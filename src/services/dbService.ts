import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase/config';
import {
  AppSettings,
  Supervisor,
  ProductionLine,
  HourlyReportRecord,
  DailyReportRecord,
} from '../types';

export const DEFAULT_ADMIN_EMAIL = 'minakhairat1@gmail.com';

export const INITIAL_SETTINGS: AppSettings = {
  dashboardPin: '1234',
  companyName: 'شركة فريش إليكتريك للأجهزة المنزلية',
  factoryName: 'مصنع مبرد الهواء والميكروويف',
  adminEmails: [DEFAULT_ADMIN_EMAIL],
  updatedAt: new Date().toISOString(),
};

export const INITIAL_PRODUCTION_LINES: ProductionLine[] = [
  {
    id: 'line-fac-1',
    name: 'خط تجميع مبرد الهواء 1',
    code: 'FAC-L1',
    category: 'air_cooler',
    idealCycleTimeSeconds: 50,
    targetHourlyUnits: 60,
    targetShiftUnits: 480,
    targetOEE: 85,
    targetAvailability: 95,
    targetPerformance: 95,
    targetQuality: 99,
    active: true,
    notes: 'خط التجميع الرئيسي لمبردات الهواء السمارت والجامبو',
  },
  {
    id: 'line-fac-2',
    name: 'خط تجميع مبرد الهواء 2',
    code: 'FAC-L2',
    category: 'air_cooler',
    idealCycleTimeSeconds: 55,
    targetHourlyUnits: 55,
    targetShiftUnits: 440,
    targetOEE: 85,
    targetAvailability: 95,
    targetPerformance: 95,
    targetQuality: 99,
    active: true,
    notes: 'خط مبردات الهواء 25 لتر و 30 لتر',
  },
  {
    id: 'line-fmw-1',
    name: 'خط تجميع الميكروويف 1',
    code: 'FMW-L1',
    category: 'microwave',
    idealCycleTimeSeconds: 60,
    targetHourlyUnits: 50,
    targetShiftUnits: 400,
    targetOEE: 85,
    targetAvailability: 95,
    targetPerformance: 95,
    targetQuality: 99,
    active: true,
    notes: 'خط ميكروويف ديجيتال وشواية',
  },
  {
    id: 'line-fsm-1',
    name: 'خط الصاج والبناطة',
    code: 'FSM-L1',
    category: 'assembly',
    idealCycleTimeSeconds: 40,
    targetHourlyUnits: 75,
    targetShiftUnits: 600,
    targetOEE: 88,
    targetAvailability: 95,
    targetPerformance: 96,
    targetQuality: 99,
    active: true,
    notes: 'خط تشكيل وتكسيح وبناطة هياكل الأجهزة',
  },
];

/**
 * Initialize system settings or return existing
 */
export async function getOrInitSettings(): Promise<AppSettings> {
  const settingsDocRef = doc(db, 'app_settings', 'general');
  try {
    const snap = await getDoc(settingsDocRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as AppSettings;
    }
    // Only attempt write if signed in
    if (auth.currentUser) {
      await setDoc(settingsDocRef, INITIAL_SETTINGS).catch(() => {});
    }
    return { id: 'general', ...INITIAL_SETTINGS };
  } catch (error) {
    console.warn('Using default system settings:', error);
    return { id: 'general', ...INITIAL_SETTINGS };
  }
}

/**
 * Update app settings (PIN, factory name, admin emails)
 */
export async function updateSettings(settings: Partial<AppSettings>): Promise<void> {
  const settingsDocRef = doc(db, 'app_settings', 'general');
  try {
    await setDoc(
      settingsDocRef,
      {
        ...settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'app_settings/general');
  }
}

/**
 * Seed initial production lines and default supervisor if empty (requires auth)
 */
export async function seedInitialDataIfNeeded(currentUserEmail?: string | null): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    const linesSnap = await getDocs(collection(db, 'production_lines'));
    if (linesSnap.empty) {
      for (const line of INITIAL_PRODUCTION_LINES) {
        const lineRef = doc(db, 'production_lines', line.id);
        await setDoc(lineRef, line);
      }
    }

    // Ensure initial admin in supervisors collection
    const adminEmail = currentUserEmail || DEFAULT_ADMIN_EMAIL;
    const supQuery = query(collection(db, 'supervisors'), where('email', '==', adminEmail.toLowerCase()));
    const supSnap = await getDocs(supQuery);
    if (supSnap.empty) {
      const adminRef = doc(collection(db, 'supervisors'));
      await setDoc(adminRef, {
        id: adminRef.id,
        email: adminEmail.toLowerCase(),
        name: 'المهندس مينا خيرت (مدير النظام)',
        role: 'admin',
        active: true,
        assignedLines: ['all'],
        phone: '01200224513',
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('Initial seed check:', error);
  }
}

/**
 * Fetch or subscribe to production lines
 */
export function subscribeToProductionLines(callback: (lines: ProductionLine[]) => void): Unsubscribe {
  const colRef = collection(db, 'production_lines');
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback(INITIAL_PRODUCTION_LINES);
        return;
      }
      const list: ProductionLine[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as ProductionLine);
      });
      callback(list.length > 0 ? list : INITIAL_PRODUCTION_LINES);
    },
    (err) => {
      console.warn('Could not listen to production_lines, using default lines:', err);
      callback(INITIAL_PRODUCTION_LINES);
    }
  );
}

/**
 * Save or update production line
 */
export async function saveProductionLine(line: Partial<ProductionLine>): Promise<string> {
  const colRef = collection(db, 'production_lines');
  try {
    if (line.id) {
      const docRef = doc(colRef, line.id);
      await setDoc(docRef, line, { merge: true });
      return line.id;
    } else {
      const newRef = doc(colRef);
      await setDoc(newRef, { ...line, id: newRef.id, active: true });
      return newRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'production_lines');
    return '';
  }
}

/**
 * Delete production line
 */
export async function deleteProductionLine(lineId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'production_lines', lineId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `production_lines/${lineId}`);
  }
}

/**
 * Subscribe to Supervisors
 */
export function subscribeToSupervisors(callback: (supervisors: Supervisor[]) => void): Unsubscribe {
  const colRef = collection(db, 'supervisors');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Supervisor[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Supervisor);
      });
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'supervisors')
  );
}

/**
 * Save supervisor
 */
export async function saveSupervisor(supervisor: Partial<Supervisor>): Promise<string> {
  const colRef = collection(db, 'supervisors');
  try {
    const emailSanitized = (supervisor.email || '').trim().toLowerCase();
    if (supervisor.id) {
      const docRef = doc(colRef, supervisor.id);
      await setDoc(docRef, { ...supervisor, email: emailSanitized }, { merge: true });
      return supervisor.id;
    } else {
      const newRef = doc(colRef);
      await setDoc(newRef, {
        ...supervisor,
        id: newRef.id,
        email: emailSanitized,
        active: supervisor.active ?? true,
        createdAt: new Date().toISOString(),
      });
      return newRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'supervisors');
    return '';
  }
}

/**
 * Delete supervisor
 */
export async function deleteSupervisor(supervisorId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'supervisors', supervisorId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `supervisors/${supervisorId}`);
  }
}

/**
 * Subscribe to Hourly Reports with optional date / line filter
 */
export function subscribeToHourlyReports(
  dateFilter: string,
  lineFilter?: string,
  callback?: (reports: HourlyReportRecord[]) => void
): Unsubscribe {
  const colRef = collection(db, 'hourly_reports');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      let list: HourlyReportRecord[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as HourlyReportRecord);
      });
      if (dateFilter) {
        list = list.filter((r) => r.date === dateFilter);
      }
      if (lineFilter && lineFilter !== 'all') {
        list = list.filter((r) => r.lineId === lineFilter);
      }
      callback?.(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'hourly_reports')
  );
}

/**
 * Save Hourly Report
 */
export async function saveHourlyReport(report: Partial<HourlyReportRecord>): Promise<string> {
  const colRef = collection(db, 'hourly_reports');
  try {
    const now = new Date().toISOString();
    if (report.id) {
      const docRef = doc(colRef, report.id);
      await setDoc(docRef, { ...report, updatedAt: now }, { merge: true });
      return report.id;
    } else {
      const newRef = doc(colRef);
      await setDoc(newRef, {
        ...report,
        id: newRef.id,
        createdAt: now,
        updatedAt: now,
      });
      return newRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'hourly_reports');
    return '';
  }
}

/**
 * Delete Hourly Report
 */
export async function deleteHourlyReport(reportId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'hourly_reports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `hourly_reports/${reportId}`);
  }
}

/**
 * Subscribe to Daily Reports
 */
export function subscribeToDailyReports(
  callback: (reports: DailyReportRecord[]) => void
): Unsubscribe {
  const colRef = collection(db, 'daily_reports');
  const q = query(colRef, orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: DailyReportRecord[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as DailyReportRecord);
      });
      callback(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'daily_reports')
  );
}

/**
 * Save Daily Report
 */
export async function saveDailyReport(report: Partial<DailyReportRecord>): Promise<string> {
  const colRef = collection(db, 'daily_reports');
  try {
    const now = new Date().toISOString();
    if (report.id) {
      const docRef = doc(colRef, report.id);
      await setDoc(docRef, { ...report, updatedAt: now }, { merge: true });
      return report.id;
    } else {
      const newRef = doc(colRef);
      await setDoc(newRef, {
        ...report,
        id: newRef.id,
        createdAt: now,
        updatedAt: now,
      });
      return newRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'daily_reports');
    return '';
  }
}

/**
 * Delete Daily Report
 */
export async function deleteDailyReport(reportId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'daily_reports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `daily_reports/${reportId}`);
  }
}

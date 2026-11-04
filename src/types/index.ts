export type UserRole = 'admin' | 'supervisor' | 'guest';

export interface CurrentUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  isGuestUnlocked?: boolean;
}

export interface AppSettings {
  id?: string;
  dashboardPin: string;
  factoryName: string;
  companyName: string;
  adminEmails: string[];
  updatedAt?: string;
}

export interface Supervisor {
  id: string;
  email: string;
  name: string;
  assignedLines: string[]; // line IDs or ['all']
  active: boolean;
  role: 'supervisor' | 'admin';
  phone?: string;
  createdAt: string;
}

export interface ProductionLine {
  id: string;
  name: string;
  code: string;
  category: 'air_cooler' | 'microwave' | 'assembly' | 'other';
  idealCycleTimeSeconds: number; // e.g. 60 sec (زمن الدورة المعياري)
  targetHourlyUnits: number; // e.g. 50
  targetShiftUnits: number; // e.g. 400
  targetOEE: number; // e.g. 85%
  targetAvailability: number; // e.g. 95%
  targetPerformance: number; // e.g. 95%
  targetQuality: number; // e.g. 99%
  active: boolean;
  notes?: string;
}

export interface HourlyReportRecord {
  id: string;
  lineId: string;
  lineName: string;
  date: string; // YYYY-MM-DD
  shift: string; // 'الوردية الأولى' | 'الوردية الثانية' | 'الوردية الثالثة'
  timeSlot: string; // e.g. '8.15--9'
  model: string;
  modelCode: string;
  plannedQty: number;
  actualQty: number;
  downtimeMinutes: number;
  downtimeReason: string;
  plannedWorkers: number;
  actualWorkers: number;
  plannedTimeMinutes: number; // usually 45 or 60 min
  operatingTimeMinutes: number; // plannedTimeMinutes - downtimeMinutes
  defects: Record<string, number>; // defectName -> count
  totalDefects: number;
  reworkPercentage: number;
  supervisorName: string;
  supervisorEmail: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductionItemRow {
  id: string;
  model: string;
  code: string;
  plannedQty: number;
  actualQty: number;
  variance: number; // actual - planned
}

export interface ManpowerDeviationRow {
  id: string;
  type: 'incoming' | 'outgoing'; // دواخل / خوارج
  workersCount: number;
  factoryOrLine: string; // من مصنع / إلى مصنع
  timeFrom: string;
  timeTo: string;
  totalHours: number;
  notes?: string;
}

export interface StoppageRow {
  id: string;
  reason: string;
  timeFrom: string;
  timeTo: string;
  durationMinutes: number;
  actionTaken?: string;
}

export interface DailyReportRecord {
  id: string;
  lineId: string;
  lineName: string;
  date: string; // YYYY-MM-DD
  shift: string;
  plannedWorkers: number;
  actualWorkers: number;
  plannedHours: number;
  actualHours: number;
  lineAbsenteeism: number; // غياب خط الإنتاج
  outgoingWorkers: number; // الخوارج
  productionRows: ProductionItemRow[];
  incomingDeviations: ManpowerDeviationRow[];
  outgoingDeviations: ManpowerDeviationRow[];
  stoppages: StoppageRow[];
  totalPlannedQty: number;
  totalActualQty: number;
  totalDowntimeMinutes: number;
  varianceReason?: string;
  // Computed KPIs
  kpiAvailability: number;
  kpiPerformance: number;
  kpiQuality: number;
  kpiOEE: number;
  kpiRejection: number;
  kpiAchievement: number;
  supervisorName: string;
  supervisorEmail: string;
  engineerName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface KPIStats {
  availability: number;
  availabilityStatus: 'on-target' | 'action-required';
  performance: number;
  performanceStatus: 'on-target' | 'action-required';
  quality: number;
  qualityStatus: 'on-target' | 'action-required';
  oee: number;
  oeeStatus: 'on-target' | 'action-required';
  rejection: number;
  rejectionStatus: 'on-target' | 'action-required';
  achievement: number;
  achievementStatus: 'on-target' | 'action-required';
  // Underlying Raw Totals
  plannedTimeMinutes: number;
  operatingTimeMinutes: number;
  totalDowntimeMinutes: number;
  totalParts: number;
  targetProduction: number;
  goodParts: number;
  rejectedParts: number;
}

// 12 Fresh Assembly Hourly Slots from the provided sheets
export const STANDARD_HOURLY_SLOTS = [
  { id: '8.15--9', label: '8:15 - 9:00', minutes: 45 },
  { id: '9--10', label: '9:00 - 10:00', minutes: 60 },
  { id: '10--11', label: '10:00 - 11:00', minutes: 60 },
  { id: '11--12', label: '11:00 - 12:00', minutes: 60 },
  { id: '12--1', label: '12:00 - 1:00', minutes: 60 },
  { id: '1.30--2', label: '1:30 - 2:00', minutes: 30 },
  { id: '2--3', label: '2:00 - 3:00', minutes: 60 },
  { id: '3--4', label: '3:00 - 4:00', minutes: 60 },
  { id: '4--5', label: '4:00 - 5:00', minutes: 60 },
  { id: '5.15--6', label: '5:15 - 6:00', minutes: 45 },
  { id: '6--7', label: '6:00 - 7:00', minutes: 60 },
  { id: '7--7.45', label: '7:00 - 7:45', minutes: 45 },
];

// Standard Fresh Defects Catalog from the PDF files
export const FRESH_DEFECT_TYPES = [
  'فروق البلاستيك',
  'أشياء غريبة ساقطة في التانك',
  'صامولة العوامة مفوتة او غير مربوطة',
  'عيب بتجميع و اتجاه الضفيرة',
  'عيب في تركيب طلمبة المياة',
  'عيب في تركيب موتور المروحة',
  'عيب بتجميع موتور الجرلة',
  'عيب بتجميع الرشاشات',
  'عيب بتركيب الخراطيم',
  'عيب بالبوردة',
  'عيب بتجميع الريش الامامي',
  'عيب بتجميع رجل القاعدة',
  'عدم وضع العجل (2 فرامل + 2 بدون)',
  'مسامير مفوتة',
  'عدم ربط طبة الصرف جيدا',
  'خراطيم معصورة (مثنية)',
  'احزمة ناقصة',
  'عيب بتجميع المروحة',
  'ثقب بالتانك',
  'عيوب بالطباعة',
  'تجاريح',
  'شبكة الطلمبة غير مثبتة',
  'مسامير مش موجودة',
  'كسر بأحد اجزاء الجهاز',
  'عيب في تركيب او اداء العوامة',
  'تسريب موجات (ميكروويف)',
  'حرق بالباب (ميكروويف)',
  'عدم نظافة',
  'عيب بدهان الجسم',
  'فرق بين القاعدة والكابينة',
  'عيوب توصيلات كهربائية',
  'حامل الطبق مختلف',
  'سيريال الكرتونة مختلف عن الجهاز والضمان',
  'عدم وجود شريحة الباب الفوم',
  'خبطة بالجسم',
  'عيب في الصاج',
  'عيب في التكسيح',
  'عيب في بناطة 1',
  'عيب في بناطة 2',
  'عيب في بناطة 3',
  'أخرى',
];

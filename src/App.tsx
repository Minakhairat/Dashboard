import React, { useState, useEffect, useMemo } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, googleProvider, testConnection } from './firebase/config';
import {
  AppSettings,
  Supervisor,
  ProductionLine,
  HourlyReportRecord,
  DailyReportRecord,
  CurrentUser,
  UserRole,
} from './types';
import {
  getOrInitSettings,
  seedInitialDataIfNeeded,
  subscribeToProductionLines,
  subscribeToSupervisors,
  subscribeToHourlyReports,
  subscribeToDailyReports,
  DEFAULT_ADMIN_EMAIL,
} from './services/dbService';

import { Header } from './components/Header';
import { LiveDashboard } from './components/LiveDashboard';
import { HourlyReportEntry } from './components/HourlyReportEntry';
import { DailyReportView } from './components/DailyReportView';
import { AdminPanel } from './components/AdminPanel';
import { PinLoginModal } from './components/PinLoginModal';
import { PrintableHourlySheet } from './components/PrintableHourlySheet';
import { PrintableDailySheet } from './components/PrintableDailySheet';
import {
  Sparkles,
  PhoneCall,
  MessageCircle,
  ShieldCheck,
  Tv,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function App() {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // System State
  const [appSettings, setAppSettings] = useState<AppSettings>({
    dashboardPin: '1234',
    factoryName: 'مصنع مبرد الهواء والميكروويف',
    companyName: 'شركة فريش إليكتريك للأجهزة المنزلية',
    adminEmails: [DEFAULT_ADMIN_EMAIL],
  });

  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [hourlyReports, setHourlyReports] = useState<HourlyReportRecord[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReportRecord[]>([]);

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'hourly' | 'daily' | 'admin'>('dashboard');
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [isGuestUnlocked, setIsGuestUnlocked] = useState<boolean>(false);

  // Filter State
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedLineId, setSelectedLineId] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');

  // Print Modals
  const [showHourlyPrint, setShowHourlyPrint] = useState<boolean>(false);
  const [showDailyPrint, setShowDailyPrint] = useState<boolean>(false);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // 1. Initial boot: Test connection & load settings
  useEffect(() => {
    testConnection();
    getOrInitSettings().then((settings) => {
      setAppSettings(settings);
    });
  }, []);

  // 2. Real-time subscriptions to Firestore collections
  useEffect(() => {
    const unsubLines = subscribeToProductionLines((data) => {
      setLines(data);
    });

    const unsubSupervisors = subscribeToSupervisors((data) => {
      setSupervisors(data);
    });

    const unsubHourly = subscribeToHourlyReports('', '', (data) => {
      setHourlyReports(data);
    });

    const unsubDaily = subscribeToDailyReports((data) => {
      setDailyReports(data);
    });

    return () => {
      unsubLines();
      unsubSupervisors();
      unsubHourly();
      unsubDaily();
    };
  }, []);

  // 3. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (!user) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }

      const email = (user.email || '').toLowerCase();
      let role: UserRole = 'guest';

      // Seed data if this user is admin
      seedInitialDataIfNeeded(email);

      // Determine role:
      const adminList = (appSettings.adminEmails || []).map((e) => e.toLowerCase());
      if (adminList.includes(email) || email === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
        role = 'admin';
      } else {
        const foundSup = supervisors.find((s) => s.email.toLowerCase() === email && s.active);
        if (foundSup) {
          role = foundSup.role === 'admin' ? 'admin' : 'supervisor';
        } else {
          // If no supervisors exist yet or first user, treat as admin
          if (supervisors.length === 0) {
            role = 'admin';
          }
        }
      }

      setCurrentUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role,
      });
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [appSettings.adminEmails, supervisors]);

  // Google Login Handler
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign In failed:', error);
    }
  };

  // Sign Out Handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setIsGuestUnlocked(false);
      setActiveTab('dashboard');
    } catch (error) {
      console.error('Sign Out error:', error);
    }
  };

  // Can view dashboard: either logged in OR guest PIN entered
  const canViewDashboard = Boolean(currentUser || isGuestUnlocked);

  // Selected Line Object for Print
  const currentLine = useMemo(() => {
    if (selectedLineId === 'all') return lines[0] || null;
    return lines.find((l) => l.id === selectedLineId) || lines[0] || null;
  }, [lines, selectedLineId]);

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Cairo',sans-serif] ${isTvMode ? 'tv-mode' : ''}`}>
      {/* Top Header & Navigation */}
      <Header
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        appSettings={appSettings}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleSignOut}
        onOpenPinModal={() => setIsPinModalOpen(true)}
        isGuestUnlocked={isGuestUnlocked}
        isTvMode={isTvMode}
        setIsTvMode={setIsTvMode}
      />

      {/* Main App Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome & Permission Prompt if Guest hasn't entered PIN yet */}
        {!canViewDashboard && activeTab === 'dashboard' ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-6 max-w-xl mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-500/10">
              <Lock className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">
                منظومة تقارير وداشبورد الإنتاج الذكية
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                مرحباً بك في نظام متابعة الإنتاج اليومي وحساب مؤشرات الأداء (KPIs) لحظة بلحظة.
                يمكنك الدخول كشاشة عرض مباشرة برمز المرور (PIN) أو تسجيل دخول المشرف / الأدمن بحساب Google.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              <button
                onClick={() => setIsPinModalOpen(true)}
                className="flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 text-sm transition"
              >
                <Tv className="w-5 h-5" />
                <span>دخول شاشة العرض (رمز PIN)</span>
              </button>

              <button
                onClick={handleGoogleSignIn}
                className="flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3.5 px-6 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold rounded-2xl text-sm transition"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>دخول المشرفين والأدمن (Google)</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 1: LIVE DASHBOARD */}
            {activeTab === 'dashboard' && (
              <LiveDashboard
                lines={lines}
                hourlyReports={hourlyReports}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                selectedLineId={selectedLineId}
                setSelectedLineId={setSelectedLineId}
                selectedShift={selectedShift}
                setSelectedShift={setSelectedShift}
                onNavigateToHourly={() => {
                  if (currentUser?.role === 'admin' || currentUser?.role === 'supervisor') {
                    setActiveTab('hourly');
                  } else {
                    handleGoogleSignIn();
                  }
                }}
                onPrintHourlySheet={() => setShowHourlyPrint(true)}
                onPrintDailySheet={() => setShowDailyPrint(true)}
                isTvMode={isTvMode}
              />
            )}

            {/* VIEW 2: HOURLY REPORT ENTRY (SUPERVISORS & ADMIN) */}
            {activeTab === 'hourly' && (
              <HourlyReportEntry
                lines={lines}
                hourlyReports={hourlyReports}
                currentUser={currentUser}
                onPrintSheet={() => setShowHourlyPrint(true)}
              />
            )}

            {/* VIEW 3: DAILY REPORT (QF-08.01.03) */}
            {activeTab === 'daily' && (
              <DailyReportView
                lines={lines}
                dailyReports={dailyReports}
                currentUser={currentUser}
                onPrintSheet={() => setShowDailyPrint(true)}
              />
            )}

            {/* VIEW 4: ADMIN PANEL */}
            {activeTab === 'admin' && currentUser?.role === 'admin' && (
              <AdminPanel
                supervisors={supervisors}
                lines={lines}
                appSettings={appSettings}
                currentUser={currentUser}
              />
            )}
          </>
        )}
      </main>

      {/* Engineer Mina Khairat Professional Engineering Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-900/90 text-slate-400 py-6 px-4 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          {/* Engineering Copyright & Credits */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-right">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-xs">
                F
              </div>
              <div>
                <span className="font-bold text-slate-200">
                  {appSettings.factoryName || 'مصنع مبرد الهواء والميكروويف'}
                </span>
                <span className="block text-[11px] text-slate-500">
                  منظومة تتبع الإنتاج وحساب الـ KPIs ساعة بساعة
                </span>
              </div>
            </div>

            <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

            <div className="text-slate-300">
              جميع الحقوق محفوظة ومسجلة للمهندس <strong className="text-amber-300 font-bold">مينا خيرت</strong> © 2026
            </div>
          </div>

          {/* Direct Contact Actions for Eng. Mina Khairat */}
          <div className="flex items-center gap-3">
            <a
              href="tel:01200224513"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition font-mono font-bold"
              title="اتصال هاتفي بالمهندس مينا خيرت"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span className="dir-ltr text-xs">01200224513</span>
            </a>

            <a
              href="https://wa.me/201200224513"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 transition text-xs font-bold"
              title="محادثة واتساب مباشرة مع المهندس مينا خيرت"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>واتساب المهندس مينا</span>
            </a>
          </div>
        </div>
      </footer>

      {/* PIN Login Modal for Guest Display Screens */}
      <PinLoginModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        correctPin={appSettings.dashboardPin || '1234'}
        onSuccess={() => {
          setIsGuestUnlocked(true);
          setIsPinModalOpen(false);
          setActiveTab('dashboard');
        }}
      />

      {/* Printable Sheet Modals */}
      {showHourlyPrint && (
        <PrintableHourlySheet
          onClose={() => setShowHourlyPrint(false)}
          reports={hourlyReports.filter(
            (r) =>
              (!selectedDate || r.date === selectedDate) &&
              (selectedLineId === 'all' || r.lineId === selectedLineId)
          )}
          line={currentLine}
          date={selectedDate || todayStr}
          shift={selectedShift === 'all' ? 'الوردية الأولى' : selectedShift}
        />
      )}

      {showDailyPrint && (
        <PrintableDailySheet
          onClose={() => setShowDailyPrint(false)}
          report={
            dailyReports.find(
              (r) =>
                (!selectedDate || r.date === selectedDate) &&
                (selectedLineId === 'all' || r.lineId === selectedLineId)
            ) || dailyReports[0] || null
          }
          hourlyReports={hourlyReports.filter(
            (r) =>
              (!selectedDate || r.date === selectedDate) &&
              (selectedLineId === 'all' || r.lineId === selectedLineId)
          )}
          line={currentLine}
          date={selectedDate || todayStr}
        />
      )}
    </div>
  );
}

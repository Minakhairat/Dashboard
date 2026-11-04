import React, { useState, useEffect } from 'react';
import {
  Activity,
  Clock,
  FileSpreadsheet,
  Settings,
  LogIn,
  LogOut,
  Tv,
  Maximize2,
  Minimize2,
  ShieldAlert,
  PhoneCall,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { CurrentUser, AppSettings } from '../types';

interface HeaderProps {
  currentUser: CurrentUser | null;
  activeTab: 'dashboard' | 'hourly' | 'daily' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'hourly' | 'daily' | 'admin') => void;
  appSettings: AppSettings;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onOpenPinModal: () => void;
  isGuestUnlocked: boolean;
  isTvMode: boolean;
  setIsTvMode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  appSettings,
  onGoogleSignIn,
  onSignOut,
  onOpenPinModal,
  isGuestUnlocked,
  isTvMode,
  setIsTvMode,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsTvMode(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsTvMode(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';
  const isSupervisorOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xl">
      {/* Top Banner with Fresh Brand and Engineer Credits */}
      <div className="px-4 py-2 bg-gradient-to-r from-red-700 via-red-800 to-slate-900 flex flex-wrap items-center justify-between text-xs gap-2 border-b border-red-900/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-black/30 rounded-md font-bold tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>FRESH ELECTRIC</span>
          </div>
          <span className="text-red-100 font-medium hidden sm:inline">
            {appSettings.factoryName || 'مصنع مبرد الهواء والميكروويف'}
          </span>
        </div>

        {/* Engineer Mina Khairat Credits Badge */}
        <div className="flex items-center gap-2">
          <a
            href="tel:01200224513"
            title="الاتصال بالمهندس مينا خيرت"
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/40 hover:bg-black/60 border border-amber-400/30 text-amber-300 font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>تصميم وتطوير: م/ مينا خيرت</span>
            <span className="font-mono text-white flex items-center gap-1 dir-ltr text-[11px]">
              <PhoneCall className="w-3 h-3 text-emerald-400" /> 01200224513
            </span>
          </a>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Title & Live Time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold leading-tight flex items-center gap-2">
                منظومة تقارير وداشبورد الإنتاج
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-400/30 text-blue-300 font-mono">
                  Live KPI
                </span>
              </h1>
              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span>{currentDate}</span>
                <span className="text-cyan-400 font-bold">{currentTime}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>الداشبورد اللحظية</span>
          </button>

          <button
            onClick={() => {
              if (isSupervisorOrAdmin) {
                setActiveTab('hourly');
              } else {
                onGoogleSignIn();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'hourly'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            title={!isSupervisorOrAdmin ? 'يتطلب تسجيل دخول مشرف معتمد' : ''}
          >
            <Clock className="w-4 h-4" />
            <span>ساعة بساعة</span>
            {!isSupervisorOrAdmin && (
              <span className="text-[10px] bg-slate-800 text-amber-300 px-1 rounded">مشرف</span>
            )}
          </button>

          <button
            onClick={() => {
              if (isSupervisorOrAdmin) {
                setActiveTab('daily');
              } else {
                onGoogleSignIn();
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'daily'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            title={!isSupervisorOrAdmin ? 'يتطلب تسجيل دخول مشرف معتمد' : ''}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تقرير الإنتاج QF</span>
            {!isSupervisorOrAdmin && (
              <span className="text-[10px] bg-slate-800 text-amber-300 px-1 rounded">مشرف</span>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'admin'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-purple-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>إدارة النظام</span>
            </button>
          )}
        </nav>

        {/* User Actions & Auth Profile */}
        <div className="flex items-center gap-2">
          {/* TV / Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${
              isTvMode
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="وضع الشاشات والمصنع (TV Fullscreen)"
          >
            <Tv className="w-4 h-4" />
            <span className="hidden md:inline">{isTvMode ? 'إلغاء وضع TV' : 'وضع TV'}</span>
            {isTvMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {currentUser ? (
            /* Logged in with Google */
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1.5">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || ''}
                  className="w-7 h-7 rounded-full border border-blue-400"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                  {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                </div>
              )}
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold leading-tight flex items-center gap-1">
                  <span>{currentUser.displayName || currentUser.email}</span>
                  {currentUser.role === 'admin' ? (
                    <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded font-bold">
                      مدير
                    </span>
                  ) : (
                    <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.2 rounded font-bold">
                      مشرف
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[130px] font-mono">
                  {currentUser.email}
                </div>
              </div>
              <button
                onClick={onSignOut}
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : isGuestUnlocked ? (
            /* Unlocked Live Display via PIN */
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>عرض الداشبورد (PIN مفعل)</span>
              </div>
              <button
                onClick={onGoogleSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                <LogIn className="w-4 h-4" />
                <span>دخول المشرف / الأدمن</span>
              </button>
            </div>
          ) : (
            /* Neither logged in nor PIN entered */
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenPinModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>عرض برمز PIN</span>
              </button>
              <button
                onClick={onGoogleSignIn}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition"
              >
                <LogIn className="w-4 h-4" />
                <span>دخول بحساب Google</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

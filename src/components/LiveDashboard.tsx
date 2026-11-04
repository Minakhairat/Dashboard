import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Layers,
  Sparkles,
  TrendingUp,
  Volume2,
  VolumeX,
  RefreshCw,
  Printer,
  ChevronDown,
  FileSpreadsheet,
  BarChart3,
  PieChart as PieChartIcon,
  Maximize2,
  Zap,
  Radio,
} from 'lucide-react';
import {
  ProductionLine,
  HourlyReportRecord,
  STANDARD_HOURLY_SLOTS,
} from '../types';
import { calculateKPIs, getStatusBadge } from '../utils/kpiCalculator';
import { saveHourlyReport } from '../services/dbService';
import confetti from 'canvas-confetti';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface LiveDashboardProps {
  lines: ProductionLine[];
  hourlyReports: HourlyReportRecord[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedLineId: string;
  setSelectedLineId: (lineId: string) => void;
  selectedShift: string;
  setSelectedShift: (shift: string) => void;
  onNavigateToHourly: () => void;
  onPrintHourlySheet: () => void;
  onPrintDailySheet?: () => void;
  isTvMode: boolean;
}

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export const LiveDashboard: React.FC<LiveDashboardProps> = ({
  lines,
  hourlyReports,
  selectedDate,
  setSelectedDate,
  selectedLineId,
  setSelectedLineId,
  selectedShift,
  setSelectedShift,
  onNavigateToHourly,
  onPrintHourlySheet,
  onPrintDailySheet,
  isTvMode,
}) => {
  const [autoCycle, setAutoCycle] = useState<boolean>(false);
  const [soundAlerts, setSoundAlerts] = useState<boolean>(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('متصل بالخادم');
  const [justUpdated, setJustUpdated] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Monitor real-time Firestore updates and animate changes
  useEffect(() => {
    if (hourlyReports.length > 0) {
      const now = new Date();
      setLastUpdateTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setJustUpdated(true);
      const timer = setTimeout(() => setJustUpdated(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [hourlyReports]);

  // Test Live Update: adds or increments a live batch in Firestore to see graphs shift in real time!
  const simulateLiveUpdate = async () => {
    setIsSimulating(true);
    try {
      const targetLine = activeLine || lines[0];
      if (!targetLine) return;
      const today = selectedDate || new Date().toISOString().split('T')[0];

      // Find first slot without data or update slot 0
      const existingSlotIds = new Set(filteredReports.map((r) => r.timeSlot));
      const nextSlot =
        STANDARD_HOURLY_SLOTS.find((s) => !existingSlotIds.has(s.id)) ||
        STANDARD_HOURLY_SLOTS[0];
      const actualQty = Math.floor(targetLine.targetHourlyUnits * (0.9 + Math.random() * 0.25));

      await saveHourlyReport({
        lineId: targetLine.id,
        lineName: targetLine.name,
        date: today,
        shift: selectedShift === 'all' ? 'الوردية الأولى' : selectedShift,
        timeSlot: nextSlot.id,
        model: targetLine.category === 'microwave' ? 'ميكروويف 25 لتر ديجيتال' : 'مبرد هواء سمارت 40 لتر',
        modelCode: targetLine.code,
        plannedQty: targetLine.targetHourlyUnits,
        actualQty: actualQty,
        downtimeMinutes: Math.random() > 0.7 ? 10 : 0,
        downtimeReason: Math.random() > 0.7 ? 'ضبط ميزان التجميع' : '',
        plannedWorkers: 24,
        actualWorkers: 24,
        plannedTimeMinutes: nextSlot.minutes,
        operatingTimeMinutes: nextSlot.minutes,
        defects: { 'فروق البلاستيك': Math.random() > 0.6 ? 1 : 0 },
        totalDefects: Math.random() > 0.6 ? 1 : 0,
        reworkPercentage: Math.random() > 0.6 ? Number(((1 / actualQty) * 100).toFixed(2)) : 0,
        supervisorName: 'محاكاة التحديث اللحظي',
        supervisorEmail: 'live-test@fresh.com',
      });
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Auto cycle through lines every 15 seconds if in TV mode / auto-cycle
  useEffect(() => {
    if (!autoCycle || lines.length <= 1) return;
    const interval = setInterval(() => {
      const currentIndex = lines.findIndex((l) => l.id === selectedLineId);
      const nextIndex = (currentIndex + 1) % lines.length;
      setSelectedLineId(lines[nextIndex]?.id || 'all');
    }, 15000);
    return () => clearInterval(interval);
  }, [autoCycle, lines, selectedLineId, setSelectedLineId]);

  // Current active line object
  const activeLine = useMemo(() => {
    if (selectedLineId === 'all') return null;
    return lines.find((l) => l.id === selectedLineId) || lines[0] || null;
  }, [lines, selectedLineId]);

  // Filtered reports by date, line, and shift
  const filteredReports = useMemo(() => {
    return hourlyReports.filter((r) => {
      const matchDate = !selectedDate || r.date === selectedDate;
      const matchLine = selectedLineId === 'all' || r.lineId === selectedLineId;
      const matchShift = selectedShift === 'all' || r.shift === selectedShift;
      return matchDate && matchLine && matchShift;
    });
  }, [hourlyReports, selectedDate, selectedLineId, selectedShift]);

  // Aggregated calculations for the selected scope
  const kpiStats = useMemo(() => {
    const plannedTimeMinutes = filteredReports.reduce(
      (sum, r) => sum + (r.plannedTimeMinutes || 60),
      0
    );
    const downtimeMinutes = filteredReports.reduce(
      (sum, r) => sum + (r.downtimeMinutes || 0),
      0
    );
    const totalParts = filteredReports.reduce((sum, r) => sum + (r.actualQty || 0), 0);
    const rejectedParts = filteredReports.reduce((sum, r) => sum + (r.totalDefects || 0), 0);

    let targetProduction = filteredReports.reduce((sum, r) => sum + (r.plannedQty || 0), 0);
    if (targetProduction === 0 && activeLine) {
      targetProduction = activeLine.targetShiftUnits || 480;
    }

    const idealCycleTimeSeconds = activeLine?.idealCycleTimeSeconds || 50;

    return calculateKPIs({
      plannedTimeMinutes: plannedTimeMinutes > 0 ? plannedTimeMinutes : 480,
      downtimeMinutes,
      totalParts,
      rejectedParts,
      targetProduction: targetProduction > 0 ? targetProduction : 480,
      idealCycleTimeSeconds,
    });
  }, [filteredReports, activeLine]);

  // Trigger celebratory confetti if OEE >= 85% and Achievement >= 100%
  const celebrateSuccess = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // 1. RECHARTS: Cumulative Production Trend dataset (الإنتاج المتراكم خلال ساعات العمل للوردية الحالية)
  const cumulativeProductionData = useMemo(() => {
    let cumPlanned = 0;
    let cumActual = 0;
    let hasReachedCurrentLoggedSlot = false;

    // Check what is the last hour logged
    const loggedSlotIds = new Set(filteredReports.map((r) => r.timeSlot));

    return STANDARD_HOURLY_SLOTS.map((slot) => {
      const report = filteredReports.find((r) => r.timeSlot === slot.id);
      const plannedInHour = report?.plannedQty || (activeLine?.targetHourlyUnits || 60);
      cumPlanned += plannedInHour;

      if (report && report.actualQty !== undefined && report.actualQty !== null) {
        cumActual += report.actualQty;
        return {
          slotId: slot.id,
          label: slot.label,
          المخطط_التراكمي: cumPlanned,
          المحقق_التراكمي: cumActual,
          المخطط_بالساعة: plannedInHour,
          المحقق_بالساعة: report.actualQty,
          الفارق: cumActual - cumPlanned,
        };
      } else if (loggedSlotIds.size > 0 && !hasReachedCurrentLoggedSlot) {
        // If no more logged slots ahead in the day
        return {
          slotId: slot.id,
          label: slot.label,
          المخطط_التراكمي: cumPlanned,
          المحقق_التراكمي: null, // Leaves line open at current progress
          المخطط_بالساعة: plannedInHour,
          المحقق_بالساعة: null,
          الفارق: null,
        };
      } else {
        return {
          slotId: slot.id,
          label: slot.label,
          المخطط_التراكمي: cumPlanned,
          المحقق_التراكمي: null,
          المخطط_بالساعة: plannedInHour,
          المحقق_بالساعة: null,
          الفارق: null,
        };
      }
    });
  }, [filteredReports, activeLine]);

  // 2. RECHARTS: Hourly Output Comparison dataset (المخطط vs الفعلي بالساعة)
  const hourlyOutputData = useMemo(() => {
    return STANDARD_HOURLY_SLOTS.map((slot) => {
      const report = filteredReports.find((r) => r.timeSlot === slot.id);
      const planned = report?.plannedQty || (activeLine?.targetHourlyUnits || 60);
      const actual = report?.actualQty ?? 0;
      const downtime = report?.downtimeMinutes || 0;
      return {
        label: slot.label.split(' - ')[0], // Compact label (8:15, 9:00, etc.)
        fullLabel: slot.label,
        المخطط: planned,
        المحقق: actual,
        التوقف_دقائق: downtime,
        achieved: actual >= planned,
      };
    });
  }, [filteredReports, activeLine]);

  // 3. RECHARTS: Defect Breakdown Pareto
  const defectBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    filteredReports.forEach((r) => {
      if (r.defects) {
        Object.entries(r.defects).forEach(([defect, count]) => {
          if (count > 0) {
            counts[defect] = (counts[defect] || 0) + count;
            total += count;
          }
        });
      }
    });

    return Object.entries(counts)
      .map(([defect, count]) => ({
        name: defect,
        count,
        percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredReports]);

  // 4. RECHARTS: Downtime & Stoppage Loss Log
  const stoppageList = useMemo(() => {
    return filteredReports
      .filter((r) => (r.downtimeMinutes || 0) > 0)
      .map((r) => ({
        timeSlot: r.timeSlot,
        minutes: r.downtimeMinutes,
        reason: r.downtimeReason || 'عطل ميكانيكي / توقف مؤقت',
        model: r.model,
      }));
  }, [filteredReports]);

  const stoppageChartData = useMemo(() => {
    const reasonsMap: Record<string, number> = {};
    stoppageList.forEach((s) => {
      const key = s.reason.length > 25 ? s.reason.substring(0, 25) + '...' : s.reason;
      reasonsMap[key] = (reasonsMap[key] || 0) + s.minutes;
    });
    return Object.entries(reasonsMap)
      .map(([reason, minutes]) => ({ name: reason, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [stoppageList]);

  return (
    <div className="space-y-6">
      {/* Top Controls & Visual Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Line, Date & Shift Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Line Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              خط الإنتاج
            </label>
            <div className="relative">
              <select
                value={selectedLineId}
                onChange={(e) => setSelectedLineId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 pl-8 text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="all">كل خطوط الإنتاج (إجمالي المصنع)</option>
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">التاريخ</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500 font-mono transition"
            />
          </div>

          {/* Shift Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">الوردية</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition"
            >
              <option value="all">جميع الورديات</option>
              <option value="الوردية الأولى">الوردية الأولى (صباحية)</option>
              <option value="الوردية الثانية">الوردية الثانية (مسائية)</option>
              <option value="الوردية الثالثة">الوردية الثالثة (ليلية)</option>
            </select>
          </div>
        </div>

        {/* Dashboard Tools & TV Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Cycle Button for TV Screens */}
          <button
            onClick={() => setAutoCycle(!autoCycle)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
              autoCycle
                ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="تدوير العرض تلقائياً بين خطوط الإنتاج كل 15 ثانية"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoCycle ? 'animate-spin' : ''}`} />
            <span>تدوير تلقائي</span>
          </button>

          {/* Sound Alert Toggle */}
          <button
            onClick={() => setSoundAlerts(!soundAlerts)}
            className={`p-2 rounded-xl border text-xs transition ${
              soundAlerts
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title={soundAlerts ? 'تنبيهات الصوت مفعلة' : 'كتم التنبيهات الصوتية'}
          >
            {soundAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Official Hourly Print Button */}
          <button
            onClick={onPrintHourlySheet}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
            title="طباعة تقرير ساعة بساعة بالبيانات الفعلية المدخلة"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>طباعة تقرير ساعة بساعة</span>
          </button>

          {/* Official Daily QF Print Button */}
          {onPrintDailySheet && (
            <button
              onClick={onPrintDailySheet}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
              title="طباعة استمارة متابعة الإنتاجية اليومية QF-08.01.03"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>طباعة نموذج QF اليومي</span>
            </button>
          )}

          {/* Quick Add Hour */}
          <button
            onClick={onNavigateToHourly}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 transition"
          >
            <Clock className="w-4 h-4" />
            <span>تسجيل ساعة جديدة</span>
          </button>
        </div>
      </div>

      {/* Visual Factory Banner (المصنع المرئي) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-inner">
            <Gauge className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">
                {activeLine ? activeLine.name : 'جميع خطوط الإنتاج التجميعية'}
              </h2>
              {activeLine && (
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/20 border border-blue-400/30 text-blue-300">
                  {activeLine.code}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              المصنع المرئي (Visual Factory Dashboard) | زمن الدورة المعياري:{' '}
              <span className="text-cyan-400 font-bold font-mono">
                {activeLine ? activeLine.idealCycleTimeSeconds : 50} ث/قطعة
              </span>{' '}
              | المستهدف بالساعة:{' '}
              <span className="text-emerald-400 font-bold font-mono">
                {activeLine ? activeLine.targetHourlyUnits : 60} قطعة
              </span>
            </p>
          </div>
        </div>

        {/* Real-Time Sync Indicator & Test Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Firestore Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline">متصل بـ Firebase لحظياً</span>
            <span className="font-mono text-[11px] text-emerald-300">({lastUpdateTime})</span>
          </div>

          {/* Test Live Update button to confirm real-time reactivity */}
          <button
            onClick={simulateLiveUpdate}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:from-amber-600/50 hover:to-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition shadow-sm"
            title="إرسال دفعة إنتاج تجريبية إلى قاعدة البيانات لمشاهدة حركة وتحديث الرسوم البيانية لحظياً أمامك"
          >
            <Zap className={`w-3.5 h-3.5 text-amber-400 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'جاري الإرسال...' : 'تجربة التحديث اللحظي'}</span>
          </button>

          {kpiStats.oee >= 85 && (
            <button
              onClick={celebrateSuccess}
              className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 rounded-xl transition"
              title="احتفال بتحقيق المستهدف"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* Real-time Flash Notification when Firestore updates */}
      {justUpdated && (
        <div className="p-3 bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-slate-900 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs font-bold flex items-center justify-between shadow-xl transition-all">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>⚡ تم استلام تحديث إنتاج مباشر من قاعدة البيانات، وتم تحديث منحنى Recharts والـ KPIs فوراً!</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
            إجمالي السجلات: {hourlyReports.length}
          </span>
        </div>
      )}

      {/* THE 6 CORE INDUSTRIAL KPI CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>مؤشرات الأداء الرئيسية (KPIs Level 2) - الحساب اللحظي المعتمد</span>
          </h3>
          <span className="text-xs text-slate-400 hidden sm:inline">
            معادلات شركة فريش ومعهد استيمو للهندسة الصناعية
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* KPI 4: OEE % */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                KPI 4 • OEE
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${getStatusBadge(kpiStats.oeeStatus).bg}`}>
                {kpiStats.oee >= 85 ? 'ناجح' : 'تنبيه'}
              </span>
            </div>
            <div className="mt-2 text-2xl font-black font-mono tracking-tight text-white">
              <span className={kpiStats.oee >= 85 ? 'text-emerald-400' : 'text-rose-400'}>
                {kpiStats.oee}%
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-300 mt-0.5 truncate">الكفاءة الشاملة</div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${kpiStats.oee >= 85 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, kpiStats.oee)}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">الهدف: ≥85%</div>
          </div>

          {/* KPI 1: Availability % */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                KPI 1 • Avail.
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${getStatusBadge(kpiStats.availabilityStatus).bg}`}>
                {kpiStats.availability >= 95 ? 'ناجح' : 'تنبيه'}
              </span>
            </div>
            <div className="mt-2 text-2xl font-black font-mono tracking-tight text-white">
              <span className={kpiStats.availability >= 95 ? 'text-emerald-400' : 'text-rose-400'}>
                {kpiStats.availability}%
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-300 mt-0.5 truncate">معدل الإتاحة</div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${kpiStats.availability >= 95 ? 'bg-blue-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, kpiStats.availability)}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">توقف: {kpiStats.totalDowntimeMinutes}د</div>
          </div>

          {/* KPI 2: Performance % */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                KPI 2 • Perf.
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${getStatusBadge(kpiStats.performanceStatus).bg}`}>
                {kpiStats.performance >= 95 ? 'ناجح' : 'تنبيه'}
              </span>
            </div>
            <div className="mt-2 text-2xl font-black font-mono tracking-tight text-white">
              <span className={kpiStats.performance >= 95 ? 'text-emerald-400' : 'text-rose-400'}>
                {kpiStats.performance}%
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-300 mt-0.5 truncate">معدل الأداء</div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${kpiStats.performance >= 95 ? 'bg-cyan-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, kpiStats.performance)}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">الهدف: ≥95%</div>
          </div>

          {/* KPI 3: Quality % */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono font-bold text-teal-400 bg-teal-500/10 px-1.5 py-0.2 rounded border border-teal-500/20">
                KPI 3 • Qual.
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${getStatusBadge(kpiStats.qualityStatus).bg}`}>
                {kpiStats.quality >= 99 ? 'ناجح' : 'تنبيه'}
              </span>
            </div>
            <div className="mt-2 text-2xl font-black font-mono tracking-tight text-white">
              <span className={kpiStats.quality >= 99 ? 'text-emerald-400' : 'text-rose-400'}>
                {kpiStats.quality}%
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-300 mt-0.5 truncate">معدل الجودة</div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${kpiStats.quality >= 99 ? 'bg-teal-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, kpiStats.quality)}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">سليم: {kpiStats.goodParts}</div>
          </div>

          {/* KPI 5: Rejection % */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                KPI 5 • Reject.
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${getStatusBadge(kpiStats.rejectionStatus).bg}`}>
                {kpiStats.rejection <= 1 ? 'ناجح' : 'تنبيه'}
              </span>
            </div>
            <div className="mt-2 text-2xl font-black font-mono tracking-tight text-white">
              <span className={kpiStats.rejection <= 1 ? 'text-emerald-400' : 'text-rose-400'}>
                {kpiStats.rejection}%
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-300 mt-0.5 truncate">نسبة العيوب</div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${kpiStats.rejection <= 1 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, kpiStats.rejection * 10)}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">عيوب: {kpiStats.rejectedParts}</div>
          </div>

          {/* KPI 6: Production Achievement % */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                KPI 6 • Achiev.
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${getStatusBadge(kpiStats.achievementStatus).bg}`}>
                {kpiStats.achievement >= 100 ? 'ناجح' : 'تنبيه'}
              </span>
            </div>
            <div className="mt-2 text-2xl font-black font-mono tracking-tight text-white">
              <span className={kpiStats.achievement >= 100 ? 'text-emerald-400' : 'text-amber-400'}>
                {kpiStats.achievement}%
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-300 mt-0.5 truncate">تحقيق الخطة</div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${kpiStats.achievement >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, kpiStats.achievement)}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              {kpiStats.totalParts} / {kpiStats.targetProduction}
            </div>
          </div>
        </div>
      </div>

      {/* CORE FEATURE: RECHARTS CUMULATIVE PRODUCTION TREND (معدل الإنتاج المتراكم للوردية الحالية) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>منحنى الإنتاج المتراكم خلال ساعات العمل للوردية (Cumulative Production Trend)</span>
                <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                  Recharts Visual Factory
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                مقارنة المسار المتراكم المخطط مقابل الإنتاج الفعلي المتراكم ساعة بساعة لكشف فجوة الأداء فوراً
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block"></span>
              <span className="text-slate-300">المخطط المتراكم (Target)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
              <span className="text-slate-300">الفعلي المتراكم (Actual)</span>
            </div>
          </div>
        </div>

        {/* The Recharts Area / Line Chart */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumulativeProductionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: '#334155' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1 font-mono text-right">
                        <div className="font-bold text-white font-sans text-sm pb-1 border-b border-slate-800">
                          فترة: {label}
                        </div>
                        <div className="text-cyan-400">
                          المخطط التراكمي: <strong>{data.المخطط_التراكمي}</strong> قطعة
                        </div>
                        <div className="text-emerald-400 font-bold">
                          المحقق التراكمي:{' '}
                          <strong>{data.المحقق_التراكمي !== null ? `${data.المحقق_التراكمي} قطعة` : 'لم تسجل بعد'}</strong>
                        </div>
                        {data.المحقق_بالساعة !== null && (
                          <div className="text-slate-300 pt-1 border-t border-slate-800 flex justify-between gap-3">
                            <span>إنتاج هذه الساعة: {data.المحقق_بالساعة}</span>
                            <span className={data.الفارق >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              الفارق: {data.الفارق > 0 ? `+${data.الفارق}` : data.الفارق}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="المخطط_التراكمي"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#plannedGradient)"
                name="المخطط التراكمي"
              />
              <Area
                type="monotone"
                dataKey="المحقق_التراكمي"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#actualGradient)"
                name="المحقق التراكمي"
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RECHARTS VISUAL FACTORY: 2-COLUMN LAYOUT (HOURLY BARS & DEFECT PARETO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Bar Chart: Planned vs Actual */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white">
                مقارنة إنتاج كل ساعة (المخطط vs الفعلي)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">ساعة بساعة للوردية</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyOutputData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs font-mono text-right">
                          <div className="font-bold text-white font-sans">{d.fullLabel}</div>
                          <div className="text-slate-400">المخطط: {d.المخطط} قطعة</div>
                          <div className={d.المحقق >= d.المخطط ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            المحقق: {d.المحقق} قطعة
                          </div>
                          {d.التوقف_دقائق > 0 && (
                            <div className="text-amber-400">التوقف: {d.التوقف_دقائق} دقيقة</div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="المخطط" fill="#334155" radius={[4, 4, 0, 0]} name="المخطط" />
                <Bar dataKey="المحقق" fill="#3b82f6" radius={[4, 4, 0, 0]} name="المحقق">
                  {hourlyOutputData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.المحقق >= entry.المخطط && entry.المحقق > 0 ? '#10b981' : entry.المحقق === 0 ? '#1e293b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Defect Pareto Chart & Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                توزيع عيوب التجميع وإعادة التشغيل (Pareto)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
              إجمالي: {kpiStats.rejectedParts} عيب
            </span>
          </div>

          {defectBreakdown.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
              <span>لا توجد عيوب أو هالك مسجل اليوم، الجودة ممتازة!</span>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={defectBreakdown.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fill: '#cbd5e1', fontSize: 10 }}
                    width={110}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-700 p-2 rounded-lg text-xs font-mono text-right">
                            <div className="font-bold text-white font-sans">{d.name}</div>
                            <div className="text-rose-400">العدد: {d.count} قطعة ({d.percentage}%)</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                    {defectBreakdown.slice(0, 6).map((_, index) => (
                      <Cell key={`defect-cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Hourly Assembly Status Cards (ساعة بساعة تفصيلي) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">
              جدول متابعة الإنتاج ساعة بساعة لخط التجميع (Shop Floor Slots)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            فترات العمل الرسمية للوردية طبقاً لشيت فريش المعتمد
          </span>
        </div>

        {/* 12 Hour Slots Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {STANDARD_HOURLY_SLOTS.map((slot) => {
            const report = filteredReports.find((r) => r.timeSlot === slot.id);
            const planned = report?.plannedQty || (activeLine?.targetHourlyUnits || 60);
            const actual = report?.actualQty ?? null;
            const downtime = report?.downtimeMinutes || 0;
            const defects = report?.totalDefects || 0;
            const hasData = actual !== null;
            const isAchieved = hasData && actual >= planned;

            return (
              <div
                key={slot.id}
                className={`relative rounded-xl p-3 border transition ${
                  hasData
                    ? isAchieved
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : 'bg-rose-950/30 border-rose-500/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-300 font-mono">{slot.label}</span>
                  {hasData && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        isAchieved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {Math.round((actual / (planned || 1)) * 100)}%
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between mt-2 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">المحقق</span>
                    <span
                      className={`text-xl font-black ${
                        hasData
                          ? isAchieved
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                          : 'text-slate-600'
                      }`}
                    >
                      {hasData ? actual : '-'}
                    </span>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 block">المخطط</span>
                    <span className="text-sm font-semibold text-slate-400">{planned}</span>
                  </div>
                </div>

                {hasData && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span
                      className={
                        downtime > 0 ? 'text-amber-400 font-bold flex items-center gap-0.5' : 'text-slate-500'
                      }
                      title={report?.downtimeReason || ''}
                    >
                      {downtime > 0 && <AlertTriangle className="w-2.5 h-2.5" />}
                      توقف: {downtime}د
                    </span>
                    <span className={defects > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                      عيوب: {defects}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stoppage Loss Log Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">
              سجل التوقفات والأعطال (Downtime Losses)
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
            إجمالي الفقد: {kpiStats.totalDowntimeMinutes} دقيقة
          </span>
        </div>

        {stoppageList.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
            <span>خط الإنتاج يعمل باستمرارية ودون أي توقفات مسجلة</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stoppageList.map((stop, i) => (
              <div
                key={i}
                className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-bold">
                      {stop.timeSlot}
                    </span>
                    {stop.model && (
                      <span className="text-slate-400 text-[11px]">موديل: {stop.model}</span>
                    )}
                  </div>
                  <p className="text-slate-200 font-medium">{stop.reason}</p>
                </div>
                <div className="text-left font-mono font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20 whitespace-nowrap">
                  {stop.minutes} دقيقة
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

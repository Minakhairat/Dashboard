import React, { useState, useMemo } from 'react';
import {
  Clock,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Layers,
  ChevronDown,
  Printer,
  Sparkles,
} from 'lucide-react';
import {
  ProductionLine,
  HourlyReportRecord,
  STANDARD_HOURLY_SLOTS,
  FRESH_DEFECT_TYPES,
  CurrentUser,
} from '../types';
import { saveHourlyReport, deleteHourlyReport } from '../services/dbService';

interface HourlyReportEntryProps {
  lines: ProductionLine[];
  hourlyReports: HourlyReportRecord[];
  currentUser: CurrentUser | null;
  onPrintSheet: () => void;
}

export const HourlyReportEntry: React.FC<HourlyReportEntryProps> = ({
  lines,
  hourlyReports,
  currentUser,
  onPrintSheet,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [selectedLineId, setSelectedLineId] = useState<string>(lines[0]?.id || '');
  const [date, setDate] = useState<string>(todayStr);
  const [shift, setShift] = useState<string>('الوردية الأولى');
  const [timeSlot, setTimeSlot] = useState<string>(STANDARD_HOURLY_SLOTS[0].id);
  const [model, setModel] = useState<string>('مبرد هواء سمارت 40 لتر');
  const [modelCode, setModelCode] = useState<string>('FAC-40SMART');
  const [plannedQty, setPlannedQty] = useState<number>(60);
  const [actualQty, setActualQty] = useState<number>(55);
  const [downtimeMinutes, setDowntimeMinutes] = useState<number>(0);
  const [downtimeReason, setDowntimeReason] = useState<string>('');
  const [plannedWorkers, setPlannedWorkers] = useState<number>(24);
  const [actualWorkers, setActualWorkers] = useState<number>(24);
  const [defects, setDefects] = useState<Record<string, number>>({});
  const [defectSearch, setDefectSearch] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Selected line object
  const currentLine = useMemo(() => {
    return lines.find((l) => l.id === selectedLineId) || lines[0] || null;
  }, [lines, selectedLineId]);

  // Selected slot duration (minutes)
  const currentSlotMinutes = useMemo(() => {
    const s = STANDARD_HOURLY_SLOTS.find((slot) => slot.id === timeSlot);
    return s?.minutes || 60;
  }, [timeSlot]);

  // Total defects count
  const totalDefectsCount = useMemo(() => {
    return Object.values(defects).reduce((sum, count) => sum + (count || 0), 0);
  }, [defects]);

  // Rework percentage
  const reworkPercentage = useMemo(() => {
    if (actualQty <= 0) return 0;
    return Number(((totalDefectsCount / actualQty) * 100).toFixed(2));
  }, [totalDefectsCount, actualQty]);

  // Hourly Achievement %
  const achievementPercentage = useMemo(() => {
    if (plannedQty <= 0) return 0;
    return Math.round((actualQty / plannedQty) * 100);
  }, [actualQty, plannedQty]);

  // Filter defects by search input
  const filteredDefectTypes = useMemo(() => {
    if (!defectSearch.trim()) return FRESH_DEFECT_TYPES;
    return FRESH_DEFECT_TYPES.filter((d) => d.includes(defectSearch.trim()));
  }, [defectSearch]);

  // Update defect count
  const updateDefectCount = (defectName: string, delta: number) => {
    setDefects((prev) => {
      const current = prev[defectName] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[defectName];
        return copy;
      }
      return { ...prev, [defectName]: next };
    });
  };

  const setDirectDefectCount = (defectName: string, val: number) => {
    const next = Math.max(0, val || 0);
    setDefects((prev) => {
      if (next === 0) {
        const copy = { ...prev };
        delete copy[defectName];
        return copy;
      }
      return { ...prev, [defectName]: next };
    });
  };

  // Load an existing record into the form for editing
  const handleEditRecord = (record: HourlyReportRecord) => {
    setEditingId(record.id);
    setSelectedLineId(record.lineId);
    setDate(record.date);
    setShift(record.shift);
    setTimeSlot(record.timeSlot);
    setModel(record.model);
    setModelCode(record.modelCode);
    setPlannedQty(record.plannedQty);
    setActualQty(record.actualQty);
    setDowntimeMinutes(record.downtimeMinutes);
    setDowntimeReason(record.downtimeReason || '');
    setPlannedWorkers(record.plannedWorkers || 24);
    setActualWorkers(record.actualWorkers || 24);
    setDefects(record.defects || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset Form
  const resetForm = () => {
    setEditingId(null);
    setDowntimeMinutes(0);
    setDowntimeReason('');
    setDefects({});
    // Advance to next time slot
    const currentIndex = STANDARD_HOURLY_SLOTS.findIndex((s) => s.id === timeSlot);
    if (currentIndex !== -1 && currentIndex < STANDARD_HOURLY_SLOTS.length - 1) {
      setTimeSlot(STANDARD_HOURLY_SLOTS[currentIndex + 1].id);
    }
  };

  // Save report to Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLineId) return;

    setIsSaving(true);
    try {
      const operatingTime = Math.max(0, currentSlotMinutes - downtimeMinutes);

      await saveHourlyReport({
        id: editingId || undefined,
        lineId: selectedLineId,
        lineName: currentLine?.name || 'خط الإنتاج',
        date,
        shift,
        timeSlot,
        model,
        modelCode,
        plannedQty,
        actualQty,
        downtimeMinutes,
        downtimeReason,
        plannedWorkers,
        actualWorkers,
        plannedTimeMinutes: currentSlotMinutes,
        operatingTimeMinutes: operatingTime,
        defects,
        totalDefects: totalDefectsCount,
        reworkPercentage,
        supervisorName: currentUser?.displayName || 'مشرف الإنتاج',
        supervisorEmail: currentUser?.email || '',
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      resetForm();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Filter records for today and current line
  const recordsToday = useMemo(() => {
    return hourlyReports.filter(
      (r) => r.lineId === selectedLineId && r.date === date && r.shift === shift
    );
  }, [hourlyReports, selectedLineId, date, shift]);

  // Total shift quantity so far
  const shiftTotals = useMemo(() => {
    const planned = recordsToday.reduce((s, r) => s + (r.plannedQty || 0), 0);
    const actual = recordsToday.reduce((s, r) => s + (r.actualQty || 0), 0);
    const downtime = recordsToday.reduce((s, r) => s + (r.downtimeMinutes || 0), 0);
    const defectsCount = recordsToday.reduce((s, r) => s + (r.totalDefects || 0), 0);
    const reworkRate = actual > 0 ? Number(((defectsCount / actual) * 100).toFixed(2)) : 0;
    return { planned, actual, downtime, defectsCount, reworkRate };
  }, [recordsToday]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Print Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span>تسجيل تقرير ساعة بساعة لخط التجميع (Hourly Assembly Log)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تسجيل إنتاج وتوقفات وعيوب إعادة التشغيل لكل ساعة عمل لحظياً
          </p>
        </div>

        <button
          onClick={onPrintSheet}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
        >
          <Printer className="w-4 h-4 text-cyan-400" />
          <span>معاينة وطباعة التقرير الرسمي</span>
        </button>
      </div>

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Shift & Hour Selection */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-blue-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-mono">
              1
            </span>
            <span>بيانات الخط والوردية وساعة العمل</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Line Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">خط الإنتاج</label>
              <div className="relative">
                <select
                  value={selectedLineId}
                  onChange={(e) => setSelectedLineId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  {lines.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">التاريخ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>

            {/* Shift */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">الوردية</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="الوردية الأولى">الوردية الأولى (8:15 ص - 7:45 م)</option>
                <option value="الوردية الثانية">الوردية الثانية</option>
                <option value="الوردية الثالثة">الوردية الثالثة</option>
              </select>
            </div>

            {/* Time Slot (Hour) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ساعة التقرير (الساعة بساعة)
              </label>
              <div className="relative">
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                  required
                >
                  {STANDARD_HOURLY_SLOTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.minutes} دقيقة)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Production Quantity & Model */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-blue-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-mono">
              2
            </span>
            <span>بيانات الموديل والإنتاج والتوقف خلال هذه الساعة</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Model Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                اسم الموديل
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="مثال: مبرد هواء سمارت 40 لتر"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* Model Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">كود الموديل</label>
              <input
                type="text"
                value={modelCode}
                onChange={(e) => setModelCode(e.target.value)}
                placeholder="FAC-40SMART"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>

            {/* Planned Qty */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                المخطط بالساعة (قطعة)
              </label>
              <input
                type="number"
                min={0}
                value={plannedQty}
                onChange={(e) => setPlannedQty(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>

            {/* Actual Qty */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                المحقق الفعلي بالساعة (قطعة)
              </label>
              <input
                type="number"
                min={0}
                value={actualQty}
                onChange={(e) => setActualQty(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-emerald-400 focus:outline-none focus:border-blue-500 font-mono text-base"
                required
              />
            </div>

            {/* Downtime Minutes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                زمن التوقف (بالدقائق)
              </label>
              <input
                type="number"
                min={0}
                max={currentSlotMinutes}
                value={downtimeMinutes}
                onChange={(e) => setDowntimeMinutes(Number(e.target.value))}
                className={`w-full bg-slate-950 border rounded-xl py-2.5 px-3 text-xs font-bold focus:outline-none font-mono ${
                  downtimeMinutes > 0 ? 'border-rose-500 text-rose-400' : 'border-slate-700 text-white'
                }`}
              />
            </div>

            {/* Downtime Reason */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                أسباب التوقف والملاحظات
              </label>
              <input
                type="text"
                value={downtimeReason}
                onChange={(e) => setDowntimeReason(e.target.value)}
                placeholder="سجل سبب التوقف أو العطل إن وجد (نقص صاج، عطل بناطة، تغيير موديل...)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Workers Count */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                عدد العمال المخطط
              </label>
              <input
                type="number"
                min={1}
                value={plannedWorkers}
                onChange={(e) => setPlannedWorkers(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                عدد العمال المحقق
              </label>
              <input
                type="number"
                min={1}
                value={actualWorkers}
                onChange={(e) => setActualWorkers(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Defect Checklist & Rework Logging (Astemo / Fresh Specific) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-mono">
                3
              </span>
              <div>
                <h3 className="text-sm font-bold text-blue-400">
                  عيوب التجميع وإعادة التشغيل (Defects & Rework Counter)
                </h3>
                <p className="text-[11px] text-slate-400">
                  حدد عدد كل عيب تم رصده خلال هذه الساعة لحساب نسبة إعادة التشغيل بدقة
                </p>
              </div>
            </div>

            {/* Quick search input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث في قائمة العيوب..."
                value={defectSearch}
                onChange={(e) => setDefectSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-1.5 pr-9 pl-3 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Grid of Defects with +/- Quick Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {filteredDefectTypes.map((defectName) => {
              const count = defects[defectName] || 0;
              const hasDefects = count > 0;

              return (
                <div
                  key={defectName}
                  className={`flex items-center justify-between p-2 rounded-xl border transition ${
                    hasDefects
                      ? 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <span className="text-xs font-medium leading-tight truncate flex-1" title={defectName}>
                    {defectName}
                  </span>

                  <div className="flex items-center gap-1 font-mono">
                    <button
                      type="button"
                      onClick={() => updateDefectCount(defectName, -1)}
                      disabled={count <= 0}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-bold text-slate-200 flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={count === 0 ? '' : count}
                      onChange={(e) => setDirectDefectCount(defectName, parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-10 text-center bg-slate-900 border border-slate-700 rounded py-0.5 text-xs font-bold text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateDefectCount(defectName, 1)}
                      className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hourly Stats Live Preview Strip */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <span>
                إجمالي العيوب المسجلة:{' '}
                <strong className="text-rose-400 font-mono text-sm">{totalDefectsCount}</strong> قطعة
              </span>
              <span>
                نسبة إعادة التشغيل (Rework %):{' '}
                <strong
                  className={`font-mono text-sm ${
                    reworkPercentage <= 1.0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {reworkPercentage}%
                </strong>
              </span>
            </div>
            <div>
              نسبة تحقيق الساعة:{' '}
              <strong
                className={`font-mono text-sm ${
                  achievementPercentage >= 100 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {achievementPercentage}%
              </strong>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                إلغاء التعديل
              </button>
            )}
            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم حفظ التقرير وتحديث الداشبورد فورا!</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 text-sm transition"
          >
            <Save className="w-4 h-4" />
            <span>{editingId ? 'تحديث ساعة العمل' : 'حفظ ساعة العمل وتحديث الداشبورد'}</span>
          </button>
        </div>
      </form>

      {/* History Table of Today's Hourly Records */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>سجل ساعات العمل المسجلة اليوم للوردية</span>
          </h3>
          <div className="flex items-center gap-3 text-xs font-mono text-slate-300">
            <span>
              إجمالي المحقق: <strong className="text-emerald-400">{shiftTotals.actual}</strong> /{' '}
              {shiftTotals.planned}
            </span>
            <span>
              توقفات: <strong className="text-rose-400">{shiftTotals.downtime} د</strong>
            </span>
            <span>
              عيوب: <strong className="text-amber-400">{shiftTotals.defectsCount}</strong> (
              {shiftTotals.reworkRate}%)
            </span>
          </div>
        </div>

        {recordsToday.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            لم يتم تسجيل ساعات عمل بعد لهذا الخط اليوم. ابدأ بإدخال الساعة الأولى بالأعلى!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                <tr>
                  <th className="py-3 px-3">الساعة</th>
                  <th className="py-3 px-3">الموديل والكود</th>
                  <th className="py-3 px-3">المخطط</th>
                  <th className="py-3 px-3">المحقق</th>
                  <th className="py-3 px-3">نسبة الإنجاز</th>
                  <th className="py-3 px-3">زمن التوقف</th>
                  <th className="py-3 px-3">العيوب والهالك</th>
                  <th className="py-3 px-3">نسبة إعادة التشغيل</th>
                  <th className="py-3 px-3">المشرف</th>
                  <th className="py-3 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {recordsToday.map((r) => {
                  const achieve =
                    r.plannedQty > 0 ? Math.round((r.actualQty / r.plannedQty) * 100) : 100;
                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-bold text-white">{r.timeSlot}</td>
                      <td className="py-3 px-3 font-sans">
                        <span className="font-bold text-slate-200">{r.model}</span>
                        <span className="block text-[11px] text-slate-500">{r.modelCode}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{r.plannedQty}</td>
                      <td className="py-3 px-3 font-bold text-white">{r.actualQty}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            achieve >= 100
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {achieve}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {r.downtimeMinutes > 0 ? (
                          <span className="text-rose-400 font-bold" title={r.downtimeReason}>
                            {r.downtimeMinutes} د ({r.downtimeReason || 'عطل'})
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300">{r.totalDefects || 0}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold ${
                            r.reworkPercentage <= 1.0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {r.reworkPercentage}%
                        </span>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-400 text-[11px]">
                        {r.supervisorName}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-sans">
                          <button
                            onClick={() => handleEditRecord(r)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
                          >
                            تعديل
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
                                deleteHourlyReport(r.id);
                              }
                            }}
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

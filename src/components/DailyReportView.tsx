import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Save,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  ArrowRightLeft,
  ChevronDown,
} from 'lucide-react';
import {
  ProductionLine,
  DailyReportRecord,
  ProductionItemRow,
  ManpowerDeviationRow,
  StoppageRow,
  CurrentUser,
} from '../types';
import { calculateKPIs, getStatusBadge } from '../utils/kpiCalculator';
import { saveDailyReport } from '../services/dbService';

interface DailyReportViewProps {
  lines: ProductionLine[];
  dailyReports: DailyReportRecord[];
  currentUser: CurrentUser | null;
  onPrintSheet: () => void;
}

export const DailyReportView: React.FC<DailyReportViewProps> = ({
  lines,
  dailyReports,
  currentUser,
  onPrintSheet,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Selected Line and Date
  const [selectedLineId, setSelectedLineId] = useState<string>(lines[0]?.id || '');
  const [date, setDate] = useState<string>(todayStr);
  const [shift, setShift] = useState<string>('الوردية الأولى');

  // Manpower & Hours
  const [plannedWorkers, setPlannedWorkers] = useState<number>(24);
  const [actualWorkers, setActualWorkers] = useState<number>(22);
  const [plannedHours, setPlannedHours] = useState<number>(8);
  const [actualHours, setActualHours] = useState<number>(8);
  const [lineAbsenteeism, setLineAbsenteeism] = useState<number>(2);
  const [outgoingWorkers, setOutgoingWorkers] = useState<number>(1);

  // Production rows
  const [productionRows, setProductionRows] = useState<ProductionItemRow[]>([
    {
      id: '1',
      model: 'مبرد هواء سمارت 40 لتر',
      code: 'FAC-40SMART',
      plannedQty: 480,
      actualQty: 450,
      variance: -30,
    },
  ]);

  // Manpower deviations (دواخل وخوارج)
  const [incomingDeviations, setIncomingDeviations] = useState<ManpowerDeviationRow[]>([
    {
      id: '1',
      type: 'incoming',
      workersCount: 2,
      factoryOrLine: 'مصنع البلاستيك',
      timeFrom: '08:30',
      timeTo: '12:00',
      totalHours: 7,
      notes: 'دعم عمالة لمحطة التجميع النهائي',
    },
  ]);

  const [outgoingDeviations, setOutgoingDeviations] = useState<ManpowerDeviationRow[]>([
    {
      id: '1',
      type: 'outgoing',
      workersCount: 1,
      factoryOrLine: 'مصنع الصاج',
      timeFrom: '13:00',
      timeTo: '16:00',
      totalHours: 3,
      notes: 'إعارة لقسم التشكيل',
    },
  ]);

  // Stoppages (التوقفات)
  const [stoppages, setStoppages] = useState<StoppageRow[]>([
    {
      id: '1',
      reason: 'عطل كهربائي بماكينة ربط المسامير الهوائية',
      timeFrom: '11:15',
      timeTo: '11:45',
      durationMinutes: 30,
      actionTaken: 'تم إصلاح الصمام الهوائي واستئناف الخط',
    },
  ]);

  const [varianceReason, setVarianceReason] = useState<string>(
    'توقف 30 دقيقة لعطل ماكينة المسامير مع نقص 2 عمال في بداية الوردية'
  );
  const [supervisorName, setSupervisorName] = useState<string>(
    currentUser?.displayName || 'المهندس مينا خيرت'
  );
  const [engineerName, setEngineerName] = useState<string>('م. مينا خيرت');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Active line
  const activeLine = useMemo(() => {
    return lines.find((l) => l.id === selectedLineId) || lines[0] || null;
  }, [lines, selectedLineId]);

  // Calculations
  const totalPlannedQty = useMemo(() => {
    return productionRows.reduce((sum, r) => sum + (r.plannedQty || 0), 0);
  }, [productionRows]);

  const totalActualQty = useMemo(() => {
    return productionRows.reduce((sum, r) => sum + (r.actualQty || 0), 0);
  }, [productionRows]);

  const totalDowntimeMinutes = useMemo(() => {
    return stoppages.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  }, [stoppages]);

  // Computed KPIs for this daily sheet
  const computedKPIs = useMemo(() => {
    const plannedTimeMinutes = plannedHours * 60;
    const idealCycleTime = activeLine?.idealCycleTimeSeconds || 50;

    return calculateKPIs({
      plannedTimeMinutes,
      downtimeMinutes: totalDowntimeMinutes,
      totalParts: totalActualQty,
      rejectedParts: Math.round(totalActualQty * 0.015), // estimated 1.5% defect rate
      targetProduction: totalPlannedQty,
      idealCycleTimeSeconds: idealCycleTime,
    });
  }, [plannedHours, totalDowntimeMinutes, totalActualQty, totalPlannedQty, activeLine]);

  // Add production row
  const addProductionRow = () => {
    setProductionRows((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        model: 'موديل جديد',
        code: 'CODE-01',
        plannedQty: 100,
        actualQty: 95,
        variance: -5,
      },
    ]);
  };

  const updateProductionRow = (
    id: string,
    field: keyof ProductionItemRow,
    value: string | number
  ) => {
    setProductionRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r, [field]: value };
          if (field === 'plannedQty' || field === 'actualQty') {
            const p = field === 'plannedQty' ? Number(value) : r.plannedQty;
            const a = field === 'actualQty' ? Number(value) : r.actualQty;
            updated.variance = a - p;
          }
          return updated;
        }
        return r;
      })
    );
  };

  const removeProductionRow = (id: string) => {
    setProductionRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Add stoppage row
  const addStoppage = () => {
    setStoppages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        reason: 'سبب التوقف',
        timeFrom: '12:00',
        timeTo: '12:15',
        durationMinutes: 15,
      },
    ]);
  };

  const updateStoppage = (id: string, field: keyof StoppageRow, value: string | number) => {
    setStoppages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeStoppage = (id: string) => {
    setStoppages((prev) => prev.filter((s) => s.id !== id));
  };

  // Add deviation
  const addDeviation = (type: 'incoming' | 'outgoing') => {
    const newRow: ManpowerDeviationRow = {
      id: String(Date.now()),
      type,
      workersCount: 1,
      factoryOrLine: 'مصنع/قسم',
      timeFrom: '09:00',
      timeTo: '11:00',
      totalHours: 2,
    };
    if (type === 'incoming') {
      setIncomingDeviations((prev) => [...prev, newRow]);
    } else {
      setOutgoingDeviations((prev) => [...prev, newRow]);
    }
  };

  const removeDeviation = (id: string, type: 'incoming' | 'outgoing') => {
    if (type === 'incoming') {
      setIncomingDeviations((prev) => prev.filter((d) => d.id !== id));
    } else {
      setOutgoingDeviations((prev) => prev.filter((d) => d.id !== id));
    }
  };

  // Save Daily Report
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveDailyReport({
        lineId: selectedLineId,
        lineName: activeLine?.name || 'خط الإنتاج',
        date,
        shift,
        plannedWorkers,
        actualWorkers,
        plannedHours,
        actualHours,
        lineAbsenteeism,
        outgoingWorkers,
        productionRows,
        incomingDeviations,
        outgoingDeviations,
        stoppages,
        totalPlannedQty,
        totalActualQty,
        totalDowntimeMinutes,
        varianceReason,
        kpiAvailability: computedKPIs.availability,
        kpiPerformance: computedKPIs.performance,
        kpiQuality: computedKPIs.quality,
        kpiOEE: computedKPIs.oee,
        kpiRejection: computedKPIs.rejection,
        kpiAchievement: computedKPIs.achievement,
        supervisorName,
        supervisorEmail: currentUser?.email || '',
        engineerName,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving daily report:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Print Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">
              متابعة الإنتاجية اليومية (نموذج QF-08.01.03)
            </h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
              Fresh Official Sheet
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            شركة فريش إليكتريك للأجهزة المنزلية - مصنع مبرد الهواء والميكروويف
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onPrintSheet}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>طباعة نموذج QF-08.01.03 الرسمي</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 text-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التقرير اليومي'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>تم حفظ تقرير متابعة الإنتاجية اليومية بنجاح في قاعدة البيانات وتحديث مؤشرات الأداء!</span>
        </div>
      )}

      {/* Sheet Header Information Block */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-blue-400 border-b border-slate-800 pb-2 flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>بيانات الخط والعمالة وساعات العمل</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">الخط الإنتاجي</label>
            <div className="relative">
              <select
                value={selectedLineId}
                onChange={(e) => setSelectedLineId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none focus:border-blue-500"
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

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">التاريخ</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              مخطط عدد العمال
            </label>
            <input
              type="number"
              value={plannedWorkers}
              onChange={(e) => setPlannedWorkers(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              محقق عدد العمال
            </label>
            <input
              type="number"
              value={actualWorkers}
              onChange={(e) => setActualWorkers(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs font-bold text-emerald-400 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              مخطط ساعات العمل
            </label>
            <input
              type="number"
              step="0.5"
              value={plannedHours}
              onChange={(e) => setPlannedHours(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              محقق ساعات العمل
            </label>
            <input
              type="number"
              step="0.5"
              value={actualHours}
              onChange={(e) => setActualHours(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs font-bold text-white focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              غياب خط الإنتاج (عمال)
            </label>
            <input
              type="number"
              value={lineAbsenteeism}
              onChange={(e) => setLineAbsenteeism(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs font-bold text-rose-400 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">الخوارج</label>
            <input
              type="number"
              value={outgoingWorkers}
              onChange={(e) => setOutgoingWorkers(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs font-bold text-amber-400 focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* Production Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">جدول الإنتاج اليومي (الموديلات والكميات)</h3>
          </div>
          <button
            type="button"
            onClick={addProductionRow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة موديل</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
              <tr>
                <th className="py-2.5 px-3">الموديل</th>
                <th className="py-2.5 px-3">الكود</th>
                <th className="py-2.5 px-3">الكمية المخططة</th>
                <th className="py-2.5 px-3">الكمية المحققة</th>
                <th className="py-2.5 px-3">الانحراف (الفرق)</th>
                <th className="py-2.5 px-3">نسبة الإنجاز</th>
                <th className="py-2.5 px-3 text-center">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {productionRows.map((row) => {
                const rowAchieve =
                  row.plannedQty > 0 ? Math.round((row.actualQty / row.plannedQty) * 100) : 100;
                return (
                  <tr key={row.id}>
                    <td className="py-2 px-3 font-sans">
                      <input
                        type="text"
                        value={row.model}
                        onChange={(e) => updateProductionRow(row.id, 'model', e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white w-full"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={row.code}
                        onChange={(e) => updateProductionRow(row.id, 'code', e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white w-28 font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={row.plannedQty}
                        onChange={(e) =>
                          updateProductionRow(row.id, 'plannedQty', Number(e.target.value))
                        }
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white w-24 font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={row.actualQty}
                        onChange={(e) =>
                          updateProductionRow(row.id, 'actualQty', Number(e.target.value))
                        }
                        className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-bold w-24 font-mono"
                      />
                    </td>
                    <td className="py-2 px-3 font-bold">
                      <span className={row.variance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {row.variance > 0 ? `+${row.variance}` : row.variance}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          rowAchieve >= 100
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {rowAchieve}%
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeProductionRow(row.id)}
                        className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-950 font-bold border-t border-slate-800 text-slate-200 font-mono">
              <tr>
                <td colSpan={2} className="py-2.5 px-3 font-sans">
                  الإجمالي الكلي للإنتاج
                </td>
                <td className="py-2.5 px-3 text-slate-400">{totalPlannedQty}</td>
                <td className="py-2.5 px-3 text-emerald-400 text-sm">{totalActualQty}</td>
                <td className="py-2.5 px-3">
                  <span
                    className={
                      totalActualQty - totalPlannedQty >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    {totalActualQty - totalPlannedQty}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-cyan-400">
                  {totalPlannedQty > 0
                    ? `${Math.round((totalActualQty / totalPlannedQty) * 100)}%`
                    : '100%'}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Manpower Deviations: Incoming & Outgoing (انحرافات ساعات العمل) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incoming Workers (دواخل لخط الإنتاج) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4" />
              <span>دواخل لخط الإنتاج (عمالة مستعارة)</span>
            </h4>
            <button
              type="button"
              onClick={() => addDeviation('incoming')}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
            >
              + إضافة داخل
            </button>
          </div>

          <div className="space-y-2">
            {incomingDeviations.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-12 gap-2 p-2 bg-slate-950 rounded-xl text-xs items-center"
              >
                <div className="col-span-3">
                  <span className="text-[10px] text-slate-500 block">عدد العمال</span>
                  <input
                    type="number"
                    value={row.workersCount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setIncomingDeviations((prev) =>
                        prev.map((d) => (d.id === row.id ? { ...d, workersCount: val } : d))
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-white text-xs"
                  />
                </div>
                <div className="col-span-4">
                  <span className="text-[10px] text-slate-500 block">من مصنع</span>
                  <input
                    type="text"
                    value={row.factoryOrLine}
                    onChange={(e) => {
                      const val = e.target.value;
                      setIncomingDeviations((prev) =>
                        prev.map((d) => (d.id === row.id ? { ...d, factoryOrLine: val } : d))
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 block">من</span>
                  <input
                    type="text"
                    value={row.timeFrom}
                    onChange={(e) => {
                      const val = e.target.value;
                      setIncomingDeviations((prev) =>
                        prev.map((d) => (d.id === row.id ? { ...d, timeFrom: val } : d))
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 font-mono text-white text-xs text-center"
                  />
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 block">إلى</span>
                  <input
                    type="text"
                    value={row.timeTo}
                    onChange={(e) => {
                      const val = e.target.value;
                      setIncomingDeviations((prev) =>
                        prev.map((d) => (d.id === row.id ? { ...d, timeTo: val } : d))
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 font-mono text-white text-xs text-center"
                  />
                </div>
                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeDeviation(row.id, 'incoming')}
                    className="text-rose-400 p-1"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outgoing Workers (خوارج من خط الإنتاج) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4" />
              <span>خوارج من خط الإنتاج (عمالة معارة)</span>
            </h4>
            <button
              type="button"
              onClick={() => addDeviation('outgoing')}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
            >
              + إضافة خارج
            </button>
          </div>

          <div className="space-y-2">
            {outgoingDeviations.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-12 gap-2 p-2 bg-slate-950 rounded-xl text-xs items-center"
              >
                <div className="col-span-3">
                  <span className="text-[10px] text-slate-500 block">عدد العمال</span>
                  <input
                    type="number"
                    value={row.workersCount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setOutgoingDeviations((prev) =>
                        prev.map((d) => (d.id === row.id ? { ...d, workersCount: val } : d))
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-white text-xs"
                  />
                </div>
                <div className="col-span-4">
                  <span className="text-[10px] text-slate-500 block">إلى مصنع</span>
                  <input
                    type="text"
                    value={row.factoryOrLine}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOutgoingDeviations((prev) =>
                        prev.map((d) => (d.id === row.id ? { ...d, factoryOrLine: val } : d))
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 block">من</span>
                  <input
                    type="text"
                    value={row.timeFrom}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOutgoingDeviations((prev) =>
                        prev.map((d) => (d.id === row.id ? { ...d, timeFrom: val } : d))
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 font-mono text-white text-xs text-center"
                  />
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 block">إلى</span>
                  <input
                    type="text"
                    value={row.timeTo}
                    onChange={(e) => {
                      const val = e.target.value;
                      setOutgoingDeviations((prev) =>
                        prev.map((d) => (d.id === row.id ? { ...d, timeTo: val } : d))
                      );
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 font-mono text-white text-xs text-center"
                  />
                </div>
                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeDeviation(row.id, 'outgoing')}
                    className="text-rose-400 p-1"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stoppages & Breakdowns (التوقفات) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>جدول التوقفات والأعطال (Stoppages)</span>
          </h4>
          <button
            type="button"
            onClick={addStoppage}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-rose-300 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة توقف</span>
          </button>
        </div>

        <div className="space-y-2">
          {stoppages.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 bg-slate-950 rounded-xl items-center text-xs"
            >
              <div className="sm:col-span-6">
                <span className="text-[10px] text-slate-500 block">سبب التوقف</span>
                <input
                  type="text"
                  value={s.reason}
                  onChange={(e) => updateStoppage(s.id, 'reason', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] text-slate-500 block">الزمن من</span>
                <input
                  type="text"
                  value={s.timeFrom}
                  onChange={(e) => updateStoppage(s.id, 'timeFrom', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-white text-xs text-center"
                />
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] text-slate-500 block">الزمن إلى</span>
                <input
                  type="text"
                  value={s.timeTo}
                  onChange={(e) => updateStoppage(s.id, 'timeTo', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-white text-xs text-center"
                />
              </div>
              <div className="sm:col-span-1">
                <span className="text-[10px] text-slate-500 block">المدة (د)</span>
                <input
                  type="number"
                  value={s.durationMinutes}
                  onChange={(e) =>
                    updateStoppage(s.id, 'durationMinutes', Number(e.target.value))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-rose-400 font-bold text-xs text-center"
                />
              </div>
              <div className="sm:col-span-1 text-center">
                <button
                  type="button"
                  onClick={() => removeStoppage(s.id)}
                  className="p-1 rounded bg-rose-500/10 text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Variance Explanation & Signatures */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            أسباب انحراف الإنتاج عن الخطة والملاحظات العامة
          </label>
          <textarea
            rows={2}
            value={varianceReason}
            onChange={(e) => setVarianceReason(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none"
          ></textarea>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">مشرف الخط</label>
            <input
              type="text"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">مهندس الخط</label>
            <input
              type="text"
              value={engineerName}
              onChange={(e) => setEngineerName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Printer, X } from 'lucide-react';
import { DailyReportRecord, ProductionLine, HourlyReportRecord, ProductionItemRow, StoppageRow } from '../types';

interface PrintableDailySheetProps {
  onClose: () => void;
  report: DailyReportRecord | null;
  hourlyReports?: HourlyReportRecord[];
  line: ProductionLine | null;
  date: string;
}

export const PrintableDailySheet: React.FC<PrintableDailySheetProps> = ({
  onClose,
  report,
  hourlyReports = [],
  line,
  date,
}) => {
  const handlePrint = () => {
    window.print();
  };

  // If report has productionRows, use them; otherwise aggregate from entered hourlyReports
  const productionRows: ProductionItemRow[] = React.useMemo(() => {
    if (report && report.productionRows && report.productionRows.length > 0) {
      return report.productionRows;
    }
    if (hourlyReports.length > 0) {
      const modelsMap: Record<string, { model: string; code: string; plannedQty: number; actualQty: number }> = {};
      hourlyReports.forEach((r) => {
        const key = r.modelCode || r.model || 'DEFAULT';
        if (!modelsMap[key]) {
          modelsMap[key] = {
            model: r.model || line?.name || 'موديل خط الإنتاج',
            code: r.modelCode || line?.code || 'FAC-40',
            plannedQty: 0,
            actualQty: 0,
          };
        }
        modelsMap[key].plannedQty += r.plannedQty || 0;
        modelsMap[key].actualQty += r.actualQty || 0;
      });

      return Object.values(modelsMap).map((m, idx) => ({
        id: String(idx + 1),
        model: m.model,
        code: m.code,
        plannedQty: m.plannedQty,
        actualQty: m.actualQty,
        variance: m.actualQty - m.plannedQty,
      }));
    }
    return [
      {
        id: '1',
        model: line?.name || 'مبرد هواء سمارت 40 لتر',
        code: line?.code || 'FAC-40SMART',
        plannedQty: line?.targetShiftUnits || 480,
        actualQty: 450,
        variance: -30,
      },
    ];
  }, [report, hourlyReports, line]);

  const stoppages: StoppageRow[] = React.useMemo(() => {
    if (report && report.stoppages && report.stoppages.length > 0) {
      return report.stoppages;
    }
    if (hourlyReports.length > 0) {
      return hourlyReports
        .filter((r) => (r.downtimeMinutes || 0) > 0)
        .map((r, idx) => ({
          id: String(idx + 1),
          reason: r.downtimeReason || 'عطل ميكانيكي / توقف مؤقت',
          timeFrom: r.timeSlot.split('--')[0] || '08:00',
          timeTo: r.timeSlot.split('--')[1] || '09:00',
          durationMinutes: r.downtimeMinutes,
        }));
    }
    return [];
  }, [report, hourlyReports]);

  const incomingDevs = report?.incomingDeviations || [];
  const outgoingDevs = report?.outgoingDeviations || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto p-4 flex flex-col items-center">
      {/* Top Action Bar */}
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl p-3 mb-4 flex items-center justify-between text-white print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">معاينة طباعة: استمارة متابعة الإنتاجية اليومية QF-08.01.03</span>
          <span className="text-xs text-slate-400 font-mono">({date})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow transition"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة نموذج QF-08.01.03</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* The Printable Page */}
      <div className="w-full max-w-4xl bg-white text-black p-8 rounded-lg shadow-2xl font-['Cairo',sans-serif] text-[11px] print:p-0 print:m-0 print:shadow-none print:max-w-none">
        {/* Top Header matching QF-08.01.03 */}
        <div className="border-b-2 border-black pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="text-sm font-bold">شركة فريش إليكتريك للأجهزة المنزلية</div>
              <div className="text-xs text-gray-700">مصنع مبرد الهواء والميكروويف</div>
              <div className="text-xs font-mono font-bold text-red-600">QF-08.01.03</div>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-black underline tracking-wide">متابعة الأنتاجية اليومية</h2>
              <div className="text-sm font-bold mt-1">
                الخــــــط رقم ( <span className="font-mono">{line?.code || line?.name || '1'}</span> )
              </div>
            </div>

            <div className="w-28 text-left">
              <div className="px-3 py-1 bg-red-600 text-white font-black text-center text-sm tracking-wider">
                FRESH
              </div>
            </div>
          </div>
        </div>

        {/* Top Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <table className="w-full border-2 border-black border-collapse text-center">
            <tbody>
              <tr className="border-b border-black">
                <td className="p-1.5 bg-gray-100 font-bold w-40 text-right pr-2">التاريخ :</td>
                <td className="p-1.5 font-mono font-bold">{date}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 bg-gray-100 font-bold text-right pr-2">مخطط عدد عمال</td>
                <td className="p-1.5 font-mono">{report?.plannedWorkers || 24}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 bg-gray-100 font-bold text-right pr-2">محقق عدد عمال</td>
                <td className="p-1.5 font-mono">{report?.actualWorkers || 24}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 bg-gray-100 font-bold text-right pr-2">مخطط ساعات العمل</td>
                <td className="p-1.5 font-mono">{report?.plannedHours || 8}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 bg-gray-100 font-bold text-right pr-2">محقق ساعات العمل</td>
                <td className="p-1.5 font-mono">{report?.actualHours || 8}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="p-1.5 bg-gray-100 font-bold text-right pr-2">غياب خط الأنتاج</td>
                <td className="p-1.5 font-mono">{report?.lineAbsenteeism || 0}</td>
              </tr>
              <tr>
                <td className="p-1.5 bg-gray-100 font-bold text-right pr-2">الخوارج</td>
                <td className="p-1.5 font-mono">{report?.outgoingWorkers || 0}</td>
              </tr>
            </tbody>
          </table>

          {/* KPI Summary Block */}
          <div className="border-2 border-black p-3 bg-gray-50 flex flex-col justify-between">
            <div className="text-center font-bold text-xs border-b border-black pb-1 mb-2">
              ملخص مؤشرات الأداء (KPIs Level 2)
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <div className="p-1.5 bg-white border border-gray-300 rounded">
                <span className="block text-[10px] text-gray-600 font-sans">OEE الكفاءة</span>
                <strong className="text-sm">{report?.kpiOEE || 82.5}%</strong>
              </div>
              <div className="p-1.5 bg-white border border-gray-300 rounded">
                <span className="block text-[10px] text-gray-600 font-sans">Availability الإتاحة</span>
                <strong className="text-sm">{report?.kpiAvailability || 93.8}%</strong>
              </div>
              <div className="p-1.5 bg-white border border-gray-300 rounded">
                <span className="block text-[10px] text-gray-600 font-sans">Quality الجودة</span>
                <strong className="text-sm">{report?.kpiQuality || 98.5}%</strong>
              </div>
              <div className="p-1.5 bg-white border border-gray-300 rounded">
                <span className="block text-[10px] text-gray-600 font-sans">الإنجاز الفعلي</span>
                <strong className="text-sm">{report?.kpiAchievement || 93.8}%</strong>
              </div>
            </div>
            <div className="text-[10px] text-center text-gray-600 mt-2">
              مطابق لمعادلات شركة فريش ومعهد استيمو للهندسة الصناعية
            </div>
          </div>
        </div>

        {/* Section: الإنتاج */}
        <div className="mb-4">
          <div className="font-bold text-center text-sm bg-gray-200 border-2 border-black py-1">
            الإنتاج
          </div>
          <table className="w-full border-2 border-t-0 border-black border-collapse text-center">
            <thead>
              <tr className="bg-gray-100 border-b border-black font-bold">
                <th className="border-l border-black p-1.5 text-right pr-3">الموديل</th>
                <th className="border-l border-black p-1.5 w-32">الكود</th>
                <th className="border-l border-black p-1.5 w-32">الكمية المخططة</th>
                <th className="p-1.5 w-32">الكمية المحققة</th>
              </tr>
            </thead>
            <tbody>
              {productionRows.map((row) => (
                <tr key={row.id} className="border-b border-black font-mono">
                  <td className="border-l border-black p-1.5 text-right font-sans pr-3 font-semibold">
                    {row.model}
                  </td>
                  <td className="border-l border-black p-1.5">{row.code}</td>
                  <td className="border-l border-black p-1.5">{row.plannedQty}</td>
                  <td className="p-1.5 font-bold">{row.actualQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section: إنحرافات ساعات العمل */}
        <div className="mb-4">
          <div className="font-bold text-center text-sm bg-gray-200 border-2 border-black py-1">
            إنحرافات ساعات العمل
          </div>
          <div className="grid grid-cols-2 border-2 border-t-0 border-black">
            {/* دواخل */}
            <div className="border-l border-black">
              <div className="bg-gray-100 text-center font-bold p-1 border-b border-black">
                دواخل لخط الإنتاج
              </div>
              <table className="w-full text-center border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-black font-semibold">
                    <th className="border-l border-black p-1">عدد العمال</th>
                    <th className="border-l border-black p-1">من مصنع</th>
                    <th className="p-1">الزمن (من - إلى)</th>
                  </tr>
                </thead>
                <tbody>
                  {incomingDevs.length > 0 ? (
                    incomingDevs.map((d) => (
                      <tr key={d.id} className="border-b border-gray-300 font-mono">
                        <td className="border-l border-black p-1">{d.workersCount}</td>
                        <td className="border-l border-black p-1 font-sans">{d.factoryOrLine}</td>
                        <td className="p-1">{d.timeFrom} - {d.timeTo}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-2 text-gray-500">لا توجد دواخل</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* خوارج */}
            <div>
              <div className="bg-gray-100 text-center font-bold p-1 border-b border-black">
                خوارج من خط الإنتاج
              </div>
              <table className="w-full text-center border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-black font-semibold">
                    <th className="border-l border-black p-1">عدد العمال</th>
                    <th className="border-l border-black p-1">إلى مصنع</th>
                    <th className="p-1">الزمن (من - إلى)</th>
                  </tr>
                </thead>
                <tbody>
                  {outgoingDevs.length > 0 ? (
                    outgoingDevs.map((d) => (
                      <tr key={d.id} className="border-b border-gray-300 font-mono">
                        <td className="border-l border-black p-1">{d.workersCount}</td>
                        <td className="border-l border-black p-1 font-sans">{d.factoryOrLine}</td>
                        <td className="p-1">{d.timeFrom} - {d.timeTo}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-2 text-gray-500">لا توجد خوارج</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section: التوقفات */}
        <div className="mb-4">
          <div className="font-bold text-center text-sm bg-gray-200 border-2 border-black py-1">
            التوقفات
          </div>
          <table className="w-full border-2 border-t-0 border-black border-collapse text-center">
            <thead>
              <tr className="bg-gray-100 border-b border-black font-bold">
                <th className="border-l border-black p-1.5 text-right pr-3">الأسباب</th>
                <th className="p-1.5 w-48">الزمن (من - إلى)</th>
              </tr>
            </thead>
            <tbody>
              {stoppages.length > 0 ? (
                stoppages.map((s) => (
                  <tr key={s.id} className="border-b border-black">
                    <td className="border-l border-black p-1.5 text-right pr-3 font-semibold">
                      {s.reason}
                    </td>
                    <td className="p-1.5 font-mono">
                      {s.timeFrom} إلى {s.timeTo} ({s.durationMinutes} دقيقة)
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-2 text-gray-500">لا توجد توقفات مسجلة</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="border-2 border-black p-3 bg-gray-50 flex justify-between items-center text-xs font-bold">
          <div>
            مشرف الخط : <span className="font-normal underline mr-2">م. مينا خيرت</span>
          </div>
          <div>
            مهندس الخط : <span className="font-normal underline mr-2">المهندس مينا خيرت</span>
          </div>
          <div>
            التوقيع : ...................................
          </div>
        </div>

        {/* Footer info & Mina Khairat credits */}
        <div className="mt-4 pt-2 border-t border-gray-300 flex justify-between text-[9px] text-gray-500">
          <span>نموذج متابعة الإنتاجية اليومية - مصنع مبرد الهواء والميكروويف</span>
          <span>تصميم وتطوير: م/ مينا خيرت - 01200224513</span>
        </div>
      </div>
    </div>
  );
};

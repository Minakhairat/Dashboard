import React from 'react';
import { Printer, X } from 'lucide-react';
import { HourlyReportRecord, ProductionLine, STANDARD_HOURLY_SLOTS, FRESH_DEFECT_TYPES } from '../types';

interface PrintableHourlySheetProps {
  onClose: () => void;
  reports: HourlyReportRecord[];
  line: ProductionLine | null;
  date: string;
  shift: string;
}

export const PrintableHourlySheet: React.FC<PrintableHourlySheetProps> = ({
  onClose,
  reports,
  line,
  date,
  shift,
}) => {
  const handlePrint = () => {
    window.print();
  };

  // Map report by time slot ID
  const reportMap = new Map<string, HourlyReportRecord>();
  reports.forEach((r) => reportMap.set(r.timeSlot, r));

  // Compute totals
  const totalActual = reports.reduce((s, r) => s + (r.actualQty || 0), 0);
  const totalDefects = reports.reduce((s, r) => s + (r.totalDefects || 0), 0);
  const reworkRate = totalActual > 0 ? ((totalDefects / totalActual) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto p-4 flex flex-col items-center">
      {/* Action Bar (hidden on print) */}
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-xl p-3 mb-4 flex items-center justify-between text-white print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">معاينة طباعة: تقرير ساعة بساعة لخط التجميع</span>
          <span className="text-xs text-slate-400 font-mono">({date} - {shift})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow transition"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الورقة الرسمية</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* The Printable Page (White background, crisp borders for physical printer) */}
      <div className="w-full max-w-5xl bg-white text-black p-6 rounded-lg shadow-2xl font-['Cairo',sans-serif] text-[10px] print:p-0 print:m-0 print:shadow-none print:max-w-none">
        {/* Header matching Fresh Sheet */}
        <div className="border-2 border-black mb-2">
          <div className="grid grid-cols-12 divide-x divide-x-reverse divide-black text-center font-bold">
            {/* Logo */}
            <div className="col-span-3 p-2 flex flex-col items-center justify-center bg-red-600 text-white">
              <span className="text-xl font-black tracking-wider">FRESH</span>
              <span className="text-[9px]">شركة فريش للأجهزة المنزلية</span>
            </div>

            {/* Title */}
            <div className="col-span-6 p-2 flex flex-col items-center justify-center">
              <span className="text-base font-black">تقرير ساعة بساعة لخط التجميع</span>
              <span className="text-xs font-semibold">مصنع مبرد الهواء والميكروويف</span>
              <span className="text-[10px] text-gray-700">إدارة العمليات والإنتاج</span>
            </div>

            {/* Meta Info */}
            <div className="col-span-3 p-1.5 text-right space-y-1 font-semibold text-[10px]">
              <div>التاريخ: <span className="font-mono">{date}</span></div>
              <div>الوردية: {shift}</div>
              <div>الخط: {line?.name || 'خط التجميع'}</div>
            </div>
          </div>

          {/* Subheader Data Strip */}
          <div className="grid grid-cols-4 divide-x divide-x-reverse divide-black border-t-2 border-black text-center font-semibold bg-gray-100">
            <div className="p-1">كمية الإنتاج المخططة: <span className="font-mono font-bold">{line?.targetShiftUnits || 480}</span></div>
            <div className="p-1">عدد العمال المخطط: <span className="font-mono font-bold">24</span></div>
            <div className="p-1">عدد العمال المحقق: <span className="font-mono font-bold">24</span></div>
            <div className="p-1">الإنتاج الإجمالي للوردية: <span className="font-mono font-black text-blue-700">{totalActual}</span></div>
          </div>
        </div>

        {/* Master Hour-by-Hour Defect & Output Table */}
        <div className="overflow-x-auto border-2 border-black">
          <table className="w-full text-center border-collapse text-[9px]">
            <thead>
              <tr className="bg-gray-200 border-b-2 border-black font-bold">
                <th className="border-l border-black p-1 text-right w-44">نوع العيب / البيان</th>
                {STANDARD_HOURLY_SLOTS.map((s) => (
                  <th key={s.id} className="border-l border-black p-0.5 font-mono text-[9px] w-12">
                    {s.id}
                  </th>
                ))}
                <th className="p-1 w-14">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {/* Defect Rows */}
              {FRESH_DEFECT_TYPES.slice(0, 20).map((defect) => {
                let rowTotal = 0;
                return (
                  <tr key={defect} className="border-b border-gray-300 hover:bg-gray-50">
                    <td className="border-l border-black p-0.5 text-right font-medium pr-1">{defect}</td>
                    {STANDARD_HOURLY_SLOTS.map((slot) => {
                      const rep = reportMap.get(slot.id);
                      const count = rep?.defects?.[defect] || 0;
                      rowTotal += count;
                      return (
                        <td key={slot.id} className="border-l border-black p-0.5 font-mono">
                          {count > 0 ? count : ''}
                        </td>
                      );
                    })}
                    <td className="p-0.5 font-mono font-bold bg-gray-100">
                      {rowTotal > 0 ? rowTotal : ''}
                    </td>
                  </tr>
                );
              })}

              {/* Bottom Summary Rows */}
              <tr className="border-t-2 border-black font-bold bg-gray-100">
                <td className="border-l border-black p-1 text-right">الموديل</td>
                {STANDARD_HOURLY_SLOTS.map((s) => (
                  <td key={s.id} className="border-l border-black p-0.5 text-[8px] truncate">
                    {reportMap.get(s.id)?.model || ''}
                  </td>
                ))}
                <td className="p-1">-</td>
              </tr>

              <tr className="border-t border-black font-bold bg-blue-50">
                <td className="border-l border-black p-1 text-right">الإنتاج المحقق</td>
                {STANDARD_HOURLY_SLOTS.map((s) => (
                  <td key={s.id} className="border-l border-black p-0.5 font-mono text-sm text-blue-900 font-black">
                    {reportMap.get(s.id)?.actualQty ?? ''}
                  </td>
                ))}
                <td className="p-1 font-mono font-black text-sm bg-blue-100">{totalActual}</td>
              </tr>

              <tr className="border-t border-black font-bold bg-amber-50">
                <td className="border-l border-black p-1 text-right">زمن التوقف (دقيقة)</td>
                {STANDARD_HOURLY_SLOTS.map((s) => (
                  <td key={s.id} className="border-l border-black p-0.5 font-mono text-rose-600">
                    {reportMap.get(s.id)?.downtimeMinutes || ''}
                  </td>
                ))}
                <td className="p-1 font-mono font-bold bg-amber-100">
                  {reports.reduce((s, r) => s + (r.downtimeMinutes || 0), 0)}
                </td>
              </tr>

              <tr className="border-t border-black text-[8px]">
                <td className="border-l border-black p-1 text-right font-bold">أسباب التوقف والملاحظات</td>
                {STANDARD_HOURLY_SLOTS.map((s) => (
                  <td key={s.id} className="border-l border-black p-0.5 text-[8px] truncate" title={reportMap.get(s.id)?.downtimeReason || ''}>
                    {reportMap.get(s.id)?.downtimeReason || ''}
                  </td>
                ))}
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer info matching Fresh PDF */}
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-black border-2 border-t-0 border-black p-2 font-bold text-center bg-gray-50 text-[10px]">
          <div>مشرف الوردية: ..............................</div>
          <div>مهندس الخط: المهندس مينا خيرت</div>
          <div>
            إجمالي نسبة إعادة التشغيل: <span className="font-mono text-rose-700">{reworkRate}%</span>
          </div>
        </div>

        {/* Copyright notice */}
        <div className="mt-3 text-center text-gray-500 text-[9px] flex justify-between">
          <span>تم الاستخراج آلياً من منظومة تقارير الإنتاج الذكية</span>
          <span>تصميم وتطوير: م/ مينا خيرت - 01200224513</span>
        </div>
      </div>
    </div>
  );
};

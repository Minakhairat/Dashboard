import React, { useState } from 'react';
import {
  Users,
  Sliders,
  KeyRound,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  Building2,
  ShieldCheck,
  Sparkles,
  Phone,
  Mail,
  Copy,
  Check,
} from 'lucide-react';
import {
  Supervisor,
  ProductionLine,
  AppSettings,
  CurrentUser,
  STANDARD_HOURLY_SLOTS,
} from '../types';
import {
  saveSupervisor,
  deleteSupervisor,
  saveProductionLine,
  deleteProductionLine,
  updateSettings,
  saveHourlyReport,
} from '../services/dbService';

interface AdminPanelProps {
  supervisors: Supervisor[];
  lines: ProductionLine[];
  appSettings: AppSettings;
  currentUser: CurrentUser | null;
  onRefreshData?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  supervisors,
  lines,
  appSettings,
  currentUser,
}) => {
  // Supervisor Form State
  const [supEmail, setSupEmail] = useState('');
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supRole, setSupRole] = useState<'supervisor' | 'admin'>('supervisor');
  const [supLineId, setSupLineId] = useState('all');
  const [isSavingSup, setIsSavingSup] = useState(false);

  // Line Form State
  const [lineName, setLineName] = useState('');
  const [lineCode, setLineCode] = useState('');
  const [lineCategory, setLineCategory] = useState<'air_cooler' | 'microwave' | 'assembly' | 'other'>('air_cooler');
  const [idealCycleTime, setIdealCycleTime] = useState<number>(50);
  const [targetHourly, setTargetHourly] = useState<number>(60);
  const [targetShift, setTargetShift] = useState<number>(480);
  const [targetOEE, setTargetOEE] = useState<number>(85);
  const [isSavingLine, setIsSavingLine] = useState(false);

  // Dashboard PIN & Factory Settings State
  const [dashboardPin, setDashboardPin] = useState(appSettings.dashboardPin || '1234');
  const [factoryName, setFactoryName] = useState(appSettings.factoryName || 'مصنع مبرد الهواء والميكروويف');
  const [companyName, setCompanyName] = useState(appSettings.companyName || 'شركة فريش إليكتريك للأجهزة المنزلية');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Handle Add Supervisor
  const handleAddSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supEmail.trim()) return;

    setIsSavingSup(true);
    try {
      await saveSupervisor({
        email: supEmail.trim(),
        name: supName.trim() || supEmail.split('@')[0],
        phone: supPhone.trim(),
        role: supRole,
        active: true,
        assignedLines: [supLineId],
      });
      setSupEmail('');
      setSupName('');
      setSupPhone('');
      showStatus('تمت إضافة المشرف بنجاح');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSup(false);
    }
  };

  // Handle Add Line
  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineName.trim() || !lineCode.trim()) return;

    setIsSavingLine(true);
    try {
      await saveProductionLine({
        name: lineName.trim(),
        code: lineCode.trim().toUpperCase(),
        category: lineCategory,
        idealCycleTimeSeconds: idealCycleTime,
        targetHourlyUnits: targetHourly,
        targetShiftUnits: targetShift,
        targetOEE,
        targetAvailability: 95,
        targetPerformance: 95,
        targetQuality: 99,
        active: true,
      });
      setLineName('');
      setLineCode('');
      showStatus('تم إنشاء خط الإنتاج بنجاح');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingLine(false);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await updateSettings({
        dashboardPin: dashboardPin.trim(),
        factoryName: factoryName.trim(),
        companyName: companyName.trim(),
      });
      showStatus('تم تحديث إعدادات النظام وكلمة سر الداشبورد بنجاح');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const copyPinToClipboard = () => {
    navigator.clipboard.writeText(dashboardPin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  // Seed sample realistic hourly reports for demonstration
  const handleSeedSampleShift = async () => {
    if (!lines.length) return;
    const targetLine = lines[0];
    const today = new Date().toISOString().split('T')[0];

    try {
      for (let i = 0; i < 5; i++) {
        const slot = STANDARD_HOURLY_SLOTS[i];
        const actual = Math.floor(targetLine.targetHourlyUnits * (0.85 + Math.random() * 0.25));
        const downtime = i === 2 ? 15 : i === 4 ? 10 : 0;
        const downtimeReason =
          i === 2
            ? 'توقف لإعادة ضبط ميزان شفرات المروحة'
            : i === 4
            ? 'نقص تغذية مسامير التجميع من المخزن'
            : '';

        await saveHourlyReport({
          lineId: targetLine.id,
          lineName: targetLine.name,
          date: today,
          shift: 'الوردية الأولى',
          timeSlot: slot.id,
          model: 'مبرد هواء سمارت 40 لتر',
          modelCode: 'FAC-40SMART',
          plannedQty: targetLine.targetHourlyUnits,
          actualQty: actual,
          downtimeMinutes: downtime,
          downtimeReason,
          plannedWorkers: 24,
          actualWorkers: 24,
          plannedTimeMinutes: slot.minutes,
          operatingTimeMinutes: slot.minutes - downtime,
          defects: {
            'فروق البلاستيك': i === 1 ? 1 : 0,
            'صامولة العوامة مفوتة او غير مربوطة': i === 2 ? 1 : 0,
            'عيب في تركيب طلمبة المياة': i === 3 ? 1 : 0,
          },
          totalDefects: i === 1 || i === 2 || i === 3 ? 1 : 0,
          reworkPercentage: actual > 0 ? Number(((1 / actual) * 100).toFixed(2)) : 0,
          supervisorName: currentUser?.displayName || 'المهندس مينا خيرت',
          supervisorEmail: currentUser?.email || '',
        });
      }
      showStatus('تم توليد بيانات نموذجية واقعية للوردية بنجاح!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">لوحة تحكم مدير النظام (Admin Control)</h2>
            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono font-bold border border-purple-500/30">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            إدارة المشرفين المعتمدين، خطوط الإنتاج ومعاييرها، وتحديد كلمة سر الداشبورد للشاشات
          </p>
        </div>

        <button
          onClick={handleSeedSampleShift}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-lg transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>توليد بيانات تجريبية واقعية للوردية</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Grid: Dashboard PIN & General Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dashboard PIN Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              كلمة سر الداشبورد (لشاشات العرض بدون حساب)
            </h3>
          </div>

          <p className="text-xs text-slate-400">
            هذه الكلمة أو الرمز (PIN) يُعطى لأي شاشة تلفزيون أو مسؤول في المصنع لعرض الداشبورد اللحظي دون
            الحاجة لتسجيل دخول Google.
          </p>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                رمز المرور الحالي (PIN)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={12}
                  value={dashboardPin}
                  onChange={(e) => setDashboardPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-lg font-bold font-mono tracking-wider text-amber-300 focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={copyPinToClipboard}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
                  title="نسخ الرمز"
                >
                  {copiedPin ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المصنع</label>
              <input
                type="text"
                value={factoryName}
                onChange={(e) => setFactoryName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">اسم الشركة</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingSettings}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الرمز والإعدادات</span>
            </button>
          </form>
        </div>

        {/* Supervisors Management */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white">
                المشرفون المصرح لهم بتسجيل التقارير (Supervisors)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
              العدد: {supervisors.length}
            </span>
          </div>

          {/* Add Supervisor Form */}
          <form
            onSubmit={handleAddSupervisor}
            className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-4">
                <label className="block text-[11px] text-slate-400 mb-1">
                  ايميل جوجل للمشرف (Google Email)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="supervisor@gmail.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 pl-8 text-white focus:outline-none font-mono"
                    required
                  />
                  <Mail className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] text-slate-400 mb-1">اسم المشرف</label>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="م. أحمد علي"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-white focus:outline-none"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  placeholder="010..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-white focus:outline-none font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-400 mb-1">الدور والصلاحية</label>
                <select
                  value={supRole}
                  onChange={(e) => setSupRole(e.target.value as 'supervisor' | 'admin')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-white focus:outline-none"
                >
                  <option value="supervisor">مشرف تقارير</option>
                  <option value="admin">مدير نظام (Admin)</option>
                </select>
              </div>

              <div className="sm:col-span-1 flex items-end">
                <button
                  type="submit"
                  disabled={isSavingSup}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg transition flex items-center justify-center"
                  title="إضافة المشرف"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>

          {/* Supervisors Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                <tr>
                  <th className="py-2.5 px-3">الاسم</th>
                  <th className="py-2.5 px-3">ايميل جوجل</th>
                  <th className="py-2.5 px-3">الصلاحية</th>
                  <th className="py-2.5 px-3">الهاتف</th>
                  <th className="py-2.5 px-3 text-center">الحالة</th>
                  <th className="py-2.5 px-3 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {supervisors.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-bold text-white">{s.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{s.email}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {s.role === 'admin' ? 'مدير نظام' : 'مشرف خط'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{s.phone || '-'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.active
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s.active ? 'مفعل' : 'معطل'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف المشرف ${s.name}؟`)) {
                            deleteSupervisor(s.id);
                          }
                        }}
                        className="p-1 text-rose-400 hover:bg-rose-500/20 rounded transition"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Production Lines Configuration */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">
              إدارة خطوط الإنتاج وأعدادها ومعاييرها (Production Lines & Standards)
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
            إجمالي الخطوط: {lines.length}
          </span>
        </div>

        {/* Add Line Form */}
        <form
          onSubmit={handleAddLine}
          className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
            <div className="lg:col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">اسم خط الإنتاج</label>
              <input
                type="text"
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
                placeholder="مثال: خط تجميع مبرد الهواء 3"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-white focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">كود الخط</label>
              <input
                type="text"
                value={lineCode}
                onChange={(e) => setLineCode(e.target.value)}
                placeholder="FAC-L3"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-white font-mono focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">نوع الإنتاج</label>
              <select
                value={lineCategory}
                onChange={(e) =>
                  setLineCategory(
                    e.target.value as 'air_cooler' | 'microwave' | 'assembly' | 'other'
                  )
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-white focus:outline-none"
              >
                <option value="air_cooler">مبرد هواء</option>
                <option value="microwave">ميكروويف</option>
                <option value="assembly">تجميع وصاج</option>
                <option value="other">آخر</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1" title="Ideal Cycle Time">
                زمن الدورة (ث/قطعة)
              </label>
              <input
                type="number"
                min={1}
                value={idealCycleTime}
                onChange={(e) => setIdealCycleTime(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-white font-mono focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">الهدف بالساعة</label>
              <input
                type="number"
                min={1}
                value={targetHourly}
                onChange={(e) => setTargetHourly(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-white font-mono focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">الهدف بالوردية</label>
              <input
                type="number"
                min={1}
                value={targetShift}
                onChange={(e) => setTargetShift(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-white font-mono focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">مستهدف OEE %</label>
              <input
                type="number"
                min={50}
                max={100}
                value={targetOEE}
                onChange={(e) => setTargetOEE(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-white font-mono focus:outline-none"
                required
              />
            </div>

            <div className="lg:col-span-4 flex items-end">
              <button
                type="submit"
                disabled={isSavingLine}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة خط الإنتاج الجديد</span>
              </button>
            </div>
          </div>
        </form>

        {/* Lines List Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {lines.map((l) => (
            <div
              key={l.id}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">{l.name}</h4>
                  <span className="font-mono text-xs text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                    {l.code}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`هل أنت متأكد من حذف الخط ${l.name}؟`)) {
                      deleteProductionLine(l.id);
                    }
                  }}
                  className="p-1 text-slate-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>زمن الدورة المعياري:</span>
                  <strong className="text-cyan-400">{l.idealCycleTimeSeconds} ث/قطعة</strong>
                </div>
                <div className="flex justify-between">
                  <span>مستهدف الساعة:</span>
                  <strong className="text-emerald-400">{l.targetHourlyUnits} قطعة</strong>
                </div>
                <div className="flex justify-between">
                  <span>مستهدف الوردية:</span>
                  <strong className="text-white">{l.targetShiftUnits} قطعة</strong>
                </div>
                <div className="flex justify-between">
                  <span>مستهدف OEE:</span>
                  <strong className="text-purple-400">≥ {l.targetOEE || 85}%</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

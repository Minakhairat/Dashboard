import React, { useState } from 'react';
import { Lock, KeyRound, ShieldCheck, X } from 'lucide-react';

interface PinLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  correctPin: string;
  onSuccess: () => void;
}

export const PinLoginModal: React.FC<PinLoginModalProps> = ({
  isOpen,
  onClose,
  correctPin,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === correctPin.trim()) {
      setError(false);
      onSuccess();
      setPin('');
    } else {
      setError(true);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 8) {
      setPin((prev) => prev + num);
      setError(false);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">دخول شاشة العرض (داشبورد فقط)</h2>
          <p className="text-xs text-slate-400 mt-1">
            أدخل كلمة السر / الـ PIN المحددة من مسؤول النظام لعرض الداشبورد المباشر بدون تسجيل دخول
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div className="relative">
              <input
                type="password"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                placeholder="أدخل كلمة السر..."
                className={`w-full text-center text-2xl tracking-widest font-mono py-3 px-4 rounded-xl bg-slate-950 border ${
                  error ? 'border-rose-500 text-rose-300' : 'border-slate-700 text-white'
                } focus:outline-none focus:border-blue-500`}
                autoFocus
              />
              <KeyRound className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
            {error && (
              <p className="text-xs text-rose-400 text-center mt-2 font-medium">
                كلمة السر غير صحيحة، يرجى مراجعة مدير النظام
              </p>
            )}
          </div>

          {/* Quick On-Screen Keypad for TV Screens / Touch Screens */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="py-3 bg-slate-800/80 hover:bg-slate-700 active:bg-blue-600 text-lg font-bold rounded-xl border border-slate-700/50 transition text-slate-200"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="py-3 bg-slate-800/50 hover:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-700/40 text-slate-400"
            >
              مسح
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="py-3 bg-slate-800/80 hover:bg-slate-700 active:bg-blue-600 text-lg font-bold rounded-xl border border-slate-700/50 transition text-slate-200"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-3 bg-slate-800/50 hover:bg-slate-800 text-xs font-semibold rounded-xl border border-slate-700/40 text-slate-400"
            >
              ⌫ حذف
            </button>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition"
          >
            <ShieldCheck className="w-5 h-5" />
            فتح الداشبورد المباشر
          </button>
        </form>
      </div>
    </div>
  );
};

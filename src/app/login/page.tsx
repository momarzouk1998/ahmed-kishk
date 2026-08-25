'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'حدث خطأ في تسجيل الدخول');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('تعذر الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 px-4">
        {/* Logo and Brand Title */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl border-2 border-brand-gold mb-3 sm:mb-4 text-primary transition-transform hover:scale-105 duration-300">
            <Logo size="xl" />
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-white tracking-tight flex items-center gap-2">
            أحمد كشك
            <span className="w-2.5 h-2.5 rounded-full bg-brand-gold inline-block animate-pulse"></span>
          </h1>
          <p className="text-brand-gold font-medium text-xs sm:text-sm mt-1.5 text-center">نظام إدارة الأقمشة والستائر الفاخرة — القاهرة</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 text-center">
            <h2 className="font-display font-bold text-xl text-white">تسجيل الدخول للنظام</h2>
            <p className="text-slate-400 text-xs mt-1">أدخل رقم هاتفك وكلمة السر للوصول إلى حسابك</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 px-4 py-3 rounded-2xl text-xs flex items-center gap-2.5 animate-shake">
                <span className="material-symbols-outlined text-[20px] shrink-0 text-rose-400">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Phone input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">رقم الهاتف</label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01558282760"
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl py-3 px-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all font-mono"
                  dir="ltr"
                />
                <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-[18px]">
                  smartphone
                </span>
              </div>
            </div>

            {/* Password input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-300">كلمة السر</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl py-3 px-4 pl-12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 transition-all"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-3 w-full bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-3.5 rounded-2xl font-display font-bold text-sm transition-all shadow-gold disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <span>دخول النظام</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-500 font-mono">
              المستخدم الافتراضي: 01558282760 / 123456
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

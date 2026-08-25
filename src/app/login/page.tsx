'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-primary text-on-primary rounded-2xl flex items-center justify-center font-display font-bold text-3xl shadow-lg mb-4">
            AK
          </div>
          <h1 className="font-display font-bold text-2xl text-primary">أحمد كشك</h1>
          <p className="text-on-surface-variant text-sm mt-1">للأقمشة والستائر — بنها</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container-highest p-8">
          <h2 className="font-display font-bold text-xl text-primary mb-1 text-center">تسجيل الدخول</h2>
          <p className="text-on-surface-variant text-sm text-center mb-6">أدخل رقم هاتفك وكلمة السر</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-on-surface-variant">رقم الهاتف</label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-on-surface-variant">
                  phone_iphone
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                  className="w-full border border-outline-variant rounded-lg py-3 pr-10 pl-4 text-sm focus:outline-none focus:border-primary transition-colors bg-surface-container-low text-primary placeholder:text-on-surface-variant"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-on-surface-variant">كلمة السر</label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-on-surface-variant">
                  lock
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="أدخل كلمة السر"
                  className="w-full border border-outline-variant rounded-lg py-3 pr-10 pl-10 text-sm focus:outline-none focus:border-primary transition-colors bg-surface-container-low text-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-on-surface-variant hover:text-primary transition-colors"
                >
                  {showPassword ? 'visibility_off' : 'visibility'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-error-container text-on-error-container text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold text-sm hover:bg-inverse-surface transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  دخول
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-6">
          نظام أحمد كشك — Powered by OpenAppo
        </p>
      </div>
    </div>
  );
}

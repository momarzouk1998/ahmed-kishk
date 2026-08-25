'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState<'info' | 'password'>('info');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Load current user from cookie-based session (via header or API)
    fetch('/api/auth/profile').then(r => r.json()).then(d => {
      if (d.user) {
        setName(d.user.name || '');
        setPhone(d.user.phone || '');
      }
    }).catch(() => {});
  }, []);

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) showMsg(data.error || 'حدث خطأ', true);
      else { showMsg('تم تحديث البيانات بنجاح ✅'); router.refresh(); }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showMsg('كلمة السر الجديدة وتأكيدها غير متطابقتان', true);
      return;
    }
    if (newPassword.length < 6) {
      showMsg('كلمة السر يجب أن تكون 6 أحرف على الأقل', true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) showMsg(data.error || 'حدث خطأ', true);
      else {
        showMsg('تم تغيير كلمة السر بنجاح ✅');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <PageShell title="الملف الشخصي">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-primary">الملف الشخصي</h1>
            <p className="text-on-surface-variant text-xs sm:text-sm mt-1">إدارة بياناتك الشخصية وكلمة السر.</p>
          </div>

          {/* Avatar Card */}
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest p-6 flex items-center gap-5">
            <div className="w-16 h-16 bg-primary text-on-primary rounded-2xl flex items-center justify-center font-display font-bold text-2xl">
              {name.charAt(0) || 'م'}
            </div>
            <div>
              <div className="font-display font-bold text-xl text-primary">{name || 'المستخدم'}</div>
              <div className="text-sm text-on-surface-variant font-mono mt-0.5">{phone}</div>
              <div className="text-xs text-secondary mt-1">مدير النظام</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-surface-container-high">
            {[
              { id: 'info', label: 'البيانات الشخصية', icon: 'person' },
              { id: 'password', label: 'تغيير كلمة السر', icon: 'lock' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Feedback */}
          {(success || error) && (
            <div className={`rounded-xl px-5 py-3 text-sm flex items-center gap-2 ${error ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
              <span className="material-symbols-outlined text-[18px]">{error ? 'error' : 'check_circle'}</span>
              {error || success}
            </div>
          )}

          {/* Info Form */}
          {tab === 'info' && (
            <form onSubmit={handleUpdateInfo} className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-on-surface-variant">الاسم الكامل</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="border border-outline-variant rounded-lg p-3 text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="اسمك الكامل"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-on-surface-variant">رقم الهاتف (يُستخدم لتسجيل الدخول)</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  dir="ltr"
                  className="border border-outline-variant rounded-lg p-3 text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="01xxxxxxxxx"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-on-primary py-3 rounded-lg font-bold text-sm hover:bg-inverse-surface transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                حفظ التغييرات
              </button>
            </form>
          )}

          {/* Password Form */}
          {tab === 'password' && (
            <form onSubmit={handleChangePassword} className="bg-surface-container-lowest rounded-2xl border border-surface-container-highest p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-on-surface-variant">كلمة السر الحالية</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="border border-outline-variant rounded-lg p-3 text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="أدخل كلمة السر الحالية"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-on-surface-variant">كلمة السر الجديدة</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="border border-outline-variant rounded-lg p-3 text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="6 أحرف على الأقل"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-mono text-on-surface-variant">تأكيد كلمة السر الجديدة</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="border border-outline-variant rounded-lg p-3 text-sm focus:outline-none focus:border-primary transition-colors"
                  placeholder="أعد كتابة كلمة السر الجديدة"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-on-primary py-3 rounded-lg font-bold text-sm hover:bg-inverse-surface transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                تغيير كلمة السر
              </button>
            </form>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full border-2 border-error text-error py-3 rounded-xl font-bold text-sm hover:bg-error hover:text-on-error transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            تسجيل الخروج
          </button>
      </div>
    </PageShell>
  );
}

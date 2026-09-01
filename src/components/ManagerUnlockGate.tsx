'use client';

import React, { useCallback, useState } from 'react';

const UNLOCK_KEY = 'mgr_price_unlock_v1';

export function isManagerUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearManagerUnlock() {
  try { sessionStorage.removeItem(UNLOCK_KEY); } catch {}
}

export async function verifyManagerPassword(password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/manager-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.ok;
  } catch { return false; }
}

/**
 * Hook: يعطى دالة `requestUnlock()` لطلب باسورد المدير + JSX للمودال.
 * الاستعمال:
 *   const { requestUnlock, Modal } = useManagerGate();
 *   ...
 *   <button onClick={async () => { if (await requestUnlock()) doPriceChange(); }}>غير السعر</button>
 *   {Modal}
 */
export function useManagerGate() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const requestUnlock = useCallback((): Promise<boolean> => {
    if (isManagerUnlocked()) return Promise.resolve(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
      setPassword('');
      setError(null);
      setOpen(true);
    });
  }, []);

  const close = (result: boolean) => {
    setOpen(false);
    if (resolver) resolver(result);
    setResolver(null);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password.trim()) { setError('أدخل كلمة سر المدير'); return; }
    setLoading(true); setError(null);
    const ok = await verifyManagerPassword(password);
    setLoading(false);
    if (ok) {
      try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch {}
      close(true);
    } else {
      setError('كلمة سر المدير غير صحيحة');
    }
  };

  const Modal = open ? (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-11 h-11 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-800">lock</span>
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base">طلب صلاحية المدير</h3>
            <p className="text-xs text-slate-500 mt-0.5">أنت غير مسرح بتعديل الأسعار أو الخصومات — أدخل باسورد المدير للمتابعة</p>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5">كلمة سر المدير:</label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
            placeholder="••••••"
          />
          {error && (
            <p className="text-xs font-bold text-red-600 mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">error</span>{error}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 py-2.5 rounded-xl font-bold text-sm shadow"
          >
            {loading ? 'جارٍ التحقق...' : 'فتح الصلاحية'}
          </button>
          <button
            type="button"
            onClick={() => close(false)}
            className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-bold"
          >
            إلغاء
          </button>
        </div>
        <p className="text-[11px] text-slate-400 text-center">الفتح صالح لهذه الجلسة فقط. الافتراضى: 1234</p>
      </form>
    </div>
  ) : null;

  return { requestUnlock, Modal };
}

'use client';

/**
 * سعر افتراضي لكل نوع شريط (٣ فتلة، إيكيا، ويفي، جراب، حلقات ديكور) — مصدر واحد للحقيقة.
 * تُقرأ من localStorage (مع القيم المدمجة كـ fallback) وتُحفظ فى SystemStore.
 * أى موظف يعدّل سعر شريط فى أى أوردر يتحدّث السعر الافتراضى لكل الأوردرات الجديدة تلقائياً،
 * مع إمكانية تعديله يدوياً لأى أوردر بعينه دون التأثير على الافتراضى إلا عند الحفظ.
 */

const STORAGE_KEY = 'ahmed_kishk_tape_type_prices_v1';

export const BUILT_IN_TAPE_PRICES: Record<string, number> = {
  '٣ فتلة': 50,
  'إيكيا': 50,
  'ويفي': 140,
  'جراب': 50,
  'حلقات ديكور': 50,
};

export function getTapeTypePrices(): Record<string, number> {
  if (typeof window === 'undefined') return BUILT_IN_TAPE_PRICES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // triggerServerFetch — تحديث فى الخلفية للتزامن بين الأجهزة (يظهر أثره فى التحميل التالى)
    fetchTapeTypePricesFromServer().catch(() => {});
    if (!raw) return BUILT_IN_TAPE_PRICES;
    return { ...BUILT_IN_TAPE_PRICES, ...JSON.parse(raw) };
  } catch {
    return BUILT_IN_TAPE_PRICES;
  }
}

async function fetchTapeTypePricesFromServer(): Promise<void> {
  try {
    const res = await fetch(`/api/system-data?key=${encodeURIComponent(STORAGE_KEY)}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const arr = Array.isArray(data?.data) ? data.data : [];
    if (arr.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr[0]));
    }
  } catch {}
}

export async function saveTapeTypePrices(next: Record<string, number>): Promise<void> {
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }
  try {
    await fetch('/api/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: STORAGE_KEY, data: [next] }),
    });
  } catch (err) {
    console.error('failed to sync tape type prices', err);
  }
}

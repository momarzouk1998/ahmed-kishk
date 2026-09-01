'use client';

/**
 * إعدادات هوية المؤسسة (اسم المتجر، هاتف، عنوان، تذييل الفاتورة).
 * مصدر واحد للحقيقة، تُحفظ فى localStorage + SystemStore.
 * تستخدمها كل مودالز الطباعة والفواتير.
 */

const STORAGE_KEY = 'ahmed_kishk_brand_settings_v1';

export interface BrandSettings {
  storeName: string;
  subTitle: string;
  phone: string;
  whatsapp: string;
  address: string;
  footerNote: string;
}

export const BUILT_IN_BRAND: BrandSettings = {
  storeName: 'أحمد كشك للأقمشة والستائر',
  subTitle: 'الفرع الرئيسي: 73 شارع سعد زغلول والجامع العباسي',
  phone: '01063821000',
  whatsapp: '201063821000',
  address: '73 شارع سعد زغلول والجامع العباسي (فروعنا: عرابي • عمر أفندي • الثلاثيني)',
  footerNote: 'شكراً لتعاملكم مع محلات أحمد كشك. البضاعة المباعة لا ترد ولا تستبدل بعد القص. جميع الحقوق محفوظة.',
};

export function getBrandSettings(): BrandSettings {
  if (typeof window === 'undefined') return BUILT_IN_BRAND;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // triggering server refresh فى الخلفية لتزامن الأجهزة
    fetchBrandFromServer().catch(() => {});
    if (!raw) return BUILT_IN_BRAND;
    const parsed = JSON.parse(raw);
    return { ...BUILT_IN_BRAND, ...(parsed || {}) };
  } catch { return BUILT_IN_BRAND; }
}

async function fetchBrandFromServer(): Promise<void> {
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

export async function loadBrandSettingsAsync(): Promise<BrandSettings> {
  if (typeof window === 'undefined') return BUILT_IN_BRAND;
  try {
    const res = await fetch(`/api/system-data?key=${encodeURIComponent(STORAGE_KEY)}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const arr = Array.isArray(data?.data) ? data.data : [];
      if (arr.length > 0) {
        const merged = { ...BUILT_IN_BRAND, ...(arr[0] || {}) };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
        return merged;
      }
    }
  } catch {}
  return getBrandSettings();
}

export async function saveBrandSettings(next: BrandSettings): Promise<void> {
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }
  const res = await fetch('/api/system-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: STORAGE_KEY, data: [next] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'فشل حفظ إعدادات الهوية على السيرفر');
  }
}

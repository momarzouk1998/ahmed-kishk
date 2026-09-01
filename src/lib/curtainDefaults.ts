'use client';

/**
 * افتراضيات تسعير الستائر — مصدر واحد للحقيقة.
 * تُقرأ من localStorage (مع القيم المدمجة كـ fallback) وتُحفظ فى SystemStore.
 * أى مدير يستطيع تعديلها من صفحة /settings/curtain-defaults.
 */

const STORAGE_KEY = 'ahmed_kishk_curtain_defaults_v1';

export interface CurtainDefaults {
  sheerLiningPricePerMeter: number;
  installFee: number;
  transportFee: number;
  trackPricePerMeter: number;
  pipePricePerMeter: number;
  tapePrices: {
    heavy: number;
    sheer: number;
    blackout: number;
  };
  accessoryPrices: {
    doubleBracket: number;
    singleBracket: number;
    sideCap: number;
    doubleRing: number;
    decorHanger: number;
  };
}

export const BUILT_IN_DEFAULTS: CurtainDefaults = {
  sheerLiningPricePerMeter: 100,
  installFee: 125,
  transportFee: 0,
  trackPricePerMeter: 100,
  pipePricePerMeter: 65,
  tapePrices: { heavy: 50, sheer: 140, blackout: 50 },
  accessoryPrices: {
    doubleBracket: 55,
    singleBracket: 45,
    sideCap: 50,
    doubleRing: 5,
    decorHanger: 100,
  },
};

function deepMerge<T>(base: T, override: any): T {
  if (!override || typeof override !== 'object') return base;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const k of Object.keys(override)) {
    const b = (base as any)?.[k];
    const o = override[k];
    if (b && typeof b === 'object' && !Array.isArray(b) && o && typeof o === 'object') {
      out[k] = deepMerge(b, o);
    } else if (o !== undefined && o !== null) {
      out[k] = o;
    }
  }
  return out;
}

export function getCurtainDefaults(): CurtainDefaults {
  if (typeof window === 'undefined') return BUILT_IN_DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // triggerServerFetch — refresh فى الخلفية للتزامن بين الأجهزة
    fetchCurtainDefaultsFromServer().catch(() => {});
    if (!raw) return BUILT_IN_DEFAULTS;
    return deepMerge(BUILT_IN_DEFAULTS, JSON.parse(raw));
  } catch {
    return BUILT_IN_DEFAULTS;
  }
}

async function fetchCurtainDefaultsFromServer(): Promise<void> {
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

export async function saveCurtainDefaults(next: CurtainDefaults): Promise<void> {
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
    console.error('failed to sync curtain defaults', err);
  }
}

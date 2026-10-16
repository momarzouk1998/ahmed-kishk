'use client';

// #PERF: بيانات المستخدم الحالى (/api/auth/profile) بتتجاب مرة واحدة وتتشارك بين
// السايد منيو وكل الصفحات. قبل كده كل صفحة كانت بتطلبها من أول وجديد مع كل تنقل،
// فكان أي ضغطة فى المنيو تستنى طلب زيادة قبل ما الصفحة تبدأ تحمّل بياناتها.

export interface ProfileResponse {
  user?: { id?: string; name: string; phone: string; role: string; branch: string } | null;
  buildId?: string | null;
  status?: number;
}

let cached: ProfileResponse | null = null;
let cachedAt = 0;
let inFlight: Promise<ProfileResponse> | null = null;

export function peekProfile(): ProfileResponse | null {
  return cached;
}

/** maxAgeMs: لو النسخة المحفوظة أحدث من كده بترجع فورًا من غير طلب. */
export function getProfile(maxAgeMs = 60_000): Promise<ProfileResponse> {
  if (cached && Date.now() - cachedAt < maxAgeMs) return Promise.resolve(cached);
  if (inFlight) return inFlight;
  inFlight = fetch('/api/auth/profile', { cache: 'no-store' })
    .then(async (r) => {
      if (!r.ok) return { status: r.status } as ProfileResponse;
      const d = await r.json();
      const res: ProfileResponse = { user: d?.user || null, buildId: d?.buildId ?? null, status: r.status };
      cached = res;
      cachedAt = Date.now();
      return res;
    })
    .catch(() => ({ status: 0 } as ProfileResponse))
    .finally(() => { inFlight = null; });
  return inFlight;
}

export function clearProfileCache() {
  cached = null;
  cachedAt = 0;
}

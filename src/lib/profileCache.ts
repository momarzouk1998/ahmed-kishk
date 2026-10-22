'use client';

// #PERF: بيانات المستخدم الحالى (/api/auth/profile) والصلاحيات (/api/user-permissions)
// بتتجاب مرة واحدة وتتشارك بين السايد منيو وكل الصفحات.

export interface ProfileResponse {
  user?: { id?: string; name: string; phone: string; role: string; branch: string } | null;
  buildId?: string | null;
  status?: number;
}

export interface UserPermissions {
  allowedPageIds: string[];
  restrictToBranch: boolean;
  branch: string;
}

let cached: ProfileResponse | null = null;
let cachedAt = 0;
let inFlight: Promise<ProfileResponse> | null = null;

const permsCache = new Map<string, { data: UserPermissions; cachedAt: number }>();
const permsInFlight = new Map<string, Promise<UserPermissions | null>>();

export function peekProfile(): ProfileResponse | null {
  if (cached) return cached;
  if (typeof window !== 'undefined') {
    try {
      const name = localStorage.getItem('userName');
      const phone = localStorage.getItem('userPhone');
      const role = localStorage.getItem('userRole');
      const branch = localStorage.getItem('userBranch');
      if (phone && name) {
        return {
          user: {
            name,
            phone,
            role: role === 'admin' ? 'ADMIN' : (role || 'BRANCH_STAFF'),
            branch: branch || 'الفرع الرئيسي',
          },
          buildId: process.env.APP_BUILD_ID || null,
          status: 200,
        };
      }
    } catch {}
  }
  return null;
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

export function peekPermissions(phone: string): UserPermissions | null {
  const norm = (phone || '').trim().replace(/\s/g, '');
  if (!norm) return null;
  const entry = permsCache.get(norm);
  if (entry) return entry.data;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`user_perms_${norm}`);
      if (stored) {
        const ids = JSON.parse(stored);
        if (Array.isArray(ids)) {
          return { allowedPageIds: ids, restrictToBranch: true, branch: '' };
        }
      }
    } catch {}
  }
  return null;
}

export async function getPermissions(phone: string, maxAgeMs = 60_000): Promise<UserPermissions | null> {
  const norm = (phone || '').trim().replace(/\s/g, '');
  if (!norm) return null;
  const now = Date.now();
  const entry = permsCache.get(norm);
  if (entry && now - entry.cachedAt < maxAgeMs) {
    return entry.data;
  }
  if (permsInFlight.has(norm)) {
    return permsInFlight.get(norm)!;
  }
  const promise = fetch(`/api/user-permissions?phone=${encodeURIComponent(norm)}`, { cache: 'no-store' })
    .then(async (r) => {
      if (!r.ok) return null;
      const data = await r.json();
      if (data && Array.isArray(data.allowedPageIds)) {
        permsCache.set(norm, { data, cachedAt: Date.now() });
        try { localStorage.setItem(`user_perms_${norm}`, JSON.stringify(data.allowedPageIds)); } catch {}
        return data as UserPermissions;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      permsInFlight.delete(norm);
    });

  permsInFlight.set(norm, promise);
  return promise;
}

export function clearProfileCache() {
  cached = null;
  cachedAt = 0;
  permsCache.clear();
}

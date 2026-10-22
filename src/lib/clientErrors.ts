'use client';

// تسجيل أخطاء المتصفح وإرسالها للسيرفر لتظهر في لوج الكونتينر ([client-error])
const sent = new Set<string>();

export function isChunkError(err: unknown): boolean {
  const msg = String((err as Error)?.message || err || '');
  const name = String((err as Error)?.name || '');
  return name === 'ChunkLoadError' || /Loading chunk [\w-]+ failed|Loading CSS chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg);
}

export function reportClientError(err: unknown, where: string, extra?: Record<string, unknown>) {
  try {
    const e = err as Error & { digest?: string };
    const message = String(e?.message || err || 'unknown').slice(0, 500);
    const key = `${where}|${message}`;
    if (sent.has(key) || sent.size > 20) return;
    sent.add(key);

    const body = JSON.stringify({
      where,
      message,
      stack: String(e?.stack || '').slice(0, 2000),
      digest: e?.digest || null,
      url: typeof location !== 'undefined' ? location.pathname + location.search : '',
      build: process.env.APP_BUILD_ID || null,
      ua: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
      ...extra,
    });

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      if (navigator.sendBeacon('/api/client-error', new Blob([body], { type: 'application/json' }))) {
        return;
      }
    }

    fetch('/api/client-error', {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* التبليغ نفسه لا يسقط أي عملية */
  }
}

/** إعادة تحميل الصفحة مرة واحدة فقط في حالة طلب ملفات حزمة قديمة بعد رفع كود جديد */
export function reloadOnceForChunkError(): boolean {
  try {
    const k = 'ahmed-kishk-chunk-reload-at';
    const last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(k, String(Date.now()));
  } catch {
    /* ignore */
  }
  window.location.reload();
  return true;
}

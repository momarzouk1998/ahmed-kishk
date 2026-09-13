// Cache version — bump this string on every deploy to force full cache refresh
const CACHE_VERSION = 'v11';
const CACHE_NAME = `ahmed-kishk-pwa-${CACHE_VERSION}`;

// Only truly static, infrequently-changing assets belong here
const STATIC_ASSETS = [
  '/manifest.json',
  '/logo.png',
  '/logo-192.png',
  '/logo-512.png',
  '/apple-touch-icon.png',
  '/icon-maskable.png',
];

// امتدادات ملفات ثابتة بحتة (صور/أيقونات) يُسمح بالتخزين المؤقت ليها فقط.
// أي حاجة تانية (صفحات HTML، JS، API...) لازم تعدّي على الشبكة دايمًا، عشان
// صفحة جديدة زي /employees متتخبيش فى كاش قديم لمجرد إننا نسيّنا نضيفها لقائمة
// استثناءات — القائمة دي كانت بالظبط سبب مشكلة ضياع حضور الفروع فى 2026-09-13.
const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|svg|ico|webp|gif|woff2?|ttf)$/i;

// ─── Install: pre-cache only static assets ─────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

// ─── Activate: delete ALL old caches so stale JS/CSS never survives ─────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())  // take control of open tabs
  );
});

// ─── Fetch: Network-first for everything except a fixed allowlist of pure
// static asset files. Every page/HTML/JS/API request always hits the
// network — no per-page allowlist to forget to update. ────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-http(s) requests completely
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Only cache same-origin requests for genuinely static files by extension,
  // or files explicitly listed in STATIC_ASSETS. Everything else — every
  // page navigation, every /_next chunk, every API call — always goes to
  // the network, so a new deploy takes effect immediately everywhere.
  const isStatic = url.origin === self.location.origin &&
    (STATIC_ASSETS.includes(url.pathname) || STATIC_EXTENSIONS.test(url.pathname));

  if (!isStatic) return; // let browser handle it normally (network)

  // ── Static assets only: stale-while-revalidate ───────────────────────────
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      }).catch(() => cached); // offline fallback

      return cached || networkFetch;
    })
  );
});

// Cache version — bump this string on every deploy to force full cache refresh
const CACHE_VERSION = 'v10';
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

// ─── Fetch: Network-first for everything; cache-fallback only for pure static ─
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and non-http(s) requests completely
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // ── NEVER cache these — always hit the network ──────────────────────────
  const bypassPatterns = [
    url.pathname.startsWith('/api/'),          // API routes
    url.pathname.startsWith('/_next/'),         // Next.js JS/CSS chunks (can change on every build)
    url.pathname === '/',                       // Home/dashboard (live data)
    url.pathname.startsWith('/pipeline/'),      // Pipeline pages (live data)
    url.pathname.startsWith('/customers'),
    url.pathname.startsWith('/orders'),
    url.pathname.startsWith('/inventory'),
    url.pathname.startsWith('/reports'),
    url.pathname.startsWith('/purchases'),
    url.pathname.startsWith('/suppliers'),
    url.pathname.startsWith('/fabric-sales'),
    url.pathname.startsWith('/settings'),
    url.pathname.startsWith('/branches'),
    url.pathname.startsWith('/workshop'),
    url.pathname.startsWith('/login'),
    url.pathname.startsWith('/profile'),
  ];

  if (bypassPatterns.some(Boolean)) return; // let browser handle it normally

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

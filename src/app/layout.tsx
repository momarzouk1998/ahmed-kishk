import type { Metadata, Viewport } from 'next';
import './globals.css';

async function checkSubscription(): Promise<{ active: boolean; status?: string; message?: string }> {
  try {
    const res = await fetch(
      'https://admin.openappo.com/api/subscription/verify?system=' + encodeURIComponent('Ahmed Kishk'),
      { cache: 'no-store' }
    );
    if (!res.ok) return { active: true };
    return await res.json();
  } catch {
    return { active: true };
  }
}

export const metadata: Metadata = {
  title: 'أحمد كشك — للأقمشة والستائر الفاخرة',
  description: 'نظام إداري متكامل لإدارة مقاسات الستائر، المعاينات الميدانية، والمبيعات لمؤسسة أحمد كشك',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'أحمد كشك',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/logo-192.png',
    shortcut: '/logo-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const subStatus = await checkSubscription();

  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Google Fonts: Cairo (Arabic Primary) + JetBrains Mono */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="أحمد كشك" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-background font-body text-on-surface antialiased min-h-screen selection:bg-brand-gold selection:text-brand-dark">
        {subStatus.status === 'expiring_soon' && (
          <div className="no-print print:hidden bg-yellow-500 text-black px-4 py-2 text-center text-sm font-bold w-full shadow-sm">
            {subStatus.message}
          </div>
        )}
        {subStatus.status === 'grace_period' && (
          <div className="no-print print:hidden bg-red-500 text-white px-4 py-2 text-center text-sm font-bold w-full shadow-sm">
            {subStatus.message}
          </div>
        )}
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) { console.log('PWA ServiceWorker registered with scope:', reg.scope); },
                    function(err) { console.warn('PWA ServiceWorker registration failed:', err); }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}


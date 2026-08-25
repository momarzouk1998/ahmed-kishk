import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'أحمد كشك — للأقمشة والستائر الفاخرة',
  description: 'نظام إداري متكامل لإدارة مقاسات الستائر، المعاينات الميدانية، والمبيعات لمؤسسة أحمد كشك',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      </head>
      <body className="bg-background font-body text-on-surface antialiased min-h-screen selection:bg-brand-gold selection:text-brand-dark">
        {children}
      </body>
    </html>
  );
}

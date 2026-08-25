import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'أحمد كشك — نظام المعاينات والستاير والأقمشة',
  description: 'نظام إداري متكامل لإدارة مقاسات الستاير، المعاينات الميدانية، والمبيعات لمؤسسة أحمد كشك',
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
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700&family=JetBrains+Mono:wght@500&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background font-body text-on-surface antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}

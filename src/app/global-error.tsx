'use client';

import { useEffect } from 'react';
import { isChunkError, reloadOnceForChunkError, reportClientError } from '@/lib/clientErrors';

/**
 * خط الدفاع الأخير لتفادي الشاشة البيضاء في حال حدوث خطأ في جذر التطبيق
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkError(error)) {
      reportClientError(error, 'chunk');
      reloadOnceForChunkError();
      return;
    }
    reportClientError(error, 'global-boundary');
  }, [error]);

  return (
    <html lang="ar" dir="rtl" translate="no">
      <head>
        <meta name="google" content="notranslate" />
        <title>أحمد كشك — تنبيه مؤقت</title>
      </head>
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: 36, maxWidth: 420, width: '100%', textAlign: 'center', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
          <img src="/logo.png" alt="أحمد كشك" style={{ width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px', objectFit: 'contain' }} />
          <h2 style={{ color: '#0f172a', fontSize: 20, margin: '0 0 10px', fontWeight: 900 }}>حصلت مشكلة مؤقتة</h2>
          <p style={{ color: '#64748b', lineHeight: 1.8, fontSize: 13, margin: '0 0 24px' }}>
            بياناتك محفوظة بأمان تام في قاعدة البيانات. اضغط زر إعادة المحاولة للمتابعة.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => reset()}
              style={{ background: '#f59e0b', color: '#0f172a', border: 0, borderRadius: 12, padding: '10px 20px', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}
            >
              إعادة المحاولة
            </button>
            <button
              onClick={() => (window.location.href = '/')}
              style={{ background: '#f1f5f9', color: '#334155', border: 0, borderRadius: 12, padding: '10px 20px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
            >
              الرئيسية
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

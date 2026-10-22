'use client';

import { useEffect } from 'react';
import { reportClientError, reloadOnceForChunkError, isChunkError } from '@/lib/clientErrors';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PageError]', error);
    if (isChunkError(error)) {
      reloadOnceForChunkError();
    } else {
      reportClientError(error, 'error.tsx', { digest: error?.digest });
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-6 border border-slate-200 text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <h1 className="text-xl font-black text-slate-900 mb-2">حدث خطأ في هذه الصفحة</h1>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
          {error?.message || 'حدث خطأ غير متوقع أثناء معالجة الصفحة.'}
        </p>
        {error?.digest && (
          <p className="text-[11px] text-slate-400 font-mono mb-4">كود الخطأ: {error.digest}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => reset()}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-4 rounded-xl transition cursor-pointer text-sm shadow-sm"
          >
            إعادة المحاولة
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 text-sm transition cursor-pointer"
          >
            تحديث
          </button>
        </div>
      </div>
    </div>
  );
}

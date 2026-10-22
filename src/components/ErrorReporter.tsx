'use client';

import { useEffect } from 'react';
import { isChunkError, reloadOnceForChunkError, reportClientError } from '@/lib/clientErrors';

/**
 * التقاط أي خطأ غير متوقع في المتصفح أو وعد مرفوض وإرساله فوراً للسيرفر
 */
export default function ErrorReporter() {
  useEffect(() => {
    const onError = (ev: ErrorEvent) => {
      if (isChunkError(ev.error || ev.message)) {
        reportClientError(ev.error || ev.message, 'chunk');
        reloadOnceForChunkError();
        return;
      }
      reportClientError(ev.error || ev.message, 'window.onerror');
    };

    const onRejection = (ev: PromiseRejectionEvent) => {
      if (isChunkError(ev.reason)) {
        reportClientError(ev.reason, 'chunk');
        reloadOnceForChunkError();
        return;
      }
      reportClientError(ev.reason, 'unhandledrejection');
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}

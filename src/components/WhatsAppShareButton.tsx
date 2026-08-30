'use client';

import React, { useState } from 'react';

interface WhatsAppShareButtonProps {
  title: string;
  customerName?: string;
  phone?: string;
  detailsText: string;
  className?: string;
}

export default function WhatsAppShareButton({
  title,
  customerName,
  phone,
  detailsText,
  className = '',
}: WhatsAppShareButtonProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    try {
      setSharing(true);
      const name = customerName || 'العميل المحترم';
      const shareText = `مرحباً أستاذ/ة ${name}،\nمرفق ${title} الخاص بكم من أقمشة أحمد كشك:\n\n${detailsText}\n\nشكراً لتعاملكم معنا.`;

      // 1. Try Native Web Share API if supported on mobile/tablet/browser
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: `${title} - أقمشة أحمد كشك`,
            text: shareText,
          });
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return;
        }
      }

      // 2. Fallback: Open WhatsApp app/web via api.whatsapp.com WITHOUT phone link in URL
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
      window.open(waUrl, '_blank');
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ أثناء إرسال البيانات عبر واتساب');
    } finally {
      setSharing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={sharing}
      className={`bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${className}`}
      title="مشاركة المستند على الواتساب"
    >
      <span>📲</span>
      <span>{sharing ? 'جاري التجهيز...' : 'مشاركة واتساب'}</span>
    </button>
  );
}

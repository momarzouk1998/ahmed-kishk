'use client';

import React, { useState } from 'react';
import { captureElementToCanvas } from '@/lib/html2canvas-safe';

interface WhatsAppShareButtonProps {
  title: string;
  customerName?: string;
  phone?: string;
  detailsText: string;
  targetElementId?: string;
  className?: string;
}

export default function WhatsAppShareButton({
  title,
  customerName,
  phone,
  detailsText,
  targetElementId,
  className = '',
}: WhatsAppShareButtonProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    try {
      setSharing(true);
      const name = customerName || 'العميل المحترم';
      const shareText = `مرحباً أستاذ/ة ${name}،\nمرفق ${title} الخاص بكم من أقمشة أحمد كشك:\n\n${detailsText}\n\nشكراً لتعاملكم معنا.`;

      let imageFile: File | null = null;

      // Capture target element as high-res PNG image if element ID is provided
      if (targetElementId) {
        const targetEl = document.getElementById(targetElementId);
        if (targetEl) {
          try {
            const canvas = await captureElementToCanvas(targetEl, {
              scale: 2.2,
              backgroundColor: '#ffffff',
              renderWidth: 800,
            });

            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, 'image/png')
            );

            if (blob) {
              const fileName = `${title.replace(/\s+/g, '_')}_${name.replace(/\s+/g, '_')}.png`;
              imageFile = new File([blob], fileName, { type: 'image/png' });
            }
          } catch (captureErr) {
            console.warn('Canvas capture fallback:', captureErr);
          }
        }
      }

      // 1. Mobile / Tablet Native Web Share API with image file support
      if (
        imageFile &&
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [imageFile] })
      ) {
        try {
          await navigator.share({
            title: `${title} - أقمشة أحمد كشك`,
            text: shareText,
            files: [imageFile],
          });
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return;
        }
      }

      // 2. Fallback text-only Web Share API if image capture wasn't possible or file share unsupported
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && !imageFile) {
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

      // 3. Desktop / Browser Fallback: Download Image + Open WhatsApp Web
      if (imageFile) {
        const url = URL.createObjectURL(imageFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = imageFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }

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
      title="مشاركة المستند كصورة على الواتساب"
    >
      <span>📲</span>
      <span>{sharing ? 'جاري تجهيز الصورة...' : 'مشاركة واتساب'}</span>
    </button>
  );
}

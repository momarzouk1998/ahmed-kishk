'use client';

import React from 'react';

interface IosInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IosInstallModal({ isOpen, onClose }: IosInstallModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          aria-label="إغلاق"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-brand-gold text-2xl">install_mobile</span>
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white">تثبيت التطبيق على آيفون (iOS)</h3>
            <p className="text-xs text-slate-400">تابع الخطوات البسيطة لإضافة التطبيق لشاشتك الرئيسية</p>
          </div>
        </div>

        {/* Steps list */}
        <div className="space-y-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-gold text-slate-950 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div className="text-xs leading-relaxed text-slate-200">
              اضغط على زر المشاركة{' '}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-brand-gold font-bold border border-slate-700">
                <span className="material-symbols-outlined text-[15px]">ios_share</span> المشاركة
              </span>{' '}
              في شريط الأدوات السفلي لمتصفح Safari.
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-gold text-slate-950 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div className="text-xs leading-relaxed text-slate-200">
              مرر لأسفل واختر{' '}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-bold border border-slate-700">
                <span className="material-symbols-outlined text-[15px]">add_box</span> إضافة إلى الشاشة الرئيسية
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-gold text-slate-950 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <div className="text-xs leading-relaxed text-slate-200">
              اضغط على كلمة{' '}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold border border-slate-700">
                إضافة (Add)
              </span>{' '}
              في أعلى اليمين لإتمام التثبيت.
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-brand-gold text-slate-950 font-black text-sm hover:bg-amber-400 transition-colors shadow-gold flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          فهمت ذلك
        </button>
      </div>
    </div>
  );
}

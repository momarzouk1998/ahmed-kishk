'use client';

import React from 'react';

interface Props {
  /** CSS selector of the element to print (default: `#print-area`). */
  targetSelector?: string;
  /** Button label. */
  label?: string;
  /** Optional title used for the browser's print dialog + PDF file name. */
  documentTitle?: string;
  /** Extra classes. */
  className?: string;
  /** Optional paper size, default A4. Use 'thermal80' for 80mm cashier printer. */
  paperSize?: 'A4' | 'thermal80';
}

/**
 * زر "طباعة / حفظ PDF" — يعتمد على window.print() مع stylesheet مؤقتة
 * تخفى كل شئ عدا العنصر ذى المُعرِّف المُحدَّد. المستخدم يختار "حفظ كـ PDF"
 * من dialog الطباعة فى المتصفح.
 */
export default function PdfPrintButton({
  targetSelector = '#print-area',
  label = 'طباعة / حفظ PDF',
  documentTitle,
  className = '',
  paperSize = 'A4',
}: Props) {
  const handlePrint = () => {
    const originalTitle = document.title;
    if (documentTitle) document.title = documentTitle;

    // ينبنى على data-attribute حتى يعرف الـ CSS ماذا يظهر
    document.documentElement.setAttribute('data-print-target', targetSelector);
    document.documentElement.setAttribute('data-print-paper', paperSize);

    // أضف tag <style> مؤقت (لن تتعارض مع أى stylesheet آخر)
    const style = document.createElement('style');
    style.id = '__pdf_print_style__';
    const pageRule = paperSize === 'thermal80'
      ? '@page { size: 80mm auto; margin: 3mm; }'
      : '@page { size: A4; margin: 12mm; }';
    style.innerHTML = `
      ${pageRule}
      @media print {
        html, body { background: #fff !important; }
        body * { visibility: hidden !important; }
        ${targetSelector}, ${targetSelector} * { visibility: visible !important; }
        ${targetSelector} {
          position: absolute !important;
          top: 0 !important; left: 0 !important; right: 0 !important;
          width: 100% !important; margin: 0 !important; padding: 0 !important;
          box-shadow: none !important; border: 0 !important;
          background: #fff !important;
        }
        .no-print, .no-print * { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    // ابدأ الطباعة
    setTimeout(() => {
      window.print();
      // نظّف بعد إتمام الـ dialog
      setTimeout(() => {
        style.remove();
        document.documentElement.removeAttribute('data-print-target');
        document.documentElement.removeAttribute('data-print-paper');
        document.title = originalTitle;
      }, 200);
    }, 50);
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={`no-print inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm ${className}`}
      title="سيفتح مربع حوار الطباعة — اختر Save as PDF"
    >
      <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
      {label}
    </button>
  );
}

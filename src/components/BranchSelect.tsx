'use client';

import React from 'react';

/**
 * قائمة اختيار الفرع الموحّدة. للأدمن: select تفاعلى عادى. لغير الأدمن: قيمة
 * ثابتة معروضة فقط (مفيش أى تحكم) — موظف الفرع لا يقدر يغيّر فرعه إطلاقاً،
 * لا فى نماذج الإنشاء ولا فى فلاتر القوائم.
 */
export default function BranchSelect({
  value,
  onChange,
  isAdmin,
  allValue,
  allLabel = '🌐 جميع الفروع',
  displayValue,
  className = '',
  lockedClassName = '',
}: {
  value: string;
  onChange: (v: string) => void;
  isAdmin: boolean;
  /** لو مُمرَّرة، يضاف خيار "كل الفروع" بهذه القيمة كسنتينل (يُستخدم فى فلاتر القوائم فقط). */
  allValue?: string;
  allLabel?: string;
  /** نص بديل يُعرض فى وضع القفل (مثلاً لو value = 'الفرع الرئيسي' والتسمية المعروضة أطول) */
  displayValue?: string;
  className?: string;
  lockedClassName?: string;
}) {
  if (!isAdmin) {
    return (
      <div className={`flex items-center gap-1.5 bg-slate-100 text-slate-700 ${lockedClassName || className}`}>
        <span className="material-symbols-outlined text-[14px] text-slate-400">lock</span>
        <span>{displayValue || value}</span>
      </div>
    );
  }

  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={className}>
      {allValue !== undefined && <option value={allValue}>{allLabel}</option>}
      <option value="الفرع الرئيسي">الفرع الرئيسي (سعد زغلول)</option>
      <option value="فرع عرابي">فرع عرابي</option>
      <option value="فرع عمر أفندي">فرع عمر أفندي</option>
      <option value="فرع الثلاثيني">فرع الثلاثيني</option>
    </select>
  );
}

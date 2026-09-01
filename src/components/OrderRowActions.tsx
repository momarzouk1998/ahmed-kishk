'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { canUserEditRecords, canUserDeleteRecords } from '@/lib/permissions';
import { deleteQuotationOrder } from '@/lib/inspectionsStore';

interface Props {
  pageId: string;                  // p_inspections, p_pricing, p_cutting, ...
  orderId: string;                 // معرّف الأوردر (quotation/pipeline id)
  customerName?: string;
  editHref?: string;               // رابط التعديل — لو موجود، الزر يفتحه؛ لو لا، يستدعى onEdit
  onEdit?: () => void;
  onDeleted?: () => void;          // callback بعد نجاح الحذف (تحديث الـ UI)
  compact?: boolean;               // نسخة مصغرة للجداول الضيقة
}

export default function OrderRowActions({
  pageId, orderId, customerName, editHref, onEdit, onDeleted, compact,
}: Props) {
  const router = useRouter();
  const canEdit = canUserEditRecords(pageId);
  const canDelete = canUserDeleteRecords(pageId);
  const [busy, setBusy] = useState(false);

  const handleEdit = () => {
    if (!canEdit) return;
    if (onEdit) return onEdit();
    if (editHref) router.push(editHref);
    else router.push(`/orders/${encodeURIComponent(orderId)}`);
  };

  const handleDelete = async () => {
    if (!canDelete || busy) return;
    const label = customerName ? `طلب "${customerName}"` : `الأوردر ${orderId}`;
    if (!confirm(`هل أنت متأكد من حذف ${label} نهائياً من كل المراحل؟\nلا يمكن التراجع.`)) return;
    setBusy(true);
    try {
      await deleteQuotationOrder(orderId);
      if (onDeleted) onDeleted();
    } catch (e: any) {
      alert('فشل الحذف: ' + (e?.message || 'خطأ غير معروف'));
    } finally {
      setBusy(false);
    }
  };

  if (!canEdit && !canDelete) return null;

  return (
    <div className={`flex items-center gap-1.5 ${compact ? '' : ''}`} onClick={e => e.stopPropagation()}>
      {canEdit && (
        <button
          type="button"
          onClick={handleEdit}
          className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs"
          title="تعديل الأوردر"
        >
          <span className="material-symbols-outlined text-[14px]">edit</span>
          {!compact && <span>تعديل</span>}
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs"
          title="حذف نهائى"
        >
          <span className="material-symbols-outlined text-[14px]">delete</span>
          {!compact && <span>{busy ? '...' : 'حذف'}</span>}
        </button>
      )}
    </div>
  );
}

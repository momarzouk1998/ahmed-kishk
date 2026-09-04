'use client';

import { saveAllQuotations, fetchQuotations } from '@/lib/inspectionsStore';

// Master Pipeline Stage Enum/Union
export type GlobalMasterStage =
  | 'المعاينات'
  | 'انتظار تسعير'
  | 'في المقص'
  | 'في الورشة'
  | 'تجهيز الاكسسوارات'
  | 'جاهز للاستلام'
  | 'جاهز للتركيب'
  | 'مكتمل';

export type LocalTailoringStatus = 'جاري الخياطة' | 'جاري الكي' | 'تمت الخياطة';

// Shared Master Order Interface
export interface PipelineMasterOrder {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  branch: string;
  deliveryDate?: string;
  cutterName?: string;
  tailorName?: string;
  technicianName?: string;
  status: GlobalMasterStage | string;
  localStatus?: LocalTailoringStatus | 'اليوم' | 'مجدول' | string;
  createdAt: string;
  remainingAmount?: number;
  totalAmount?: number;
  depositPaid?: number;
  rooms: any[];
}

const STORAGE_KEY = 'ahmed_kishk_pipeline_orders_v5';

// #1: تم إلغاء القائمة السوداء تماماً — العملاء المحذوفون تُدار حذفهم فى قاعدة البيانات فقط.
export const DEFAULT_PIPELINE_ORDERS: PipelineMasterOrder[] = [];

export function isTodayOrOverdue(dateStr?: string): boolean {
  if (!dateStr || dateStr.trim() === '') return true;
  const today = new Date().toISOString().split('T')[0];
  const target = dateStr.split(' ')[0].split('T')[0];
  return target <= today;
}

export function getDeletedOrderIds(): string[] {
  return [];
}

export function registerDeletedOrderId(id: string) {
  // DB is now the source of truth للحذف — لا يوجد أى تخزين محلى.
}

/**
 * Normalizes any status to official Global Master Stage
 */
export function normalizeMasterStage(statusStr: string): GlobalMasterStage {
  if (!statusStr) return 'المعاينات';
  const s = statusStr.trim();
  if (s === 'مكتمل' || s.includes('مكتمل') || s.includes('مغلق')) return 'مكتمل';
  if (s === 'جاهز للتركيب' || s.includes('تركيب') || s === 'في التركيبات') return 'جاهز للتركيب';
  if (s === 'جاهز للاستلام' || s.includes('تسليم') || s === 'في التسليمات') return 'جاهز للاستلام';
  if (s === 'تجهيز الاكسسوارات' || s.includes('اكسسوار')) return 'تجهيز الاكسسوارات';
  if (s === 'في الورشة' || s.includes('خياطة') || s.includes('كي') || s.includes('ورشة') || s === 'تم القص وجاهز للخياطة') return 'في الورشة';
  if (s === 'في المقص' || s.includes('قص') || s === 'بانتظار القص' || s === 'قص القماش') return 'في المقص';
  if (s === 'انتظار تسعير' || s.includes('تسعير') || s === 'بانتظار التسعير' || s === 'تم إرسال المقايسة') return 'انتظار تسعير';
  if (s === 'المعاينات' || s.includes('معاينة') || s === 'مُجدول' || s === 'تم رفع المقاسات' || s === 'قيد الانتظار') return 'المعاينات';
  return 'المعاينات';
}

// #FIX: كان بيخزّن نسخة فى localStorage (على قرص الجهاز) وبيرجعها لو فشل الطلب من
// السيرفر — ده اللي بيسبب ظهور بيانات قديمة/غلط لما السيرفر يبقى فاضى أو مؤقتًا مش
// متاح (مثلاً وقت إعادة نشر). دلوقتى فيه ذاكرة مؤقتة فى المتصفح نفسه بس (تتصفّر لو
// عملت Refresh)، بتتملى فقط من نتيجة طلب حقيقى ناجح للسيرفر — مفيش أى تخزين على القرص.
let pipelineOrdersMemoryCache: PipelineMasterOrder[] = [];

export async function fetchPipelineOrders(): Promise<PipelineMasterOrder[]> {
  try {
    const res = await fetch('/api/pipeline-orders', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.orders)) {
        pipelineOrdersMemoryCache = json.orders;
        return json.orders;
      }
    }
  } catch (err) {
    console.error('Error fetching pipeline orders from server:', err);
  }
  return [];
}

/** بترجع آخر نسخة اتجابت فعليًا من السيرفر فى نفس جلسة المتصفح دي بس (مفيش تخزين على القرص). */
export function getStoredPipelineOrders(): PipelineMasterOrder[] {
  return pipelineOrdersMemoryCache;
}

export async function saveStoredPipelineOrders(orders: PipelineMasterOrder[]) {
  pipelineOrdersMemoryCache = orders;
  try {
    await fetch('/api/pipeline-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    });
  } catch (err) {
    console.error('Error saving pipeline orders to database:', err);
  }

  try {
    await fetch('/api/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: STORAGE_KEY, data: orders }),
    });
  } catch (err) {
    console.error('Error saving pipeline orders to system-data:', err);
  }
}

export async function updatePipelineOrderStatus(
  id: string,
  newStatus: GlobalMasterStage | string,
  localStatus?: string
) {
  const current = await fetchPipelineOrders();
  const normalized = normalizeMasterStage(newStatus);
  const cleanId = (id || '').trim();
  const rawId = cleanId.replace(/^ORD-/, '');

  let found = false;
  const updated = current.map(o => {
    // #19: مطابقة بالمعرّفات فقط — لا نستخدم customerName كخيار احتياطى
    // (كان يخلط بين عملاء بنفس الاسم).
    const isMatch =
      o.id === cleanId ||
      o.orderId === cleanId ||
      o.orderId === rawId ||
      o.id === `ORD-${rawId}` ||
      o.id.replace(/^ORD-/, '') === rawId;

    if (isMatch) {
      found = true;
      return {
        ...o,
        status: normalized,
        localStatus: localStatus || o.localStatus || newStatus,
      };
    }
    return o;
  });

  if (!found && cleanId) {
    let quotMatch: any = null;
    try {
      const qs = await fetchQuotations();
      quotMatch = qs.find(q =>
        q.id === rawId ||
        q.id === cleanId ||
        cleanId === `ORD-${q.id}`
      );
    } catch {}

    const newEntry: PipelineMasterOrder = {
      id: cleanId.startsWith('ORD-') ? cleanId : `ORD-${cleanId}`,
      orderId: rawId,
      customerName: quotMatch?.customerName || (cleanId.startsWith('ORD-') ? 'عميل' : cleanId),
      phone: quotMatch?.phone || '',
      address: quotMatch?.address || '',
      branch: quotMatch?.branch || 'الفرع الرئيسي',
      deliveryDate: quotMatch?.deliveryDate || '',
      status: normalized,
      localStatus: localStatus || newStatus,
      createdAt: quotMatch?.date || new Date().toISOString().split('T')[0],
      totalAmount: quotMatch?.totalAmount || 0,
      depositPaid: quotMatch?.depositPaid || 0,
      remainingAmount: quotMatch?.remainingAmount || 0,
      rooms: quotMatch?.rooms || [],
    };
    updated.unshift(newEntry);
  }

  await saveStoredPipelineOrders(updated);

  // Sync quotation status as well
  try {
    const quotations = await fetchQuotations();
    const qIdx = quotations.findIndex(q =>
      q.id === rawId || q.id === cleanId
    );
    if (qIdx >= 0) {
      quotations[qIdx].status = normalized as any;
      await saveAllQuotations(quotations);
    }
  } catch {}
}

export function addPipelineOrder(order: Partial<PipelineMasterOrder>): PipelineMasterOrder {
  const current = getStoredPipelineOrders();
  const newOrder: PipelineMasterOrder = {
    id: order.id || `ORD-${Date.now()}`,
    orderId: order.orderId || `ORD-00${current.length + 1}`,
    customerName: order.customerName || 'عميل جديد',
    phone: order.phone || '',
    address: order.address || 'غير مسجل',
    branch: order.branch || 'الفرع الرئيسي',
    deliveryDate: order.deliveryDate || new Date().toISOString().split('T')[0],
    status: normalizeMasterStage(order.status || 'المعاينات'),
    localStatus: order.localStatus || 'جاري المتابعة',
    createdAt: new Date().toISOString().split('T')[0],
    remainingAmount: order.remainingAmount || 0,
    totalAmount: order.totalAmount || 0,
    depositPaid: order.depositPaid || 0,
    rooms: order.rooms || [],
  };

  saveStoredPipelineOrders([newOrder, ...current]);
  return newOrder;
}

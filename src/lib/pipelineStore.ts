'use client';

import { saveServerData } from '@/lib/syncService';

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
const DELETED_IDS_KEY = 'ahmed_kishk_deleted_order_ids_v1';

export const PERMANENT_BLACKLIST_NAMES = [
  'محمود عبد الرحمن',
  'سارة أحمد',
  'شركة المعمار للمقاولات',
];

export const DEFAULT_PIPELINE_ORDERS: PipelineMasterOrder[] = [];

export function isTodayOrOverdue(dateStr?: string): boolean {
  if (!dateStr || dateStr.trim() === '') return true;
  const today = new Date().toISOString().split('T')[0];
  const target = dateStr.split(' ')[0].split('T')[0];
  return target <= today;
}

export function getDeletedOrderIds(): string[] {
  if (typeof window === 'undefined') return [...PERMANENT_BLACKLIST_NAMES];
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return Array.from(new Set([...list, ...PERMANENT_BLACKLIST_NAMES]));
  } catch {
    return [...PERMANENT_BLACKLIST_NAMES];
  }
}

export function registerDeletedOrderId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const deleted = getDeletedOrderIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(deleted));
    }
  } catch (err) {
    console.error('Error saving deleted order id:', err);
  }
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

export async function fetchPipelineOrders(): Promise<PipelineMasterOrder[]> {
  try {
    const res = await fetch('/api/pipeline-orders', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.orders)) {
        const deleted = getDeletedOrderIds();
        const serverFiltered: PipelineMasterOrder[] = json.orders.filter((o: any) => {
          const isIdDel = deleted.includes(o.id) || deleted.includes(o.orderId);
          const isNameDel = PERMANENT_BLACKLIST_NAMES.some(bn => o.customerName?.includes(bn));
          return !isIdDel && !isNameDel;
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverFiltered));
        }
        return serverFiltered;
      }
    }
  } catch (err) {
    console.error('Error fetching pipeline orders from server:', err);
  }
  return getStoredPipelineOrders();
}

export function getStoredPipelineOrders(): PipelineMasterOrder[] {
  if (typeof window === 'undefined') return DEFAULT_PIPELINE_ORDERS;
  try {
    const deleted = getDeletedOrderIds();
    const raw = localStorage.getItem(STORAGE_KEY);
    let list: PipelineMasterOrder[] = [];
    if (!raw) {
      fetchPipelineOrders().catch(() => {});
      return DEFAULT_PIPELINE_ORDERS;
    } else {
      list = JSON.parse(raw);
    }
    const filtered = list.filter(o => {
      const isIdDel = deleted.includes(o.id) || deleted.includes(o.orderId);
      const isNameDel = PERMANENT_BLACKLIST_NAMES.some(bn => o.customerName.includes(bn));
      return !isIdDel && !isNameDel;
    });
    return filtered;
  } catch (err) {
    console.error('Error reading pipeline orders:', err);
    return DEFAULT_PIPELINE_ORDERS;
  }
}

export async function saveStoredPipelineOrders(orders: PipelineMasterOrder[]) {
  const deleted = getDeletedOrderIds();
  const filtered = orders.filter(o => {
    const isIdDel = deleted.includes(o.id) || deleted.includes(o.orderId);
    const isNameDel = PERMANENT_BLACKLIST_NAMES.some(bn => o.customerName.includes(bn));
    return !isIdDel && !isNameDel;
  });

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch {}
  }

  try {
    await fetch('/api/pipeline-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders: filtered }),
    });
  } catch (err) {
    console.error('Error saving pipeline orders to database:', err);
  }

  try {
    await fetch('/api/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: STORAGE_KEY, data: filtered }),
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
  const current = getStoredPipelineOrders();
  const normalized = normalizeMasterStage(newStatus);

  const updated = current.map(o => {
    if (o.id === id || o.orderId === id) {
      return {
        ...o,
        status: normalized,
        localStatus: localStatus || o.localStatus || newStatus,
      };
    }
    return o;
  });

  await saveStoredPipelineOrders(updated);

  const targetOrder = updated.find(o => o.id === id || o.orderId === id);
  if (targetOrder) {
    try {
      await fetch('/api/pipeline-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetOrder),
      });
    } catch (err) {
      console.error('Error updating order on API:', err);
    }
  }
}

export function addPipelineOrder(order: Partial<PipelineMasterOrder>): PipelineMasterOrder {
  const current = getStoredPipelineOrders();
  const newOrder: PipelineMasterOrder = {
    id: order.id || `ORD-${Date.now()}`,
    orderId: order.orderId || `ORD-00${current.length + 1}`,
    customerName: order.customerName || 'عميل جديد',
    phone: order.phone || '01000000000',
    address: order.address || 'القاهرة',
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

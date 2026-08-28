'use client';

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

const STORAGE_KEY = 'ahmed_kishk_pipeline_orders_v4';

export const DEFAULT_PIPELINE_ORDERS: PipelineMasterOrder[] = [
  {
    id: 'CUT-101',
    orderId: 'ORD-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    branch: 'الفرع الرئيسي',
    deliveryDate: '2026-09-02',
    cutterName: 'عم مصطفى البياع',
    tailorName: 'أبو فهد الخياط',
    technicianName: 'م. أحمد عبده',
    status: 'في المقص',
    localStatus: 'بانتظار القص',
    createdAt: '2026-08-28',
    totalAmount: 9400,
    depositPaid: 5200,
    remainingAmount: 4200,
    rooms: [
      {
        roomName: 'غرفة (1) - الصالة الرئيسية',
        heavyFabric: { name: 'قطيفة تركي ثقيل', code: 'V-990', meters: 6.3, pieces: 'جنبين', tapeType: 'شريط 3 فتلة (معامل ×2)', netHeight: '280 سم' },
        sheerFabric: { name: 'تول خفيف مطرز', code: 'T-402', meters: 8.75, pieces: 'قطعة واحدة', tapeType: 'شريط ويفي (معامل ×2.5)', netHeight: '278 سم' },
        blackoutFabric: { name: 'بلاك آوت عازل', code: 'BL-101', meters: 2.25, pieces: 'قطعة واحدة', tapeType: 'شريط كشكشة عريض', netHeight: '275 سم' },
      },
      {
        roomName: 'غرفة (2) - غرفة النوم الرئيسية',
        heavyFabric: { name: 'قطيفة تركي ثقيل', code: 'V-990', meters: 4.5, pieces: 'جنبين', tapeType: 'شريط 3 فتلة (معامل ×2)', netHeight: '265 سم' },
        sheerFabric: { name: 'تول خفيف مطرز', code: 'T-402', meters: 5.0, pieces: 'قطعة واحدة', tapeType: 'شريط ويفي (معامل ×2.5)', netHeight: '263 سم' },
        blackoutFabric: { name: 'بلاك آوت عازل', code: 'BL-101', meters: 3.0, pieces: 'قطعة واحدة', tapeType: 'شريط كشكشة عريض', netHeight: '260 سم' },
      },
    ],
  },
  {
    id: 'CUT-102',
    orderId: 'ORD-002',
    customerName: 'د. سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، بيفرلي هيلز',
    branch: 'فرع عرابي',
    deliveryDate: '2026-09-05',
    cutterName: 'سيد القصاد',
    tailorName: 'الأسطى إبراهيم',
    technicianName: 'م. هاني سعيد',
    status: 'في المقص',
    localStatus: 'بانتظار القص',
    createdAt: '2026-08-27',
    totalAmount: 8500,
    depositPaid: 4700,
    remainingAmount: 3800,
    rooms: [
      {
        roomName: 'غرفة المعيشة',
        heavyFabric: { name: 'كتان هازل بني', code: 'LN-77', meters: 12.0, pieces: 'جنبين', tapeType: 'شريط ويفي (معامل ×2.5)', netHeight: '290 سم' },
        sheerFabric: { name: 'تول ويفي أبيض', code: 'TW-10', meters: 12.0, pieces: 'قطعتين', tapeType: 'شريط ويفي (معامل ×2.5)', netHeight: '288 سم' },
      },
    ],
  },
  {
    id: 'CUT-103',
    orderId: 'ORD-003',
    customerName: 'م/ طارق عبد المحسن',
    phone: '01144556677',
    address: 'المعادي، دجلة',
    branch: 'الفرع الرئيسي',
    deliveryDate: '2026-08-30',
    cutterName: 'عم مصطفى البياع',
    tailorName: 'أبو فهد الخياط',
    technicianName: 'م. أحمد عبده',
    status: 'في الورشة',
    localStatus: 'جاري الخياطة',
    createdAt: '2026-08-25',
    totalAmount: 7200,
    depositPaid: 4000,
    remainingAmount: 3200,
    rooms: [
      {
        roomName: 'صالون الضيوف',
        heavyFabric: { name: 'شانيل تركيات بيج', code: 'CH-88', meters: 8.5, pieces: 'جنبين', tapeType: 'شريط 3 فتلة (معامل ×2)', netHeight: '280 سم' },
        sheerFabric: { name: 'تول سادة أوف وايت', code: 'TS-01', meters: 9.0, pieces: 'قطعة واحدة', tapeType: 'شريط ويفي (معامل ×2.5)', netHeight: '278 سم' },
      },
    ],
  },
];

/**
 * Normalizes any status to official Global Master Stage
 */
export function normalizeMasterStage(statusStr: string): GlobalMasterStage {
  if (!statusStr) return 'المعاينات';
  const s = statusStr.trim();
  if (s === 'المعاينات' || s === 'في المعاينات' || s.includes('معاينة') || s === 'مُجدول') return 'المعاينات';
  if (s === 'انتظار تسعير' || s === 'في التسعير' || s.includes('تسعير') || s === 'قيد التسعير') return 'انتظار تسعير';
  if (s === 'في المقص' || s === 'بانتظار القص' || s === 'قص القماش') return 'في المقص';
  if (s === 'في الورشة' || s === 'جاري الخياطة' || s === 'جاري الكي' || s === 'تمت الخياطة' || s === 'تم القص وجاهز للخياطة') return 'في الورشة';
  if (s === 'تجهيز الاكسسوارات' || s === 'تجهيز الاكسسوار' || s === 'جاري التجهيز' || s === 'تم التجهيز') return 'تجهيز الاكسسوارات';
  if (s === 'جاهز للاستلام' || s === 'في التسليمات' || s === 'تسليمات المعرض والشحن') return 'جاهز للاستلام';
  if (s === 'جاهز للتركيب' || s === 'في التركيبات' || s === 'التركيبات') return 'جاهز للتركيب';
  if (s === 'مكتمل' || s === 'تم التسليم للعميل بنجاح' || s === 'تم التركيب بنجاح ومغلق' || s === 'مكتمل ومسلم') return 'مكتمل';
  return 'المعاينات';
}

export function getStoredPipelineOrders(): PipelineMasterOrder[] {
  if (typeof window === 'undefined') return DEFAULT_PIPELINE_ORDERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PIPELINE_ORDERS));
      return DEFAULT_PIPELINE_ORDERS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading pipeline orders:', err);
    return DEFAULT_PIPELINE_ORDERS;
  }
}

export function saveStoredPipelineOrders(orders: PipelineMasterOrder[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Error saving pipeline orders:', err);
  }
}

export function updatePipelineOrderStatus(
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

  saveStoredPipelineOrders(updated);
  return updated;
}

export function isTodayOrOverdue(dateStr?: string): boolean {
  if (!dateStr || dateStr.trim() === '' || dateStr.includes('غير محدد') || dateStr.includes('اليوم')) {
    return true;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const match = dateStr.match(/\d{4}-\d{2}-\d{2}/);
  if (match) {
    return match[0] <= todayStr;
  }

  return true;
}

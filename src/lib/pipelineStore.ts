'use client';

// Shared Pipeline Order Interface
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
  status:
    | 'بانتظار القص'
    | 'تم القص وجاهز للخياطة'
    | 'جاري الخياطة'
    | 'تمت الخياطة'
    | 'جاهز للتسليم'
    | 'تم التحويل للتسليمات'
    | 'في التسليمات'
    | 'تم التسليم للعميل بنجاح'
    | 'في التركيبات'
    | 'تم التركيب بنجاح ومغلق';
  createdAt: string;
  remainingAmount?: number;
  rooms: any[];
}

const STORAGE_KEY = 'ahmed_kishk_pipeline_orders_v2';

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
    status: 'بانتظار القص',
    createdAt: '2026-08-28',
    remainingAmount: 4200,
    rooms: [
      {
        roomName: 'غرفة (1) - الصالة الرئيسية',
        heavyFabric: { name: 'قطيفة تركي ثقيل', code: 'V-990', meters: 6.3 },
        sheerFabric: { name: 'تول خفيف مطرز', code: 'T-402', meters: 8.75 },
        blackoutFabric: { name: 'بلاك آوت عازل', code: 'BL-101', meters: 2.25 },
      },
      {
        roomName: 'غرفة (2) - غرفة النوم الرئيسية',
        heavyFabric: { name: 'قطيفة تركي ثقيل', code: 'V-990', meters: 4.5 },
        sheerFabric: { name: 'تول خفيف مطرز', code: 'T-402', meters: 5.0 },
        blackoutFabric: { name: 'بلاك آوت عازل', code: 'BL-101', meters: 3.0 },
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
    status: 'بانتظار القص',
    createdAt: '2026-08-27',
    remainingAmount: 3800,
    rooms: [
      {
        roomName: 'غرفة المعيشة',
        heavyFabric: { name: 'كتان هازل بني', code: 'LN-77', meters: 12.0 },
        sheerFabric: { name: 'تول ويفي أبيض', code: 'TW-10', meters: 12.0 },
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
    status: 'تم القص وجاهز للخياطة',
    createdAt: '2026-08-25',
    remainingAmount: 3200,
    rooms: [
      {
        roomName: 'صالون الضيوف',
        heavyFabric: { name: 'شانيل تركيات بيج', code: 'CH-88', meters: 8.5 },
        sheerFabric: { name: 'تول سادة أوف وايت', code: 'TS-01', meters: 9.0 },
      },
    ],
  },
];

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

export function updatePipelineOrderStatus(id: string, newStatus: PipelineMasterOrder['status']) {
  const current = getStoredPipelineOrders();
  const updated = current.map(o => o.id === id || o.orderId === id ? { ...o, status: newStatus } : o);
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

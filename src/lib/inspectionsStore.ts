import { saveServerData } from '@/lib/syncService';

export interface Room {
  id: string;
  name: string;
  type: 'شباك' | 'بلكونة';
  widthCm: number;
  heightCm: number;
  sides: number;
  installationType: string;
  ceilingType: string;
  notes?: string;
}

export interface InspectionData {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  branch: string;
  scheduledAt: string;
  technician: string;
  status: 'مُجدول' | 'تم رفع المقاسات' | 'قيد التسعير' | 'في الورشة' | 'مكتمل';
  isLocked: boolean;
  notes: string;
  rooms: Room[];
  createdAt?: string;
}

export interface PipeAccessories {
  doubleBrackets: number; // حامل مجوز (55 ج)
  singleBrackets: number; // حامل مفرد (45 ج)
  sideCaps: number;       // قم جانبي / شكل (50 ج)
  doubleRings: number;    // حلقات دبل (5 ج)
  decorHangers: number;   // شماعة ديكور (100 ج)
}

export interface RoomPricing {
  id: string;
  name: string;
  type: string;
  widthCm: number;
  heightCm: number;
  sides: number;
  installationType: string;
  ceilingType: string;

  // Toggles for active layers
  heavyEnabled?: boolean;
  sheerEnabled?: boolean;
  blackoutEnabled?: boolean;

  // Heavy / Main Sides Fabric (1st)
  heavyFabricCode?: string;
  heavyFabricName?: string;
  heavyTapeType?: string;
  heavyMultiplier?: number;
  heavyMeters: number;
  heavyPrice: number;

  // Sheer / Background Fabric (2nd)
  sheerFabricCode?: string;
  sheerFabricName?: string;
  sheerTapeType?: string;
  sheerMultiplier?: number;
  sheerMeters: number;
  sheerPrice: number;

  // Blackout Layer (3rd)
  blackoutFabricCode?: string;
  blackoutFabricName?: string;
  blackoutTapeType?: string;
  blackoutMultiplier?: number;
  blackoutMeters: number;
  blackoutPrice: number;

  // Installation Category & Pipe details
  installationCategory?: 'تراك' | 'مواسير فورجيه';
  trackMeters: number;
  trackPrice: number;

  // Pipe Forge specifications & accessories
  pipeTypeDescription?: 'سادة' | 'مجدول';
  pipeColor?: 'فضى' | 'أوكسيديه' | 'أسود' | 'زيتى';
  pipePricePerMeter?: number;
  pipeAccessories?: PipeAccessories;

  // Tape, Tailoring, Install & Transport
  tapeMeters: number;
  tapePrice: number;
  tailorPricePerSide: number;
  installFeeEnabled?: boolean; // رسوم التركيب (اختياري)
  installFee: number;
  transportFeeEnabled?: boolean; // رسوم النقل للمحافظات (اختياري)
  transportFee?: number;
  totalSellPrice: number;
}

export type QuotationStatus =
  | 'المعاينات'
  | 'تم ارسال المعاينات'
  | 'بانتظار التسعير'
  | 'تم إرسال المقايسة'
  | 'معتمد ومسدد العربون'
  | 'معتمد و مسدد العربون'
  | 'تم التحويل للورشة'
  | 'تم التحويل الى الورشه'
  | 'في المقص'
  | 'قص القماش'
  | 'تم القص'
  | 'في الورشة'
  | 'تمت الخياطة'
  | 'تجهيز الاكسسوارات'
  | 'جاري تجهيز الاكسسوار'
  | 'تم تجهيز الاكسسوار'
  | 'جاهز للاستلام'
  | 'جاهز للستليم'
  | 'جاهز للتسليم'
  | 'جاهز للتركيب'
  | 'في التركيبات'
  | 'تم التركيب بنجاح'
  | 'في التسليمات'
  | 'تم التسليم بنجاح'
  | 'تم التسليم'
  | 'مكتمل'
  | 'مكتمل ومسلم';

export interface QuotationOrder {
  id: string;
  inspectionId: string;
  customerName: string;
  phone: string;
  address: string;
  branch?: string;
  status: QuotationStatus;
  totalAmount: number;
  depositPaid: number;
  remainingAmount: number;
  date: string;
  deliveryDate?: string;
  estimatorName: string;
  rooms: RoomPricing[];
}

export const TAPE_PRICES: Record<string, number> = {
  '٣ فتلة': 0,
  'إيكيا': 0,
  'ويفي': 0,
  'جراب': 0,
  'حلقات ديكور': 0,
};

export const TAPE_MULTIPLIERS: Record<string, number> = {
  '٣ فتلة': 2.0,
  'إيكيا': 2.0,
  'ويفي': 2.5,
  'جراب': 2.0,
  'حلقات ديكور': 2.0,
};

export const ACCESSORY_PRICES = {
  trackPerMeter: 100,
  pipePerMeter: 65,
  doubleBracket: 55,  // حامل مجوز
  singleBracket: 45,  // حامل مفرد
  sideCap: 50,        // قم جانبي
  doubleRing: 5,      // حلقات دبل
  decorHanger: 100,   // شماعة ديكور
  defaultInstallFee: 125, // رسوم التركيب الثابتة
};

export const PERMANENT_BLACKLIST_CUSTOMER_NAMES = [
  'محمود عبد الرحمن',
  'سارة أحمد',
  'شركة المعمار للمقاولات',
];

export const defaultInspectionsList: InspectionData[] = [];
export const defaultQuotationsList: QuotationOrder[] = [];

const INSPECTIONS_STORAGE_KEY = 'ahmed_kishk_inspections_data_v4';
const QUOTATIONS_STORAGE_KEY = 'ahmed_kishk_quotations_data_v4';

function isCustomerBlacklisted(name: string): boolean {
  if (!name) return false;
  return PERMANENT_BLACKLIST_CUSTOMER_NAMES.some(bn => name.includes(bn));
}

export async function fetchInspections(): Promise<InspectionData[]> {
  try {
    const res = await fetch('/api/inspections', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.inspections)) {
        const filtered = json.inspections.filter((i: any) => !isCustomerBlacklisted(i.customerName));
        if (typeof window !== 'undefined') {
          localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(filtered));
        }
        return filtered;
      }
    }
  } catch (err) {
    console.error('Error fetching inspections from server:', err);
  }
  return getStoredInspections();
}

export async function fetchQuotations(): Promise<QuotationOrder[]> {
  try {
    const res = await fetch('/api/pricing', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.quotations)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(json.quotations));
        }
        return json.quotations;
      }
    }
  } catch (err) {
    console.error('Error fetching quotations from server:', err);
  }
  return getStoredQuotations();
}

export function getStoredInspections(): InspectionData[] {
  if (typeof window === 'undefined') {
    return defaultInspectionsList;
  }
  try {
    const raw = localStorage.getItem(INSPECTIONS_STORAGE_KEY);
    let list: InspectionData[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    }
    const filtered = list.filter(i => !isCustomerBlacklisted(i.customerName));
    if (filtered.length > 0) return filtered;

    // localStorage is empty — trigger a background server fetch to hydrate it,
    // and return empty for now (PageShell's onSyncReady will trigger a remount).
    fetchInspections().catch(() => {});
    return defaultInspectionsList;
  } catch {
    return defaultInspectionsList;
  }
}

export async function saveAllInspections(list: InspectionData[]): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }
  try {
    await fetch('/api/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: INSPECTIONS_STORAGE_KEY, data: list }),
    });
  } catch (err) {
    console.error('Failed to save inspections to server:', err);
  }
}

export function getInspectionById(id: string): InspectionData | null {
  const list = getStoredInspections();
  return list.find(item => item.id.toUpperCase() === id.toUpperCase()) || null;
}

export async function saveOrUpdateInspection(item: InspectionData): Promise<void> {
  const list = getStoredInspections();
  const index = list.findIndex(i => i.id.toUpperCase() === item.id.toUpperCase());
  let updated: InspectionData[];
  if (index >= 0) {
    updated = [...list];
    updated[index] = item;
  } else {
    updated = [item, ...list];
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(updated));
  }
  try {
    await fetch('/api/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch (err) {
    console.error('Failed to save inspection to API:', err);
  }
}

export function getStoredQuotations(): QuotationOrder[] {
  if (typeof window === 'undefined') {
    return defaultQuotationsList;
  }
  try {
    const raw = localStorage.getItem(QUOTATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // localStorage is empty — trigger a background server fetch to hydrate it.
    fetchQuotations().catch(() => {});
    return defaultQuotationsList;
  } catch {
    return defaultQuotationsList;
  }
}

export async function saveAllQuotations(list: QuotationOrder[]): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }

  try {
    await fetch('/api/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quotations: list }),
    });
  } catch (err) {
    console.error('Failed to save quotations to database:', err);
  }

  try {
    await fetch('/api/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: QUOTATIONS_STORAGE_KEY, data: list }),
    });
  } catch (err) {
    console.error('Failed to save quotations to server:', err);
  }
}

export async function saveOrUpdateQuotation(item: QuotationOrder): Promise<void> {
  const list = getStoredQuotations();
  const index = list.findIndex(q => q.id.toUpperCase() === item.id.toUpperCase());
  let updated: QuotationOrder[];
  if (index >= 0) {
    updated = [...list];
    updated[index] = item;
  } else {
    updated = [item, ...list];
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(updated));
  }
  try {
    await fetch('/api/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
  } catch (err) {
    console.error('Failed to save quotation to API:', err);
  }
}

export function syncInspectionToPricing(inspectionOrId: InspectionData | string): QuotationOrder {
  const inspection: InspectionData = typeof inspectionOrId === 'string'
    ? (getInspectionById(inspectionOrId) || {
        id: inspectionOrId,
        customerName: 'عميل جديد',
        phone: '',
        address: '',
        branch: 'الفرع الرئيسي',
        scheduledAt: '',
        technician: '',
        status: 'تم رفع المقاسات',
        isLocked: false,
        notes: '',
        rooms: []
      })
    : inspectionOrId;

  const quotations = getStoredQuotations();
  const existingIdx = quotations.findIndex(q => q.inspectionId.toUpperCase() === inspection.id.toUpperCase());

  const convertedRooms: RoomPricing[] = inspection.rooms.map(r => {
    const widthMeters = r.widthCm / 100;
    const heavyTapeType = '٣ فتلة';
    const heavyMultiplier = 2.0;
    const heavyMeters = Math.round(widthMeters * heavyMultiplier * 100) / 100;

    const sheerTapeType = 'ويفي';
    const sheerMultiplier = 2.5;
    const sheerMeters = Math.round(widthMeters * sheerMultiplier * 100) / 100;

    const isPipe = r.installationType.includes('مواسير');

    return {
      id: r.id,
      name: r.name,
      type: r.type,
      widthCm: r.widthCm,
      heightCm: r.heightCm,
      sides: r.sides,
      installationType: r.installationType,
      ceilingType: r.ceilingType,

      heavyEnabled: true,
      sheerEnabled: true,
      blackoutEnabled: false,

      // Heavy 1st
      heavyFabricCode: 'HV-201',
      heavyFabricName: 'قطيفة جاجوار تركيات (درجات البيج)',
      heavyTapeType,
      heavyMultiplier,
      heavyMeters,
      heavyPrice: 0,

      // Sheer 2nd
      sheerFabricCode: 'SH-101',
      sheerFabricName: 'شيفون حرير فاخر (أبيض سادة)',
      sheerTapeType,
      sheerMultiplier,
      sheerMeters,
      sheerPrice: 0,

      // Blackout 3rd
      blackoutFabricCode: '',
      blackoutFabricName: '',
      blackoutTapeType: 'جراب',
      blackoutMultiplier: 1.2,
      blackoutMeters: 0,
      blackoutPrice: 0,

      // Installation Category
      installationCategory: isPipe ? 'مواسير فورجيه' : 'تراك',
      trackMeters: widthMeters,
      trackPrice: 0,

      pipeTypeDescription: 'سادة',
      pipeColor: 'فضى',
      pipePricePerMeter: 0,
      pipeAccessories: {
        doubleBrackets: isPipe ? 2 : 0,
        singleBrackets: 0,
        sideCaps: isPipe ? 2 : 0,
        doubleRings: 0,
        decorHangers: 0,
      },

      tapeMeters: Math.round((sheerMeters + heavyMeters) * 100) / 100,
      tapePrice: 0,
      tailorPricePerSide: 0,
      installFee: 0,
      totalSellPrice: 0,
    };
  });

  const totalSum = convertedRooms.reduce((s, rm) => s + rm.totalSellPrice, 0);

  let targetQuotation: QuotationOrder;
  if (existingIdx >= 0) {
    targetQuotation = {
      ...quotations[existingIdx],
      customerName: inspection.customerName,
      phone: inspection.phone,
      address: inspection.address,
      branch: inspection.branch,
      rooms: convertedRooms,
      totalAmount: totalSum,
      remainingAmount: totalSum - quotations[existingIdx].depositPaid,
    };
    quotations[existingIdx] = targetQuotation;
  } else {
    const qotId = `QOT-${100 + quotations.length + 1}`;
    targetQuotation = {
      id: qotId,
      inspectionId: inspection.id,
      customerName: inspection.customerName,
      phone: inspection.phone,
      address: inspection.address,
      branch: inspection.branch,
      status: 'بانتظار التسعير',
      totalAmount: totalSum,
      depositPaid: 0,
      remainingAmount: totalSum,
      date: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      estimatorName: 'أحمد كشك',
      rooms: convertedRooms,
    };
    quotations.unshift(targetQuotation);
  }

  saveAllQuotations(quotations);
  return targetQuotation;
}

export function deleteQuotationOrder(orderId: string): void {
  const targetQot = getStoredQuotations().find(q => q.id.toUpperCase() === orderId.toUpperCase() || q.inspectionId?.toUpperCase() === orderId.toUpperCase());
  const customerName = targetQot?.customerName;
  
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('ahmed_kishk_deleted_order_ids_v1');
      const deletedArr: string[] = raw ? JSON.parse(raw) : [];
      if (!deletedArr.includes(orderId)) deletedArr.push(orderId);
      if (targetQot?.id && !deletedArr.includes(targetQot.id)) deletedArr.push(targetQot.id);
      if (targetQot?.inspectionId && !deletedArr.includes(targetQot.inspectionId)) deletedArr.push(targetQot.inspectionId);
      if (customerName && !deletedArr.includes(customerName)) deletedArr.push(customerName);
      localStorage.setItem('ahmed_kishk_deleted_order_ids_v1', JSON.stringify(deletedArr));
    } catch {}
  }

  const quotations = getStoredQuotations();
  const filteredQots = quotations.filter(q => q.id.toUpperCase() !== orderId.toUpperCase() && q.inspectionId?.toUpperCase() !== orderId.toUpperCase() && q.customerName !== customerName);
  saveAllQuotations(filteredQots);

  const inspections = getStoredInspections();
  const filteredInsps = inspections.filter(i => i.id.toUpperCase() !== orderId.toUpperCase() && i.customerName !== customerName);
  saveAllInspections(filteredInsps);
}

export function updateQuotationStageAndStatus(orderId: string, newStatus: QuotationOrder['status']): void {
  const quotations = getStoredQuotations();
  const target = quotations.find(q => q.id.toUpperCase() === orderId.toUpperCase());
  if (target) {
    target.status = newStatus;
    saveAllQuotations(quotations);

    // Sync inspection
    const insp = getInspectionById(target.inspectionId);
    if (insp) {
      if (newStatus === 'تم التحويل الى الورشه' || newStatus === 'جاهز للستليم') {
        insp.status = 'في الورشة';
      } else if (newStatus === 'تم التسليم') {
        insp.status = 'مكتمل';
      } else if (newStatus === 'بانتظار التسعير') {
        insp.status = 'قيد التسعير';
      } else if (newStatus === 'المعاينات') {
        insp.status = 'مُجدول';
      } else if (newStatus === 'تم ارسال المعاينات') {
        insp.status = 'تم رفع المقاسات';
      }
      saveOrUpdateInspection(insp);
    }
  }
}

export function updateQuotationFullDetails(orderId: string, updatedData: Partial<QuotationOrder>): QuotationOrder | null {
  const quotations = getStoredQuotations();
  const idx = quotations.findIndex(q => q.id.toUpperCase() === orderId.toUpperCase());
  if (idx === -1) return null;

  const current = quotations[idx];
  const merged: QuotationOrder = {
    ...current,
    ...updatedData,
    rooms: updatedData.rooms || current.rooms,
  };

  if (updatedData.rooms) {
    const sum = updatedData.rooms.reduce((s, r) => s + r.totalSellPrice, 0);
    merged.totalAmount = sum;
    merged.remainingAmount = Math.max(0, sum - (updatedData.depositPaid ?? current.depositPaid));
  } else if (updatedData.depositPaid !== undefined) {
    merged.remainingAmount = Math.max(0, merged.totalAmount - updatedData.depositPaid);
  }

  quotations[idx] = merged;
  saveAllQuotations(quotations);

  // Sync inspection details
  const insp = getInspectionById(merged.inspectionId);
  if (insp) {
    insp.customerName = merged.customerName;
    insp.phone = merged.phone;
    insp.address = merged.address;
    if (merged.branch) insp.branch = merged.branch;
    saveOrUpdateInspection(insp);
  }

  return merged;
}


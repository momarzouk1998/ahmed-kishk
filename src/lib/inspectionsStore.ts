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
  heavyTapePrice?: number; // سعر متر شريط الجوانب المحفوظ فعلياً على الغرفة (منفصل عن السعر الافتراضى لنوع الشريط)
  heavyMultiplier?: number;
  heavyMeters: number;
  heavyPrice: number;

  // Sheer / Background Fabric (2nd)
  sheerFabricCode?: string;
  sheerFabricName?: string;
  sheerTapeType?: string;
  sheerTapePrice?: number;
  sheerMultiplier?: number;
  sheerMeters: number;
  sheerPrice: number;
  sheerLiningEnabled?: boolean;       // بطانة إضافية للشيفون
  sheerLiningPricePerMeter?: number;  // سعر متر البطانة
  sheerPieces?: 'قطعة واحدة' | 'قطعتين'; // عدد قطع الشيفون

  // Blackout Layer (3rd)
  blackoutFabricCode?: string;
  blackoutFabricName?: string;
  blackoutTapeType?: string;
  blackoutTapePrice?: number;
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

/**
 * الحالات الرسمية الوحيدة (Canonical Statuses).
 * أى نص قديم مخزَّن يُطبّع بواسطة normalizeQuotationStatus قبل الحفظ/العرض.
 */
export type QuotationStatus =
  | 'بانتظار التسعير'
  | 'تم إرسال المقايسة'
  | 'معتمد ومسدد العربون'
  | 'تم التحويل للورشة'
  | 'في المقص'
  | 'في الورشة'
  | 'تجهيز الاكسسوارات'
  | 'جاهز للاستلام'
  | 'جاهز للتركيب'
  | 'مكتمل';

/**
 * يحوّل أى صيغة قديمة/بها خطأ إملائى إلى الحالة الرسمية.
 * يُستدعى عند القراءة والحفظ معاً.
 */
export function normalizeQuotationStatus(raw: string | undefined | null): QuotationStatus {
  const s = String(raw || '').trim();
  if (!s) return 'بانتظار التسعير';
  // completed / delivered
  if (s.includes('مكتمل') || s === 'تم التسليم' || s === 'تم التسليم بنجاح' || s === 'مكتمل ومسلم') return 'مكتمل';
  // install
  if (s === 'تم التركيب بنجاح' || s === 'في التركيبات' || s === 'جاهز للتركيب') return 'جاهز للتركيب';
  // pickup / delivery-ready
  if (s === 'جاهز للاستلام' || s === 'جاهز للستليم' || s === 'جاهز للتسليم' || s === 'في التسليمات') return 'جاهز للاستلام';
  // accessories
  if (s.includes('اكسسوار') || s === 'تجهيز الاكسسوارات') return 'تجهيز الاكسسوارات';
  // workshop
  if (s.includes('خياطة') || s === 'في الورشة' || s === 'تمت الخياطة' || s === 'تم القص وجاهز للخياطة') return 'في الورشة';
  // cutting
  if (s === 'في المقص' || s === 'قص القماش' || s === 'تم القص' || s === 'بانتظار القص') return 'في المقص';
  // approved-deposit
  if (s === 'معتمد ومسدد العربون' || s === 'معتمد و مسدد العربون') return 'معتمد ومسدد العربون';
  // sent to workshop transition
  if (s === 'تم التحويل للورشة' || s === 'تم التحويل الى الورشه') return 'تم التحويل للورشة';
  // sent quote
  if (s === 'تم إرسال المقايسة' || s === 'تم ارسال المعاينات') return 'تم إرسال المقايسة';
  // pricing pending
  if (s === 'بانتظار التسعير' || s === 'المعاينات' || s === 'انتظار تسعير' || s === 'قيد التسعير') return 'بانتظار التسعير';
  return 'بانتظار التسعير';
}

export interface QuotationOrder {
  id: string;
  inspectionId: string;
  customerName: string;
  phone: string;
  address: string;
  branch?: string;
  status: QuotationStatus;
  totalAmount: number;
  discountAmount?: number; // خصم يدوي بالجنيه يُطرح من إجمالي الغرف (subtotal) للحصول على totalAmount
  depositPaid: number;
  remainingAmount: number;
  date: string;
  deliveryDate?: string;
  estimatorName: string;
  rooms: RoomPricing[];
  updatedAt?: string; // #18: timestamp للـ conflict detection
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

export const defaultInspectionsList: InspectionData[] = [];
export const defaultQuotationsList: QuotationOrder[] = [];

const INSPECTIONS_STORAGE_KEY = 'ahmed_kishk_inspections_data_v4';
const QUOTATIONS_STORAGE_KEY = 'ahmed_kishk_quotations_data_v4';

export async function fetchInspections(): Promise<InspectionData[]> {
  try {
    const res = await fetch('/api/inspections', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.inspections)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(json.inspections));
        }
        return json.inspections;
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
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
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
      if (Array.isArray(parsed)) {
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

export class ConflictError extends Error {
  serverUpdatedAt: string;
  constructor(msg: string, serverUpdatedAt: string) {
    super(msg);
    this.serverUpdatedAt = serverUpdatedAt;
  }
}

export async function saveOrUpdateQuotation(item: QuotationOrder): Promise<void> {
  const list = getStoredQuotations();
  const index = list.findIndex(q => q.id.toUpperCase() === item.id.toUpperCase());

  // #18: Conflict detection — لو النسخة المحفوظة أحدث من اللى بنكتبها، نرفض ونرمى ConflictError
  if (index >= 0) {
    const stored = list[index];
    const storedTs = stored.updatedAt ? new Date(stored.updatedAt).getTime() : 0;
    const incomingTs = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
    // فقط لو الاثنين لديهم timestamp والمخزَّن أحدث بأكتر من 2 ثانية (safe margin)
    if (storedTs && incomingTs && storedTs - incomingTs > 2000) {
      throw new ConflictError(
        'تم تعديل هذا العقد من جلسة أخرى بعد آخر تحميل. أعِد التحميل ثم حاول من جديد.',
        stored.updatedAt || ''
      );
    }
  }

  // إضافة timestamp حالى قبل الحفظ
  const withTs: QuotationOrder = { ...item, updatedAt: new Date().toISOString() };
  let updated: QuotationOrder[];
  if (index >= 0) {
    updated = [...list];
    updated[index] = withTs;
  } else {
    updated = [withTs, ...list];
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(updated));
  }
  try {
    await fetch('/api/pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withTs),
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
        rooms: [],
      })
    : inspectionOrId;

  // #17: لا يوجد قماش وهمى افتراضى — الغرفة تبدأ فارغة وتحتاج تسعير يدوى.

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

      // Heavy 1st — تُترك فارغة، المُسعِّر يختار من المخزون
      heavyFabricCode: '',
      heavyFabricName: '',
      heavyTapeType,
      heavyMultiplier,
      heavyMeters,
      heavyPrice: 0,

      // Sheer 2nd — تُترك فارغة، المُسعِّر يختار من المخزون
      sheerFabricCode: '',
      sheerFabricName: '',
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

/**
 * حذف كامل ودائم للأوردر: يمسح المعاينة + التسعير + سطر الـ pipeline من قاعدة البيانات.
 * لا يعتمد على أى قائمة سوداء — الحذف حقيقى على السيرفر.
 */
export async function deleteQuotationOrder(orderId: string): Promise<void> {
  const targetQot = getStoredQuotations().find(
    q => q.id.toUpperCase() === orderId.toUpperCase() ||
         q.inspectionId?.toUpperCase() === orderId.toUpperCase()
  );

  const inspectionId = targetQot?.inspectionId || orderId;
  const quotationId = targetQot?.id || orderId;

  // 1) امسح من الـ localStorage فوراً (UI تحديث سريع)
  if (typeof window !== 'undefined') {
    try {
      const rawQ = localStorage.getItem('ahmed_kishk_quotations_data_v4');
      if (rawQ) {
        const arr = JSON.parse(rawQ);
        if (Array.isArray(arr)) {
          const nx = arr.filter((q: any) => q.id !== quotationId && q.inspectionId !== inspectionId);
          localStorage.setItem('ahmed_kishk_quotations_data_v4', JSON.stringify(nx));
        }
      }
      const rawI = localStorage.getItem('ahmed_kishk_inspections_data_v4');
      if (rawI) {
        const arr = JSON.parse(rawI);
        if (Array.isArray(arr)) {
          const nx = arr.filter((i: any) => i.id !== inspectionId);
          localStorage.setItem('ahmed_kishk_inspections_data_v4', JSON.stringify(nx));
        }
      }
      const rawP = localStorage.getItem('ahmed_kishk_pipeline_orders_v5');
      if (rawP) {
        const arr = JSON.parse(rawP);
        if (Array.isArray(arr)) {
          const nx = arr.filter((p: any) => p.id !== quotationId && p.orderId !== quotationId && p.id !== `ORD-${quotationId}`);
          localStorage.setItem('ahmed_kishk_pipeline_orders_v5', JSON.stringify(nx));
        }
      }
    } catch {}
  }

  // 2) امسح من قاعدة البيانات (بالتوازى)
  const del = (key: string, id: string) =>
    fetch(`/api/system-data?key=${encodeURIComponent(key)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      .catch(err => console.error(`Failed to delete ${key}:${id}`, err));

  await Promise.all([
    del('ahmed_kishk_quotations_data_v4', quotationId),
    del('ahmed_kishk_inspections_data_v4', inspectionId),
    del('ahmed_kishk_pipeline_orders_v5', quotationId),
    del('ahmed_kishk_pipeline_orders_v5', `ORD-${quotationId}`),
  ]);
}

export function updateQuotationStageAndStatus(orderId: string, newStatus: QuotationOrder['status']): void {
  const quotations = getStoredQuotations();
  const target = quotations.find(q => q.id.toUpperCase() === orderId.toUpperCase());
  if (target) {
    const canonical = normalizeQuotationStatus(newStatus);
    target.status = canonical;
    saveAllQuotations(quotations);

    // Sync inspection status + قفل تلقائى عند اعتماد العربون فما بعد
    const insp = getInspectionById(target.inspectionId);
    if (insp) {
      // #23: قفل المعاينة تلقائياً بعد اعتماد العربون (لا يمكن تعديل المقاسات بعدها)
      const LOCK_AFTER: string[] = [
        'معتمد ومسدد العربون', 'تم التحويل للورشة', 'في المقص', 'في الورشة',
        'تجهيز الاكسسوارات', 'جاهز للاستلام', 'جاهز للتركيب', 'مكتمل',
      ];
      if (LOCK_AFTER.includes(canonical)) insp.isLocked = true;

      if (canonical === 'تم التحويل للورشة' || canonical === 'في الورشة') insp.status = 'في الورشة';
      else if (canonical === 'مكتمل') insp.status = 'مكتمل';
      else if (canonical === 'بانتظار التسعير') insp.status = 'قيد التسعير';
      else if (canonical === 'تم إرسال المقايسة') insp.status = 'تم رفع المقاسات';
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


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
  | 'جاهز للستليم'
  | 'تم التسليم'
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
  '٣ فتلة': 50,
  'إيكيا': 70,
  'ويفي': 140,
  'جراب': 50,
  'حلقات ديكور': 70,
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

export const defaultInspectionsList: InspectionData[] = [
  {
    id: 'INS-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    branch: 'الفرع الرئيسي',
    scheduledAt: '2026-08-26 16:00',
    technician: 'أحمد حسن',
    status: 'تم رفع المقاسات',
    isLocked: false,
    notes: 'شقة 3 غرف + صالة بلكونة كبيرة',
    createdAt: '2026-08-25',
    rooms: [
      {
        id: 'r1',
        name: 'الصالة الرئيسية (بلكونة)',
        type: 'بلكونة',
        widthCm: 350,
        heightCm: 280,
        sides: 2,
        installationType: 'تراك سقف',
        ceilingType: 'بيت نور / جبس بورد',
        notes: 'يوجد بيت نور بعمق 15سم — ثني الذيل 12سم',
      },
      {
        id: 'r2',
        name: 'غرفة النوم الرئيسية',
        type: 'شباك',
        widthCm: 200,
        heightCm: 260,
        sides: 2,
        installationType: 'مواسير فورجيه',
        ceilingType: 'سقف عادي خرسانه',
        notes: 'تثبيت الماسورة أعلى حلق الشباك بـ 15سم',
      }
    ],
  },
  {
    id: 'INS-002',
    customerName: 'سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، كمبوند بيفرلي هيلز',
    branch: 'فرع عرابي',
    scheduledAt: '2026-08-27 12:00',
    technician: 'محمد علي',
    status: 'مُجدول',
    isLocked: false,
    notes: 'شقة عروسة — 4 غرف',
    createdAt: '2026-08-25',
    rooms: [],
  },
  {
    id: 'INS-003',
    customerName: 'شركة المعمار للمقاولات',
    phone: '01155556666',
    address: 'المهندسين، شارع البطل أحمد عبد العزيز',
    branch: 'الفرع الرئيسي',
    scheduledAt: '2026-08-24 11:00',
    technician: 'محمد علي',
    status: 'في الورشة',
    isLocked: true,
    notes: 'مكاتب إدارية وقاعات اجتماعات',
    createdAt: '2026-08-24',
    rooms: [
      {
        id: 'r3',
        name: 'قاعة الاجتماعات الرئيسية',
        type: 'شباك',
        widthCm: 500,
        heightCm: 300,
        sides: 2,
        installationType: 'تراك سقف',
        ceilingType: 'سقف عادي خرسانه',
        notes: '3 شبابيك متساوية',
      }
    ],
  }
];

export const defaultQuotationsList: QuotationOrder[] = [
  {
    id: 'QOT-101',
    inspectionId: 'INS-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    branch: 'الفرع الرئيسي',
    status: 'معتمد ومسدد العربون',
    totalAmount: 12600,
    depositPaid: 7000,
    remainingAmount: 5600,
    date: '2026-08-25',
    deliveryDate: '2026-09-02',
    estimatorName: 'أحمد كشك',
    rooms: [
      {
        id: 'r1',
        name: 'الصالة الرئيسية (بلكونة)',
        type: 'بلكونة',
        widthCm: 350,
        heightCm: 280,
        sides: 2,
        installationType: 'تراك سقف',
        ceilingType: 'بيت نور / جبس بورد',
        heavyEnabled: true,
        sheerEnabled: true,
        blackoutEnabled: false,
        sheerFabricCode: 'SH-101',
        sheerFabricName: 'شيفون حرير فاخر (أبيض سادة)',
        sheerTapeType: 'ويفي',
        sheerMeters: 8.75,
        sheerPrice: 160,
        heavyFabricCode: 'HV-201',
        heavyFabricName: 'قطيفة جاجوار تركيات (درجات البيج)',
        heavyTapeType: '٣ فتلة',
        heavyMeters: 7.0,
        heavyPrice: 380,
        blackoutMeters: 0,
        blackoutPrice: 0,
        installationCategory: 'تراك',
        trackMeters: 7.0, // 2 tracks for 2 layers
        trackPrice: 100,
        tapeMeters: 15.75,
        tapePrice: 50,
        tailorPricePerSide: 0,
        installFee: 125,
        totalSellPrice: 12600,
      }
    ]
  },
  {
    id: 'QOT-102',
    inspectionId: 'INS-002',
    customerName: 'سارة أحمد',
    phone: '01298765432',
    address: 'الشيخ زايد، بيفرلي هيلز',
    branch: 'فرع عرابي',
    status: 'بانتظار التسعير',
    totalAmount: 0,
    depositPaid: 0,
    remainingAmount: 0,
    date: '2026-08-25',
    deliveryDate: '2026-09-05',
    estimatorName: 'أحمد كشك',
    rooms: [
      {
        id: 'r2',
        name: 'غرفة النوم الرئيسية',
        type: 'شباك',
        widthCm: 250,
        heightCm: 270,
        sides: 2,
        installationType: 'مواسير فورجيه',
        ceilingType: 'سقف عادي خرسانه',
        heavyEnabled: true,
        sheerEnabled: true,
        blackoutEnabled: true,
        sheerFabricCode: 'SH-102',
        sheerFabricName: 'تول مطرز كريستال تركيات',
        sheerTapeType: 'ويفي',
        sheerMeters: 6.25,
        sheerPrice: 220,
        heavyFabricCode: 'HV-202',
        heavyFabricName: 'قطيفة شانيل كابوتونيه فاخر',
        heavyTapeType: '٣ فتلة',
        heavyMeters: 5.0,
        heavyPrice: 450,
        blackoutFabricCode: 'BK-301',
        blackoutFabricName: 'بلاك آوت عازل حراري ومائي (ثلاثي)',
        blackoutTapeType: 'جراب',
        blackoutMeters: 3.75,
        blackoutPrice: 250,
        installationCategory: 'مواسير فورجيه',
        pipeTypeDescription: 'سادة',
        pipeColor: 'فضى',
        pipePricePerMeter: 65,
        pipeAccessories: {
          doubleBrackets: 2,
          singleBrackets: 0,
          sideCaps: 2,
          doubleRings: 20,
          decorHangers: 0,
        },
        trackMeters: 0,
        trackPrice: 0,
        tapeMeters: 15.0,
        tapePrice: 50,
        tailorPricePerSide: 0,
        installFee: 125,
        totalSellPrice: 0,
      }
    ]
  }
];

const INSPECTIONS_STORAGE_KEY = 'ahmed_kishk_inspections_data_v4';
const QUOTATIONS_STORAGE_KEY = 'ahmed_kishk_quotations_data_v4';

export function getStoredInspections(): InspectionData[] {
  if (typeof window === 'undefined') {
    return defaultInspectionsList;
  }
  try {
    const raw = localStorage.getItem(INSPECTIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(defaultInspectionsList));
      return defaultInspectionsList;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return defaultInspectionsList;
  } catch {
    return defaultInspectionsList;
  }
}

export function saveAllInspections(list: InspectionData[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save inspections to localStorage:', err);
  }
}

export function getInspectionById(id: string): InspectionData | null {
  const list = getStoredInspections();
  return list.find(item => item.id.toUpperCase() === id.toUpperCase()) || null;
}

export function saveOrUpdateInspection(item: InspectionData): void {
  const list = getStoredInspections();
  const index = list.findIndex(i => i.id.toUpperCase() === item.id.toUpperCase());
  let updated: InspectionData[];
  if (index >= 0) {
    updated = [...list];
    updated[index] = item;
  } else {
    updated = [item, ...list];
  }
  saveAllInspections(updated);
}

export function getStoredQuotations(): QuotationOrder[] {
  if (typeof window === 'undefined') {
    return defaultQuotationsList;
  }
  try {
    const raw = localStorage.getItem(QUOTATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(defaultQuotationsList));
      return defaultQuotationsList;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return defaultQuotationsList;
  } catch {
    return defaultQuotationsList;
  }
}

export function saveAllQuotations(list: QuotationOrder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUOTATIONS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save quotations to localStorage:', err);
  }
}

export function syncInspectionToPricing(inspection: InspectionData): QuotationOrder {
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
      heavyPrice: 380,

      // Sheer 2nd
      sheerFabricCode: 'SH-101',
      sheerFabricName: 'شيفون حرير فاخر (أبيض سادة)',
      sheerTapeType,
      sheerMultiplier,
      sheerMeters,
      sheerPrice: 160,

      // Blackout 3rd
      blackoutFabricCode: '',
      blackoutFabricName: '',
      blackoutTapeType: 'جراب',
      blackoutMultiplier: 1.2,
      blackoutMeters: 0,
      blackoutPrice: 0,

      // Installation Category
      installationCategory: isPipe ? 'مواسير فورجيه' : 'تراك',
      trackMeters: isPipe ? 0 : widthMeters * 2, // 2 tracks for 2 layers
      trackPrice: isPipe ? 0 : 100,

      pipeTypeDescription: 'سادة',
      pipeColor: 'فضى',
      pipePricePerMeter: 65,
      pipeAccessories: {
        doubleBrackets: 2,
        singleBrackets: 0,
        sideCaps: 2,
        doubleRings: 0,
        decorHangers: 0,
      },

      tapeMeters: Math.round((sheerMeters + heavyMeters) * 100) / 100,
      tapePrice: 50,
      tailorPricePerSide: 0,
      installFee: 125,
      totalSellPrice: Math.round(
        (heavyMeters * 380) +
        (sheerMeters * 160) +
        (isPipe ? (widthMeters * 65 + 2 * 55 + 2 * 50) : (widthMeters * 2 * 100)) +
        (heavyMeters * 50 + sheerMeters * 140) +
        125
      ),
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
  const quotations = getStoredQuotations();
  const filtered = quotations.filter(q => q.id.toUpperCase() !== orderId.toUpperCase());
  saveAllQuotations(filtered);
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


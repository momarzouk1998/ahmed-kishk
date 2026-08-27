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

export interface RoomPricing {
  id: string;
  name: string;
  type: string;
  widthCm: number;
  heightCm: number;
  sides: number;
  installationType: string;
  ceilingType: string;
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
  blackoutMultiplier?: number;
  blackoutMeters: number;
  blackoutPrice: number;
  // Track, Tape, Tailoring & Install
  trackMeters: number;
  trackPrice: number;
  tapeMeters: number;
  tapePrice: number;
  tailorPricePerSide: number;
  installFee: number;
  totalSellPrice: number;
}

export interface QuotationOrder {
  id: string;
  inspectionId: string;
  customerName: string;
  phone: string;
  address: string;
  status: 'بانتظار التسعير' | 'تم إرسال المقايسة' | 'معتمد ومسدد العربون' | 'تم التحويل للورشة';
  totalAmount: number;
  depositPaid: number;
  remainingAmount: number;
  date: string;
  estimatorName: string;
  rooms: RoomPricing[];
}

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
        ceilingType: 'بيت نور / جبس بورد',
        notes: 'ستائر عازلة للضوء والصوت',
      },
      {
        id: 'r4',
        name: 'مكتب رئيس مجلس الإدارة',
        type: 'شباك',
        widthCm: 280,
        heightCm: 290,
        sides: 2,
        installationType: 'مواسير فورجيه',
        ceilingType: 'بيت نور / جبس بورد',
        notes: '',
      }
    ],
  },
  {
    id: 'INS-004',
    customerName: 'أسرة محمود سعيد',
    phone: '01099887766',
    address: 'مصر الجديدة، ميدان الحجاز',
    branch: 'فرع عرابي',
    scheduledAt: '2026-08-23 18:00',
    technician: 'أحمد حسن',
    status: 'مكتمل',
    isLocked: true,
    notes: '',
    createdAt: '2026-08-23',
    rooms: [
      {
        id: 'r5',
        name: 'غرفة المعيشة',
        type: 'شباك',
        widthCm: 300,
        heightCm: 270,
        sides: 2,
        installationType: 'تراك سقف',
        ceilingType: 'سقف عادي خرسانه',
      }
    ],
  },
  {
    id: 'INS-005',
    customerName: 'د. طارق خيري',
    phone: '01077665544',
    address: 'المعادي، دجلة شارع 200',
    branch: 'الفرع الرئيسي',
    scheduledAt: '2026-08-28 15:00',
    technician: 'أحمد حسن',
    status: 'مُجدول',
    isLocked: false,
    notes: 'فيلا خاصة',
    createdAt: '2026-08-25',
    rooms: [],
  }
];

export const defaultQuotationsList: QuotationOrder[] = [
  {
    id: 'QOT-101',
    inspectionId: 'INS-001',
    customerName: 'محمود عبد الرحمن',
    phone: '01012345678',
    address: 'التجمع الخامس، فيلا 42',
    status: 'معتمد ومسدد العربون',
    totalAmount: 12600,
    depositPaid: 7000,
    remainingAmount: 5600,
    date: '2026-08-25',
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
        sheerFabricCode: 'SH-101',
        sheerFabricName: 'شيفون حرير فاخر (أبيض سادة)',
        sheerMeters: 8.75,
        sheerPrice: 160,
        heavyFabricCode: 'HV-201',
        heavyFabricName: 'قطيفة جاجوار تركيات (درجات البيج)',
        heavyMeters: 7.0,
        heavyPrice: 380,
        blackoutMeters: 0,
        blackoutPrice: 0,
        trackMeters: 3.5,
        trackPrice: 120,
        tapeMeters: 8.75,
        tapePrice: 40,
        tailorPricePerSide: 150,
        installFee: 200,
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
    status: 'بانتظار التسعير',
    totalAmount: 0,
    depositPaid: 0,
    remainingAmount: 0,
    date: '2026-08-25',
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
        sheerFabricCode: 'SH-102',
        sheerFabricName: 'تول مطرز كريستال تركيات',
        sheerMeters: 6.25,
        sheerPrice: 220,
        heavyFabricCode: 'HV-202',
        heavyFabricName: 'قطيفة شانيل كابوتونيه فاخر',
        heavyMeters: 5.0,
        heavyPrice: 450,
        blackoutFabricCode: 'BK-301',
        blackoutFabricName: 'بلاك آوت عازل حراري ومائي (ثلاثي)',
        blackoutMeters: 3.75,
        blackoutPrice: 250,
        trackMeters: 2.5,
        trackPrice: 120,
        tapeMeters: 6.25,
        tapePrice: 40,
        tailorPricePerSide: 150,
        installFee: 150,
        totalSellPrice: 0,
      }
    ]
  },
  {
    id: 'QOT-103',
    inspectionId: 'INS-003',
    customerName: 'شركة المعمار للمقاولات',
    phone: '01155556666',
    address: 'المهندسين، شارع البطل',
    status: 'تم التحويل للورشة',
    totalAmount: 28400,
    depositPaid: 18400,
    remainingAmount: 10000,
    date: '2026-08-24',
    estimatorName: 'أحمد كشك',
    rooms: []
  }
];

const INSPECTIONS_STORAGE_KEY = 'ahmed_kishk_inspections_data_v3';
const QUOTATIONS_STORAGE_KEY = 'ahmed_kishk_quotations_data_v3';

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

    const blackoutMultiplier = 1.20;
    const blackoutMeters = Math.round(widthMeters * blackoutMultiplier * 100) / 100;

    const trackMeters = widthMeters;
    const tapeMeters = Math.round((sheerMeters + heavyMeters) * 100) / 100;

    return {
      id: r.id,
      name: r.name,
      type: r.type,
      widthCm: r.widthCm,
      heightCm: r.heightCm,
      sides: r.sides,
      installationType: r.installationType,
      ceilingType: r.ceilingType,
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
      blackoutMultiplier,
      blackoutMeters: 0,
      blackoutPrice: 0,
      // Details
      trackMeters,
      trackPrice: 120,
      tapeMeters,
      tapePrice: 40,
      tailorPricePerSide: 150,
      installFee: 200,
      totalSellPrice: Math.round(
        (heavyMeters * 380) +
        (sheerMeters * 160) +
        (trackMeters * 120) +
        (tapeMeters * 40) +
        (r.sides * 150) +
        200
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
      status: 'بانتظار التسعير',
      totalAmount: totalSum,
      depositPaid: 0,
      remainingAmount: totalSum,
      date: new Date().toISOString().split('T')[0],
      estimatorName: 'أحمد كشك',
      rooms: convertedRooms,
    };
    quotations.unshift(targetQuotation);
  }

  saveAllQuotations(quotations);
  return targetQuotation;
}

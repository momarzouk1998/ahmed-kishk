export interface BranchConfig {
  id: string;
  name: string;
  address: string;
  type: 'ستائر وأقمشة تنجيد' | 'أقمشة فقط' | 'أقمشة وشحن أونلاين';
  userCapacity: number;
  phone?: string;
  landline?: string;
  isMain?: boolean;
}

// Canonical branch value stored in DB (short form) vs display label
export const MAIN_BRANCH_VALUE = 'الفرع الرئيسي';
export const MAIN_BRANCH_LABEL = 'الفرع الرئيسي (سعد زغلول)';

export const BRANCHES_LIST: BranchConfig[] = [
  {
    id: 'br_main',
    name: 'الفرع الرئيسي',
    address: '73 ش سعد زغلول والجامع العباسي',
    type: 'ستائر وأقمشة تنجيد',
    userCapacity: 2,
    landline: '064/3931419',
    phone: '01012161542',
    isMain: true,
  },
  {
    id: 'br_oraby',
    name: 'فرع عرابي',
    address: 'الإسماعيلية: 18 ش عدلي أمام عمر أفندي',
    type: 'ستائر وأقمشة تنجيد',
    userCapacity: 2,
    landline: '064/3915879',
    phone: '01019999024',
  },
  {
    id: 'br_omareffendi',
    name: 'فرع عمر أفندي',
    address: 'الإسماعيلية: 162 ش عدلي مبنى عمر أفندي',
    type: 'أقمشة فقط',
    userCapacity: 2,
    landline: '064/3926630',
    phone: '01070186618',
  },
  {
    id: 'br_thalatheny',
    name: 'فرع الثلاثيني',
    address: 'الإسماعيلية: 27 ش سعد زغلول',
    type: 'أقمشة فقط',
    userCapacity: 1,
    landline: '064/3927021',
    phone: '01091444432',
  },
  {
    id: 'br_commercial',
    name: 'الفرع التجاري',
    address: 'الإسماعيلية: ش التجاري بجوار استوديو عادل',
    type: 'أقمشة وشحن أونلاين',
    userCapacity: 2,
    phone: '01280042900',
  },
];

// Convenience: returns the display label for a stored branch value.
export function branchLabel(value: string): string {
  if (value === MAIN_BRANCH_VALUE || value === 'الفرع الرئيسي — القاهرة') return MAIN_BRANCH_LABEL;
  return value;
}

// Normalizes any branch name variant to standard 5 canonical branch values
export function normalizeBranchName(raw?: string | null): string {
  if (!raw) return 'الفرع الرئيسي';
  const s = String(raw).trim();
  if (s === 'الكل' || s === 'ALL') return 'الكل';
  if (s.includes('رئيسي') || s.includes('سعد زغلول') || s.includes('القاهرة')) return 'الفرع الرئيسي';
  if (s.includes('عرابي') || s.includes('عدلي')) return 'فرع عرابي';
  if (s.includes('عمر أفندي') || s.includes('عمر افندي') || s.includes('عمر')) return 'فرع عمر أفندي';
  if (s.includes('الثلاثيني') || s.includes('ثلاثيني')) return 'فرع الثلاثيني';
  if (s.includes('تجاري') || s.includes('تجارى') || s.includes('أونلاين') || s.includes('اونلاين')) return 'الفرع التجاري';
  return s;
}

export function getBranchConfig(branchName?: string | null): BranchConfig {
  const norm = normalizeBranchName(branchName);
  const found = BRANCHES_LIST.find(b => b.name === norm);
  return found || BRANCHES_LIST[0];
}

export const BRANCH_TREASURIES: { branch: string; treasury: string }[] = [
  { branch: 'الفرع الرئيسي', treasury: 'خزينة الفرع الرئيسي (سعد زغلول)' },
  { branch: 'فرع عرابي', treasury: 'خزينة فرع عرابي' },
  { branch: 'فرع عمر أفندي', treasury: 'خزينة فرع عمر أفندي' },
  { branch: 'فرع الثلاثيني', treasury: 'خزينة فرع الثلاثيني' },
  { branch: 'الفرع التجاري', treasury: 'خزينة الفرع التجاري' },
];

export function getBranchTreasury(branchName?: string | null): string {
  const norm = normalizeBranchName(branchName);
  const found = BRANCH_TREASURIES.find(bt => bt.branch === norm);
  return found ? found.treasury : 'خزينة الفرع الرئيسي (سعد زغلول)';
}



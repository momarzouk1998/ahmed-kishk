export interface BranchConfig {
  id: string;
  name: string;
  address: string;
  type: 'ستائر وأقمشة تنجيد' | 'أقمشة فقط';
  userCapacity: number;
  phone?: string;
  isMain?: boolean;
}

// Canonical branch value stored in DB (short form) vs display label
export const MAIN_BRANCH_VALUE = 'الفرع الرئيسي';
export const MAIN_BRANCH_LABEL = 'الفرع الرئيسي (سعد زغلول)';

export const BRANCHES_LIST: BranchConfig[] = [
  {
    id: 'br_main',
    name: 'الفرع الرئيسي',
    address: '73 شارع سعد زغلول والجامع العباسي',
    type: 'ستائر وأقمشة تنجيد',
    userCapacity: 2,
    isMain: true,
  },
  {
    id: 'br_oraby',
    name: 'فرع عرابي',
    address: '18 شارع عدلي',
    type: 'ستائر وأقمشة تنجيد',
    userCapacity: 2,
  },
  {
    id: 'br_omareffendi',
    name: 'فرع عمر أفندي',
    address: 'فرع عمر أفندي',
    type: 'أقمشة فقط',
    userCapacity: 2,
  },
  {
    id: 'br_thalatheny',
    name: 'فرع الثلاثيني',
    address: 'شارع الثلاثيني',
    type: 'أقمشة فقط',
    userCapacity: 1,
  },
];

// Convenience: returns the display label for a stored branch value.
export function branchLabel(value: string): string {
  if (value === MAIN_BRANCH_VALUE || value === 'الفرع الرئيسي — القاهرة') return MAIN_BRANCH_LABEL;
  return value;
}

// Renders <option> elements for a branch <select> using the canonical 4-branch list.
// Callers should map: BRANCHES_LIST.map(b => <option value={b.name}>{b.isMain ? MAIN_BRANCH_LABEL : b.name}</option>)

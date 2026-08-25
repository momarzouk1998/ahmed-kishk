export interface BranchConfig {
  id: string;
  name: string;
  address: string;
  type: 'ستائر وأقمشة تنجيد' | 'أقمشة فقط';
  userCapacity: number;
  phone?: string;
  isMain?: boolean;
}

export const BRANCHES_LIST: BranchConfig[] = [
  {
    id: 'br_main',
    name: 'الفرع الرئيسي',
    address: '73 شارع سعد زغلول والجامع العباسي',
    type: 'ستائر وأقمشة تنجيد',
    userCapacity: 1,
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

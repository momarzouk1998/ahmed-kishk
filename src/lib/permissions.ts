export interface PagePermission {
  id: string;
  name: string;
  shortName: string;
  category: 'مراحل الستائر' | 'المبيعات والحسابات' | 'الإدارة والمخزون';
  href: string;
  icon: string;
  hasPriceControl?: boolean;  // toggle: تعديل الأسعار (باسورد المدير عند القفل)
  hasEditControl?: boolean;   // toggle: تعديل السجلات (فتح/إعادة توجيه)
  hasDeleteControl?: boolean; // toggle: حذف السجلات نهائياً
}

export const ALL_SYSTEM_PAGES: PagePermission[] = [
  // مراحل الستائر (Pipeline)
  { id: 'p_inspections', name: '1. رفع المقاسات', shortName: 'المقاسات', category: 'مراحل الستائر', href: '/pipeline/inspections', icon: 'square_foot', hasPriceControl: true, hasEditControl: true, hasDeleteControl: true },
  { id: 'p_pricing', name: '2. التسعير والعقد', shortName: 'التسعير', category: 'مراحل الستائر', href: '/pipeline/pricing', icon: 'request_quote', hasPriceControl: true, hasEditControl: true, hasDeleteControl: true },
  { id: 'p_cutting', name: '3. قص القماش', shortName: 'قص القماش', category: 'مراحل الستائر', href: '/pipeline/cutting', icon: 'content_cut', hasEditControl: true, hasDeleteControl: true },
  { id: 'p_tailoring', name: '4. الورشة', shortName: 'الورشة', category: 'مراحل الستائر', href: '/pipeline/tailoring', icon: 'precision_manufacturing', hasEditControl: true, hasDeleteControl: true },
  { id: 'p_accessories', name: '5. الإكسسوارات', shortName: 'الإكسسوارات', category: 'مراحل الستائر', href: '/pipeline/accessories', icon: 'handyman', hasEditControl: true, hasDeleteControl: true },
  { id: 'p_delivery', name: '6. التسليمات', shortName: 'التسليمات', category: 'مراحل الستائر', href: '/pipeline/delivery', icon: 'local_shipping', hasEditControl: true, hasDeleteControl: true },
  { id: 'p_installation', name: '7. التركيبات', shortName: 'التركيبات', category: 'مراحل الستائر', href: '/pipeline/installation', icon: 'build_circle', hasEditControl: true, hasDeleteControl: true },
  { id: 'p_orders', name: '8. طلبات الستائر', shortName: 'الطلبات', category: 'مراحل الستائر', href: '/orders', icon: 'receipt_long', hasPriceControl: true, hasEditControl: true, hasDeleteControl: true },

  // المبيعات والحسابات
  { id: 'p_dashboard', name: 'الرئيسية', shortName: 'الرئيسية', category: 'المبيعات والحسابات', href: '/', icon: 'dashboard' },
  { id: 'p_fabric_sales', name: 'فواتير المبيعات', shortName: 'المبيعات', category: 'المبيعات والحسابات', href: '/fabric-sales', icon: 'point_of_sale', hasPriceControl: true, hasEditControl: true, hasDeleteControl: true },
  { id: 'p_purchases', name: 'فواتير المشتريات', shortName: 'المشتريات', category: 'المبيعات والحسابات', href: '/purchases', icon: 'shopping_bag', hasPriceControl: true, hasEditControl: true, hasDeleteControl: true },
  { id: 'p_customers', name: 'العملاء والديون', shortName: 'العملاء', category: 'المبيعات والحسابات', href: '/customers', icon: 'group', hasEditControl: true, hasDeleteControl: true },
  { id: 'p_suppliers', name: 'الموردون والمستحقات', shortName: 'الموردون', category: 'المبيعات والحسابات', href: '/suppliers', icon: 'local_shipping', hasEditControl: true, hasDeleteControl: true },

  // الإدارة والمخزون
  { id: 'p_inventory', name: 'المخزون والأصناف', shortName: 'المخزون', category: 'الإدارة والمخزون', href: '/inventory', icon: 'texture', hasPriceControl: true, hasEditControl: true, hasDeleteControl: true },
  { id: 'p_reports', name: 'التقارير المالية', shortName: 'التقارير', category: 'الإدارة والمخزون', href: '/reports', icon: 'bar_chart' },
  { id: 'p_branches', name: 'الفروع والصلاحيات', shortName: 'الفروع', category: 'الإدارة والمخزون', href: '/branches', icon: 'corporate_fare' },
  { id: 'p_settings', name: 'الإعدادات والهوية', shortName: 'الإعدادات', category: 'الإدارة والمخزون', href: '/settings', icon: 'settings' },
];

// Sub-permission suffix builders
export const subPermKey = {
  price: (pageId: string) => `${pageId}_edit_price`,
  edit:  (pageId: string) => `${pageId}_edit`,
  del:   (pageId: string) => `${pageId}_delete`,
};

function isCurrentUserAdmin(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const role = localStorage.getItem('userRole') || localStorage.getItem('user_role');
    if (role === 'admin' || role === 'ADMIN') return true;
    const phone = localStorage.getItem('userPhone') || localStorage.getItem('user_phone') || '';
    // fallback للـ super admins حتى قبل ما يتحمل الـ profile
    return phone === '01558282760' || phone === '01063821000';
  } catch { return true; }
}

function hasSubPerm(pageId: string, subKey: string): boolean {
  if (typeof window === 'undefined') return true;
  if (isCurrentUserAdmin()) return true;
  try {
    const phone = localStorage.getItem('userPhone') || localStorage.getItem('user_phone') || '';
    const raw = localStorage.getItem(`user_perms_${phone}`);
    if (!raw) return true; // بلا قيود مخصصة = مسموح
    const perms: string[] = JSON.parse(raw);
    return perms.includes(pageId) && perms.includes(subKey);
  } catch { return true; }
}

/** يمكن للمستخدم تعديل الأسعار على هذه الصفحة (بدون باسورد مدير). */
export function canUserEditPrices(pageId: string): boolean {
  return hasSubPerm(pageId, subPermKey.price(pageId));
}

/** يمكن للمستخدم تعديل السجلات على هذه الصفحة. */
export function canUserEditRecords(pageId: string): boolean {
  return hasSubPerm(pageId, subPermKey.edit(pageId));
}

/** يمكن للمستخدم حذف السجلات نهائياً على هذه الصفحة. */
export function canUserDeleteRecords(pageId: string): boolean {
  return hasSubPerm(pageId, subPermKey.del(pageId));
}


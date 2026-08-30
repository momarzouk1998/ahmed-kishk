export interface PagePermission {
  id: string;
  name: string;
  shortName: string;
  category: 'مراحل الستائر' | 'المبيعات والحسابات' | 'الإدارة والمخزون';
  href: string;
  icon: string;
  hasPriceControl?: boolean; // Controls whether price editing can be toggled for this page
}

export const ALL_SYSTEM_PAGES: PagePermission[] = [
  // مراحل الستائر (Pipeline) - الترتيب الرقمي الجديد 1-8
  { id: 'p_inspections', name: '1. رفع المقاسات', shortName: 'المقاسات', category: 'مراحل الستائر', href: '/pipeline/inspections', icon: 'square_foot', hasPriceControl: true },
  { id: 'p_pricing', name: '2. التسعير والعقد', shortName: 'التسعير', category: 'مراحل الستائر', href: '/pipeline/pricing', icon: 'request_quote', hasPriceControl: true },
  { id: 'p_cutting', name: '3. قص القماش', shortName: 'قص القماش', category: 'مراحل الستائر', href: '/pipeline/cutting', icon: 'content_cut' },
  { id: 'p_tailoring', name: '4. الورشة', shortName: 'الورشة', category: 'مراحل الستائر', href: '/pipeline/tailoring', icon: 'precision_manufacturing' },
  { id: 'p_accessories', name: '5. الإكسسوارات', shortName: 'الإكسسوارات', category: 'مراحل الستائر', href: '/pipeline/accessories', icon: 'handyman' },
  { id: 'p_delivery', name: '6. التسليمات', shortName: 'التسليمات', category: 'مراحل الستائر', href: '/pipeline/delivery', icon: 'local_shipping' },
  { id: 'p_installation', name: '7. التركيبات', shortName: 'التركيبات', category: 'مراحل الستائر', href: '/pipeline/installation', icon: 'build_circle' },
  { id: 'p_orders', name: '8. طلبات الستائر', shortName: 'الطلبات', category: 'مراحل الستائر', href: '/orders', icon: 'receipt_long', hasPriceControl: true },

  // المبيعات والحسابات
  { id: 'p_dashboard', name: 'الرئيسية', shortName: 'الرئيسية', category: 'المبيعات والحسابات', href: '/', icon: 'dashboard' },
  { id: 'p_fabric_sales', name: 'فواتير المبيعات', shortName: 'المبيعات', category: 'المبيعات والحسابات', href: '/fabric-sales', icon: 'point_of_sale', hasPriceControl: true },
  { id: 'p_purchases', name: 'فواتير المشتريات', shortName: 'المشتريات', category: 'المبيعات والحسابات', href: '/purchases', icon: 'shopping_bag', hasPriceControl: true },
  { id: 'p_customers', name: 'العملاء والديون', shortName: 'العملاء', category: 'المبيعات والحسابات', href: '/customers', icon: 'group' },
  { id: 'p_suppliers', name: 'الموردون والمستحقات', shortName: 'الموردون', category: 'المبيعات والحسابات', href: '/suppliers', icon: 'local_shipping' },

  // الإدارة والمخزون
  { id: 'p_inventory', name: 'المخزون والأصناف', shortName: 'المخزون', category: 'الإدارة والمخزون', href: '/inventory', icon: 'texture', hasPriceControl: true },
  { id: 'p_reports', name: 'التقارير المالية', shortName: 'التقارير', category: 'الإدارة والمخزون', href: '/reports', icon: 'bar_chart' },
  { id: 'p_branches', name: 'الفروع والصلاحيات', shortName: 'الفروع', category: 'الإدارة والمخزون', href: '/branches', icon: 'corporate_fare' },
  { id: 'p_settings', name: 'الإعدادات والهوية', shortName: 'الإعدادات', category: 'الإدارة والمخزون', href: '/settings', icon: 'settings' },
];

/**
 * Check if the current user has permission to edit/modify prices for a given page.
 * Returns true for admins, or if explicit price edit permission `${pageId}_edit_price` is present.
 */
export function canUserEditPrices(pageId: string): boolean {
  if (typeof window === 'undefined') return true;

  try {
    const userRole = localStorage.getItem('userRole') || localStorage.getItem('user_role');
    const userPhone = localStorage.getItem('userPhone') || localStorage.getItem('user_phone') || '01063821000';

    // Super Admin / Managers always have price edit rights
    if (userRole === 'admin' || userPhone === '01558282760' || userPhone === '01063821000') {
      return true;
    }

    const savedPermsRaw = localStorage.getItem(`user_perms_${userPhone}`);
    if (!savedPermsRaw) return true; // Default fallback to enabled if no explicit restrictions saved

    const perms: string[] = JSON.parse(savedPermsRaw);
    
    // Check if the page itself is allowed AND price edit sub-permission is enabled
    const priceEditKey = `${pageId}_edit_price`;
    return perms.includes(pageId) && perms.includes(priceEditKey);
  } catch (e) {
    return true;
  }
}


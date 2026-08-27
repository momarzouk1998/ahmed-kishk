export interface PagePermission {
  id: string;
  name: string;
  shortName: string;
  category: 'مراحل الستائر' | 'المبيعات والحسابات' | 'الإدارة والمخزون';
  href: string;
  icon: string;
}

export const ALL_SYSTEM_PAGES: PagePermission[] = [
  // مراحل الستائر (Pipeline) - أسماء مختصرة ونظيفة
  { id: 'p_orders', name: 'سجل أوامر الستائر', shortName: 'الأوامر', category: 'مراحل الستائر', href: '/orders', icon: 'receipt_long' },
  { id: 'p_inspections', name: 'رفع المقاسات', shortName: 'المقاسات', category: 'مراحل الستائر', href: '/pipeline/inspections', icon: 'square_foot' },
  { id: 'p_pricing', name: 'التسعير والعقد', shortName: 'التسعير', category: 'مراحل الستائر', href: '/pipeline/pricing', icon: 'request_quote' },
  { id: 'p_cutting', name: 'القص والتجهيز', shortName: 'القص', category: 'مراحل الستائر', href: '/pipeline/cutting', icon: 'content_cut' },
  { id: 'p_tailoring', name: 'الخياطة والتفصيل', shortName: 'الخياطة', category: 'مراحل الستائر', href: '/pipeline/tailoring', icon: 'precision_manufacturing' },
  { id: 'p_accessories', name: 'الإكسسوارات', shortName: 'الإكسسوارات', category: 'مراحل الستائر', href: '/pipeline/accessories', icon: 'handyman' },
  { id: 'p_installation', name: 'التركيب والتسليم', shortName: 'التركيب', category: 'مراحل الستائر', href: '/pipeline/installation', icon: 'local_shipping' },

  // المبيعات والحسابات
  { id: 'p_dashboard', name: 'الرئيسية', shortName: 'الرئيسية', category: 'المبيعات والحسابات', href: '/', icon: 'dashboard' },
  { id: 'p_fabric_sales', name: 'بيع الأقمشة (POS)', shortName: 'نقطة البيع', category: 'المبيعات والحسابات', href: '/fabric-sales', icon: 'point_of_sale' },
  { id: 'p_customers', name: 'العملاء والديون', shortName: 'العملاء', category: 'المبيعات والحسابات', href: '/customers', icon: 'group' },
  { id: 'p_suppliers', name: 'الموردون', shortName: 'الموردون', category: 'المبيعات والحسابات', href: '/suppliers', icon: 'local_shipping' },

  // الإدارة والمخزون
  { id: 'p_inventory', name: 'المخزون والأصناف', shortName: 'المخزون', category: 'الإدارة والمخزون', href: '/inventory', icon: 'texture' },
  { id: 'p_reports', name: 'التقارير المالية', shortName: 'التقارير', category: 'الإدارة والمخزون', href: '/reports', icon: 'bar_chart' },
  { id: 'p_branches', name: 'الفروع والصلاحيات', shortName: 'الفروع', category: 'الإدارة والمخزون', href: '/branches', icon: 'corporate_fare' },
  { id: 'p_settings', name: 'الإعدادات والهوية', shortName: 'الإعدادات', category: 'الإدارة والمخزون', href: '/settings', icon: 'settings' },
];

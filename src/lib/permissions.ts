export interface PagePermission {
  id: string;
  name: string;
  category: 'مراحل الستائر' | 'المبيعات والحسابات' | 'الإدارة والمخزون';
  href: string;
  icon: string;
}

export const ALL_SYSTEM_PAGES: PagePermission[] = [
  // مراحل الستائر (Pipeline)
  { id: 'p_inspections', name: '1. المعاينات ورفع المقاسات', category: 'مراحل الستائر', href: '/pipeline/inspections', icon: 'square_foot' },
  { id: 'p_pricing', name: '2. التسعير والعقد والعربون', category: 'مراحل الستائر', href: '/pipeline/pricing', icon: 'request_quote' },
  { id: 'p_cutting', name: '3. الورشة - القص وتجهيز القماش', category: 'مراحل الستائر', href: '/pipeline/cutting', icon: 'content_cut' },
  { id: 'p_tailoring', name: '4. الورشة - الخياطة والتفصيل', category: 'مراحل الستائر', href: '/pipeline/tailoring', icon: 'precision_manufacturing' },
  { id: 'p_accessories', name: '5. تجهيز التراكات والإكسسوارات', category: 'مراحل الستائر', href: '/pipeline/accessories', icon: 'handyman' },
  { id: 'p_installation', name: '6. التركيب والتسليم والتحصيل', category: 'مراحل الستائر', href: '/pipeline/installation', icon: 'local_shipping' },

  // المبيعات والحسابات
  { id: 'p_dashboard', name: 'لوحة التحكم والإحصائيات', category: 'المبيعات والحسابات', href: '/', icon: 'dashboard' },
  { id: 'p_fabric_sales', name: 'بيع الأقمشة بالمتر (POS)', category: 'المبيعات والحسابات', href: '/fabric-sales', icon: 'storefront' },
  { id: 'p_customers', name: 'سجل العملاء والديون', category: 'المبيعات والحسابات', href: '/customers', icon: 'group' },
  { id: 'p_suppliers', name: 'الموردون والحسابات', category: 'المبيعات والحسابات', href: '/suppliers', icon: 'local_shipping' },

  // الإدارة والمخزون
  { id: 'p_inventory', name: 'المخزون وحجز الأقمشة', category: 'الإدارة والمخزون', href: '/inventory', icon: 'texture' },
  { id: 'p_reports', name: 'التقارير المالية والأرباح', category: 'الإدارة والمخزون', href: '/reports', icon: 'bar_chart' },
  { id: 'p_branches', name: 'الفروع وصلاحيات الموظفين', category: 'الإدارة والمخزون', href: '/branches', icon: 'corporate_fare' },
  { id: 'p_settings', name: 'إعدادات الهوية والطباعة', category: 'الإدارة والمخزون', href: '/settings', icon: 'settings' },
];

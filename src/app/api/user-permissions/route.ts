import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const STORE_KEY = 'user_permissions_v1';

interface PermsMap {
  // key = phone → { allowedPageIds, restrictToBranch, branch }
  [phone: string]: {
    allowedPageIds: string[];
    restrictToBranch: boolean;
    branch: string;
  };
}

const DEFAULT_PERMS_ROSTER: PermsMap = {
  // Super admins
  '01558282760': {
    allowedPageIds: ['p_inspections', 'p_pricing', 'p_cutting', 'p_tailoring', 'p_accessories', 'p_delivery', 'p_installation', 'p_orders', 'p_dashboard', 'p_fabric_sales', 'p_purchases', 'p_customers', 'p_suppliers', 'p_inventory', 'p_reports', 'p_branches', 'p_settings'],
    restrictToBranch: false,
    branch: 'المدير العام',
  },
  '01063821000': {
    allowedPageIds: ['p_inspections', 'p_pricing', 'p_cutting', 'p_tailoring', 'p_accessories', 'p_delivery', 'p_installation', 'p_orders', 'p_dashboard', 'p_fabric_sales', 'p_purchases', 'p_customers', 'p_suppliers', 'p_inventory', 'p_reports', 'p_branches', 'p_settings'],
    restrictToBranch: false,
    branch: 'الفرع الرئيسي',
  },
  // يوسف ياسر (الفرع الرئيسي)
  '01279549182': {
    allowedPageIds: ['p_inspections', 'p_pricing', 'p_cutting', 'p_tailoring', 'p_accessories', 'p_delivery', 'p_installation', 'p_orders', 'p_dashboard', 'p_fabric_sales', 'p_purchases', 'p_customers', 'p_suppliers', 'p_inventory', 'p_reports', 'p_fabric_sales_edit_price', 'p_purchases_edit_price', 'p_inventory_edit_price', 'p_inspections_edit_price', 'p_pricing_edit_price', 'p_orders_edit_price'],
    restrictToBranch: true,
    branch: 'الفرع الرئيسي',
  },
  // أحمد عبدالله (فرع عرابي)
  '01023232370': {
    allowedPageIds: ['p_inspections', 'p_pricing', 'p_cutting', 'p_tailoring', 'p_accessories', 'p_delivery', 'p_installation', 'p_orders', 'p_fabric_sales', 'p_purchases', 'p_customers', 'p_suppliers', 'p_inventory', 'p_reports', 'p_fabric_sales_edit_price', 'p_purchases_edit_price', 'p_inventory_edit_price', 'p_inspections_edit_price', 'p_pricing_edit_price', 'p_orders_edit_price'],
    restrictToBranch: true,
    branch: 'فرع عرابي',
  },
  // محمد نصار (كاشير عرابي)
  '01055288214': {
    allowedPageIds: ['p_inspections', 'p_pricing', 'p_fabric_sales', 'p_customers', 'p_inventory'],
    restrictToBranch: true,
    branch: 'فرع عرابي',
  },
  // محمد كشك (مدير فرع عمر أفندي - فرع أقمشة فقط بدون مراحل ستائر)
  '01018728640': {
    allowedPageIds: ['p_fabric_sales', 'p_purchases', 'p_customers', 'p_suppliers', 'p_inventory', 'p_fabric_sales_edit_price', 'p_purchases_edit_price', 'p_inventory_edit_price'],
    restrictToBranch: true,
    branch: 'فرع عمر أفندي',
  },
  // أحمد عبدالعال (كاشير فرع عمر أفندي - فرع أقمشة فقط بدون مراحل ستائر وبدون تعديل أسعار)
  '01275763008': {
    allowedPageIds: ['p_fabric_sales', 'p_customers', 'p_inventory'],
    restrictToBranch: true,
    branch: 'فرع عمر أفندي',
  },
  // عبدالله كشك (مدير فرع الثلاثيني - فرع أقمشة فقط بدون مراحل ستائر)
  '01033447262': {
    allowedPageIds: ['p_fabric_sales', 'p_purchases', 'p_customers', 'p_suppliers', 'p_inventory', 'p_fabric_sales_edit_price', 'p_purchases_edit_price', 'p_inventory_edit_price'],
    restrictToBranch: true,
    branch: 'فرع الثلاثيني',
  },
};

async function readAllPerms(): Promise<PermsMap> {
  const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
  const raw = rec?.data as any;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as PermsMap;
  return {};
}

async function writeAllPerms(map: PermsMap): Promise<void> {
  await prisma.systemStore.upsert({
    where: { key: STORE_KEY },
    update: { data: map as any },
    create: { key: STORE_KEY, data: map as any },
  });
}

// GET ?phone=xxx  → returns { allowedPageIds, restrictToBranch, branch } for that user
export async function GET(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const url = new URL(request.url);
    const phone = String(url.searchParams.get('phone') || '').trim();
    if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

    const map = await readAllPerms();
    let entry = map[phone] || DEFAULT_PERMS_ROSTER[phone] || {
      allowedPageIds: ['p_fabric_sales', 'p_inventory', 'p_customers'],
      restrictToBranch: true,
      branch: 'الفرع الرئيسي',
    };

    // ضمان إخفاء الصفحة الرئيسية لأحمد عبدالله إذا لم يكن محدداً بغير ذلك
    if (phone === '01023232370') {
      entry = {
        ...entry,
        allowedPageIds: (entry.allowedPageIds || []).filter((id: string) => id !== 'p_dashboard'),
      };
    }

    return NextResponse.json(entry);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

// POST { phone, allowedPageIds, restrictToBranch, branch } — يحفظ صلاحيات موظف
// يتطلب أن يكون المستخدم الحالى ADMIN
export async function POST(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'تحتاج صلاحية مدير لتعديل الصلاحيات' }, { status: 403 });
    }

    const body = await request.json();
    const phone = String(body?.phone || '').trim();
    if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

    const map = await readAllPerms();
    const targetBranch = String(body?.branch || 'الفرع الرئيسي');
    map[phone] = {
      allowedPageIds: Array.isArray(body?.allowedPageIds) ? body.allowedPageIds.map(String) : [],
      restrictToBranch: !!body?.restrictToBranch,
      branch: targetBranch,
    };
    await writeAllPerms(map);

    // تحديث فرع الموظف فى جدول المستخدمين
    try {
      await prisma.user.updateMany({
        where: { phone },
        data: { branch: targetBranch },
      });
    } catch (e) {
      console.error('Error updating user branch in Prisma:', e);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

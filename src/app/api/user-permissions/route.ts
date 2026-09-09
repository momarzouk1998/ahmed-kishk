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

function normalizePhone(p: string): string {
  const clean = (p || '').trim().replace(/\s/g, '');
  if (!clean) return '';
  return clean.startsWith('0') ? clean : `0${clean}`;
}

async function readAllPerms(): Promise<PermsMap> {
  try {
    const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
    const raw = rec?.data as any;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as PermsMap;
  } catch (e) {
    console.error('Error reading perms from DB:', e);
  }
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
    const rawPhone = String(url.searchParams.get('phone') || '').trim();
    if (!rawPhone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

    const phone = normalizePhone(rawPhone);
    const normNoZero = phone.replace(/^0/, '');
    const map = await readAllPerms();

    const entry = map[phone] || map[normNoZero] || map[`0${normNoZero}`] || DEFAULT_PERMS_ROSTER[phone] || DEFAULT_PERMS_ROSTER[normNoZero] || {
      allowedPageIds: ['p_fabric_sales', 'p_inventory', 'p_customers'],
      restrictToBranch: true,
      branch: 'الفرع الرئيسي',
    };

    return NextResponse.json(entry);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

// POST { phone, allowedPageIds, restrictToBranch, branch } — يحفظ صلاحيات موظف
export async function POST(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const userPhone = normalizePhone(user.phone || '');
    const isSuperAdmin = userPhone === '01558282760' || userPhone === '01063821000' || user.role === 'ADMIN' || user.branch === 'المدير العام';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'تحتاج صلاحية مدير لتعديل الصلاحيات' }, { status: 403 });
    }

    const body = await request.json();
    const rawPhone = String(body?.phone || '').trim();
    if (!rawPhone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

    const phone = normalizePhone(rawPhone);
    const normNoZero = phone.replace(/^0/, '');
    const map = await readAllPerms();
    const targetBranch = String(body?.branch || 'الفرع الرئيسي');
    const allowedPageIds = Array.isArray(body?.allowedPageIds) ? body.allowedPageIds.map(String) : [];
    const restrictToBranch = !!body?.restrictToBranch;

    const newEntry = {
      allowedPageIds,
      restrictToBranch,
      branch: targetBranch,
    };

    map[phone] = newEntry;
    map[normNoZero] = newEntry;

    await writeAllPerms(map);

    // تحديث فرع الموظف فى جدول المستخدمين
    try {
      await prisma.user.updateMany({
        where: {
          OR: [
            { phone: phone },
            { phone: normNoZero },
            { phone: `0${normNoZero}` },
          ],
        },
        data: { branch: targetBranch },
      });
    } catch (e) {
      console.error('Error updating user branch in Prisma:', e);
    }

    return NextResponse.json({ ok: true, phone, allowedCount: allowedPageIds.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

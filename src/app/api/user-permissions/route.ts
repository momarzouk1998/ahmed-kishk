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
    const phone = url.searchParams.get('phone');
    if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });
    const map = await readAllPerms();
    const entry = map[phone];
    if (!entry) return NextResponse.json({ allowedPageIds: null, restrictToBranch: null, branch: null });
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

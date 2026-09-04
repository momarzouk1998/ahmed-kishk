import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthCookie } from '@/lib/auth';
import { BRANCHES_LIST } from '@/lib/branches';

export const dynamic = 'force-dynamic';

const STORE_KEY = 'branch_price_passwords_v1';
const DEFAULT_PWD = '1234';

/** يرجّع خريطة {فرع: كلمة السر} — أي فرع لسه ما اتغيّرش باسورده بياخد الافتراضى. */
export async function getBranchPricePasswords(): Promise<Record<string, string>> {
  const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
  const raw = (rec?.data as any) || {};
  const map: Record<string, string> = {};
  for (const b of BRANCHES_LIST) {
    map[b.name] = typeof raw[b.name] === 'string' && raw[b.name] ? raw[b.name] : DEFAULT_PWD;
  }
  return map;
}

// GET — الأدمن بس يشوف باسورد كل الفروع
export async function GET(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    if (!user) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'عرض باسوردات الأسعار متاح للأدمن فقط' }, { status: 403 });
    }
    const passwords = await getBranchPricePasswords();
    return NextResponse.json({ success: true, passwords });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST { branch, password } — الأدمن بس يغيّر باسورد فرع معيّن
export async function POST(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    if (!user) return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'تغيير باسورد الأسعار متاح للأدمن فقط' }, { status: 403 });
    }

    const body = await request.json();
    const branch = String(body?.branch || '').trim();
    const password = String(body?.password || '').trim();
    if (!BRANCHES_LIST.some(b => b.name === branch)) {
      return NextResponse.json({ success: false, error: 'فرع غير معروف' }, { status: 400 });
    }
    if (!password || password.length < 3) {
      return NextResponse.json({ success: false, error: 'كلمة السر قصيرة جداً' }, { status: 400 });
    }

    const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
    const current = (rec?.data as any) || {};
    const updated = { ...current, [branch]: password };
    await prisma.systemStore.upsert({
      where: { key: STORE_KEY },
      update: { data: updated },
      create: { key: STORE_KEY, data: updated },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

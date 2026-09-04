import { NextResponse } from 'next/server';
import { verifyAuthCookie } from '@/lib/auth';
import { BRANCHES_LIST } from '@/lib/branches';
import { getBranchPricePasswords, setBranchPricePassword } from '@/lib/branchPricePasswords';

export const dynamic = 'force-dynamic';

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

    await setBranchPricePassword(branch, password);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

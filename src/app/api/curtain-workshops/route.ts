import { NextResponse } from 'next/server';
import { verifyAuthCookie } from '@/lib/auth';
import { getCurtainWorkshops, setCurtainWorkshops } from '@/lib/curtainWorkshops';

export const dynamic = 'force-dynamic';

// GET → أى مستخدم مسجل دخول يقدر يقرأ قائمة الورش (فى دروب داون الورشة وأمر التفصيل)
export async function GET(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    const list = await getCurtainWorkshops();
    return NextResponse.json({ list });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

// POST { list: string[] } → الأدمن يقدر يضيف/يشيل اسم ورشة
export async function POST(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'تحتاج صلاحية مدير لتعديل قائمة الورش' }, { status: 403 });
    }
    const body = await request.json();
    if (!Array.isArray(body?.list)) {
      return NextResponse.json({ error: 'list يجب أن تكون مصفوفة' }, { status: 400 });
    }
    const saved = await setCurtainWorkshops(body.list);
    return NextResponse.json({ ok: true, list: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

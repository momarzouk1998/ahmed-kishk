import { NextResponse } from 'next/server';
import { verifyAuthCookie } from '@/lib/auth';
import { getCurtainTechnicians, setCurtainTechnicians } from '@/lib/curtainTechnicians';

export const dynamic = 'force-dynamic';

// GET → أى مستخدم مسجل دخول يقدر يقرأ القائمة (يستخدمها فى دروب داون فنى المعاينة)
export async function GET(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    const list = await getCurtainTechnicians();
    return NextResponse.json({ list });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

// POST { list: string[] } → الأدمن فقط يقدر يضيف/يشيل فنيين
export async function POST(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'تحتاج صلاحية مدير لتعديل قائمة الفنيين' }, { status: 403 });
    }
    const body = await request.json();
    if (!Array.isArray(body?.list)) {
      return NextResponse.json({ error: 'list يجب أن تكون مصفوفة' }, { status: 400 });
    }
    const saved = await setCurtainTechnicians(body.list);
    return NextResponse.json({ ok: true, list: saved });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

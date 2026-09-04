import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { verifyAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const STORE_KEY = 'manager_price_password_v1';
const DEFAULT_PWD = '1234'; // كلمة سر افتراضية — يستطيع أى مدير تغييرها

async function readStoredHash(): Promise<string> {
  const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
  const raw = rec?.data as any;
  if (raw && typeof raw === 'object' && typeof raw.hash === 'string') return raw.hash;
  // seed default
  const hash = await bcrypt.hash(DEFAULT_PWD, 10);
  await prisma.systemStore.upsert({
    where: { key: STORE_KEY },
    update: { data: { hash } as any },
    create: { key: STORE_KEY, data: { hash } as any },
  });
  return hash;
}

// POST { password } — verify (used by employee price-edit modal)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pwd = String(body?.password || '').trim();
    if (!pwd) return NextResponse.json({ ok: false, error: 'كلمة السر مطلوبة' }, { status: 400 });
    const hash = await readStoredHash();
    const ok = await bcrypt.compare(pwd, hash);
    if (!ok) return NextResponse.json({ ok: false, error: 'كلمة سر المدير غير صحيحة' }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'خطأ' }, { status: 500 });
  }
}

// PUT { currentPassword, newPassword } — تغيير كلمة السر (فقط المدير الحالى)
export async function PUT(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    if (!user) return NextResponse.json({ ok: false, error: 'غير مصرح' }, { status: 401 });
    // #GUARD: كان أي موظف مسجّل دخول يقدر يغيّر باسورد المدير طالما عارف الباسورد
    // الحالي — دلوقتى الأدمن بس (مدير الفرع/المؤسسة) اللي يقدر يغيّرها.
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ ok: false, error: 'تغيير باسورد المدير متاح للأدمن فقط' }, { status: 403 });
    }

    const body = await request.json();
    const cur = String(body?.currentPassword || '').trim();
    const next = String(body?.newPassword || '').trim();
    if (!next || next.length < 3) {
      return NextResponse.json({ ok: false, error: 'كلمة السر الجديدة قصيرة جداً' }, { status: 400 });
    }
    const hash = await readStoredHash();
    const okCurrent = await bcrypt.compare(cur, hash);
    if (!okCurrent) {
      return NextResponse.json({ ok: false, error: 'كلمة السر الحالية غير صحيحة' }, { status: 401 });
    }
    const newHash = await bcrypt.hash(next, 10);
    await prisma.systemStore.upsert({
      where: { key: STORE_KEY },
      update: { data: { hash: newHash } as any },
      create: { key: STORE_KEY, data: { hash: newHash } as any },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'خطأ' }, { status: 500 });
  }
}

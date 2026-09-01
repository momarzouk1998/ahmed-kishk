import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, AUTH_COOKIE } from '@/lib/auth';

// Canonical user roster — Super Admins + مديري/كاشير الفروع الأربعة.
// كلمة السر الافتراضية للجميع: 123456 (يمكن للمدير تغييرها لاحقاً من صفحته).
const DEFAULT_USERS_ROSTER = [
  // Super admins
  { name: 'openappo', phone: '01558282760', role: 'ADMIN', branch: 'المدير العام' },
  { name: 'أحمد كشك', phone: '01063821000', role: 'ADMIN', branch: 'الفرع الرئيسي' },
  // الفرع الرئيسي — سعد زغلول
  { name: 'يوسف ياسر', phone: '01279549182', role: 'ADMIN', branch: 'الفرع الرئيسي' },
  // فرع عرابي
  { name: 'أحمد عبدالله', phone: '01023232370', role: 'ADMIN', branch: 'فرع عرابي' },
  { name: 'محمد نصار', phone: '01055288214', role: 'BRANCH_STAFF', branch: 'فرع عرابي' },
  // فرع عمر أفندي
  { name: 'محمد كشك', phone: '01018728640', role: 'ADMIN', branch: 'فرع عمر أفندي' },
  { name: 'أحمد عبدالعال', phone: '01275763008', role: 'BRANCH_STAFF', branch: 'فرع عمر أفندي' },
  // فرع الثلاثيني
  { name: 'عبدالله كشك', phone: '01033447262', role: 'ADMIN', branch: 'فرع الثلاثيني' },
];

async function ensureDefaultUsers() {
  try {
    const hashedPassword = await bcrypt.hash('123456', 10);
    // Additive upsert — لن يمس المستخدمين القدامى ولا كلمات السر التى غيّرها المدير.
    for (const u of DEFAULT_USERS_ROSTER) {
      await prisma.user.upsert({
        where: { phone: u.phone },
        update: {}, // لا شئ عند وجود المستخدم — نحترم كلمة سره الحالية
        create: {
          name: u.name,
          phone: u.phone,
          password: hashedPassword,
          role: u.role as any,
          branch: u.branch,
        },
      });
    }
  } catch (err) {
    console.error('Auto-seed check failed:', err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = body.phone ? String(body.phone).trim().replace(/\s/g, '') : '';
    const password = body.password ? String(body.password).trim() : '';

    if (!phone || !password) {
      return NextResponse.json({ error: 'رقم الهاتف وكلمة السر مطلوبان' }, { status: 400 });
    }

    // Ensure default admin users exist in DB if empty
    await ensureDefaultUsers();

    // Find user by phone (exact match or with/without leading zero)
    const normalizedPhone = phone.replace(/^0/, '');
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: phone },
          { phone: `0${normalizedPhone}` },
          { phone: normalizedPhone },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'رقم الهاتف غير مسجل في النظام' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'كلمة السر غير صحيحة' }, { status: 401 });
    }

    const token = await signToken({
      userId: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      branch: user.branch,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role, branch: user.branch },
    });

    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: `حدث خطأ في الخادم: ${error?.message || 'خطأ غير معروف'}` },
      { status: 500 }
    );
  }
}

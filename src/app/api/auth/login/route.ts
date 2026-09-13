import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, AUTH_COOKIE } from '@/lib/auth';

// ⚠️ حساب/إعادة إنشاء المستخدمين الافتراضيين تم نقلها بالكامل لـ prisma/seed.ts
// (تُشغَّل يدويًا مرة واحدة عند إعداد النظام: `npm run db:seed`). كانت هنا بتتنفذ
// على *كل* طلب تسجيل دخول، فلو أى حساب من الروستر الثابت اتمسح (قصدًا أو غلط)،
// كان بيرجع يتزرع تلقائيًا بباسورد افتراضى ضعيف (123456) بلا أى تدخل من الأدمن —
// عمليًا باب خلفي دائم. حذفها من هنا يمنع هذا السيناريو نهائيًا.

// ─────────────────────────────────────────────────────────────────────────
// Rate limiting بسيط فى الذاكرة (in-memory) لمنع محاولات brute-force على تسجيل
// الدخول. كافٍ لكونتينر واحد (single instance) — لو النظام اتوسّع لأكتر من
// نسخة/سيرفر مستقبلاً، لازم يتحول لمخزن مشترك (Redis) بدل الـ Map المحلية دي.
// ─────────────────────────────────────────────────────────────────────────
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 دقيقة
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; windowStart: number }>();

function getLoginRateLimitKey(request: Request, phone: string): string {
  const xff = request.headers.get('x-forwarded-for');
  const ip = (xff ? xff.split(',')[0].trim() : null) || 'unknown-ip';
  return `${ip}::${phone}`;
}

function isRateLimited(key: string): boolean {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}

function recordFailedLoginAttempt(key: string): void {
  const entry = loginAttempts.get(key);
  if (!entry || Date.now() - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, windowStart: Date.now() });
  } else {
    entry.count += 1;
  }
}

function clearLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phone = body.phone ? String(body.phone).trim().replace(/\s/g, '') : '';
    const password = body.password ? String(body.password).trim() : '';

    if (!phone || !password) {
      return NextResponse.json({ error: 'رقم الهاتف وكلمة السر مطلوبان' }, { status: 400 });
    }

    const rateLimitKey = getLoginRateLimitKey(request, phone);
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { error: 'محاولات كثيرة جدًا لتسجيل الدخول. من فضلك حاول مرة أخرى بعد قليل.' },
        { status: 429 }
      );
    }

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
      recordFailedLoginAttempt(rateLimitKey);
      return NextResponse.json({ error: 'رقم الهاتف غير مسجل في النظام' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      recordFailedLoginAttempt(rateLimitKey);
      return NextResponse.json({ error: 'كلمة السر غير صحيحة' }, { status: 401 });
    }

    clearLoginAttempts(rateLimitKey);

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
      { error: 'حدث خطأ فى الخادم، من فضلك حاول مرة أخرى' },
      { status: 500 }
    );
  }
}

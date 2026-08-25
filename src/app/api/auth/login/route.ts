import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, AUTH_COOKIE } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !password) {
      return NextResponse.json({ error: 'رقم الهاتف وكلمة السر مطلوبان' }, { status: 400 });
    }

    // Normalize phone
    const normalizedPhone = phone.replace(/\s/g, '').replace(/^0/, '0');

    const user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      return NextResponse.json({ error: 'رقم الهاتف أو كلمة السر غير صحيحة' }, { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'رقم الهاتف أو كلمة السر غير صحيحة' }, { status: 401 });
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
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

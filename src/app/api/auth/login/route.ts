import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, AUTH_COOKIE } from '@/lib/auth';

async function ensureDefaultUsers() {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('⚡ No users found in DB. Auto-seeding default admins...');
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      await prisma.user.createMany({
        data: [
          {
            name: 'openappo',
            phone: '01558282760',
            password: hashedPassword,
            role: 'ADMIN',
            branch: 'المدير العام',
          },
          {
            name: 'أحمد كشك',
            phone: '01063821000',
            password: hashedPassword,
            role: 'ADMIN',
            branch: 'الفرع الرئيسي — القاهرة',
          },
        ],
        skipDuplicates: true,
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

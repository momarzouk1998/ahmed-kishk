import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { verifyToken, signToken, AUTH_COOKIE } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
    if (!token) return NextResponse.json({ user: null });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ user: null });
    return NextResponse.json({ user: { name: payload.name, phone: payload.phone, role: payload.role, branch: payload.branch } });
  } catch {
    return NextResponse.json({ user: null });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'جلسة منتهية الصلاحية' }, { status: 401 });
    }

    const { name, phone, currentPassword, newPassword } = await request.json();

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // If changing password, verify current password first
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'أدخل كلمة السر الحالية أولاً' }, { status: 400 });
      }
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return NextResponse.json({ error: 'كلمة السر الحالية غير صحيحة' }, { status: 400 });
      }
    }

    const updateData: Record<string, string> = {};
    if (name) updateData.name = name;
    if (phone && phone !== user.phone) updateData.phone = phone;
    if (newPassword) updateData.password = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
    });

    // Re-issue token with new data
    const newToken = await signToken({
      userId: updated.id,
      phone: updated.phone,
      name: updated.name,
      role: updated.role,
      branch: updated.branch,
    });

    const response = NextResponse.json({
      success: true,
      user: { name: updated.name, phone: updated.phone, role: updated.role },
    });

    response.cookies.set(AUTH_COOKIE, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

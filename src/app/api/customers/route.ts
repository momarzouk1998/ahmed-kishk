import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, phone, address, city, balance, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'الاسم ورقم الهاتف مطلوبان' }, { status: 400 });
    }

    const customer = await prisma.customer.upsert({
      where: { phone: phone.trim() },
      create: {
        id: id || undefined,
        name: name.trim(),
        phone: phone.trim(),
        address: address || '',
        city: city || 'القاهرة',
        balance: Number(balance) || 0,
        notes: notes || '',
      },
      update: {
        name: name.trim(),
        address: address || '',
        city: city || 'القاهرة',
        balance: Number(balance) || 0,
        notes: notes || '',
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

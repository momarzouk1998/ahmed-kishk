import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, suppliers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, phone, address, balance, notes } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم المورد مطلوب' }, { status: 400 });
    }

    const supplierId = id || `SUP-${Date.now()}`;
    const supplier = await prisma.supplier.upsert({
      where: { id: supplierId },
      create: {
        id: supplierId,
        name: name.trim(),
        phone: phone || '',
        address: address || '',
        balance: Number(balance) || 0,
        notes: notes || '',
      },
      update: {
        name: name.trim(),
        phone: phone || '',
        address: address || '',
        balance: Number(balance) || 0,
        notes: notes || '',
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

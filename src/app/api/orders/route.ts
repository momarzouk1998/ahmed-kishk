import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, phone, totalAmount, paidAmount, stage, technician, installAt, branch, notes } = body;

    if (!customerName || !phone) {
      return NextResponse.json({ error: 'اسم العميل ورقم الهاتف مطلوبان' }, { status: 400 });
    }

    let customer = await prisma.customer.findFirst({
      where: { phone: phone.trim() },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName.trim(),
          phone: phone.trim(),
          city: 'القاهرة',
        },
      });
    }

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        totalAmount: Number(totalAmount) || 0,
        paidAmount: Number(paidAmount) || 0,
        stage: stage || 'اختيار قماش',
        technician: technician || '',
        installAt: installAt ? new Date(installAt) : null,
        branch: branch || 'الفرع الرئيسي — القاهرة',
        notes: notes || '',
      },
      include: {
        customer: true,
      },
    });

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: `حدث خطأ أثناء حفظ الأوردر: ${error?.message}` }, { status: 500 });
  }
}

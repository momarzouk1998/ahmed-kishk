import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await prisma.pipelineOrder.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, orderId, customerName, phone, address, branch, deliveryDate, cutterName, tailorName, technicianName, status, localStatus, totalAmount, depositPaid, remainingAmount, rooms } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Pipeline Order ID is required' }, { status: 400 });
    }

    const order = await prisma.pipelineOrder.upsert({
      where: { id },
      create: {
        id,
        orderId: orderId || id,
        customerName: customerName || '',
        phone: phone || '',
        address: address || '',
        branch: branch || 'الفرع الرئيسي',
        deliveryDate: deliveryDate || null,
        cutterName: cutterName || null,
        tailorName: tailorName || null,
        technicianName: technicianName || null,
        status: status || 'في المقص',
        localStatus: localStatus || 'بانتظار القص',
        totalAmount: Number(totalAmount) || 0,
        depositPaid: Number(depositPaid) || 0,
        remainingAmount: Number(remainingAmount) || 0,
        rooms: rooms || [],
      },
      update: {
        status: status || undefined,
        localStatus: localStatus || undefined,
        cutterName: cutterName !== undefined ? cutterName : undefined,
        tailorName: tailorName !== undefined ? tailorName : undefined,
        technicianName: technicianName !== undefined ? technicianName : undefined,
        deliveryDate: deliveryDate !== undefined ? deliveryDate : undefined,
        depositPaid: depositPaid !== undefined ? Number(depositPaid) : undefined,
        remainingAmount: remainingAmount !== undefined ? Number(remainingAmount) : undefined,
        rooms: rooms !== undefined ? rooms : undefined,
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const orders = await prisma.pipelineOrder.findMany({
      where: branchWhere(scope),
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const body = await request.json();
    const { customerName, phone, address, totalAmount, depositPaid, status, localStatus, technicianName, branch, rooms } = body;

    if (!customerName || !phone) {
      return NextResponse.json({ error: 'اسم العميل ورقم الهاتف مطلوبان' }, { status: 400 });
    }

    const effBranch = effectiveCreateBranch(scope, branch);

    const order = await prisma.pipelineOrder.create({
      data: {
        orderId: `ORD-${Date.now()}`,
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address || '',
        branch: effBranch,
        totalAmount: Number(totalAmount) || 0,
        depositPaid: Number(depositPaid) || 0,
        remainingAmount: Math.max(0, (Number(totalAmount) || 0) - (Number(depositPaid) || 0)),
        status: status || 'في المقص',
        localStatus: localStatus || 'بانتظار القص',
        technicianName: technicianName || '',
        rooms: rooms || [],
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ success: false, error: `حدث خطأ أثناء حفظ الأوردر: ${error?.message}` }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await prisma.pipelineOrder.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    let fallbackOrders: any[] = [];
    try {
      const store = await prisma.systemStore.findUnique({
        where: { key: 'ahmed_kishk_pipeline_orders_v5' },
      });
      if (store && Array.isArray(store.data)) {
        fallbackOrders = store.data as any[];
      }
    } catch {}

    const orderMap = new Map<string, any>();
    fallbackOrders.forEach(o => {
      if (o && o.id) orderMap.set(o.id, o);
    });
    orders.forEach(o => {
      if (o && o.id) orderMap.set(o.id, o);
    });

    const combined = Array.from(orderMap.values());
    return NextResponse.json({ success: true, orders: combined });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawList = Array.isArray(body.orders) ? body.orders : (Array.isArray(body) ? body : [body]);

    const results = [];
    for (const item of rawList) {
      if (!item || !item.id) continue;
      const { id, orderId, customerName, phone, address, branch, deliveryDate, cutterName, tailorName, technicianName, status, localStatus, totalAmount, depositPaid, remainingAmount, rooms } = item;

      const order = await prisma.pipelineOrder.upsert({
        where: { id },
        create: {
          id,
          orderId: orderId || id,
          customerName: customerName || '',
          phone: phone || '',
          address: address || '',
          branch: branch || 'الفرع الرئيسي',
          deliveryDate: deliveryDate ? String(deliveryDate) : null,
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
          orderId: orderId || undefined,
          customerName: customerName || undefined,
          phone: phone || undefined,
          address: address || undefined,
          branch: branch || undefined,
          status: status || undefined,
          localStatus: localStatus || undefined,
          cutterName: cutterName !== undefined ? cutterName : undefined,
          tailorName: tailorName !== undefined ? tailorName : undefined,
          technicianName: technicianName !== undefined ? technicianName : undefined,
          deliveryDate: deliveryDate !== undefined ? (deliveryDate ? String(deliveryDate) : null) : undefined,
          totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
          depositPaid: depositPaid !== undefined ? Number(depositPaid) : undefined,
          remainingAmount: remainingAmount !== undefined ? Number(remainingAmount) : undefined,
          rooms: rooms !== undefined ? rooms : undefined,
        },
      });
      results.push(order);
    }

    return NextResponse.json({ success: true, order: results[0], orders: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

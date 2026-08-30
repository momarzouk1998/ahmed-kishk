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
      if (!item) continue;
      const cleanOrderId = item.orderId || item.id || `ORD-${Date.now()}`;
      const targetId = item.id || `ORD-${cleanOrderId.replace(/^ORD-/, '')}`;

      // Check if existing record exists by id, orderId or customerName
      const existing = await prisma.pipelineOrder.findFirst({
        where: {
          OR: [
            { id: targetId },
            { orderId: cleanOrderId },
            { orderId: cleanOrderId.replace(/^ORD-/, '') },
            { id: cleanOrderId },
            ...(item.customerName ? [{ customerName: item.customerName }] : [])
          ]
        }
      });

      const orderKey = existing ? existing.id : targetId;

      const order = await prisma.pipelineOrder.upsert({
        where: { id: orderKey },
        create: {
          id: orderKey,
          orderId: cleanOrderId,
          customerName: item.customerName || '',
          phone: item.phone || '',
          address: item.address || '',
          branch: item.branch || 'الفرع الرئيسي',
          deliveryDate: item.deliveryDate ? String(item.deliveryDate) : null,
          cutterName: item.cutterName || null,
          tailorName: item.tailorName || null,
          technicianName: item.technicianName || null,
          status: item.status || 'في المقص',
          localStatus: item.localStatus || 'بانتظار القص',
          totalAmount: Number(item.totalAmount) || 0,
          depositPaid: Number(item.depositPaid) || 0,
          remainingAmount: Number(item.remainingAmount) || 0,
          rooms: item.rooms || [],
        },
        update: {
          orderId: cleanOrderId,
          customerName: item.customerName || undefined,
          phone: item.phone || undefined,
          address: item.address || undefined,
          branch: item.branch || undefined,
          status: item.status || undefined,
          localStatus: item.localStatus || undefined,
          cutterName: item.cutterName !== undefined ? item.cutterName : undefined,
          tailorName: item.tailorName !== undefined ? item.tailorName : undefined,
          technicianName: item.technicianName !== undefined ? item.technicianName : undefined,
          deliveryDate: item.deliveryDate !== undefined ? (item.deliveryDate ? String(item.deliveryDate) : null) : undefined,
          totalAmount: item.totalAmount !== undefined ? Number(item.totalAmount) : undefined,
          depositPaid: item.depositPaid !== undefined ? Number(item.depositPaid) : undefined,
          remainingAmount: item.remainingAmount !== undefined ? Number(item.remainingAmount) : undefined,
          rooms: item.rooms !== undefined ? item.rooms : undefined,
        },
      });

      // Cleanup any other duplicate rows with same orderId or customerName
      if (existing) {
        await prisma.pipelineOrder.deleteMany({
          where: {
            id: { not: order.id },
            OR: [
              { orderId: cleanOrderId },
              { orderId: cleanOrderId.replace(/^ORD-/, '') },
              ...(item.customerName ? [{ customerName: item.customerName }] : [])
            ]
          }
        });
      }

      results.push(order);
    }

    return NextResponse.json({ success: true, order: results[0], orders: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const name = searchParams.get('name');

    if (!id && !name) {
      return NextResponse.json({ success: false, error: 'id or name is required' }, { status: 400 });
    }

    const conditions: any[] = [];
    if (id) {
      const cleanId = id.trim();
      const rawId = cleanId.replace(/^ORD-/, '');
      conditions.push({ id: cleanId });
      conditions.push({ orderId: cleanId });
      conditions.push({ orderId: rawId });
      conditions.push({ id: `ORD-${rawId}` });
    }
    if (name) {
      conditions.push({ customerName: name.trim() });
    }

    await prisma.pipelineOrder.deleteMany({
      where: {
        OR: conditions,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

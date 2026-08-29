import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const inspections = await prisma.inspectionRequest.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, inspections });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, customerName, phone, address, branch, scheduledAt, technician, status, isLocked, notes, rooms } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Inspection ID is required' }, { status: 400 });
    }

    const inspection = await prisma.inspectionRequest.upsert({
      where: { id },
      create: {
        id,
        customerName: customerName || 'عميل جديد',
        phone: phone || '',
        address: address || '',
        branch: branch || 'الفرع الرئيسي',
        scheduledAt: scheduledAt || '',
        technician: technician || 'أحمد كشك',
        status: status || 'تم رفع المقاسات',
        isLocked: Boolean(isLocked),
        notes: notes || '',
        rooms: rooms || [],
      },
      update: {
        customerName: customerName || undefined,
        phone: phone || undefined,
        address: address || undefined,
        branch: branch || undefined,
        scheduledAt: scheduledAt || undefined,
        technician: technician || undefined,
        status: status || undefined,
        isLocked: isLocked !== undefined ? Boolean(isLocked) : undefined,
        notes: notes !== undefined ? notes : undefined,
        rooms: rooms !== undefined ? rooms : undefined,
      },
    });

    return NextResponse.json({ success: true, inspection });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

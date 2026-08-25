import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const inspections = await prisma.inspectionRequest.findMany({
      include: {
        customer: true,
        rooms: {
          include: {
            fabrics: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ inspections });
  } catch (error: any) {
    console.error('Error fetching inspections:', error);
    return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, phone, address, scheduledAt, technician, notes, rooms } = body;

    if (!customerName || !phone) {
      return NextResponse.json({ error: 'اسم العميل ورقم الهاتف مطلوبان' }, { status: 400 });
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { phone: phone.trim() },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName.trim(),
          phone: phone.trim(),
          address: address || '',
          city: 'القاهرة',
        },
      });
    }

    // Calculate total cost from rooms
    let totalCost = 0;
    if (rooms && Array.isArray(rooms)) {
      totalCost = rooms.reduce((sum: number, r: any) => sum + (r.estimatedCost || 0), 0);
    }

    // Create InspectionRequest
    const inspection = await prisma.inspectionRequest.create({
      data: {
        customerId: customer.id,
        address: address || '',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        notes: notes || '',
        stage: 'معاينة',
        status: 'SCHEDULED',
        totalCost,
        branch: 'الفرع الرئيسي — القاهرة',
        rooms: {
          create: (rooms || []).map((r: any) => ({
            roomName: r.name || r.roomName || 'غرفة',
            roomType: r.type === 'بلكونة' ? 'BALCONY' : 'WINDOW',
            widthCm: Number(r.widthCm) || 0,
            heightCm: Number(r.heightCm) || 0,
            sides: Number(r.sides) || 2,
            installationType: r.installationType === 'مواسير' ? 'RODS' : r.installationType === 'مجرى حائط' ? 'WALL_TRACK' : 'CEILING_TRACK',
            ceilingType: r.ceilingType === 'جيبسون بورد' ? 'HOLLOW_GYPSUM' : 'STANDARD',
            fabricMeters: Number(r.meters) || 0,
            avgPricePerMeter: Number(r.avgPrice) || 0,
            estimatedCost: Number(r.estimatedCost) || ((Number(r.meters) || 0) * (Number(r.avgPrice) || 0)),
            fabrics: {
              create: (r.fabrics || []).map((f: any) => ({
                layerName: f.layer || f.layerName || 'خامة',
                fabricCode: f.code || f.fabricCode || '',
                hasPleatedTape: Boolean(f.tape || f.hasPleatedTape),
                hasEyeletRings: Boolean(f.eyelet || f.hasEyeletRings),
              })),
            },
          })),
        },
      },
      include: {
        customer: true,
        rooms: {
          include: {
            fabrics: true,
          },
        },
      },
    });

    return NextResponse.json({ inspection });
  } catch (error: any) {
    console.error('Error creating inspection:', error);
    return NextResponse.json({ error: `حدث خطأ أثناء حفظ المعاينة: ${error?.message}` }, { status: 500 });
  }
}

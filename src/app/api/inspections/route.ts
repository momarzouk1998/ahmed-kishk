import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const inspections = await prisma.inspectionRequest.findMany({
      where: branchWhere(scope),
      orderBy: { updatedAt: 'desc' },
    });

    let fallbackInspections: any[] = [];
    try {
      const store = await prisma.systemStore.findUnique({
        where: { key: 'ahmed_kishk_inspections_data_v4' },
      });
      if (store && Array.isArray(store.data)) {
        fallbackInspections = store.data as any[];
      }
    } catch {}

    if (scope && !scope.isAdmin) {
      fallbackInspections = fallbackInspections.filter((i: any) => i?.branch === scope.branch);
    }

    const insMap = new Map<string, any>();
    fallbackInspections.forEach(i => {
      if (i && i.id) insMap.set(i.id, i);
    });
    inspections.forEach(i => {
      if (i && i.id) insMap.set(i.id, i);
    });

    const combined = Array.from(insMap.values());
    return NextResponse.json({ success: true, inspections: combined });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const body = await request.json();
    const { id, customerName, phone, address, branch, scheduledAt, technician, status, isLocked, notes, rooms } = body;

    let targetId = id;
    if (!targetId || targetId === 'new' || targetId === 'NEW') {
      const rand = Math.floor(100 + Math.random() * 900);
      targetId = `INS-${Date.now().toString().slice(-6)}-${rand}`;
    }

    // موظف مقيّد بفرع: لا يمكنه إنشاء أو نقل معاينة لفرع آخر مهما أرسل الـ client.
    const effBranch = effectiveCreateBranch(scope, branch);

    const inspection = await prisma.inspectionRequest.upsert({
      where: { id: targetId },
      create: {
        id: targetId,
        customerName: customerName || 'عميل جديد',
        phone: phone || '',
        address: address || '',
        branch: effBranch,
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
        branch: scope && !scope.isAdmin ? scope.branch : (branch || undefined),
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

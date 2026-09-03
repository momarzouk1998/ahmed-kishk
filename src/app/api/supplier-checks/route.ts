import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const checks = await prisma.supplierCheck.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, checks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // يدعم إما شيك واحد أو مصفوفة شيكات (دفعة من فاتورة مشتريات مثلاً)
    const rawList = Array.isArray(body.checks) ? body.checks : (Array.isArray(body) ? body : [body]);

    const results = [];
    for (const c of rawList) {
      if (!c || !c.checkNumber) continue;
      const checkId = c.id || `CHK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const check = await prisma.supplierCheck.upsert({
        where: { id: checkId },
        create: {
          id: checkId,
          checkNumber: String(c.checkNumber).trim(),
          bankName: c.bankName || 'غير محدد',
          supplierId: c.supplierId || '',
          supplierName: c.supplierName || '',
          amount: Number(c.amount) || 0,
          issueDate: c.issueDate || new Date().toISOString().split('T')[0],
          dueDate: c.dueDate || '',
          status: c.status || 'قيد الانتظار',
          notes: c.notes || '',
        },
        update: {
          status: c.status || undefined,
          amount: c.amount !== undefined ? Number(c.amount) : undefined,
          notes: c.notes !== undefined ? c.notes : undefined,
        },
      });
      results.push(check);
    }

    return NextResponse.json({ success: true, check: results[0], checks: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

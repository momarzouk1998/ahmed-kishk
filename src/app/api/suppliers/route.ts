import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const suppliers = await prisma.supplier.findMany({
      where: branchWhere(scope),
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, suppliers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const body = await request.json();
    const { id, name, phone, address, branch, balance, notes } = body;

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
        branch: effectiveCreateBranch(scope, branch),
        balance: Number(balance) || 0,
        notes: notes || '',
      },
      update: {
        name: name.trim(),
        phone: phone || '',
        address: address || '',
        branch: scope && !scope.isAdmin ? scope.branch : (branch || undefined),
        balance: Number(balance) || 0,
        notes: notes || '',
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

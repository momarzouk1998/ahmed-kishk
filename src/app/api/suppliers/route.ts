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
    const {
      id, name, phone, address, branch, notes,
      categoriesSupplied, totalPurchases, paidAmount, openingBalance,
      balance, // = balanceOwed على الواجهة
    } = body;

    const isPartialUpdate = !!id && !name;
    if (!isPartialUpdate && !name) {
      return NextResponse.json({ success: false, error: 'اسم المورد مطلوب' }, { status: 400 });
    }

    const supplierId = id || `SUP-${Date.now()}`;

    if (isPartialUpdate) {
      // تحديث جزئى (مثلاً بعد تسجيل سداد) — لا يمس الحقول غير المُرسَلة
      const supplier = await prisma.supplier.update({
        where: { id: supplierId },
        data: {
          categoriesSupplied: Array.isArray(categoriesSupplied) ? categoriesSupplied : undefined,
          totalPurchases: totalPurchases !== undefined ? Number(totalPurchases) : undefined,
          paidAmount: paidAmount !== undefined ? Number(paidAmount) : undefined,
          openingBalance: openingBalance !== undefined ? Number(openingBalance) : undefined,
          balance: balance !== undefined ? Number(balance) : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
      });
      return NextResponse.json({ success: true, supplier });
    }

    const supplier = await prisma.supplier.upsert({
      where: { id: supplierId },
      create: {
        id: supplierId,
        name: name.trim(),
        phone: phone || '',
        address: address || '',
        branch: effectiveCreateBranch(scope, branch),
        categoriesSupplied: Array.isArray(categoriesSupplied) ? categoriesSupplied : [],
        totalPurchases: Number(totalPurchases) || 0,
        paidAmount: Number(paidAmount) || 0,
        openingBalance: Number(openingBalance) || 0,
        balance: Number(balance) || 0,
        notes: notes || '',
      },
      update: {
        name: name.trim(),
        phone: phone || '',
        address: address || '',
        branch: scope && !scope.isAdmin ? scope.branch : (branch || undefined),
        categoriesSupplied: Array.isArray(categoriesSupplied) ? categoriesSupplied : undefined,
        totalPurchases: totalPurchases !== undefined ? Number(totalPurchases) : undefined,
        paidAmount: paidAmount !== undefined ? Number(paidAmount) : undefined,
        openingBalance: openingBalance !== undefined ? Number(openingBalance) : undefined,
        balance: balance !== undefined ? Number(balance) : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

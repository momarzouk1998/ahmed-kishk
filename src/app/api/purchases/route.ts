import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';

export const dynamic = 'force-dynamic';

/**
 * يربط فاتورة الشراء بالمورد المطابق فى جدول Supplier ويحدّث حقلَيه المالييْن تلقائياً:
 *   - totalPurchases: يزيد/ينقص بفارق صافى الفاتورة (totalAmount)
 *   - balance (= balanceOwed): يزيد/ينقص بفارق المتبقى الآجل (remainingAmount)
 *
 * التحديث تفاضلى (delta) وليس إعادة حساب من الصفر، فلا يوجد خطر تكرار أو مسح.
 * المطابقة بالاسم (لا يوجد supplierId فى الموديل، وشاشة إنشاء الفاتورة تُدخل الاسم
 * كنص حر) — ولا يُلمس أى مورد إلا إذا كان هناك مورد واحد فقط بنفس الاسم (+ نفس الفرع
 * إن توفّر). سداد الموردين (SupplierPayment) يظل يخصم من balance بشكل مستقل عبر
 * الواجهة، فإنشاء فاتورة آجلة يرفع balance والسداد يخفضه — سلوك متسق.
 */
async function adjustSupplierAggregate(
  name: string | null | undefined,
  branch: string | null | undefined,
  deltaTotalPurchases: number,
  deltaBalanceOwed: number,
) {
  if (!name || (deltaTotalPurchases === 0 && deltaBalanceOwed === 0)) return;
  const matches = await prisma.supplier.findMany({
    where: { name, ...(branch ? { branch } : {}) },
  });
  if (matches.length !== 1) return; // اسم غير موجود أو غير فريد → لا نخمّن
  const s = matches[0];
  await prisma.supplier.update({
    where: { id: s.id },
    data: {
      totalPurchases: Math.max(0, (Number(s.totalPurchases) || 0) + deltaTotalPurchases),
      balance: Math.max(0, (Number(s.balance) || 0) + deltaBalanceOwed),
    },
  });
}

async function syncSupplierFromPurchase(
  existing: { supplierName: string; totalAmount: number; remainingAmount: number } | null,
  invoice: { supplierName: string; branch: string; totalAmount: number; remainingAmount: number },
) {
  try {
    const newTotal = Number(invoice.totalAmount) || 0;
    const newRemaining = Number(invoice.remainingAmount) || 0;
    const oldTotal = existing ? Number(existing.totalAmount) || 0 : 0;
    const oldRemaining = existing ? Number(existing.remainingAmount) || 0 : 0;
    const oldName = existing?.supplierName;

    if (existing && oldName && oldName !== invoice.supplierName) {
      // تغيّر اسم المورد على الفاتورة: اعكس القديم بالكامل من المورد القديم وأضف الجديد
      await adjustSupplierAggregate(oldName, invoice.branch, -oldTotal, -oldRemaining);
      await adjustSupplierAggregate(invoice.supplierName, invoice.branch, newTotal, newRemaining);
    } else {
      await adjustSupplierAggregate(
        invoice.supplierName,
        invoice.branch,
        newTotal - oldTotal,
        newRemaining - oldRemaining,
      );
    }
  } catch (e) {
    console.error('syncSupplierFromPurchase failed:', e);
  }
}

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const purchases = await prisma.purchaseInvoice.findMany({
      where: branchWhere(scope),
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ success: true, purchases });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    const body = await request.json();
    const {
      id, invoiceNumber, supplierName, supplierPhone, branch,
      subtotal, discountAmount, totalAmount, paidAmount, remainingAmount,
      paymentMethod, status, date, items, notes,
    } = body;

    let invNum = (invoiceNumber || '').trim();
    if (!invNum) {
      invNum = `PUR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;
    }

    const existingById = id ? await prisma.purchaseInvoice.findUnique({ where: { id } }) : null;
    let existingInvoice = existingById;
    let invoice;

    if (existingById) {
      invoice = await prisma.purchaseInvoice.update({
        where: { id: existingById.id },
        data: {
          supplierName: supplierName || undefined,
          supplierPhone: supplierPhone !== undefined ? supplierPhone : undefined,
          branch: branch || undefined,
          subtotal: subtotal !== undefined ? Number(subtotal) : undefined,
          discountAmount: discountAmount !== undefined ? Number(discountAmount) : undefined,
          totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
          paidAmount: paidAmount !== undefined ? Number(paidAmount) : undefined,
          remainingAmount: remainingAmount !== undefined ? Number(remainingAmount) : undefined,
          paymentMethod: paymentMethod || undefined,
          status: status || undefined,
          items: items !== undefined ? items : undefined,
          notes: notes !== undefined ? notes : undefined,
        },
      });
    } else {
      const existingByNumber = await prisma.purchaseInvoice.findUnique({ where: { invoiceNumber: invNum } });
      if (existingByNumber) {
        invNum = `PUR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      }

      invoice = await prisma.purchaseInvoice.create({
        data: {
          id: id || `PUR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          invoiceNumber: invNum,
          supplierName: supplierName || 'مورد عام',
          supplierPhone: supplierPhone || '',
          branch: effectiveCreateBranch(scope, branch),
          subtotal: Number(subtotal) || 0,
          discountAmount: Number(discountAmount) || 0,
          totalAmount: Number(totalAmount) || 0,
          paidAmount: Number(paidAmount) || 0,
          remainingAmount: Number(remainingAmount) || 0,
          paymentMethod: paymentMethod || 'نقدي (كاش)',
          status: status || 'آجل / غير مسدد',
          date: date || new Date().toISOString().split('T')[0],
          items: items || [],
          notes: notes || '',
        },
      });
    }

    await syncSupplierFromPurchase(existingInvoice, invoice);

    // تحديث أرصدة المخزون وسعر التكلفة لكل صنف تم شراؤه
    if (Array.isArray(items) && items.length > 0) {
      const targetBranch = effectiveCreateBranch(scope, branch);
      for (const it of items) {
        const qtyToAdd = Number(it.meters || it.quantity) || 0;
        const unitCost = Number(it.unitCost || it.pricePerMeter || it.costPrice) || 0;
        if (qtyToAdd > 0) {
          try {
            const itemCode = (it.code || '').trim();
            const itemName = (it.name || '').trim();

            let existing = itemCode ? await prisma.inventoryItem.findUnique({ where: { code: itemCode } }) : null;
            if (!existing && itemName) {
              existing = await prisma.inventoryItem.findFirst({
                where: { name: itemName, branch: targetBranch },
              });
            }

            if (existing) {
              await prisma.inventoryItem.update({
                where: { id: existing.id },
                data: {
                  totalQuantity: { increment: qtyToAdd },
                  costPrice: unitCost > 0 ? unitCost : undefined,
                },
              });
            }
          } catch (err) {
            console.error('Failed to sync inventory item quantity from purchase:', err);
          }
        }
      }
    }

    return NextResponse.json({ success: true, invoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'المعرف مطلوب للحذف' }, { status: 400 });
    }
    // اقرأ الفواتير المستهدفة قبل الحذف لعكس أثرها على رصيد المورد
    // #GUARD: موظف مقيّد ميقدرش يمسح فاتورة من فرع تاني حتى لو عرف الـ id.
    const deleteWhere = { AND: [{ OR: [{ id }, { invoiceNumber: id }] }, branchWhere(scope)] };
    const toDelete = await prisma.purchaseInvoice.findMany({ where: deleteWhere });
    await prisma.purchaseInvoice.deleteMany({ where: deleteWhere });
    for (const inv of toDelete) {
      await adjustSupplierAggregate(
        inv.supplierName,
        inv.branch,
        -(Number(inv.totalAmount) || 0),
        -(Number(inv.remainingAmount) || 0),
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

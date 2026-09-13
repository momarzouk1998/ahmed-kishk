import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';
import { generateUniqueSalesInvoiceNumber } from '@/lib/uniqueCode';
import { getTodayDateStr } from '@/lib/dateUtils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const sales = await prisma.salesInvoice.findMany({
      where: branchWhere(scope),
      orderBy: { updatedAt: 'desc' },
    });
    const normalizedSales = sales.map(s => {
      let splitPayments = (s as any).splitPayments || undefined;
      if (!splitPayments && s.notes && s.notes.includes('[SPLIT:')) {
        try {
          const match = s.notes.match(/\[SPLIT:([^\]]+)\]/);
          if (match && match[1]) {
            splitPayments = JSON.parse(match[1]);
          }
        } catch {}
      }
      const cleanNotes = s.notes ? s.notes.replace(/\[SPLIT:[^\]]+\]/g, '').trim() : '';

      return {
        ...s,
        notes: cleanNotes,
        splitPayments,
        paymentMethod: s.paymentType || (s as any).paymentMethod || 'نقدي',
      };
    });
    return NextResponse.json({ success: true, sales: normalizedSales });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const body = await request.json();
    const {
      id, invoiceNumber, customerName, phone, branch, totalAmount, paidAmount, remainingAmount, date, items, notes, splitPayments,
      isOnlineOrder, shippingFee, shippingCompany, trackingNumber, shippingAddress, receiverPhone, orderSource,
    } = body;
    const pMethod = body.paymentMethod || body.paymentType || 'نقدي';

    let finalNotes = (notes || '').trim();
    if (splitPayments && typeof splitPayments === 'object') {
      finalNotes = finalNotes.replace(/\[SPLIT:[^\]]+\]/g, '').trim();
      finalNotes = `${finalNotes} [SPLIT:${JSON.stringify(splitPayments)}]`.trim();
    }

    let invNum = (invoiceNumber || '').trim();

    // Check if this is an update to an existing record
    const existingById = id ? await prisma.salesInvoice.findUnique({ where: { id } }) : null;

    if (existingById && !scope.isAdmin && existingById.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بتعديل فاتورة فرع آخر' }, { status: 403 });
    }

    let invoice;

    if (existingById) {
      // Intentional update to an existing invoice
      invoice = await prisma.salesInvoice.update({
        where: { id: existingById.id },
        data: {
          customerName: customerName || undefined,
          phone: phone || undefined,
          branch: !scope.isAdmin ? scope.branch : (branch || undefined),
          totalAmount: totalAmount !== undefined ? Number(totalAmount) : undefined,
          paidAmount: paidAmount !== undefined ? Number(paidAmount) : undefined,
          remainingAmount: remainingAmount !== undefined ? Number(remainingAmount) : undefined,
          paymentType: pMethod,
          items: items !== undefined ? items : undefined,
          notes: finalNotes !== undefined ? finalNotes : undefined,
          isOnlineOrder: isOnlineOrder !== undefined ? !!isOnlineOrder : undefined,
          shippingFee: shippingFee !== undefined ? Number(shippingFee) || 0 : undefined,
          shippingCompany: shippingCompany !== undefined ? shippingCompany : undefined,
          trackingNumber: trackingNumber !== undefined ? trackingNumber : undefined,
          shippingAddress: shippingAddress !== undefined ? shippingAddress : undefined,
          receiverPhone: receiverPhone !== undefined ? receiverPhone : undefined,
          orderSource: orderSource !== undefined ? orderSource : undefined,
        },
      });
    } else {
      // New invoice creation — مبدأ عدم تطابق الأكواد: لو رقم الفاتورة المقترح من
      // الواجهة (أو الفاضي) مكرر بالفعل، ولّد رقم بديل متحقق فعليًا من قاعدة
      // البيانات (retry loop) بدل محاولة واحدة بس.
      if (!invNum || (await prisma.salesInvoice.findUnique({ where: { invoiceNumber: invNum } }))) {
        invNum = await generateUniqueSalesInvoiceNumber();
      }

      invoice = await prisma.salesInvoice.create({
        data: {
          id: id || `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          invoiceNumber: invNum,
          customerName: customerName || 'عميل نقدي',
          phone: phone || '',
          branch: effectiveCreateBranch(scope, branch),
          totalAmount: Number(totalAmount) || 0,
          paidAmount: Number(paidAmount) || 0,
          remainingAmount: Number(remainingAmount) || 0,
          paymentType: pMethod,
          date: date || getTodayDateStr(),
          items: items || [],
          notes: finalNotes,
          isOnlineOrder: !!isOnlineOrder,
          shippingFee: Number(shippingFee) || 0,
          shippingCompany: shippingCompany || undefined,
          trackingNumber: trackingNumber || undefined,
          shippingAddress: shippingAddress || undefined,
          receiverPhone: receiverPhone || undefined,
          orderSource: orderSource || undefined,
        },
      });

      // ⚠️ خصم فعلي وذرّي (atomic decrement) من المخزون عند تسجيل فاتورة بيع جديدة.
      // قبل هذا التعديل، المخزون كان بيزيد بس من فواتير الشراء ومفيش أي مكان بينقص
      // عند البيع، فـ"الكمية المتاحة" المعروضة فى كل الشاشات كانت بعيدة تدريجيًا عن
      // الواقع. بيطبَّق مرة واحدة بس عند الإنشاء (مش عند أي تعديل لاحق على الفاتورة)
      // تفاديًا لخصم مضاعف لو اتعدلت بيانات دفع الفاتورة بعدين بدون تغيير الأصناف.
      if (Array.isArray(items) && items.length > 0) {
        const targetBranch = effectiveCreateBranch(scope, branch);
        for (const it of items) {
          const qtyToDeduct = Number(it.meters || it.quantity) || 0;
          const itemCode = (it.code || '').trim();
          if (qtyToDeduct <= 0) continue;
          try {
            let existingItem = itemCode ? await prisma.inventoryItem.findUnique({ where: { code: itemCode } }) : null;
            if (!existingItem && it.name) {
              existingItem = await prisma.inventoryItem.findFirst({ where: { name: String(it.name).trim(), branch: targetBranch } });
            }
            if (existingItem) {
              await prisma.inventoryItem.update({
                where: { id: existingItem.id },
                data: { totalQuantity: { decrement: qtyToDeduct } },
              });
            }
          } catch (err) {
            console.error('Failed to deduct inventory quantity for sale:', err);
          }
        }
      }
    }

    const normalizedInvoice = {
      ...invoice,
      notes: notes || '',
      splitPayments: splitPayments || undefined,
      paymentMethod: invoice.paymentType || pMethod,
    };

    return NextResponse.json({ success: true, invoice: normalizedInvoice });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

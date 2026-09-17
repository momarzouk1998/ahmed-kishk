import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope } from '@/lib/branchScope';
import { normalizeBranchName } from '@/lib/branches';

export const dynamic = 'force-dynamic';

// تحويلات بين الفروع — نقل بضاعة (والتسويات النقدية اللي بتقفل ديونها) — بديل
// حل "فاتورة بيع وهمية + فاتورة شراء وهمية" اللي كان بيلخبط أرقام المبيعات
// والمشتريات الحقيقية. سجل مستقل تمامًا، بيحدّث المخزون فعليًا بس متأثرش على
// أي تقرير مبيعات/مشتريات.

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const all = await prisma.branchTransfer.findMany({ orderBy: { createdAt: 'desc' } });

    // مدير الفرع العادي يشوف بس التحويلات اللي فرعه طرف فيها (صادرة أو واردة).
    const transfers = scope.isAdmin
      ? all
      : all.filter(t =>
          normalizeBranchName(t.fromBranch) === normalizeBranchName(scope.branch) ||
          normalizeBranchName(t.toBranch) === normalizeBranchName(scope.branch)
        );

    return NextResponse.json({ success: true, transfers });
  } catch (error: any) {
    console.error('Failed to get branch transfers:', error);
    return NextResponse.json({ success: false, transfers: [], error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { date, kind, fromBranch, toBranch, items, totalValue, splitPayments, notes, createdByName } = body;

    const cleanKind = kind === 'تسوية نقدية' ? 'تسوية نقدية' : 'نقل بضاعة';
    const from = (fromBranch || '').trim();
    const to = (toBranch || '').trim();

    if (!from || !to) {
      return NextResponse.json({ success: false, error: 'الفرع المرسل والفرع المستلم مطلوبين' }, { status: 400 });
    }
    if (normalizeBranchName(from) === normalizeBranchName(to)) {
      return NextResponse.json({ success: false, error: 'لازم الفرعين يكونوا مختلفين' }, { status: 400 });
    }

    // #GUARD: التسوية النقدية بتأثر فعليًا على أرصدة الفروع الحقيقية — للأدمن بس.
    // نقل البضاعة العادي مدير أي فرع طرف فيه (مرسل أو مستلم) يقدر يسجله.
    if (cleanKind === 'تسوية نقدية' && !scope.isAdmin) {
      return NextResponse.json({ success: false, error: 'التسوية بين الفروع متاحة للأدمن فقط' }, { status: 403 });
    }
    if (!scope.isAdmin) {
      const myBranch = normalizeBranchName(scope.branch);
      if (myBranch !== normalizeBranchName(from) && myBranch !== normalizeBranchName(to)) {
        return NextResponse.json({ success: false, error: 'غير مصرح بتسجيل تحويل لا يخص فرعك' }, { status: 403 });
      }
    }

    const cleanItems = cleanKind === 'نقل بضاعة' && Array.isArray(items) ? items : [];
    const value = Number(totalValue) || 0;
    const cleanSplit = cleanKind === 'تسوية نقدية' && splitPayments && typeof splitPayments === 'object' ? {
      cash: Number(splitPayments.cash) || 0,
      instapay: Number(splitPayments.instapay) || 0,
      vodafone: Number(splitPayments.vodafone) || 0,
      visa: Number(splitPayments.visa) || 0,
    } : undefined;
    if (cleanKind === 'تسوية نقدية') {
      const splitSum = cleanSplit ? (cleanSplit.cash + cleanSplit.instapay + cleanSplit.vodafone + cleanSplit.visa) : 0;
      if (!cleanSplit || Math.abs(splitSum - value) > 0.01) {
        return NextResponse.json({ success: false, error: 'توزيع التسوية على طرق الدفع لازم يساوي المبلغ بالظبط' }, { status: 400 });
      }
    }
    if (cleanKind === 'نقل بضاعة' && cleanItems.length === 0) {
      return NextResponse.json({ success: false, error: 'لازم صنف واحد على الأقل فى تحويل البضاعة' }, { status: 400 });
    }
    if (value <= 0) {
      return NextResponse.json({ success: false, error: 'القيمة لازم تكون أكبر من صفر' }, { status: 400 });
    }

    // تحديث المخزون فعليًا — بينقص من الفرع المرسل ويتضاف للفرع المستلم، بنفس
    // منطق "لو الصنف موجود بالاسم زوّد فيه، لو مش موجود اعمله" اللي فى المخزون.
    if (cleanKind === 'نقل بضاعة') {
      for (const it of cleanItems) {
        const meters = Number(it.meters) || 0;
        if (meters <= 0) continue;

        if (it.code) {
          const sourceItem = await prisma.inventoryItem.findUnique({ where: { code: it.code } });
          if (sourceItem) {
            await prisma.inventoryItem.update({
              where: { id: sourceItem.id },
              data: { totalQuantity: { decrement: meters } },
            });
          }
        }

        const destExisting = await prisma.inventoryItem.findFirst({
          where: { name: it.name, branch: to },
        });
        if (destExisting) {
          await prisma.inventoryItem.update({
            where: { id: destExisting.id },
            data: { totalQuantity: { increment: meters } },
          });
        } else {
          const { generateUniqueInventoryCode } = await import('@/lib/uniqueCode');
          const uniqueCode = await generateUniqueInventoryCode();
          await prisma.inventoryItem.create({
            data: {
              code: uniqueCode,
              name: it.name,
              category: it.category || 'ستائر',
              unit: it.unit || 'متر',
              totalQuantity: meters,
              costPrice: Number(it.unitCost) || 0,
              sellPrice: Number(it.unitCost) || 0,
              branch: to,
              supplier: 'تحويل من ' + from,
            },
          });
        }
      }
    }

    const transfer = await prisma.branchTransfer.create({
      data: {
        date: date || new Date().toISOString().slice(0, 10),
        kind: cleanKind,
        fromBranch: from,
        toBranch: to,
        items: cleanItems,
        totalValue: value,
        splitPayments: cleanSplit,
        notes: notes || undefined,
        createdByName: createdByName || undefined,
      },
    });

    return NextResponse.json({ success: true, transfer });
  } catch (error: any) {
    console.error('Failed to create branch transfer:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

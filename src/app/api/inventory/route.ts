import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';
import { assertPagePermission } from '@/lib/permissionsServer';
import { generateUniqueInventoryCode } from '@/lib/uniqueCode';

import initialInventory from '@/data/initialInventory.json';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);

    // التأكد من وجود أصناف الفرع التجاري وكافة الأصناف في قاعدة البيانات
    try {
      const commCount = await prisma.inventoryItem.count({
        where: {
          OR: [
            { branch: 'الفرع التجاري' },
            { branch: { contains: 'تجاري' } },
            { branch: { contains: 'تجارى' } },
          ],
        },
      });
      if (commCount === 0) {
        await prisma.inventoryItem.createMany({
          data: initialInventory as any,
          skipDuplicates: true,
        });
      }
    } catch (e) {
      console.error('Error auto-populating inventory in GET:', e);
    }

    let items = await prisma.inventoryItem.findMany({
      where: branchWhere(scope),
      orderBy: { updatedAt: 'desc' },
    });

    if (items.length === 0) {
      let rawList = initialInventory as any[];
      if (scope && !scope.isAdmin && scope.branch) {
        rawList = rawList.filter(i => i.branch === scope.branch || i.branch === 'الكل');
      }
      return NextResponse.json({ success: true, items: rawList });
    }

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json({ success: true, items: initialInventory });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const body = await request.json();
    const { id, name, category, unit, totalQuantity, quantityDelta, reservedQuantity, costPrice, sellPrice, branch, minAlert, supplier } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم الصنف مطلوب' }, { status: 400 });
    }

    const effBranch = effectiveCreateBranch(scope, branch);

    // #FIX (باغ اختفاء الأصناف + مطلب "إخفاء الكود والتعديل عليه"): كود الصنف
    // بقى بالكامل مسؤولية السيرفر — العميل ولا الواجهة يبعتوه أو يعدّلوه خالص.
    // إنشاء صنف جديد بيولّد كود مُتحقّق فعليًا من قاعدة البيانات إنه مش مكرر
    // (generateUniqueInventoryCode)، وتعديل صنف موجود بيسيب الكود الأصلى زي ما هو
    // دايمًا (id هو المفتاح الحقيقى للتعديل، مش الكود). النتيجة: تصادم الأكواد
    // (اللي كان بيمسح صنف زي "خياطة" بصمت) بقى مستحيل هيكليًا مش بس معالج بعد ما يحصل.
    const existingById = id ? await prisma.inventoryItem.findUnique({ where: { id } }) : null;

    // #GUARD: موظف مقيّد ميقدرش يعدّل صنف من فرع تاني حتى لو عرف الـ id
    // (كان مسموحًا للحقول غير السعرية — الاسم/الكمية/التصنيف — قبل هذا التعديل).
    if (existingById && !scope.isAdmin && existingById.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'غير مصرح بتعديل صنف من فرع آخر' }, { status: 403 });
    }

    let item;
    if (existingById) {
      // #GUARD: تغيير سعر البيع/التكلفة لصنف موجود فعلاً يتطلب صلاحية "تعديل
      // الأسعار" — ده نفس القفل اللي شغال فعلاً فى واجهة /inventory (priceLocked)
      // فبس بنمنع تخطيه بطلب مباشر للـ API.
      const priceChanged =
        (costPrice !== undefined && Number(costPrice) !== Number(existingById.costPrice)) ||
        (sellPrice !== undefined && Number(sellPrice) !== Number(existingById.sellPrice));
      if (priceChanged) {
        const pricePerm = await assertPagePermission(request, 'p_inventory', 'edit_price');
        if (!pricePerm.ok) return NextResponse.json({ success: false, error: pricePerm.error }, { status: pricePerm.status });
      }

      // ⚠️ تعديل الكمية بالجرد اليدوي (quantityDelta) بيتطبق كفارق ذرّي (atomic
      // increment) على القيمة الحالية فعليًا فى الداتابيز وقت الحفظ — مش استبدال
      // الرقم بالكامل بقيمة كانت معروضة فى الفورم لحظة ما الموظف فتحه. ده بيمنع
      // ضياع زيادة مخزون وصلت من فاتورة شراء متزامنة وقت ما الموظف كان بيعدّل.
      // totalQuantity المطلق لسه مدعوم فقط لو مفيش quantityDelta (توافق قديم).
      item = await prisma.inventoryItem.update({
        where: { id: existingById.id },
        data: {
          // #NOTE: code مش موجود هنا عمدًا — التعديل مينفعش يغيّر كود الصنف أبدًا.
          name: name.trim(),
          category: category || undefined,
          unit: unit || undefined,
          totalQuantity:
            quantityDelta !== undefined
              ? { increment: Number(quantityDelta) || 0 }
              : (totalQuantity !== undefined ? Number(totalQuantity) : undefined),
          reservedQuantity: reservedQuantity !== undefined ? Number(reservedQuantity) : undefined,
          costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
          sellPrice: sellPrice !== undefined ? Number(sellPrice) : undefined,
          branch: !scope.isAdmin ? scope.branch : (branch || undefined),
          minAlert: minAlert !== undefined ? Number(minAlert) : undefined,
          supplier: supplier || undefined,
        },
      });
    } else {
      const uniqueCode = await generateUniqueInventoryCode();
      item = await prisma.inventoryItem.create({
        data: {
          id: id || `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          code: uniqueCode,
          name: name.trim(),
          category: category || 'ستائر',
          unit: unit || 'متر',
          totalQuantity: Number(totalQuantity) || 0,
          reservedQuantity: Number(reservedQuantity) || 0,
          costPrice: Number(costPrice) || 0,
          sellPrice: Number(sellPrice) || 0,
          branch: effBranch,
          minAlert: Number(minAlert) || 20,
          supplier: supplier || 'شركة النيل',
        },
      });
    }

    return NextResponse.json({ success: true, item });
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

    // #GUARD: موظف مقيّد ميقدرش يمسح صنف من فرع تاني حتى لو عرف الـ id.
    if (!scope.isAdmin) {
      const existing = await prisma.inventoryItem.findUnique({ where: { id } });
      if (existing && existing.branch !== scope.branch) {
        return NextResponse.json({ success: false, error: 'غير مصرح بحذف صنف من فرع آخر' }, { status: 403 });
      }
    }

    await prisma.inventoryItem.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

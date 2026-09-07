import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope, branchWhere, effectiveCreateBranch } from '@/lib/branchScope';
import { assertPagePermission } from '@/lib/permissionsServer';

import initialInventory from '@/data/initialInventory.json';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const scope = await getBranchScope(request);

    // إذا كانت قاعدة البيانات تحتوي على أقل من 250 صنف، نقوم بإدراج الأصناف فوراً
    try {
      const count = await prisma.inventoryItem.count();
      if (count < 250) {
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
    const body = await request.json();
    const { id, code, name, category, unit, totalQuantity, reservedQuantity, costPrice, sellPrice, branch, minAlert, supplier } = body;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: 'كود الصنف والاسم مطلوبان' }, { status: 400 });
    }

    const effBranch = effectiveCreateBranch(scope, branch);
    const trimmedCode = code.trim();

    // #FIX (باغ اختفاء الأصناف): كان الحفظ upsert بالـ code كمفتاح وحيد — لو صنفين
    // مختلفين اتصادف إن الكود اللي اتولّد لهم أوتوماتيك (زي SAT-#### العشوائى أو
    // FAB-/ITEM- المبنى على آخر أرقام الوقت) طلع نفسه بالصدفة، التسجيل التانى كان
    // بيمسح ويستبدل كل بيانات الأول بصمت (نفس الاسم بيتغيّر لحاجة تانية) من غير أي
    // تنبيه — وده اللي حصل بالظبط لصنف "خياطة" فى فرع عرابي. دلوقتى: التمييز بين
    // "تعديل صنف موجود" (لما id بتاع الصنف نفسه متبعوت ومطابق) و"إنشاء صنف جديد"
    // (تعارض فى الكود بيتحل بتوليد كود بديل فريد، مش استبدال صامت).
    const existingById = id ? await prisma.inventoryItem.findUnique({ where: { id } }) : null;
    const existingByCode = await prisma.inventoryItem.findUnique({ where: { code: trimmedCode } });

    // #GUARD: الكود فريد على مستوى النظام كله (لا لكل فرع). موظف مقيّد لا يستطيع
    // الاستيلاء على صنف فرع آخر بمجرد كتابة نفس الكود.
    if (scope && !scope.isAdmin && existingByCode && existingByCode.id !== existingById?.id && existingByCode.branch !== scope.branch) {
      return NextResponse.json({ success: false, error: 'هذا الكود مستخدم بالفعل فى فرع آخر — اختر كوداً مختلفاً' }, { status: 409 });
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

      // تعارض كود مع صنف آخر (مش هو نفسه) أثناء التعديل — ارفض بدل الاستبدال الصامت
      if (existingByCode && existingByCode.id !== existingById.id) {
        return NextResponse.json({ success: false, error: 'هذا الكود مستخدم بالفعل لصنف آخر — اختر كوداً مختلفاً' }, { status: 409 });
      }

      item = await prisma.inventoryItem.update({
        where: { id: existingById.id },
        data: {
          code: trimmedCode,
          name: name.trim(),
          category: category || undefined,
          unit: unit || undefined,
          totalQuantity: totalQuantity !== undefined ? Number(totalQuantity) : undefined,
          reservedQuantity: reservedQuantity !== undefined ? Number(reservedQuantity) : undefined,
          costPrice: costPrice !== undefined ? Number(costPrice) : undefined,
          sellPrice: sellPrice !== undefined ? Number(sellPrice) : undefined,
          branch: scope && !scope.isAdmin ? scope.branch : (branch || undefined),
          minAlert: minAlert !== undefined ? Number(minAlert) : undefined,
          supplier: supplier || undefined,
        },
      });
    } else {
      // إنشاء صنف جديد. لو الكود (غالبًا مولّد تلقائيًا) اتصادف إنه مستخدم بالفعل
      // لصنف تاني، ولّد كود بديل فريد بدل ما تستبدل الصنف القديم بصمت.
      let finalCode = trimmedCode;
      if (existingByCode) {
        finalCode = `${trimmedCode}-${Date.now().toString().slice(-4)}`;
      }
      item = await prisma.inventoryItem.create({
        data: {
          id: id || `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          code: finalCode,
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

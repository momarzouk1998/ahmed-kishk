import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import initialInventory from '@/data/initialInventory.json';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // ⚠️ الـ endpoint ده بيمسح (deleteMany) أصناف فرع كامل قبل إعادة تعبئتها — كان
    // بلا أي حماية إطلاقًا وقابل للتنفيذ بمجرد فتح اللينك (GET). دلوقتى محمي بمفتاح
    // سري مشترك (SEED_SECRET) بيتبعت من سكريبت الديبلوي بس عبر هيدر مخصص، فمفيش أي
    // طلب خارجي عادي (متصفح/بوت/كراولر) يقدر يشغّله.
    const secretHeader = request.headers.get('x-seed-secret');
    const expectedSecret = process.env.SEED_SECRET;
    if (!expectedSecret || secretHeader !== expectedSecret) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    // ⚠️ كان هنا خطوة (1) بتمسح deleteMany كل أصناف الفرع التجاري بالكامل قبل
    // كل ديلوي، والخطوة (2) كانت upsert بـ update يكتب فوق أي صنف رسمي موجود
    // فعلاً. النتيجة: أي صنف يضيفه الكاشير يدويًا للفرع التجاري (زي "روزالين")
    // كان بيتمسح تمامًا فى الديلوي اللي بعده — واتأكدنا من كده فعليًا: 74 من
    // 75 صنف فى الفرع التجاري كانوا كلهم اتسجلوا فى نفس الدقيقة (وقت آخر
    // ديلوي)، يعني بيتعملهم إعادة ضبط كامل مع كل نشر للكود مهما كان بعيد عن
    // المخزون تمامًا. دلوقتى الجرد إضافي بحت: بيتأكد إن الأصناف الرسمية الـ326
    // موجودة على الأقل مرة واحدة (create لو ناقصة) ومبيلمسش أي صنف موجود فعلاً
    // (مُضاف يدويًا أو رسمي اتعدّل سعره) — بلا حذف وبلا استبدال إطلاقًا.
    const created = await prisma.inventoryItem.createMany({
      data: initialInventory as any,
      skipDuplicates: true,
    });
    const inserted = created.count;

    // 3. مزامنة التصنيفات لجميع الفروع تلقائياً
    const distinctMap = new Map<string, { name: string; branch: string }>();
    (initialInventory as any[]).forEach(item => {
      if (item.category && item.branch) {
        const key = item.category.trim() + '__' + item.branch.trim();
        distinctMap.set(key, { name: item.category.trim(), branch: item.branch.trim() });
      }
    });

    const seedCats = Array.from(distinctMap.values());
    for (const cat of seedCats) {
      try {
        await (prisma as any).branchCategory.upsert({
          where: {
            name_branch: {
              name: cat.name,
              branch: cat.branch,
            },
          },
          create: {
            name: cat.name,
            branch: cat.branch,
          },
          update: {
            name: cat.name,
          },
        });
      } catch (e) {}
    }

    const totalInDb = await prisma.inventoryItem.count();
    const mainCount = await prisma.inventoryItem.count({ where: { branch: 'الفرع الرئيسي' } });
    const orabyCount = await prisma.inventoryItem.count({ where: { branch: 'فرع عرابي' } });
    const thalCount = await prisma.inventoryItem.count({ where: { branch: 'فرع الثلاثيني' } });
    const comCount = await prisma.inventoryItem.count({ where: { branch: 'الفرع التجاري' } });
    const totalCats = await (prisma as any).branchCategory.count();

    return NextResponse.json({
      success: true,
      message: 'تم تحديث واستبدال أصناف المخزن التجاري ومزامنة المخزون والتصنيفات بالكامل بنجاح',
      totalInDb,
      totalCategories: totalCats,
      breakdown: {
        'الفرع الرئيسي': mainCount,
        'فرع عرابي': orabyCount,
        'فرع الثلاثيني': thalCount,
        'الفرع التجاري': comCount,
      },
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

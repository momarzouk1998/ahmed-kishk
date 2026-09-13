import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getBranchScope } from '@/lib/branchScope';
import { assertPagePermission } from '@/lib/permissionsServer';
import initialInventory from '@/data/initialInventory.json';

export const dynamic = 'force-dynamic';

const ALL_BRANCH_NAMES = [
  'الفرع الرئيسي',
  'فرع عرابي',
  'فرع عمر أفندي',
  'فرع الثلاثيني',
  'الفرع التجاري',
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchParam = searchParams.get('branch');

    let dbCats: any[] = [];
    try {
      dbCats = await (prisma as any).branchCategory.findMany({
        orderBy: [{ branch: 'asc' }, { name: 'asc' }],
      });
    } catch (e) {
      console.error('Error querying branchCategory, will check fallback:', e);
    }

    // Auto-seed missing categories from initialInventory.json
    const distinctMap = new Map<string, { name: string; branch: string }>();
    (initialInventory as any[]).forEach(item => {
      if (item.category && item.branch) {
        const key = item.category.trim() + '__' + item.branch.trim();
        distinctMap.set(key, { name: item.category.trim(), branch: item.branch.trim() });
      }
    });

    const existingKeys = new Set(dbCats.map((c: any) => c.name?.trim() + '__' + c.branch?.trim()));
    const missing = Array.from(distinctMap.values()).filter(d => !existingKeys.has(d.name + '__' + d.branch));

    if (missing.length > 0) {
      try {
        await (prisma as any).branchCategory.createMany({
          data: missing,
          skipDuplicates: true,
        });
        dbCats = await (prisma as any).branchCategory.findMany({
          orderBy: [{ branch: 'asc' }, { name: 'asc' }],
        });
      } catch (e) {
        console.error('Error auto-seeding missing categories:', e);
      }
    }

    let filtered = dbCats;
    if (branchParam && branchParam !== 'الكل') {
      filtered = dbCats.filter((c: any) => c.branch === branchParam);
    }

    return NextResponse.json({ success: true, categories: filtered });
  } catch (error: any) {
    console.error('Failed to get categories:', error);
    return NextResponse.json({ success: false, categories: [], error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const body = await request.json();
    const name = (body.name || '').trim();
    const targetBranch = (body.branch || 'الكل').trim();

    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم التصنيف مطلوب' }, { status: 400 });
    }

    const branchesToAdd = targetBranch === 'الكل' ? ALL_BRANCH_NAMES : [targetBranch];
    const created: any[] = [];

    for (const b of branchesToAdd) {
      try {
        const rec = await (prisma as any).branchCategory.upsert({
          where: {
            name_branch: {
              name,
              branch: b,
            },
          },
          create: {
            name,
            branch: b,
          },
          update: {
            name,
          },
        });
        created.push(rec);
      } catch (e) {
        console.error('Error saving category ' + name + ' for branch ' + b + ':', e);
      }
    }

    // Also sync to SystemStore for legacy fallback
    try {
      const allDBCats = await (prisma as any).branchCategory.findMany();
      const map: Record<string, string[]> = {};
      allDBCats.forEach((c: any) => {
        if (!map[c.branch]) map[c.branch] = [];
        map[c.branch].push(c.name);
      });
      await (prisma as any).systemStore.upsert({
        where: { key: 'ahmed_kishk_branch_categories_v2' },
        create: { key: 'ahmed_kishk_branch_categories_v2', data: map },
        update: { data: map },
      });
    } catch (e) {}

    return NextResponse.json({ success: true, created });
  } catch (error: any) {
    console.error('Failed to create category:', error);
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const body = await request.json();
    const oldName = (body.oldName || '').trim();
    const newName = (body.newName || '').trim();
    const branch = body.branch ? body.branch.trim() : undefined;

    if (!oldName || !newName) {
      return NextResponse.json({ success: false, error: 'الاسم القديم والجديد مطلوبان' }, { status: 400 });
    }

    try {
      if (branch && branch !== 'الكل') {
        await (prisma as any).branchCategory.updateMany({
          where: { name: oldName, branch },
          data: { name: newName },
        });
        await prisma.inventoryItem.updateMany({
          where: { category: oldName, branch },
          data: { category: newName },
        });
      } else {
        await (prisma as any).branchCategory.updateMany({
          where: { name: oldName },
          data: { name: newName },
        });
        await prisma.inventoryItem.updateMany({
          where: { category: oldName },
          data: { category: newName },
        });
      }
    } catch (e) {
      console.error('Error updating category in DB:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const scope = await getBranchScope(request);
    if (!scope) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name')?.trim();
    const branch = searchParams.get('branch')?.trim();

    if (!name) {
      return NextResponse.json({ success: false, error: 'اسم التصنيف مطلوب' }, { status: 400 });
    }
    const perm = await assertPagePermission(request, 'p_inventory', 'delete');
    if (!perm.ok) return NextResponse.json({ success: false, error: perm.error }, { status: perm.status });

    try {
      if (branch && branch !== 'الكل') {
        await (prisma as any).branchCategory.deleteMany({
          where: { name, branch },
        });
        await prisma.inventoryItem.updateMany({
          where: { category: name, branch },
          data: { category: 'غير مصنف' },
        });
      } else {
        await (prisma as any).branchCategory.deleteMany({
          where: { name },
        });
        await prisma.inventoryItem.updateMany({
          where: { category: name },
          data: { category: 'غير مصنف' },
        });
      }
    } catch (e) {
      console.error('Error deleting category from DB:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'حدث خطأ فى الخادم' }, { status: 500 });
  }
}

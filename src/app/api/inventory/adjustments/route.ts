import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ADJUSTMENTS_KEY = 'ahmed_kishk_inventory_adjustments_v1';

export interface InventoryAdjustmentLog {
  id: string;
  timestamp: string;
  itemCode: string;
  itemName: string;
  branch: string;
  previousStock: number;
  newStock: number;
  difference: number;
  reason: string;
  userName: string;
}

async function readAdjustments(): Promise<InventoryAdjustmentLog[]> {
  const rec = await prisma.systemStore.findUnique({ where: { key: ADJUSTMENTS_KEY } });
  if (rec && Array.isArray(rec.data)) {
    return (rec.data as unknown) as InventoryAdjustmentLog[];
  }
  return [];
}

async function writeAdjustments(logs: InventoryAdjustmentLog[]): Promise<void> {
  await prisma.systemStore.upsert({
    where: { key: ADJUSTMENTS_KEY },
    update: { data: logs as any },
    create: { key: ADJUSTMENTS_KEY, data: logs as any },
  });
}

// GET /api/inventory/adjustments — جلب سجل التعديلات والجرد
export async function GET() {
  try {
    const logs = await readAdjustments();
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/inventory/adjustments — إضافة حركة تعديل جرد جديدة
export async function POST(request: Request) {
  try {
    const user = await verifyAuthCookie(request);
    const body = await request.json();

    const { itemCode, itemName, branch, previousStock, newStock, reason } = body;
    if (!itemCode || !itemName) {
      return NextResponse.json({ success: false, error: 'بيانات الحركة غير مكتملة' }, { status: 400 });
    }

    const prev = Number(previousStock) || 0;
    const next = Number(newStock) || 0;
    const diff = next - prev;

    const newLog: InventoryAdjustmentLog = {
      id: `ADJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      itemCode,
      itemName,
      branch: branch || 'الفرع الرئيسي',
      previousStock: prev,
      newStock: next,
      difference: diff,
      reason: reason || 'تعديل وتصفية جرد محلي في المخزن',
      userName: user?.name || user?.phone || 'مستخدم النظام',
    };

    const currentLogs = await readAdjustments();
    const updated = [newLog, ...currentLogs].slice(0, 500); // حفظ آخر 500 حركة
    await writeAdjustments(updated);

    return NextResponse.json({ success: true, log: newLog });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

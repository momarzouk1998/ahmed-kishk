import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Delete all operational/transactional data in order
    await prisma.inspectionRequest.deleteMany({});
    await prisma.quotationOrder.deleteMany({});
    await prisma.pipelineOrder.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.inventoryItem.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.salesInvoice.deleteMany({});
    await prisma.purchaseInvoice.deleteMany({});
    await prisma.systemStore.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'تم تصفير جميع بيانات البرنامج بنجاح، مع الحفاظ على حسابات المستخدمين والفروع الرسمية.',
    });
  } catch (error: any) {
    console.error('Error resetting database:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { prisma } from '@/lib/prisma';

/**
 * مبدأ عام للنظام كله: أي كود/رقم تسلسلي (كود صنف مخزون، رقم فاتورة بيع أو شراء،
 * رقم مرتجع...) يتولّد من السيرفر نفسه، ويتحقق فعليًا من قاعدة البيانات إنه مش
 * مكرر قبل ما يتحفظ — مش مجرد رقم عشوائي/مبني على الوقت ونتمنى إنه فريد. لو حصل
 * تصادم (احتمال ضئيل جدًا لكن ممكن)، بيعيد المحاولة بقيمة جديدة تلقائيًا.
 *
 * `exists(candidate)` لازم ترجع true لو الكود ده محجوز بالفعل فى الجدول المطلوب.
 */
export async function generateUniqueCode(
  prefix: string,
  exists: (candidate: string) => Promise<boolean>,
  opts?: { withYear?: boolean }
): Promise<string> {
  const year = new Date().getFullYear();
  for (let attempt = 0; attempt < 8; attempt++) {
    const stamp = `${Date.now().toString().slice(-6)}${attempt}`;
    const rand = Math.floor(100 + Math.random() * 900);
    const candidate = opts?.withYear
      ? `${prefix}-${year}-${stamp}-${rand}`
      : `${prefix}-${stamp}-${rand}`;
    if (!(await exists(candidate))) return candidate;
  }
  // احتياطى نهائى: طابع زمنى كامل + جزء عشوائى طويل، احتمال التكرار فيه شبه معدوم
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** توليد كود صنف مخزون فريد فعليًا فى قاعدة البيانات (بديل الأكواد العشوائية القديمة). */
export async function generateUniqueInventoryCode(): Promise<string> {
  return generateUniqueCode('SAT', async (candidate) => {
    const found = await prisma.inventoryItem.findUnique({ where: { code: candidate } });
    return !!found;
  });
}

/** توليد رقم فاتورة بيع فريد فعليًا. */
export async function generateUniqueSalesInvoiceNumber(): Promise<string> {
  return generateUniqueCode('INV', async (candidate) => {
    const found = await prisma.salesInvoice.findUnique({ where: { invoiceNumber: candidate } });
    return !!found;
  }, { withYear: true });
}

/** توليد رقم فاتورة شراء فريد فعليًا. */
export async function generateUniquePurchaseInvoiceNumber(): Promise<string> {
  return generateUniqueCode('PUR', async (candidate) => {
    const found = await prisma.purchaseInvoice.findUnique({ where: { invoiceNumber: candidate } });
    return !!found;
  }, { withYear: true });
}

/** توليد رقم مرتجع بيع فريد فعليًا. */
export async function generateUniqueSalesReturnNumber(): Promise<string> {
  return generateUniqueCode('RET', async (candidate) => {
    const found = await prisma.salesReturn.findUnique({ where: { returnNumber: candidate } });
    return !!found;
  }, { withYear: true });
}

/** توليد رقم مرتجع شراء فريد فعليًا. */
export async function generateUniquePurchaseReturnNumber(): Promise<string> {
  return generateUniqueCode('PRET', async (candidate) => {
    const found = await prisma.purchaseReturn.findUnique({ where: { returnNumber: candidate } });
    return !!found;
  }, { withYear: true });
}

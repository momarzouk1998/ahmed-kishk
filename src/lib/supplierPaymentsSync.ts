import { prisma } from '@/lib/prisma';

/**
 * بيحدّث depositPaid... يعني paidAmount/remainingAmount/status لفاتورة (فواتير)
 * شراء مورد معيّن، بناءً على إجمالي ما اتسدد له فعليًا (سندات سداد فورية +
 * شيكات مؤكّدة الصرف) — بعد أي إضافة/حذف/تأكيد سند.
 *
 * ⚠️ ليس فيه أي ربط مباشر بين سند السداد وفاتورة شراء معيّنة (المورد الواحد
 * ممكن يكون عليه أكتر من فاتورة). فبنطبّق القاعدة الآمنة اللي منعت نفس المشكلة
 * اللي حصلت مع تحصيلات العملاء: لو المورد عنده فاتورة واحدة بس، إجمالي السداد
 * ده كله بيخصها بالتأكيد فنحدّثها. لو عنده أكتر من فاتورة، مفيش طريقة نعرف
 * السداد ده لأنهيه منهم بالتحديد، فمنسيبهم يدويين بدل ما نخمّن توزيع غلط.
 */
export async function syncPurchaseInvoicesFromSupplierPayments(supplierId: string): Promise<void> {
  if (!supplierId) return;

  try {
    const invoices = await prisma.purchaseInvoice.findMany({
      where: { supplierName: (await prisma.supplier.findUnique({ where: { id: supplierId }, select: { name: true } }))?.name || '__none__' },
    });
    if (invoices.length !== 1) return; // أكتر من فاتورة أو مفيش فواتير — نسيبها يدوي.

    const invoice = invoices[0];

    const [payments, checks] = await Promise.all([
      prisma.supplierPayment.findMany({ where: { supplierId } }),
      prisma.supplierCheck.findMany({ where: { supplierId, status: 'تم الصرف' } }),
    ]);

    const immediateMethods = (m: string) => {
      const s = (m || '').trim();
      return !(s.includes('شيك') || s.includes('آجل') || s.includes('دفعات'));
    };

    const totalSettled =
      payments.filter(p => immediateMethods(p.method)).reduce((s, p) => s + (Number(p.amount) || 0), 0) +
      checks.reduce((s, c) => s + (Number(c.amount) || 0), 0);

    const totalAmt = Number(invoice.totalAmount) || 0;
    const newPaid = Math.min(totalSettled, totalAmt);
    const newRemaining = Math.max(0, totalAmt - newPaid);
    const newStatus = newRemaining === 0 && totalAmt > 0 ? 'مسدد بالكامل' : newPaid > 0 ? 'مسدد جزئياً' : 'آجل / غير مسدد';

    await prisma.purchaseInvoice.update({
      where: { id: invoice.id },
      data: { paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus },
    });
  } catch (err) {
    console.error('syncPurchaseInvoicesFromSupplierPayments failed:', err);
  }
}

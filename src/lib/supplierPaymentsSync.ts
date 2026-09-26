import { prisma } from '@/lib/prisma';

/**
 * المورد بيتعامل معاه كـ"محفظة"/حساب واحد جاري، مش فاتورة فاتورة — "خدت وخدت
 * يبقى عليا كذا، سددت وسددت يبقى عليا كذا" بالظبط زي ما طلب العميل. فبعد أي
 * سداد أو تأكيد شيك، بنجمع إجمالي المستحق (كل فواتير الشراء) وإجمالي المسدد
 * (سندات فورية + شيكات مؤكّدة الصرف)، ونوزّع المسدد على الفواتير الأقدم أولاً
 * (FIFO) — فاتورة قديمة بالكامل، اللي بعدها لحد ما يخلص المبلغ. ده مجرد
 * انعكاس لحالة كل فاتورة على حدة (مسدد/متبقي) لغرض العرض، والحساب الحقيقي
 * (Supplier.balance) فضل زي ما هو من الأول بيتحدّث ذرّيًا مع كل سند.
 */
export async function syncPurchaseInvoicesFromSupplierPayments(supplierId: string): Promise<void> {
  if (!supplierId) return;

  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { name: true } });
    if (!supplier) return;

    const invoices = await prisma.purchaseInvoice.findMany({
      where: { supplierName: supplier.name },
      orderBy: { date: 'asc' },
    });
    if (invoices.length === 0) return;

    const [payments, checks] = await Promise.all([
      prisma.supplierPayment.findMany({ where: { supplierId } }),
      prisma.supplierCheck.findMany({ where: { supplierId, status: 'تم الصرف' } }),
    ]);

    const immediateMethods = (m: string) => {
      const s = (m || '').trim();
      return !(s.includes('شيك') || s.includes('آجل') || s.includes('دفعات'));
    };

    let pool =
      payments.filter(p => immediateMethods(p.method)).reduce((s, p) => s + (Number(p.amount) || 0), 0) +
      checks.reduce((s, c) => s + (Number(c.amount) || 0), 0);

    for (const invoice of invoices) {
      const totalAmt = Number(invoice.totalAmount) || 0;
      const newPaid = Math.max(0, Math.min(pool, totalAmt));
      pool -= newPaid;
      const newRemaining = Math.max(0, totalAmt - newPaid);
      const newStatus = newRemaining === 0 && totalAmt > 0 ? 'مسدد بالكامل' : newPaid > 0 ? 'مسدد جزئياً' : 'آجل / غير مسدد';

      await prisma.purchaseInvoice.update({
        where: { id: invoice.id },
        data: { paidAmount: newPaid, remainingAmount: newRemaining, status: newStatus },
      });
    }
  } catch (err) {
    console.error('syncPurchaseInvoicesFromSupplierPayments failed:', err);
  }
}

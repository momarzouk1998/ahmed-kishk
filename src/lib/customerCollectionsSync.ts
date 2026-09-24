import { prisma } from '@/lib/prisma';

const normPhone = (p: string | null | undefined) => (p || '').replace(/\D/g, '').slice(-10);
const normName = (n: string | null | undefined) => (n || '').trim().toLowerCase();

/**
 * يعيد حساب depositPaid/remainingAmount/status لأي عرض سعر أو أوردر خط إنتاج
 * تابع لنفس العميل (بالاسم أو الهاتف بعد التطبيع)، بناءً على إجمالي سندات
 * التحصيل الحقيقية المخزَّنة فعليًا فى جدول CustomerCollection.
 *
 * يُستدعى بعد إضافة/تعديل/حذف سند تحصيل واحد — نطاقه العميل المتأثر فقط، مش كل
 * عملاء النظام، عكس التصميم القديم اللي كان بيعيد فحص كل الأوردرات فى كل مرة.
 */
export async function syncCustomerOrdersFromCollections(customerName: string, phone: string): Promise<void> {
  const key = normPhone(phone) || normName(customerName);
  if (!key) return;

  try {
    // الجدول صغير نسبيًا (سندات تحصيل) فالفلترة فى الذاكرة بعد جلب الكل مقبولة
    // ومطابقة لنفس منطق المطابقة القديم (بالاسم/الهاتف المطبَّع، لأن عروض
    // الأسعار وأوردرات خط الإنتاج بتخزن اسم/هاتف العميل كنص حر بلا customerId).
    const allCollections = await prisma.customerCollection.findMany();
    const customerCollections = allCollections.filter(c => (normPhone(c.phone) || normName(c.customerName)) === key);
    // سندات قديمة (من قبل ما اتضاف عمود quotationId) مش مربوطة بأوردر بعينه —
    // لسه بتتحسب على مستوى العميل ككل عشان توافق البيانات القديمة.
    const unlinkedTotal = customerCollections
      .filter(c => !c.quotationId)
      .reduce((s, c) => s + (Number(c.amount) || 0), 0);

    const allQuotations = await prisma.quotationOrder.findMany();
    for (const q of allQuotations) {
      const qKey = normPhone(q.phone) || normName(q.customerName);
      if (qKey !== key) continue;
      const totalAmt = Number(q.totalAmount) || 0;

      // ⚠️ #FIX: كان بيحسب totalCol كإجمالي كل سندات تحصيل العميل (عبر كل أوردراته)
      // ويطبّقه على كل أوردر ليها لوحده — فلو العميل عنده أكتر من أوردر، أي سند
      // تحصيل لأوردر تاني كان بيمسح/يقلب المدفوع والمتبقي الصح المُدخل وقت التسعير
      // لهذا الأوردر بالذات. دلوقتى: لو فيه سندات مربوطة فعليًا بالأوردر ده
      // (quotationId) بس اللي بتتحسب. لو مفيش أي سند مربوط بيه، نسيب العربون
      // المُدخل يدويًا فى شاشة التسعير زي ما هو من غير ما نلمسه.
      const linkedCollections = customerCollections.filter(c => c.quotationId === q.id);
      const hasLinked = linkedCollections.length > 0;
      const linkedTotal = linkedCollections.reduce((s, c) => s + (Number(c.amount) || 0), 0);

      let newDeposit: number;
      if (hasLinked) {
        newDeposit = Math.min(totalAmt > 0 ? totalAmt : linkedTotal, linkedTotal);
      } else if (unlinkedTotal > 0) {
        // توافق قديم فقط: مفيش سندات مربوطة بالأوردر ده تحديدًا، بس فيه سندات قديمة
        // غير مربوطة لنفس العميل — نستخدمها لأنها كانت السلوك الوحيد المتاح وقتها.
        newDeposit = Math.min(totalAmt > 0 ? totalAmt : unlinkedTotal, unlinkedTotal);
      } else {
        newDeposit = Number(q.depositPaid) || 0;
      }
      const newRemaining = Math.max(0, totalAmt - newDeposit);
      const newStatus = (newRemaining === 0 && totalAmt > 0)
        ? (['تم التحويل للورشة', 'في الورشة', 'تم التركيب والتسليم'].includes(q.status) ? q.status : 'معتمد ومسدد بالكامل')
        : (newDeposit > 0 ? 'معتمد ومسدد العربون' : q.status);

      await prisma.quotationOrder.update({
        where: { id: q.id },
        data: { depositPaid: newDeposit, remainingAmount: newRemaining, status: newStatus },
      });
    }

    const allPipelines = await prisma.pipelineOrder.findMany();
    for (const p of allPipelines) {
      const pKey = normPhone(p.phone) || normName(p.customerName);
      if (pKey !== key) continue;
      const totalAmt = Number(p.totalAmount) || 0;

      const linkedCollections = customerCollections.filter(c => c.quotationId === p.orderId || c.quotationId === p.id);
      const hasLinked = linkedCollections.length > 0;
      const linkedTotal = linkedCollections.reduce((s, c) => s + (Number(c.amount) || 0), 0);

      let newDeposit: number;
      if (hasLinked) {
        newDeposit = Math.min(totalAmt > 0 ? totalAmt : linkedTotal, linkedTotal);
      } else if (unlinkedTotal > 0) {
        newDeposit = Math.min(totalAmt > 0 ? totalAmt : unlinkedTotal, unlinkedTotal);
      } else {
        newDeposit = Number(p.depositPaid) || 0;
      }
      const newRemaining = Math.max(0, totalAmt - newDeposit);

      await prisma.pipelineOrder.update({
        where: { id: p.id },
        data: { depositPaid: newDeposit, remainingAmount: newRemaining },
      });
    }
  } catch (err) {
    console.error('syncCustomerOrdersFromCollections failed:', err);
  }
}

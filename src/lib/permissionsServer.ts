import { verifyAuthCookie } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const STORE_KEY = 'user_permissions_v1';

interface PermsMap {
  [phone: string]: {
    allowedPageIds: string[];
    restrictToBranch: boolean;
    branch: string;
  };
}

/**
 * تحقق فعلى من صلاحية المستخدم على مستوى السيرفر — مش بس فى الواجهة.
 * القفل اللي بيتعمل فى /branches (تعديل الأسعار / تعديل السجلات / حذف السجلات)
 * كان شغال فى الواجهة بس (يخفى الزرار) لحد دلوقتى، وأى حد يعرف يبعت طلب مباشر
 * للـ API كان يقدر يتخطاه بالكامل. الدالة دى بتتنادى فعليًا جوه كل route قبل
 * أى عملية إنشاء/تعديل/حذف حساسة.
 *
 * الأدمن (ADMIN role) بيعدّى دايمًا. غير كده، لازم يكون عنده الصفحة نفسها +
 * الصلاحية الفرعية المطلوبة (`${pageId}_edit_price` / `_edit` / `_delete`)
 * محفوظين صراحة فى السيرفر.
 */
export async function assertPagePermission(
  request: Request,
  pageId: string,
  subKey: 'edit_price' | 'edit' | 'delete'
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const user = await verifyAuthCookie(request);
  if (!user) return { ok: false, status: 401, error: 'غير مصرح' };
  if (user.role === 'ADMIN') return { ok: true };

  try {
    const rec = await prisma.systemStore.findUnique({ where: { key: STORE_KEY } });
    const map = (rec?.data as any as PermsMap) || {};
    const entry = map[user.phone];
    // مفيش سجل صلاحيات محفوظ لهذا الموظف أصلاً — الافتراضى الآمن: ممنوع.
    if (!entry || !Array.isArray(entry.allowedPageIds)) {
      return { ok: false, status: 403, error: 'لا تملك صلاحية لهذا الإجراء' };
    }
    const fullKey = `${pageId}_${subKey}`;
    if (entry.allowedPageIds.includes(pageId) && entry.allowedPageIds.includes(fullKey)) {
      return { ok: true };
    }
    return { ok: false, status: 403, error: 'لا تملك صلاحية لهذا الإجراء — اطلب من مدير فرعك تفعيلها' };
  } catch {
    return { ok: false, status: 403, error: 'تعذر التحقق من الصلاحية' };
  }
}

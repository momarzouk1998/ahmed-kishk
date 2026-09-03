import { verifyAuthCookie } from '@/lib/auth';

export interface BranchScope {
  isAdmin: boolean;
  branch: string;
}

/**
 * يحدد نطاق رؤية المستخدم الحالى: أدمن = كل الفروع، غير كده = فرعه فقط.
 * يعتمد على verifyAuthCookie (JWT) — مش على middleware، لأن الميدل وير
 * بيتجاهل مسارات /api بالكامل (Arabic لا تُمرَّر فى الـ headers).
 *
 * إرجاع null يعنى تعذّر التحقق من الجلسة (بلا كوكي صالح). هذا لا يمنح
 * صلاحية أدمن — لكنه أيضاً لا يفرض فلترة فرع (نفس السلوك الحالى للراوت
 * قبل هذا التعديل)، لأن كل هذه المسارات لم تكن تتحقق من الجلسة إطلاقاً
 * من قبل. تشديد هذا لاحقاً (رفض الطلب كلياً بلا جلسة) تحسين منفصل.
 */
export async function getBranchScope(request: Request): Promise<BranchScope | null> {
  const user = await verifyAuthCookie(request);
  if (!user) return null;
  return { isAdmin: user.role === 'ADMIN', branch: user.branch || 'الفرع الرئيسي' };
}

/** where-clause جاهز لإدخاله فى أى prisma.findMany: فرع المستخدم المقيّد فقط، أو بلا قيد للأدمن/الجلسة غير المؤكدة. */
export function branchWhere(scope: BranchScope | null): { branch?: string } {
  if (!scope || scope.isAdmin) return {};
  return { branch: scope.branch };
}

/**
 * الفرع الفعلى اللى يُستخدم عند إنشاء سجل جديد:
 * - أدمن: أى فرع بيختاره فى الفورم (requestedBranch)
 * - موظف مقيّد: فرعه هو دايماً، بغض النظر عمّا أُرسل من العميل
 *   (يمنع تعديل الـ payload يدوياً لتغيير الفرع).
 */
export function effectiveCreateBranch(scope: BranchScope | null, requestedBranch: string | undefined, fallback = 'الفرع الرئيسي'): string {
  if (scope && !scope.isAdmin) return scope.branch;
  return requestedBranch || fallback;
}

import { verifyAuthCookie } from '@/lib/auth';

export interface BranchScope {
  isAdmin: boolean;
  branch: string;
}

export function isSuperAdminIdentifier(phone?: string | null, branch?: string | null, role?: string | null): boolean {
  const p = (phone || '').trim().replace(/\s/g, '');
  const norm = p.replace(/^0/, '');
  if (norm === '1063821000' || norm === '1558282760' || p === '01063821000' || p === '01558282760') {
    return true;
  }
  if (branch === 'المدير العام' || branch === 'الكل' || role === 'SUPER_ADMIN') {
    return true;
  }
  return false;
}

/**
 * يحدد نطاق رؤية المستخدم الحالى:
 * - سوبر أدمن (المدير العام أحمد كشك ومطور النظام openappo): يرى كل الفروع (isAdmin: true).
 * - مدير الفرع أو موظف الفرع: يرى فرعه المخصص فقط (isAdmin: false, branch: user.branch).
 */
export async function getBranchScope(request: Request): Promise<BranchScope | null> {
  const user = await verifyAuthCookie(request);
  if (!user) return null;
  const isSuperAdmin = isSuperAdminIdentifier(user.phone, user.branch, user.role);
  return { isAdmin: isSuperAdmin, branch: user.branch || 'الفرع الرئيسي' };
}

/** where-clause جاهز لإدخاله فى أى prisma.findMany: فرع المستخدم المقيّد فقط، أو بلا قيد للأدمن العام. */
export function branchWhere(scope: BranchScope | null): { branch?: string } {
  if (!scope || scope.isAdmin) return {};
  return { branch: scope.branch };
}

/**
 * الفرع الفعلى اللى يُستخدم عند إنشاء سجل جديد:
 * - أدمن عام: أى فرع بيختاره فى الفورم (requestedBranch)
 * - مدير/موظف فرع: فرعه هو دايماً، بغض النظر عمّا أُرسل من العميل
 *   (يمنع تعديل الـ payload يدوياً لتغيير الفرع).
 */
export function effectiveCreateBranch(scope: BranchScope | null, requestedBranch: string | undefined, fallback = 'الفرع الرئيسي'): string {
  if (scope && !scope.isAdmin) return scope.branch;
  return requestedBranch || fallback;
}

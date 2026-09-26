import { verifyAuthCookie } from '@/lib/auth';

export interface BranchScope {
  isAdmin: boolean;
  branch: string;
}

export function isSuperAdminIdentifier(phone?: string | null, branch?: string | null, role?: string | null, name?: string | null): boolean {
  const p = (phone || '').trim().replace(/\s/g, '');
  const norm = p.replace(/^0/, '');
  const n = (name || '').trim().toLowerCase();
  if (norm === '1063821000' || norm === '1558282760' || p === '01063821000' || p === '01558282760') {
    return true;
  }
  if (branch === 'المدير العام' || branch === 'الكل' || role === 'SUPER_ADMIN') {
    return true;
  }
  if (n.includes('أحمد كشك') || n.includes('احمد كشك') || n.includes('openapp') || n.includes('openappo')) {
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
  const isSuperAdmin = isSuperAdminIdentifier(user.phone, user.branch, user.role, (user as any).name);
  return { isAdmin: isSuperAdmin, branch: user.branch || 'الفرع الرئيسي' };
}

import { normalizeBranchName, MAIN_BRANCH_VALUE, MAIN_BRANCH_LABEL } from '@/lib/branches';

export function getBranchVariants(branchOrScope: string | BranchScope | null): string[] {
  if (!branchOrScope) return [];
  const branchStr = typeof branchOrScope === 'string' ? branchOrScope : branchOrScope.branch;
  if (!branchStr) return [];
  const norm = normalizeBranchName(branchStr);
  if (norm === 'فرع عمر أفندي') {
    return Array.from(new Set(['فرع عمر أفندي', 'فرع عمر افندي', 'عمر أفندي', 'عمر افندي', 'عمر', branchStr]));
  }
  if (norm === 'فرع الثلاثيني') {
    return Array.from(new Set(['فرع الثلاثيني', 'فرع التلاتيني', 'الثلاثيني', 'التلاتيني', branchStr]));
  }
  if (norm === 'فرع عرابي') {
    return Array.from(new Set(['فرع عرابي', 'عرابي', 'عدلي', '18 ش عدلي', 'فرع عرابي (18 ش عدلي)', branchStr]));
  }
  if (norm === MAIN_BRANCH_VALUE) {
    return Array.from(new Set([branchStr, norm, MAIN_BRANCH_VALUE, MAIN_BRANCH_LABEL, 'سعد زغلول', 'الرئيسي', '73 سعد زغلول', '73 ش سعد زغلول']));
  }
  if (norm === 'الفرع التجاري') {
    return Array.from(new Set(['الفرع التجاري', 'تجاري', 'تجارى', 'الفرع التجارى', 'التجاري', branchStr]));
  }
  return Array.from(new Set([branchStr, norm]));
}

/** where-clause جاهز لإدخاله فى أى prisma.findMany: فرع المستخدم المقيّد فقط، أو بلا قيد للأدمن العام مع مراعاة كافة الصيغ الإملائية. */
export function branchWhere(scope: BranchScope | null): { branch?: any } {
  if (!scope || scope.isAdmin) return {};
  return { branch: { in: getBranchVariants(scope) } };
}

/** where-clause للعملاء حيث الفرع مخزن فى city */
export function cityWhere(scope: BranchScope | null): { city?: any } {
  if (!scope || scope.isAdmin) return {};
  return { city: { in: getBranchVariants(scope) } };
}

/** where-clause لسندات التحصيل للفرع حسب عمود branch أو خزينة الفرع treasury */
export function collectionBranchWhere(scope: BranchScope | null): any {
  if (!scope || scope.isAdmin) return {};
  const variants = getBranchVariants(scope);
  const norm = normalizeBranchName(scope.branch);
  const treasuryKeyword = norm.replace(/^فرع\s*/, '');
  return {
    OR: [
      { branch: { in: variants } },
      { treasury: { contains: treasuryKeyword } },
      { treasury: { in: variants } },
    ]
  };
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

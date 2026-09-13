/**
 * إدارة التصنيفات المعتمدة حسب الفروع للمخزون وفواتير المبيعات.
 * كل فرع يعتمد تصنيفاته بناءً على الأصناف المسجلة به والتصنيفات المضافة له خصيصاً.
 */

export const DEFAULT_INVENTORY_CATEGORIES = [
  'ستائر',
  'سواريه',
  'تراكات ومواسير',
  'أشرطة وإكسسوارات',
];

export const ALL_BRANCH_NAMES = [
  'الفرع الرئيسي',
  'فرع عرابي',
  'فرع عمر أفندي',
  'فرع الثلاثيني',
  'الفرع التجاري',
];

const BRANCH_CUSTOM_CATEGORIES_KEY = 'ahmed_kishk_branch_categories_v2';
const CUSTOM_CATEGORIES_KEY = 'ahmed_kishk_custom_categories_v1';

// ⚠️ كانت الدالة دي بتقرأ حصريًا من localStorage — تصنيف مضاف من جهاز/متصفح متعرفش
// عليه أي جهاز تاني إلا لو حد أضاف/عدّل حاجة على الجهاز التانى فحدّثت الـ map محليًا
// بالصدفة. `/api/categories` (جدول BranchCategory حقيقي) موجود بالفعل وبيتغذّى من
// كل عمليات الإضافة، فبنعمل مزامنة خلفية منه فى localStorage — نفس نمط
// brandSettings/curtainDefaults/tapeTypePrices (قراءة فورية من الكاش المحلي +
// تحديث فى الخلفية يظهر أثره فى الاستدعاء التالى).
let categoriesSyncInFlight = false;
function syncBranchCategoriesFromServer(): void {
  if (typeof window === 'undefined' || categoriesSyncInFlight) return;
  categoriesSyncInFlight = true;
  fetch('/api/categories?branch=الكل', { cache: 'no-store' })
    .then(res => (res.ok ? res.json() : null))
    .then(json => {
      if (!json?.success || !Array.isArray(json.categories)) return;
      const map: Record<string, string[]> = {};
      json.categories.forEach((c: any) => {
        if (!c?.branch || !c?.name) return;
        if (!map[c.branch]) map[c.branch] = [];
        if (!map[c.branch].includes(c.name)) map[c.branch].push(c.name);
      });
      localStorage.setItem(BRANCH_CUSTOM_CATEGORIES_KEY, JSON.stringify(map));
    })
    .catch(() => {})
    .finally(() => { categoriesSyncInFlight = false; });
}

export function getBranchCustomCategories(branchName?: string): string[] {
  if (typeof window === 'undefined') return [];
  syncBranchCategoriesFromServer();
  try {
    const raw = localStorage.getItem(BRANCH_CUSTOM_CATEGORIES_KEY);
    if (!raw) return [];
    const map: Record<string, string[]> = JSON.parse(raw);
    if (!branchName || branchName === 'الكل') {
      const all: string[] = [];
      Object.values(map).forEach(list => {
        if (Array.isArray(list)) all.push(...list);
      });
      return Array.from(new Set(all));
    }
    return Array.from(new Set(map[branchName] || []));
  } catch {
    return [];
  }
}

// #FIX: التلات دوال دي (إضافة/حذف/تعديل تصنيف) كانت بتبعت الطلب الحقيقي لقاعدة
// البيانات (/api/categories) fire-and-forget (.catch(() => {}) بلا await ولا
// فحص للنتيجة) وترجّع نجاح للواجهة فورًا من الكاش المحلي بس — لو السيرفر رفض
// الطلب (403 مثلاً) كانت الواجهة تفضل عارضة "تم الحفظ/الحذف" رغم إن قاعدة
// البيانات ماتغيرتش خالص. دلوقتى async وبتستنى رد السيرفر فعليًا وترجّع
// true/false حقيقية، والكاش المحلي بيتحدّث بس لو السيرفر أكّد النجاح.

export async function saveBranchCustomCategory(branchName: string, newCategory: string): Promise<boolean> {
  const cat = newCategory.trim();
  if (!cat || typeof window === 'undefined') return false;
  const targetBranch = branchName || 'الكل';
  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: cat, branch: targetBranch }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return false;

    const raw = localStorage.getItem(BRANCH_CUSTOM_CATEGORIES_KEY);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (targetBranch === 'الكل') {
      ALL_BRANCH_NAMES.forEach(b => {
        map[b] = Array.from(new Set([...(map[b] || []), cat]));
      });
    } else {
      map[targetBranch] = Array.from(new Set([...(map[targetBranch] || []), cat]));
    }
    localStorage.setItem(BRANCH_CUSTOM_CATEGORIES_KEY, JSON.stringify(map));

    // Sync to SystemStore (legacy fallback, best-effort)
    fetch('/api/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: BRANCH_CUSTOM_CATEGORIES_KEY, data: map }),
    }).catch(() => {});

    return true;
  } catch {
    return false;
  }
}

export async function deleteBranchCategory(branchName: string, categoryToDelete: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch(`/api/categories?name=${encodeURIComponent(categoryToDelete)}&branch=${encodeURIComponent(branchName || 'الكل')}`, {
      method: 'DELETE',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return false;

    const raw = localStorage.getItem(BRANCH_CUSTOM_CATEGORIES_KEY);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (!branchName || branchName === 'الكل') {
      Object.keys(map).forEach(k => {
        map[k] = (map[k] || []).filter(c => c !== categoryToDelete);
      });
    } else if (map[branchName]) {
      map[branchName] = map[branchName].filter(c => c !== categoryToDelete);
    }
    localStorage.setItem(BRANCH_CUSTOM_CATEGORIES_KEY, JSON.stringify(map));

    fetch('/api/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: BRANCH_CUSTOM_CATEGORIES_KEY, data: map }),
    }).catch(() => {});

    return true;
  } catch {
    return false;
  }
}

export function getPersistentCategories(): string[] {
  return getBranchCustomCategories('الكل');
}

export async function saveCustomCategory(newCategory: string): Promise<boolean> {
  return saveBranchCustomCategory('الكل', newCategory);
}

export async function deleteCategory(categoryToDelete: string): Promise<boolean> {
  return deleteBranchCategory('الكل', categoryToDelete);
}

export async function renameCategory(oldName: string, newName: string, branchName?: string): Promise<boolean> {
  const cleanNew = newName.trim();
  if (!cleanNew || typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName: cleanNew, branch: branchName || 'الكل' }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) return false;

    const raw = localStorage.getItem(BRANCH_CUSTOM_CATEGORIES_KEY);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    Object.keys(map).forEach(k => {
      map[k] = (map[k] || []).map(c => (c === oldName ? cleanNew : c));
    });
    localStorage.setItem(BRANCH_CUSTOM_CATEGORIES_KEY, JSON.stringify(map));

    fetch('/api/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: BRANCH_CUSTOM_CATEGORIES_KEY, data: map }),
    }).catch(() => {});

    return true;
  } catch {
    return false;
  }
}


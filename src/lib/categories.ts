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

export function getBranchCustomCategories(branchName?: string): string[] {
  if (typeof window === 'undefined') return [];
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

export function saveBranchCustomCategory(branchName: string, newCategory: string): string[] {
  const cat = newCategory.trim();
  if (!cat || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BRANCH_CUSTOM_CATEGORIES_KEY);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    
    const targetBranch = branchName || 'الكل';
    if (targetBranch === 'الكل') {
      ALL_BRANCH_NAMES.forEach(b => {
        map[b] = Array.from(new Set([...(map[b] || []), cat]));
      });
    } else {
      map[targetBranch] = Array.from(new Set([...(map[targetBranch] || []), cat]));
    }
    
    localStorage.setItem(BRANCH_CUSTOM_CATEGORIES_KEY, JSON.stringify(map));
    fetch('/api/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: BRANCH_CUSTOM_CATEGORIES_KEY, data: map }),
    }).catch(() => {});
    
    return map[targetBranch] || [];
  } catch {
    return [];
  }
}

export function deleteBranchCategory(branchName: string, categoryToDelete: string) {
  if (typeof window === 'undefined') return;
  try {
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
  } catch {}
}

export function getPersistentCategories(): string[] {
  return getBranchCustomCategories('الكل');
}

export function saveCustomCategory(newCategory: string): string[] {
  return saveBranchCustomCategory('الكل', newCategory);
}

export function deleteCategory(categoryToDelete: string): string[] {
  deleteBranchCategory('الكل', categoryToDelete);
  return getBranchCustomCategories('الكل');
}

export function renameCategory(oldName: string, newName: string): string[] {
  const cleanNew = newName.trim();
  if (!cleanNew || typeof window === 'undefined') return [];
  try {
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
  } catch {}
  return getBranchCustomCategories('الكل');
}


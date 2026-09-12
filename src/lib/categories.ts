/**
 * إدارة التصنيفات المعتمدة والدائمة للمخزون وفواتير المبيعات.
 * يضمن بقاء التصنيفات الأساسية (مثل: خياطة، جوانب الستاير، شيفونات وتل، إلخ)
 * ثابتة لكل الفروع دون أن تختفي أبداً حتى لو لم تكن هناك أصناف مسجلة تحتها مؤقتاً.
 */

export const DEFAULT_INVENTORY_CATEGORIES = [
  'جوانب الستاير',
  'شيفونات وتل',
  'بلاك أوت وعوازل',
  'خياطة',
  'خياطة وتفصيل',
  'تراكات ومواسير',
  'إكسسوارات ولوازم',
  'خدمات ومصنعيات',
];

const CUSTOM_CATEGORIES_KEY = 'ahmed_kishk_custom_categories_v1';

export function getPersistentCategories(): string[] {
  if (typeof window === 'undefined') return DEFAULT_INVENTORY_CATEGORIES;
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(DEFAULT_INVENTORY_CATEGORIES));
      return DEFAULT_INVENTORY_CATEGORIES;
    }
    const custom: string[] = JSON.parse(raw);
    return Array.from(new Set([...custom]));
  } catch {
    return DEFAULT_INVENTORY_CATEGORIES;
  }
}

export function saveAllCategories(categories: string[]): string[] {
  const unique = Array.from(new Set(categories.map(c => c.trim()).filter(Boolean)));
  if (typeof window !== 'undefined') {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(unique));
  }
  fetch('/api/system-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: CUSTOM_CATEGORIES_KEY, data: unique }),
  }).catch(() => {});
  return unique;
}

export function saveCustomCategory(newCategory: string): string[] {
  const cat = newCategory.trim();
  if (!cat) return getPersistentCategories();
  const existing = getPersistentCategories();
  if (!existing.includes(cat)) {
    return saveAllCategories([...existing, cat]);
  }
  return existing;
}

export function deleteCategory(categoryToDelete: string): string[] {
  const existing = getPersistentCategories();
  const updated = existing.filter(c => c !== categoryToDelete);
  return saveAllCategories(updated);
}

export function renameCategory(oldName: string, newName: string): string[] {
  const cleanNew = newName.trim();
  if (!cleanNew) return getPersistentCategories();
  const existing = getPersistentCategories();
  const updated = existing.map(c => (c === oldName ? cleanNew : c));
  return saveAllCategories(updated);
}

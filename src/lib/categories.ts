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
    const custom: string[] = raw ? JSON.parse(raw) : [];
    return Array.from(new Set([...DEFAULT_INVENTORY_CATEGORIES, ...custom]));
  } catch {
    return DEFAULT_INVENTORY_CATEGORIES;
  }
}

export function saveCustomCategory(newCategory: string): string[] {
  const cat = newCategory.trim();
  if (!cat) return getPersistentCategories();
  const existing = getPersistentCategories();
  if (!existing.includes(cat)) {
    const updated = [...existing, cat];
    if (typeof window !== 'undefined') {
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(updated));
    }
    fetch('/api/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: CUSTOM_CATEGORIES_KEY, data: updated }),
    }).catch(() => {});
    return updated;
  }
  return existing;
}

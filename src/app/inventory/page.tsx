'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: 'متر' | 'قطعة' | 'طقم';
  quantity: number;
  costPrice: number;
  sellPrice: number;
  branch: string;
  minAlert: number;
  supplier: string;
}

const initialItems: InventoryItem[] = [
  { id: 'INV-001', code: 'SAT-01', name: 'ستان سواريه ناعم', category: 'سواريه', unit: 'متر', quantity: 120, costPrice: 320, sellPrice: 450, branch: 'الفرع الرئيسي — القاهرة', minAlert: 30, supplier: 'شركة النيل' },
  { id: 'INV-002', code: 'SLK-01', name: 'حرير طبيعي ممتاز', category: 'سواريه', unit: 'متر', quantity: 45, costPrice: 650, sellPrice: 900, branch: 'الفرع الرئيسي — القاهرة', minAlert: 15, supplier: 'شركة النيل' },
  { id: 'INV-003', code: 'CRP-01', name: 'كريب مزدوج أسباني', category: 'سواريه', unit: 'متر', quantity: 200, costPrice: 200, sellPrice: 300, branch: 'فرع ثانٍ — القاهرة', minAlert: 40, supplier: 'شركة النيل' },
  { id: 'INV-004', code: 'CHF-01', name: 'شيفون ناعم مطرز', category: 'سواريه', unit: 'متر', quantity: 180, costPrice: 150, sellPrice: 250, branch: 'فرع ثالث — القاهرة', minAlert: 25, supplier: 'مستورد الشرق' },
  { id: 'INV-005', code: 'VLV-01', name: 'قطيفة ستائر ثقيلة', category: 'ستائر', unit: 'متر', quantity: 95, costPrice: 260, sellPrice: 380, branch: 'الفرع الرئيسي — القاهرة', minAlert: 20, supplier: 'مصنع الدلتا' },
  { id: 'INV-006', code: 'BLK-01', name: 'بلاك آوت عازل ضوء 100%', category: 'ستائر', unit: 'متر', quantity: 160, costPrice: 180, sellPrice: 280, branch: 'الفرع الرئيسي — القاهرة', minAlert: 50, supplier: 'مصنع الدلتا' },
  { id: 'INV-007', code: 'TRK-01', name: 'تراك سقف ألومنيوم (مجاري)', category: 'تراكات ومواسير', unit: 'متر', quantity: 300, costPrice: 45, sellPrice: 85, branch: 'الفرع الرئيسي — القاهرة', minAlert: 50, supplier: 'مصنع الدلتا' },
  { id: 'INV-008', code: 'ROD-01', name: 'مواسير استيل مذهبة', category: 'تراكات ومواسير', unit: 'متر', quantity: 80, costPrice: 90, sellPrice: 160, branch: 'الفرع الرئيسي — القاهرة', minAlert: 20, supplier: 'مصنع الدلتا' },
  { id: 'INV-009', code: 'TAP-01', name: 'شريط كشكشة 3 فتلة', category: 'أشرطة وإكسسوارات', unit: 'متر', quantity: 500, costPrice: 8, sellPrice: 18, branch: 'الفرع الرئيسي — القاهرة', minAlert: 100, supplier: 'مستورد الشرق' },
];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [categories, setCategories] = useState<string[]>(['الكل', 'سواريه', 'ستائر', 'تراكات ومواسير', 'أشرطة وإكسسوارات']);
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [selectedBranch, setSelectedBranch] = useState('الكل');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Item form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('سواريه');
  const [newCatInput, setNewCatInput] = useState('');
  const [unit, setUnit] = useState<'متر' | 'قطعة' | 'طقم'>('متر');
  const [quantity, setQuantity] = useState<number>(100);
  const [costPrice, setCostPrice] = useState<number>(100);
  const [sellPrice, setSellPrice] = useState<number>(150);
  const [branch, setBranch] = useState('الفرع الرئيسي — القاهرة');
  const [supplier, setSupplier] = useState('شركة النيل');

  const filtered = items.filter((item) => {
    const matchesCat = activeCategory === 'الكل' || item.category === activeCategory;
    const matchesBranch = selectedBranch === 'الكل' || item.branch === selectedBranch;
    const matchesSearch = item.name.includes(search) || item.code.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesBranch && matchesSearch;
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    const catToUse = newCatInput ? newCatInput : category;
    if (newCatInput && !categories.includes(newCatInput)) {
      setCategories([...categories, newCatInput]);
    }

    const newItem: InventoryItem = {
      id: `INV-${String(items.length + 1).padStart(3, '0')}`,
      code,
      name,
      category: catToUse,
      unit,
      quantity,
      costPrice,
      sellPrice,
      branch,
      minAlert: 20,
      supplier,
    };

    setItems([newItem, ...items]);
    setShowAddModal(false);
    setCode('');
    setName('');
    setNewCatInput('');
  };

  const totalInventoryCost = items.reduce((sum, i) => sum + i.quantity * i.costPrice, 0);
  const totalInventorySellValue = items.reduce((sum, i) => sum + i.quantity * i.sellPrice, 0);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header title="المخزون والأصناف بالمتر" />
      <div className="pr-72 pt-16">
        <main className="px-8 py-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-2xl text-primary">إدارة المخزون والأصناف بالمتر</h1>
              <p className="text-on-surface-variant text-sm mt-1">
                تتبع كميات الأقمشة بالمتر، التراكات، المواسير، الأشرطة، وهامش الربح لكل فرع.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-on-primary px-5 py-2.5 rounded-lg hover:bg-inverse-surface transition-colors flex items-center gap-2 font-bold text-sm shadow"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              إضافة صنف جديد للمخزن
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
              <div className="text-xs text-on-surface-variant font-mono">إجمالي الأصناف</div>
              <div className="font-display font-bold text-2xl text-primary mt-1">{items.length}</div>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
              <div className="text-xs text-on-surface-variant font-mono">قيمة التكلفة في المخزن</div>
              <div className="font-display font-bold text-2xl text-primary mt-1">
                {totalInventoryCost.toLocaleString()} ج.م
              </div>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
              <div className="text-xs text-on-surface-variant font-mono">القيمة البيعية المتوقعة</div>
              <div className="font-display font-bold text-2xl text-secondary mt-1">
                {totalInventorySellValue.toLocaleString()} ج.م
              </div>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container-highest">
              <div className="text-xs text-on-surface-variant font-mono">أصناف منخفضة (تنبيه)</div>
              <div className="font-display font-bold text-2xl text-error mt-1">
                {items.filter((i) => i.quantity <= i.minAlert).length}
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Category Tabs */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-mono border transition-colors ${
                    activeCategory === cat ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Branch Filter & Search */}
            <div className="flex items-center gap-3">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="border border-outline-variant rounded-lg p-2 text-xs font-mono bg-surface-container-lowest"
              >
                <option value="الكل">كل الفروع</option>
                <option value="الفرع الرئيسي — القاهرة">الفرع الرئيسي — القاهرة</option>
                <option value="فرع ثانٍ — القاهرة">فرع ثانٍ — القاهرة</option>
                <option value="فرع ثالث — القاهرة">فرع ثالث — القاهرة</option>
              </select>

              <div className="relative">
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث باسم الصنف أو الكود..."
                  className="border border-outline-variant rounded-lg py-2 pr-9 pl-3 text-xs focus:outline-none focus:border-primary bg-surface-container-lowest"
                />
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest overflow-hidden">
            <table className="w-full text-right">
              <thead className="bg-surface-container-low text-xs font-mono text-on-surface-variant border-b border-surface-container-high">
                <tr>
                  <th className="p-3.5">الكود</th>
                  <th className="p-3.5">الصنف / الخامة</th>
                  <th className="p-3.5">التصنيف</th>
                  <th className="p-3.5 text-center">الكمية بالمخزن</th>
                  <th className="p-3.5 text-left">سعر التكلفة</th>
                  <th className="p-3.5 text-left">سعر البيع</th>
                  <th className="p-3.5 text-left">هامش الربح / م</th>
                  <th className="p-3.5">الفرع</th>
                  <th className="p-3.5 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const profitPerUnit = item.sellPrice - item.costPrice;
                  const isLow = item.quantity <= item.minAlert;

                  return (
                    <tr key={item.id} className="border-b border-surface-container-low hover:bg-surface-container-low transition-colors">
                      <td className="p-3.5 font-mono text-xs text-on-surface-variant">{item.code}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-sm text-primary">{item.name}</div>
                        <div className="text-xs text-on-surface-variant">{item.supplier}</div>
                      </td>
                      <td className="p-3.5 text-xs text-on-surface-variant">{item.category}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-sm">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-3.5 text-left font-mono text-xs text-on-surface-variant">{item.costPrice} ج</td>
                      <td className="p-3.5 text-left font-mono font-bold text-primary text-sm">{item.sellPrice} ج</td>
                      <td className="p-3.5 text-left font-mono font-bold text-secondary text-xs">
                        +{profitPerUnit} ج ({Math.round((profitPerUnit / item.costPrice) * 100)}%)
                      </td>
                      <td className="p-3.5 text-xs text-on-surface-variant">{item.branch}</td>
                      <td className="p-3.5 text-center">
                        {isLow ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-error-container text-on-error-container">
                            مخزون منخفض
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-primary-container text-on-primary-container">
                            متوفر
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl p-6 w-full max-w-lg">
            <h2 className="font-display font-bold text-xl text-primary mb-4">إضافة صنف جديد للمخزن</h2>
            <form onSubmit={handleAddItem} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">كود الصنف *</label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="مثال: SAT-02"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">اسم الصنف *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="مثال: ستان إيطالي"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">التصنيف الحالي</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  >
                    {categories.filter((c) => c !== 'الكل').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">أو إضافة تصنيف جديد</label>
                  <input
                    value={newCatInput}
                    onChange={(e) => setNewCatInput(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="إضافة تصنيف جديد..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">وحدة القياس</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="متر">متر</option>
                    <option value="قطعة">قطعة</option>
                    <option value="طقم">طقم</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">الكمية الأولية</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">الفرع</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="الفرع الرئيسي — القاهرة">الفرع الرئيسي — القاهرة</option>
                    <option value="فرع ثانٍ — القاهرة">فرع ثانٍ — القاهرة</option>
                    <option value="فرع ثالث — القاهرة">فرع ثالث — القاهرة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">سعر التكلفة للمتر / القطعة</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono text-on-surface-variant">سعر البيع للمتر / القطعة</label>
                  <input
                    type="number"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(Number(e.target.value))}
                    className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">المورد</label>
                <input
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button type="submit" className="flex-1 bg-primary text-on-primary py-2.5 rounded font-bold text-sm">
                  حفظ الصنف
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

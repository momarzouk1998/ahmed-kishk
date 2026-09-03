'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { canUserEditPrices } from '@/lib/permissions';
import { useManagerGate, isManagerUnlocked } from '@/components/ManagerUnlockGate';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: 'متر' | 'قطعة' | 'طقم';
  totalQuantity: number;
  reservedQuantity: number;
  costPrice: number;
  sellPrice: number;
  branch: string;
  minAlert: number;
  supplier: string;
}

const initialItems: InventoryItem[] = [];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [categories, setCategories] = useState<string[]>(['الكل', 'سواريه', 'ستائر', 'تراكات ومواسير', 'أشرطة وإكسسوارات']);
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [selectedBranch, setSelectedBranch] = useState('الكل');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);

  useEffect(() => {
    async function loadInventory() {
      try {
        const res = await fetch('/api/inventory', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.items) && json.items.length > 0) {
            setItems(json.items);
            localStorage.setItem('ahmed_kishk_inventory_v3', JSON.stringify(json.items));
          } else {
            const raw = localStorage.getItem('ahmed_kishk_inventory_v3');
            if (raw) setItems(JSON.parse(raw));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    async function loadSuppliers() {
      try {
        const res = await fetch('/api/suppliers', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.suppliers)) {
            setSuppliersList(json.suppliers);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }
      try {
        const raw = localStorage.getItem('ahmed_kishk_suppliers_v3');
        if (raw) setSuppliersList(JSON.parse(raw));
      } catch {}
    }
    loadInventory();
    loadSuppliers();
  }, []);

  // Form states (shared by Add & Edit)
  const [name, setName] = useState('');
  const [category, setCategory] = useState('سواريه');
  const [newCatInput, setNewCatInput] = useState('');
  const [unit, setUnit] = useState<'متر' | 'قطعة' | 'طقم'>('متر');
  const [totalQuantity, setTotalQuantity] = useState<number>(100);
  const [reservedQuantity, setReservedQuantity] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(100);
  const [sellPrice, setSellPrice] = useState<number>(150);

  // Manager unlock gate for price editing (used when the user has no direct permission)
  const { requestUnlock, Modal: MgrModal } = useManagerGate();
  const [mgrUnlocked, setMgrUnlocked] = useState<boolean>(false);
  useEffect(() => { setMgrUnlocked(isManagerUnlocked()); }, []);
  const priceLocked = !canUserEditPrices('p_inventory') && !mgrUnlocked;
  const gatePriceEdit = async (): Promise<boolean> => {
    if (!priceLocked) return true;
    const ok = await requestUnlock();
    if (ok) setMgrUnlocked(true);
    return ok;
  };
  const [branch, setBranch] = useState('الفرع الرئيسي');
  const { user: currentUser, isAdmin } = useCurrentUser();
  useEffect(() => {
    if (!isAdmin && currentUser?.branch) setBranch(currentUser.branch);
  }, [isAdmin, currentUser]);
  useEffect(() => {
    if (!isAdmin && currentUser?.branch) setSelectedBranch(currentUser.branch);
  }, [isAdmin, currentUser]);
  const [supplier, setSupplier] = useState('');

  // Dynamically set default supplier once suppliers list is loaded
  useEffect(() => {
    if (suppliersList.length > 0 && !supplier) {
      setSupplier(suppliersList[0].name);
    }
  }, [suppliersList]);

  const filtered = items.filter((item) => {
    const matchesCat = activeCategory === 'الكل' || item.category === activeCategory;
    const matchesBranch = selectedBranch === 'الكل' || item.branch === selectedBranch;
    const matchesSearch = item.name.includes(search) || (item.code && item.code.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesBranch && matchesSearch;
  });

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const catToUse = category === 'NEW' ? newCatInput : category;
    if (category === 'NEW' && newCatInput && !categories.includes(newCatInput)) {
      setCategories([...categories, newCatInput]);
    }

    const generatedCode = 'SAT-' + Math.floor(1000 + Math.random() * 9000);

    const newItem: InventoryItem = {
      id: `INV-${Date.now()}`,
      code: generatedCode,
      name,
      category: catToUse,
      unit,
      totalQuantity,
      reservedQuantity,
      costPrice,
      sellPrice,
      branch,
      minAlert: 20,
      supplier: supplier || 'مورد عام',
    };

    const updated = [newItem, ...items];
    setItems(updated);
    localStorage.setItem('ahmed_kishk_inventory_v3', JSON.stringify(updated));
    setShowAddModal(false);
    setName('');
    setNewCatInput('');
    setCategory('سواريه');
    setTotalQuantity(100);
    setCostPrice(100);
    setSellPrice(150);

    try {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
    } catch (err) {
      console.error('Failed to save item to API:', err);
    }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !name) return;

    const catToUse = category === 'NEW' ? newCatInput : category;
    if (category === 'NEW' && newCatInput && !categories.includes(newCatInput)) {
      setCategories([...categories, newCatInput]);
    }

    const updatedItem: InventoryItem = {
      ...editingItem,
      name,
      category: catToUse,
      unit,
      totalQuantity,
      reservedQuantity,
      costPrice,
      sellPrice,
      branch,
      supplier: supplier || 'مورد عام',
    };

    const updated = items.map(it => it.id === editingItem.id ? updatedItem : it);
    setItems(updated);
    localStorage.setItem('ahmed_kishk_inventory_v3', JSON.stringify(updated));
    setShowEditModal(false);
    setEditingItem(null);

    try {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
      });
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  };

  const handleDeleteItem = async (id: string, itemName: string) => {
    if (confirm(`هل أنت متأكد من حذف الصنف "${itemName}" من المخزن نهائياً؟`)) {
      const updated = items.filter(it => it.id !== id);
      setItems(updated);
      localStorage.setItem('ahmed_kishk_inventory_v3', JSON.stringify(updated));

      try {
        await fetch(`/api/inventory?id=${id}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed to delete item:', err);
      }
    }
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(categories.includes(item.category) ? item.category : 'NEW');
    if (!categories.includes(item.category)) {
      setNewCatInput(item.category);
    } else {
      setNewCatInput('');
    }
    setUnit(item.unit);
    setTotalQuantity(item.totalQuantity);
    setReservedQuantity(item.reservedQuantity);
    setCostPrice(item.costPrice);
    setSellPrice(item.sellPrice);
    setBranch(item.branch);
    setSupplier(item.supplier);
    setShowEditModal(true);
  };

  const totalCostValue = items.reduce((sum, i) => sum + i.totalQuantity * i.costPrice, 0);
  const totalExpectedProfit = items.reduce((sum, i) => sum + (i.totalQuantity * (i.sellPrice - i.costPrice)), 0);
  const totalReservedMeters = items.reduce((sum, i) => sum + i.reservedQuantity, 0);
  const totalAvailableMeters = items.reduce((sum, i) => sum + (i.totalQuantity - i.reservedQuantity), 0);

  return (
    <PageShell title="المخزون والأصناف بالمتر">
      <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-primary">إدارة المخزون والأصناف بالمتر</h1>
              <p className="text-on-surface-variant text-xs sm:text-sm mt-1">
                تتبع كميات الأقمشة بالمتر، التراكات، المواسير، الأشرطة، وهامش الربح لكل فرع.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-on-primary px-4 sm:px-5 py-2.5 rounded-lg hover:bg-inverse-surface transition-colors flex items-center gap-2 font-bold text-xs sm:text-sm shadow w-full sm:w-auto justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              إضافة صنف جديد للمخزن
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
              <div className="text-xs text-slate-500 font-bold">إجمالي الأصناف</div>
              <div className="font-display font-black text-xl text-slate-900 mt-1">{items.length} صنف</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-soft">
              <div className="text-xs text-amber-800 font-bold">المحجوز للورشة</div>
              <div className="font-display font-black text-xl text-amber-900 mt-1 font-mono">
                {totalReservedMeters.toLocaleString()} متر
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-soft">
              <div className="text-xs text-emerald-800 font-bold">المتاح للبيع</div>
              <div className="font-display font-black text-xl text-emerald-900 mt-1 font-mono">
                {totalAvailableMeters.toLocaleString()} متر
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
              <div className="text-xs text-slate-500 font-bold">قيمة المخزون (تكلفة)</div>
              <div className="font-display font-black text-xl text-slate-900 mt-1 font-mono">
                {totalCostValue.toLocaleString()} ج.م
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/40 shadow-soft">
              <div className="text-xs text-purple-800 font-bold">توقع الأرباح الكلية</div>
              <div className="font-display font-black text-xl text-purple-900 mt-1 font-mono">
                {totalExpectedProfit.toLocaleString()} ج.م
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    activeCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <BranchSelect
                value={selectedBranch}
                onChange={setSelectedBranch}
                isAdmin={isAdmin}
                allValue="الكل"
                allLabel="كل الفروع"
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الكود..."
                className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-brand-gold"
              />
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[700px]">
              <thead className="bg-slate-50 text-xs font-mono text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">الصنف / الخامة</th>
                  <th className="p-3.5 text-center">الرصيد الكلي</th>
                  <th className="p-3.5 text-center text-amber-700">المحجوز للورشة</th>
                  <th className="p-3.5 text-center text-emerald-700">المتاح للبيع</th>
                  <th className="p-3.5 text-left">التكلفة</th>
                  <th className="p-3.5 text-left">سعر البيع</th>
                  <th className="p-3.5 text-left">توقع الربح الكلي</th>
                  <th className="p-3.5">الفرع</th>
                  <th className="p-3.5 text-center">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const available = item.totalQuantity - item.reservedQuantity;
                  const profitPerUnit = item.sellPrice - item.costPrice;
                  const totalProfit = profitPerUnit * item.totalQuantity;
                  const isLow = available <= item.minAlert;

                  return (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-sm text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-400">{item.supplier} • {item.category}</div>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-900">
                        {item.totalQuantity} {item.unit}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-amber-700 bg-amber-50/50">
                        {item.reservedQuantity} {item.unit}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-emerald-700 bg-emerald-50/50">
                        {available} {item.unit}
                      </td>
                      <td className="p-3.5 text-left font-mono text-xs text-slate-500">{item.costPrice} ج</td>
                      <td className="p-3.5 text-left font-mono font-bold text-slate-900 text-sm">{item.sellPrice} ج</td>
                      <td className="p-3.5 text-left">
                        <div className="font-mono font-black text-purple-700 text-sm">+{totalProfit.toLocaleString()} ج</div>
                        <div className="text-[10px] text-slate-400 font-bold font-mono">
                          ({profitPerUnit} ج / {item.unit}) • {item.costPrice > 0 ? Math.round((profitPerUnit / item.costPrice) * 100) : 0}%
                        </div>
                      </td>
                      <td className="p-3.5 text-xs text-slate-600 font-medium">{item.branch}</td>
                      <td className="p-3.5 text-center">
                        {isLow ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800">
                            مخزون منخفض
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                            متوفر
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="bg-amber-100 text-amber-950 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer hover:bg-amber-200 transition-colors"
                            title="تعديل الصنف"
                          >
                            ✏️ تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="bg-rose-100 text-rose-800 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer hover:bg-rose-200 transition-colors"
                            title="حذف الصنف"
                          >
                            🗑️ حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-bold text-xl text-slate-900 mb-4">إضافة صنف جديد للمخزن</h2>
            <form onSubmit={handleAddItem} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">اسم الصنف *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900" placeholder="مثال: ستان إيطالي" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">التصنيف</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900">
                    {categories.filter(c => c !== 'الكل').map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="NEW">+ إضافة تصنيف جديد...</option>
                  </select>
                  {category === 'NEW' && (
                    <input
                      type="text"
                      value={newCatInput}
                      onChange={e => setNewCatInput(e.target.value)}
                      placeholder="اكتب اسم التصنيف الجديد..."
                      className="border border-slate-200 rounded-xl p-2 text-sm mt-1 text-slate-900"
                      required
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الفرع</label>
                  <BranchSelect
                    value={branch}
                    onChange={setBranch}
                    isAdmin={isAdmin}
                    className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الكمية الكلية</label>
                  <input type="number" value={totalQuantity} onChange={e => setTotalQuantity(Number(e.target.value))} className="border border-slate-200 rounded-xl p-2 text-sm font-mono text-slate-900" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">سعر التكلفة (ج)</label>
                  <input
                    type="number"
                    value={costPrice}
                    readOnly={priceLocked}
                    onFocus={async () => { if (priceLocked) await gatePriceEdit(); }}
                    onClick={async () => { if (priceLocked) await gatePriceEdit(); }}
                    onChange={e => { if (!priceLocked) setCostPrice(Number(e.target.value)); }}
                    className={`border rounded-xl p-2 text-sm font-mono text-slate-900 ${priceLocked ? 'bg-amber-50 border-amber-200 cursor-pointer' : 'border-slate-200'}`}
                    title={priceLocked ? 'اضغط لإدخال باسورد المدير' : ''}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">سعر البيع (ج)</label>
                  <input
                    type="number"
                    value={sellPrice}
                    readOnly={priceLocked}
                    onFocus={async () => { if (priceLocked) await gatePriceEdit(); }}
                    onClick={async () => { if (priceLocked) await gatePriceEdit(); }}
                    onChange={e => { if (!priceLocked) setSellPrice(Number(e.target.value)); }}
                    className={`border rounded-xl p-2 text-sm font-mono text-slate-900 ${priceLocked ? 'bg-amber-50 border-amber-200 cursor-pointer' : 'border-slate-200'}`}
                    title={priceLocked ? 'اضغط لإدخال باسورد المدير' : ''}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">المورد</label>
                <select value={supplier} onChange={e => setSupplier(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900">
                  <option value="مورد عام">مورد عام</option>
                  {suppliersList.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 mt-4">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-2.5 rounded-xl font-bold text-sm shadow-gold cursor-pointer">
                  حفظ الصنف
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="font-display font-bold text-xl text-slate-900 mb-4">تعديل بيانات الصنف</h2>
            <form onSubmit={handleEditItem} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">اسم الصنف *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900" placeholder="مثال: ستان إيطالي" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">التصنيف</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900">
                    {categories.filter(c => c !== 'الكل').map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="NEW">+ إضافة تصنيف جديد...</option>
                  </select>
                  {category === 'NEW' && (
                    <input
                      type="text"
                      value={newCatInput}
                      onChange={e => setNewCatInput(e.target.value)}
                      placeholder="اكتب اسم التصنيف الجديد..."
                      className="border border-slate-200 rounded-xl p-2 text-sm mt-1 text-slate-900"
                      required
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الفرع</label>
                  <BranchSelect
                    value={branch}
                    onChange={setBranch}
                    isAdmin={isAdmin}
                    className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الكمية الكلية</label>
                  <input type="number" value={totalQuantity} onChange={e => setTotalQuantity(Number(e.target.value))} className="border border-slate-200 rounded-xl p-2 text-sm font-mono text-slate-900" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">سعر التكلفة (ج)</label>
                  <input
                    type="number"
                    value={costPrice}
                    readOnly={priceLocked}
                    onFocus={async () => { if (priceLocked) await gatePriceEdit(); }}
                    onClick={async () => { if (priceLocked) await gatePriceEdit(); }}
                    onChange={e => { if (!priceLocked) setCostPrice(Number(e.target.value)); }}
                    className={`border rounded-xl p-2 text-sm font-mono text-slate-900 ${priceLocked ? 'bg-amber-50 border-amber-200 cursor-pointer' : 'border-slate-200'}`}
                    title={priceLocked ? 'اضغط لإدخال باسورد المدير' : ''}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">سعر البيع (ج)</label>
                  <input
                    type="number"
                    value={sellPrice}
                    readOnly={priceLocked}
                    onFocus={async () => { if (priceLocked) await gatePriceEdit(); }}
                    onClick={async () => { if (priceLocked) await gatePriceEdit(); }}
                    onChange={e => { if (!priceLocked) setSellPrice(Number(e.target.value)); }}
                    className={`border rounded-xl p-2 text-sm font-mono text-slate-900 ${priceLocked ? 'bg-amber-50 border-amber-200 cursor-pointer' : 'border-slate-200'}`}
                    title={priceLocked ? 'اضغط لإدخال باسورد المدير' : ''}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">المورد</label>
                <select value={supplier} onChange={e => setSupplier(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900">
                  <option value="مورد عام">مورد عام</option>
                  {suppliersList.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 mt-4">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-2.5 rounded-xl font-bold text-sm shadow-gold cursor-pointer">
                  تعديل الصنف
                </button>
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {MgrModal}
    </PageShell>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { canUserEditPrices } from '@/lib/permissions';
import { useManagerGate, isManagerUnlocked } from '@/components/ManagerUnlockGate';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';
import { BRANCHES_LIST, normalizeBranchName, branchLabel } from '@/lib/branches';
import initialInventory from '@/data/initialInventory.json';

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

interface AdjustmentLog {
  id: string;
  timestamp: string;
  itemCode: string;
  itemName: string;
  branch: string;
  previousStock: number;
  newStock: number;
  difference: number;
  reason: string;
  userName: string;
}

const TABS = [
  { key: 'stock', label: 'أصناف المخزون والجرد', icon: '📦' },
  { key: 'adjustments', label: 'سجل التعديلات والجرد', icon: '📊' },
  { key: 'stores', label: 'إحصائيات الفروع', icon: '🏪' },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function InventoryPage() {
  const [tab, setTab] = useState<TabKey>('stock');
  const [items, setItems] = useState<InventoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('ahmed_kishk_inventory_v3');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length >= 300) return parsed;
        }
      } catch {}
    }
    return initialInventory as InventoryItem[];
  });
  const [categories, setCategories] = useState<string[]>(() => ['الكل', ...Array.from(new Set(initialInventory.map(i => i.category).filter(Boolean)))]);
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [selectedBranch, setSelectedBranch] = useState('الكل');
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);

  // Inline Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState<InventoryItem | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Adjustment Logs State
  const [adjustmentLogs, setAdjustmentLogs] = useState<AdjustmentLog[]>([]);
  const [logSearch, setLogSearch] = useState('');

  // Add / Edit Modal States
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states (For Add Modal)
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ستائر');
  const [newCatInput, setNewCatInput] = useState('');
  const [unit, setUnit] = useState<'متر' | 'قطعة' | 'طقم'>('متر');
  const [totalQuantity, setTotalQuantity] = useState<number>(100);
  const [reservedQuantity, setReservedQuantity] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(100);
  const [sellPrice, setSellPrice] = useState<number>(150);
  const [minAlert, setMinAlert] = useState<number>(20);
  const [branch, setBranch] = useState('الفرع الرئيسي');
  const [supplier, setSupplier] = useState('');

  // User & Permissions
  const { user: currentUser, isAdmin } = useCurrentUser();
  const { requestUnlock, Modal: mgrModal } = useManagerGate();
  const [mgrUnlocked, setMgrUnlocked] = useState<boolean>(false);

  useEffect(() => {
    setMgrUnlocked(isManagerUnlocked());
  }, []);

  const priceLocked = !canUserEditPrices('p_inventory') && !mgrUnlocked;

  const gatePriceEdit = async (): Promise<boolean> => {
    if (!priceLocked) return true;
    const ok = await requestUnlock();
    if (ok) setMgrUnlocked(true);
    return ok;
  };

  useEffect(() => {
    if (!isAdmin && currentUser?.branch) {
      setBranch(currentUser.branch);
      setSelectedBranch(currentUser.branch);
    }
  }, [isAdmin, currentUser]);

  // Load Inventory & Suppliers
  const loadInventory = async () => {
    try {
      const res = await fetch('/api/inventory', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.items) && json.items.length > 0) {
          setItems(json.items);
          localStorage.setItem('ahmed_kishk_inventory_v3', JSON.stringify(json.items));
          // Extract unique categories dynamically
          const cats = Array.from(new Set(json.items.map((i: InventoryItem) => i.category).filter(Boolean)));
          setCategories(['الكل', ...cats as string[]]);
        } else {
          const raw = localStorage.getItem('ahmed_kishk_inventory_v3');
          if (raw) setItems(JSON.parse(raw));
        }
      }
    } catch (e) {
      console.error(e);
      const raw = localStorage.getItem('ahmed_kishk_inventory_v3');
      if (raw) setItems(JSON.parse(raw));
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.suppliers)) {
          setSuppliersList(json.suppliers);
          if (json.suppliers.length > 0 && !supplier) {
            setSupplier(json.suppliers[0].name);
          }
          return;
        }
      }
    } catch (e) {}
    try {
      const raw = localStorage.getItem('ahmed_kishk_suppliers_v3');
      if (raw) {
        const list = JSON.parse(raw);
        setSuppliersList(list);
        if (list.length > 0 && !supplier) setSupplier(list[0].name);
      }
    } catch {}
  };

  const loadAdjustments = async () => {
    try {
      const res = await fetch('/api/inventory/adjustments', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.logs)) {
          setAdjustmentLogs(json.logs);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadInventory();
    loadSuppliers();
    loadAdjustments();
  }, []);

  // Filter items
  const branchScopedItems = items.filter(item => 
    selectedBranch === 'الكل' || normalizeBranchName(item.branch) === normalizeBranchName(selectedBranch)
  );
  const dynamicCategories = ['الكل', ...Array.from(new Set(branchScopedItems.map(i => i.category).filter(Boolean)))];

  const filteredItems = items.filter((item) => {
    const matchesCat = activeCategory === 'الكل' || item.category === activeCategory;
    const matchesBranch = selectedBranch === 'الكل' || normalizeBranchName(item.branch) === normalizeBranchName(selectedBranch);
    const matchesSearch =
      !search.trim() ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(search.toLowerCase())) ||
      (item.supplier && item.supplier.toLowerCase().includes(search.toLowerCase()));
    
    const available = item.totalQuantity - item.reservedQuantity;
    const isLow = available <= (item.minAlert || 20);
    const matchesLow = !lowStockOnly || isLow;

    return matchesCat && matchesBranch && matchesSearch && matchesLow;
  });

  // Start Inline Edit
  const startInlineEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setInlineForm({ ...item });
  };

  // Cancel Inline Edit
  const cancelInlineEdit = () => {
    setEditingId(null);
    setInlineForm(null);
  };

  // Save Inline Edit (Optimistic UI + API + Adjustment Log)
  const saveInlineEdit = async (item: InventoryItem) => {
    if (!inlineForm) return;

    if (!inlineForm.name.trim()) {
      alert('اسم الصنف مطلوب');
      return;
    }

    const oldTotal = item.totalQuantity;
    const newTotal = Number(inlineForm.totalQuantity) || 0;
    const isStockChanged = oldTotal !== newTotal;

    setSavingId(item.id);

    // Optimistic UI update
    const updatedItems = items.map(it => it.id === item.id ? { ...inlineForm } : it);
    setItems(updatedItems);
    localStorage.setItem('ahmed_kishk_inventory_v3', JSON.stringify(updatedItems));
    setEditingId(null);

    try {
      // 1. Save updated item to Inventory API
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inlineForm),
      });

      // 2. If stock quantity changed, log adjustment in audit history
      if (isStockChanged) {
        const adjRes = await fetch('/api/inventory/adjustments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemCode: inlineForm.code,
            itemName: inlineForm.name,
            branch: inlineForm.branch,
            previousStock: oldTotal,
            newStock: newTotal,
            reason: `جرد وتعديل مباشر في جدول المخزون (${inlineForm.branch})`,
          }),
        });

        if (adjRes.ok) {
          loadAdjustments();
        }
      }
    } catch (err: any) {
      alert('حدث خطأ أثناء الحفظ بالسيرفر: ' + (err?.message || ''));
      loadInventory(); // Revert on failure
    } finally {
      setSavingId(null);
      setInlineForm(null);
    }
  };

  // Add Item Handler
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
      minAlert,
      supplier: supplier || 'مورد عام',
    };

    const updated = [newItem, ...items];
    setItems(updated);
    localStorage.setItem('ahmed_kishk_inventory_v3', JSON.stringify(updated));
    setShowAddModal(false);
    setName('');
    setNewCatInput('');
    setCategory('ستائر');
    setTotalQuantity(100);
    setCostPrice(100);
    setSellPrice(150);

    try {
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      // Log initial stock creation
      await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCode: newItem.code,
          itemName: newItem.name,
          branch: newItem.branch,
          previousStock: 0,
          newStock: newItem.totalQuantity,
          reason: `إضافة صنف جديد بالمخزن بحصيلة ابتدائية`,
        }),
      });
      loadAdjustments();
    } catch (err) {
      console.error('Failed to save item to API:', err);
    }
  };

  // Delete Item Handler
  const handleDeleteItem = async (id: string, itemName: string) => {
    if (confirm(`هل أنت متأكد من حذف الصنف "${itemName}" من المخزن نهائياً؟`)) {
      const updated = items.filter(it => it.id !== id);
      setItems(updated);
      localStorage.setItem('ahmed_kishk_inventory_v3', JSON.stringify(updated));

      try {
        await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Failed to delete item:', err);
      }
    }
  };

  // Summary Metrics (Scoped to the selected branch)
  const statsItems = branchScopedItems;
  const totalCostValue = statsItems.reduce((sum, i) => sum + i.totalQuantity * i.costPrice, 0);
  const totalExpectedProfit = statsItems.reduce((sum, i) => sum + (i.totalQuantity * (i.sellPrice - i.costPrice)), 0);
  const totalReservedMeters = statsItems.reduce((sum, i) => sum + i.reservedQuantity, 0);
  const totalAvailableMeters = statsItems.reduce((sum, i) => sum + (i.totalQuantity - i.reservedQuantity), 0);
  const lowStockCount = statsItems.filter(i => (i.totalQuantity - i.reservedQuantity) <= (i.minAlert || 20)).length;

  // Filtered Adjustments
  const filteredAdjustments = adjustmentLogs.filter(log => {
    const matchesBranch = selectedBranch === 'الكل' || normalizeBranchName(log.branch) === normalizeBranchName(selectedBranch);
    if (!matchesBranch) return false;
    if (!logSearch.trim()) return true;
    const q = logSearch.toLowerCase().trim();
    return (
      log.itemName.toLowerCase().includes(q) ||
      log.itemCode.toLowerCase().includes(q) ||
      log.branch.toLowerCase().includes(q) ||
      log.reason.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q)
    );
  });

  return (
    <PageShell title="المخزون والجرد المباشر">
      {mgrModal}
      <div className="flex flex-col gap-6">
        {/* Header Title */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-xl sm:text-2xl text-slate-900 flex items-center gap-2">
              <span>📦</span>
              <span>نظام المخزون والجرد المباشر</span>
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              تتبع كميات الأقمشة بالمتر، أشرطة الستائر، الجرد المباشر في الجدول، وسجل التسويات التلقائي.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 sm:px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-xs sm:text-sm shadow-md w-full sm:w-auto justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            إضافة صنف جديد للمخزن
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-px">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs sm:text-sm font-black transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                tab === t.key
                  ? 'border-amber-500 text-amber-900 bg-amber-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.key === 'stock' && lowStockCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {lowStockCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: STOCK LIST & INLINE EDIT                           */}
        {/* ========================================================= */}
        {tab === 'stock' && (
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
                <div className="text-xs text-slate-500 font-bold">إجمالي الأصناف</div>
                <div className="font-display font-black text-xl text-slate-900 mt-1">{statsItems.length} صنف</div>
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
                  {totalCostValue.toLocaleString()} ج
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/40 shadow-soft">
                <div className="text-xs text-purple-800 font-bold">توقع الأرباح الكلية</div>
                <div className="font-display font-black text-xl text-purple-900 mt-1 font-mono">
                  {totalExpectedProfit.toLocaleString()} ج
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs font-bold text-slate-400">التصنيف:</span>
                {dynamicCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      activeCategory === cat
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-700 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={lowStockOnly}
                    onChange={(e) => setLowStockOnly(e.target.checked)}
                    className="accent-rose-600 w-4 h-4 rounded cursor-pointer"
                  />
                  <span>⚠️ تحت الحد الأدنى فقط ({lowStockCount})</span>
                </label>

                <BranchSelect
                  value={selectedBranch}
                  displayValue={branchLabel(selectedBranch)}
                  onChange={(b) => {
                    setSelectedBranch(b);
                    setActiveCategory('الكل');
                  }}
                  isAdmin={isAdmin}
                  allValue="الكل"
                  allLabel="كل الفروع"
                  className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                />

                <div className="relative">
                  <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-slate-400 text-[18px]">search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث بالاسم، الكود، المورد..."
                    className="bg-white border border-slate-300 rounded-xl py-2 pl-3 pr-9 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 w-48"
                  />
                </div>
              </div>
            </div>

            {/* Mobile View Cards */}
            <div className="space-y-3 md:hidden">
              {filteredItems.map(item => {
                const available = item.totalQuantity - item.reservedQuantity;
                const isLow = available <= (item.minAlert || 20);
                const isEditing = editingId === item.id;

                if (isEditing && inlineForm) {
                  return (
                    <div key={item.id} className="bg-amber-50/90 border-2 border-amber-400 rounded-2xl p-4 space-y-3 shadow-md">
                      <div className="font-bold text-xs text-amber-950 flex items-center justify-between">
                        <span>✏️ جرد وتعديل مباشر للصنف</span>
                        <span className="font-mono bg-amber-200 px-2 py-0.5 rounded">{item.code}</span>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">اسم الصنف</label>
                        <input
                          type="text"
                          value={inlineForm.name}
                          onChange={e => setInlineForm({ ...inlineForm, name: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-emerald-800 block mb-1">الرصيد الكلي ({inlineForm.unit})</label>
                          <input
                            type="number"
                            value={inlineForm.totalQuantity}
                            onChange={e => setInlineForm({ ...inlineForm, totalQuantity: Number(e.target.value) })}
                            className="w-full bg-white border-2 border-emerald-500 rounded-xl p-2 text-xs font-mono font-bold text-emerald-950 text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-amber-800 block mb-1">المحجوز للورشة</label>
                          <input
                            type="number"
                            value={inlineForm.reservedQuantity}
                            onChange={e => setInlineForm({ ...inlineForm, reservedQuantity: Number(e.target.value) })}
                            className="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs font-mono font-bold text-amber-950 text-center"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-rose-800 block mb-1">الحد الأدنى</label>
                          <input
                            type="number"
                            value={inlineForm.minAlert ?? 20}
                            onChange={e => setInlineForm({ ...inlineForm, minAlert: Number(e.target.value) })}
                            className="w-full bg-white border border-rose-300 rounded-xl p-2 text-xs font-mono font-bold text-rose-950 text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">التكلفة (ج)</label>
                          <input
                            type="number"
                            value={inlineForm.costPrice}
                            onChange={e => setInlineForm({ ...inlineForm, costPrice: Number(e.target.value) })}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">البيع (ج)</label>
                          <input
                            type="number"
                            value={inlineForm.sellPrice}
                            onChange={e => setInlineForm({ ...inlineForm, sellPrice: Number(e.target.value) })}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 text-center"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-amber-200">
                        <button
                          type="button"
                          onClick={() => saveInlineEdit(item)}
                          disabled={savingId === item.id}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold shadow-sm"
                        >
                          {savingId === item.id ? '⏳ جاري الحفظ...' : '✓ حفظ التعديل والجرد'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelInlineEdit}
                          className="bg-white border border-slate-300 px-3 py-2 rounded-xl text-xs font-bold text-slate-700"
                        >
                          ✕ إلغاء
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={item.id} className={`bg-white rounded-2xl p-4 border space-y-2 shadow-soft ${isLow ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{item.supplier} • {item.category}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isLow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {isLow ? 'مخزون منخفض' : 'متوفر'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl text-center text-xs font-mono font-bold">
                      <div>
                        <div className="text-[10px] text-slate-400">الرصيد الكلي</div>
                        <div className="text-slate-900">{item.totalQuantity} {item.unit}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-amber-700">المحجوز</div>
                        <div className="text-amber-800">{item.reservedQuantity} {item.unit}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-700">المتاح للبيع</div>
                        <div className="text-emerald-800">{available} {item.unit}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono font-bold pt-1">
                      <span className="text-slate-500">البيع: <strong className="text-slate-900">{item.sellPrice} ج</strong></span>
                      <span className="text-slate-500">الفرع: <strong className="text-slate-800">{item.branch}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => startInlineEdit(item)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                      >
                        <span>✏️</span> تعديل وجرد مباشر
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 p-1.5 rounded-xl text-xs font-bold"
                        title="حذف الصنف"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[950px]">
                  <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">اسم الصنف</th>
                      <th className="py-2.5 px-3">التصنيف</th>
                      <th className="py-2.5 px-3 text-center">الوحدة</th>
                      <th className="py-2.5 px-3 text-center text-slate-900 bg-slate-200/50">الرصيد</th>
                      <th className="py-2.5 px-3 text-center text-amber-800 bg-amber-50/50">المحجوز</th>
                      <th className="py-2.5 px-3 text-center text-emerald-800 bg-emerald-50/50">المتاح</th>
                      <th className="py-2.5 px-3 text-center text-rose-800 bg-rose-50/50">الحد الأدنى</th>
                      <th className="py-2.5 px-3 text-left">التكلفة</th>
                      <th className="py-2.5 px-3 text-left">سعر البيع</th>
                      <th className="py-2.5 px-3">الفرع</th>
                      <th className="py-2.5 px-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map(item => {
                      const available = item.totalQuantity - item.reservedQuantity;
                      const isLow = available <= (item.minAlert || 20);
                      const isEditing = editingId === item.id;

                      if (isEditing && inlineForm) {
                        return (
                          <tr key={item.id} className="bg-amber-50/90 ring-2 ring-amber-400">
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={inlineForm.name}
                                onChange={e => setInlineForm({ ...inlineForm, name: e.target.value })}
                                className="w-full bg-white border border-amber-300 rounded-lg p-1 text-xs font-bold text-slate-900"
                                autoFocus
                              />
                            </td>
                            <td className="p-1.5">
                              <select
                                value={inlineForm.category}
                                onChange={e => setInlineForm({ ...inlineForm, category: e.target.value })}
                                className="w-full bg-white border border-slate-300 rounded-lg p-1 text-xs font-bold text-slate-900"
                              >
                                {categories.filter(c => c !== 'الكل').map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </td>
                            <td className="p-1.5 text-center">
                              <select
                                value={inlineForm.unit}
                                onChange={e => setInlineForm({ ...inlineForm, unit: e.target.value as any })}
                                className="bg-white border border-slate-300 rounded-lg p-1 text-xs font-bold text-slate-900 text-center"
                              >
                                <option value="متر">متر</option>
                                <option value="قطعة">قطعة</option>
                                <option value="طقم">طقم</option>
                              </select>
                            </td>
                            <td className="p-1.5 text-center">
                              <input
                                type="number"
                                value={inlineForm.totalQuantity}
                                onChange={e => setInlineForm({ ...inlineForm, totalQuantity: Number(e.target.value) })}
                                className="w-16 bg-white border-2 border-emerald-500 rounded-lg p-1 text-center font-mono font-black text-emerald-950 text-xs"
                              />
                            </td>
                            <td className="p-1.5 text-center">
                              <input
                                type="number"
                                value={inlineForm.reservedQuantity}
                                onChange={e => setInlineForm({ ...inlineForm, reservedQuantity: Number(e.target.value) })}
                                className="w-14 bg-white border border-amber-300 rounded-lg p-1 text-center font-mono font-bold text-amber-950 text-xs"
                              />
                            </td>
                            <td className="p-1.5 text-center font-mono font-bold text-emerald-800 text-xs">
                              {inlineForm.totalQuantity - inlineForm.reservedQuantity}
                            </td>
                            <td className="p-1.5 text-center">
                              <input
                                type="number"
                                value={inlineForm.minAlert ?? 20}
                                onChange={e => setInlineForm({ ...inlineForm, minAlert: Number(e.target.value) })}
                                className="w-14 bg-white border border-rose-300 rounded-lg p-1 text-center font-mono font-bold text-rose-950 text-xs"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                value={inlineForm.costPrice}
                                onChange={e => setInlineForm({ ...inlineForm, costPrice: Number(e.target.value) })}
                                className="w-14 bg-white border border-slate-300 rounded-lg p-1 text-center font-mono font-bold text-slate-900 text-xs"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                value={inlineForm.sellPrice}
                                onChange={e => setInlineForm({ ...inlineForm, sellPrice: Number(e.target.value) })}
                                className="w-14 bg-white border border-slate-300 rounded-lg p-1 text-center font-mono font-bold text-slate-900 text-xs"
                              />
                            </td>
                            <td className="p-1.5">
                              <select
                                value={inlineForm.branch}
                                onChange={e => setInlineForm({ ...inlineForm, branch: e.target.value })}
                                className="bg-white border border-slate-300 rounded-lg p-1 text-xs font-bold text-slate-900"
                              >
                                {BRANCHES_LIST.map(b => (
                                  <option key={b.id} value={b.name}>{b.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-1.5 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => saveInlineEdit(item)}
                                  disabled={savingId === item.id}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                                  title="حفظ التعديلات وتوثيق الجرد"
                                >
                                  {savingId === item.id ? '⏳' : '✓ حفظ'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelInlineEdit}
                                  className="bg-white border border-slate-300 text-slate-700 px-1.5 py-1 rounded-lg font-bold text-xs cursor-pointer"
                                  title="إلغاء التعديل"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors border-b border-slate-100 ${isLow ? 'bg-rose-50/40' : ''}`}>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-xs text-slate-900 truncate max-w-[280px] block" title={item.name}>
                              {item.name}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-xs font-bold text-slate-700 whitespace-nowrap">
                            {item.category}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="inline-block text-[11px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg font-bold text-slate-700">
                              {item.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 bg-slate-50/50 text-xs whitespace-nowrap">
                            {item.totalQuantity}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-800 bg-amber-50/40 text-xs whitespace-nowrap">
                            {item.reservedQuantity}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40 text-xs whitespace-nowrap">
                            <span>{available}</span>
                            {isLow && (
                              <span className="mr-1 text-[9px] text-rose-600 font-bold bg-rose-100 px-1 py-0.2 rounded">منخفض</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 bg-rose-50/30 text-xs whitespace-nowrap">
                            {item.minAlert ?? 20}
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono text-xs text-slate-600 whitespace-nowrap">{item.costPrice} ج</td>
                          <td className="py-2.5 px-3 text-left font-mono font-bold text-slate-900 text-xs whitespace-nowrap">{item.sellPrice} ج</td>
                          <td className="py-2.5 px-3 text-xs text-slate-700 font-bold whitespace-nowrap">{item.branch}</td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startInlineEdit(item)}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                                title="تعديل مباشر في الجدول"
                              >
                                <span>✏️</span> تعديل
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 p-1 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                                title="حذف الصنف"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={11} className="p-12 text-center text-slate-400 font-bold">
                          لا توجد أصناف مطابقة للبحث أو التصفية الحالية
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ADJUSTMENTS & AUDIT LOG                            */}
        {/* ========================================================= */}
        {tab === 'adjustments' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-base text-slate-900">سجل تسويات وتعديلات الجرد المخزني</h2>
                <p className="text-xs text-slate-500 mt-0.5">توثيق تلقائي لكل حركة تغيير رصيد، جرد محلي، أو تسوية بالفرع</p>
              </div>

              <div className="relative">
                <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-slate-400 text-[18px]">search</span>
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="بحث في سجل التعديلات..."
                  className="bg-white border border-slate-300 rounded-xl py-2 pl-3 pr-9 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 w-64"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs min-w-[800px]">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">التاريخ والوقت</th>
                      <th className="p-3.5">الكود والصنف</th>
                      <th className="p-3.5">الفرع</th>
                      <th className="p-3.5 text-center">الرصيد السابق</th>
                      <th className="p-3.5 text-center">الرصيد الجديد</th>
                      <th className="p-3.5 text-center">الفارق (+ / -)</th>
                      <th className="p-3.5">سبب التسوية والجرد</th>
                      <th className="p-3.5">المسؤول</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {filteredAdjustments.map(log => {
                      const isPositive = log.difference >= 0;
                      const dateStr = new Date(log.timestamp).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 text-slate-500 text-[11px] whitespace-nowrap">{dateStr}</td>
                          <td className="p-3.5 font-sans">
                            <div className="font-bold text-slate-900">{log.itemName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{log.itemCode}</div>
                          </td>
                          <td className="p-3.5 font-sans font-bold text-slate-700">{log.branch}</td>
                          <td className="p-3.5 text-center font-bold text-slate-500">{log.previousStock}</td>
                          <td className="p-3.5 text-center font-black text-slate-900">{log.newStock}</td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-md font-black text-xs ${
                              isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isPositive ? `+${log.difference}` : log.difference}
                            </span>
                          </td>
                          <td className="p-3.5 font-sans text-slate-600 text-xs">{log.reason}</td>
                          <td className="p-3.5 font-sans font-bold text-slate-800">{log.userName}</td>
                        </tr>
                      );
                    })}
                    {filteredAdjustments.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center font-sans text-slate-400 font-bold">
                          لا توجد حركات تسوية أو جرد مسجلة حتى الآن
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: STORES & BRANCH OVERVIEW                           */}
        {/* ========================================================= */}
        {tab === 'stores' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {BRANCHES_LIST.map(b => {
                const branchItems = items.filter(i => i.branch === b.name || (b.isMain && (i.branch === 'الكل' || !i.branch)));
                const totalStock = branchItems.reduce((sum, i) => sum + (i.totalQuantity - i.reservedQuantity), 0);
                const totalValue = branchItems.reduce((sum, i) => sum + i.totalQuantity * i.costPrice, 0);
                const totalProfit = branchItems.reduce((sum, i) => sum + i.totalQuantity * (i.sellPrice - i.costPrice), 0);

                return (
                  <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft hover:shadow-md transition-all space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                          <span>🏢</span>
                          <span>{b.name}</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">{b.address}</p>
                      </div>
                      {b.isMain && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full">
                          الرئيسي
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-xs font-bold">
                      <div className="flex justify-between text-slate-600">
                        <span>عدد أصناف الفرع:</span>
                        <span className="font-mono text-slate-900">{branchItems.length} صنف</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>الرصيد المتاح:</span>
                        <span className="font-mono text-emerald-700">{totalStock.toLocaleString()} متر</span>
                      </div>
                      <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-100">
                        <span>قيمة المخزون بالفرع:</span>
                        <span className="font-mono text-slate-900">{totalValue.toLocaleString()} ج</span>
                      </div>
                      <div className="flex justify-between text-purple-900 pt-1">
                        <span>توقع ربح الفرع:</span>
                        <span className="font-mono text-purple-700">+{totalProfit.toLocaleString()} ج</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
                    />
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">وحدة القياس</label>
                  <select value={unit} onChange={e => setUnit(e.target.value as any)} className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900">
                    <option value="متر">متر (ستائر/أقمشة)</option>
                    <option value="قطعة">قطعة (تراكات/كابات)</option>
                    <option value="طقم">طقم (إكسسوارات)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الكمية الكلية الرصيد</label>
                  <input type="number" value={totalQuantity} onChange={e => setTotalQuantity(Number(e.target.value))} className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">حد التنبيه الأدنى</label>
                  <input type="number" value={minAlert} onChange={e => setMinAlert(Number(e.target.value))} className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">سعر التكلفة (ج.م)</label>
                  <input type="number" value={costPrice} onChange={e => setCostPrice(Number(e.target.value))} className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900" required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">سعر البيع للمتر (ج.م)</label>
                  <input type="number" value={sellPrice} onChange={e => setSellPrice(Number(e.target.value))} className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">الفرع المخصص</label>
                  <BranchSelect
                    value={branch}
                    onChange={setBranch}
                    isAdmin={isAdmin}
                    className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">اسم المورد</label>
                  <select value={supplier} onChange={e => setSupplier(e.target.value)} className="border border-slate-200 rounded-xl p-2 text-sm text-slate-900">
                    {suppliersList.map((s: any) => (
                      <option key={s.id || s.name} value={s.name}>{s.name}</option>
                    ))}
                    {suppliersList.length === 0 && <option value="مورد عام">مورد عام</option>}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold">
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">
                  حفظ الصنف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}

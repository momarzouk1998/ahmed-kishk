'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { canUserEditPrices } from '@/lib/permissions';
import { useManagerGate, isManagerUnlocked } from '@/components/ManagerUnlockGate';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';
import { BRANCHES_LIST, normalizeBranchName, branchLabel } from '@/lib/branches';
import initialInventory from '@/data/initialInventory.json';
import Pagination from '@/components/Pagination';
import { getBranchCustomCategories, saveBranchCustomCategory, deleteBranchCategory, getPersistentCategories, saveCustomCategory, deleteCategory, renameCategory } from '@/lib/categories';

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
  { key: 'categories', label: 'إدارة وتعديل التصنيفات', icon: '🏷️' },
] as const;
type TabKey = typeof TABS[number]['key'];

export default function InventoryPage() {
  const [tab, setTab] = useState<TabKey>('stock');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['الكل']);
  const [loading, setLoading] = useState(true);
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

  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null); // e.g. "ستائر__فرع عرابي"
  const [editingCategoryNewName, setEditingCategoryNewName] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryBranch, setNewCategoryBranch] = useState<string>('الكل');
  const [categoryTabBranch, setCategoryTabBranch] = useState<string>('الكل');
  const [categorySearch, setCategorySearch] = useState<string>('');

  const handleAddNewCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;
    const targetBranch = newCategoryBranch || (categoryTabBranch !== 'الكل' ? categoryTabBranch : 'الكل');
    saveBranchCustomCategory(targetBranch, clean);
    setCategories(['الكل', ...getBranchCustomCategories('الكل')]);
    setNewCategoryName('');
    alert(`تمت إضافة تصنيف "${clean}" بنجاح ${targetBranch === 'الكل' ? 'لكل الفروع (5 أسطر)' : `إلى ${targetBranch}`}`);
  };

  const handleStartRenameCategory = (catName: string, branchName: string) => {
    setEditingCategoryKey(`${catName}__${branchName}`);
    setEditingCategoryNewName(catName);
  };

  const handleSaveRenameCategory = async (oldName: string, branchName: string) => {
    const cleanNew = editingCategoryNewName.trim();
    if (!cleanNew || cleanNew === oldName) {
      setEditingCategoryKey(null);
      return;
    }

    const updatedCats = renameCategory(oldName, cleanNew, branchName);
    setCategories(['الكل', ...updatedCats]);

    const updatedItems = items.map(it => {
      const matchBranch = branchName === 'الكل' || normalizeBranchName(it.branch) === normalizeBranchName(branchName);
      return (matchBranch && it.category === oldName) ? { ...it, category: cleanNew } : it;
    });
    setItems(updatedItems);
    setEditingCategoryKey(null);

    try {
      await fetch('/api/system-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ahmed_kishk_inventory_v3', data: updatedItems }),
      });
      alert(`تم تحديث اسم التصنيف إلى "${cleanNew}" وتعديل كافة الأصناف المرتبطة به بنجاح.`);
    } catch (err) {
      console.error('Failed to sync renamed category items:', err);
    }
  };

  const handleDeleteCategory = async (catToDelete: string, branchName?: string) => {
    const targetBranch = branchName || 'الكل';
    const branchItems = items.filter(it => 
      (targetBranch === 'الكل' || normalizeBranchName(it.branch) === normalizeBranchName(targetBranch)) &&
      it.category === catToDelete
    );

    if (branchItems.length > 0) {
      if (!confirm(`تحذير: هذا التصنيف يحتوي على ${branchItems.length} صنف مسجل في ${targetBranch === 'الكل' ? 'المخازن' : targetBranch}. هل أنت متأكد من حذفه ونقل أصنافه إلى "غير مصنف"؟`)) {
        return;
      }
    } else {
      if (!confirm(`هل أنت متأكد من حذف تصنيف "${catToDelete}" من ${targetBranch === 'الكل' ? 'جميع الفروع' : targetBranch}؟`)) {
        return;
      }
    }

    deleteBranchCategory(targetBranch, catToDelete);
    const updatedCats = getBranchCustomCategories('الكل');
    setCategories(['الكل', ...updatedCats]);

    if (branchItems.length > 0) {
      const updatedItems = items.map(it => {
        const matchBranch = targetBranch === 'الكل' || normalizeBranchName(it.branch) === normalizeBranchName(targetBranch);
        return (matchBranch && it.category === catToDelete) ? { ...it, category: 'غير مصنف' } : it;
      });
      setItems(updatedItems);
      try {
        await fetch('/api/system-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'ahmed_kishk_inventory_v3', data: updatedItems }),
        });
      } catch (e) {}
    }
  };

  // #GUARD: تاب "إحصائيات الفروع" و "إدارة التصنيفات" للأدمن فقط — لو الحالة محفوظة من قبل لغير أدمن نرجّعه لتاب المخزون.
  useEffect(() => {
    if ((tab === 'stores' || tab === 'categories') && !isAdmin) setTab('stock');
  }, [tab, isAdmin]);

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
      setLoading(true);
      const res = await fetch('/api/inventory', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.items)) {
          setItems(json.items);
          // Extract unique categories dynamically + guarantee baseline categories (including خياطة)
          const persistent = getPersistentCategories();
          const itemCats = json.items.map((i: InventoryItem) => i.category).filter(Boolean);
          const allCats = Array.from(new Set([...persistent, ...itemCats]));
          setCategories(['الكل', ...allCats]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
        }
      }
    } catch (e) {}
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

  // Filter items & Guarantee categories (e.g. خياطة) never disappear for any branch
  const branchScopedItems = items.filter(item => 
    selectedBranch === 'الكل' || normalizeBranchName(item.branch) === normalizeBranchName(selectedBranch)
  );
  const persistentCats = getPersistentCategories();
  const branchCats = branchScopedItems.map(i => i.category).filter(Boolean);
  const dynamicCategories = ['الكل', ...Array.from(new Set([...persistentCats, ...branchCats]))];

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

    const catToUse = category === 'NEW' ? newCatInput.trim() : category;
    if (category === 'NEW' && newCatInput.trim()) {
      saveCustomCategory(newCatInput.trim());
      if (!categories.includes(newCatInput.trim())) {
        setCategories([...categories, newCatInput.trim()]);
      }
    }

    // #NOTE: كود الصنف بقى بيتولّد من السيرفر فقط (مضمون فريد فعليًا فى قاعدة
    // البيانات) — الواجهة متبعتش ولا تعرض كود خالص. القيمة هنا مؤقتة للعرض
    // المتفائل قبل رد السيرفر وبتتستبدل بيه فورًا.
    const newItem: InventoryItem = {
      id: `INV-${Date.now()}`,
      code: '',
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
    setShowAddModal(false);
    setName('');
    setNewCatInput('');
    setCategory('ستائر');
    setTotalQuantity(100);
    setCostPrice(100);
    setSellPrice(150);

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      const json = await res.json().catch(() => null);
      const savedItem: InventoryItem = json?.item || newItem;

      // استبدل الصنف المؤقت (id/code وهميين) بالنسخة الحقيقية من السيرفر بكودها الفعلى
      setItems(prev => prev.map(it => it.id === newItem.id ? savedItem : it));

      // Log initial stock creation
      await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemCode: savedItem.code,
          itemName: savedItem.name,
          branch: savedItem.branch,
          previousStock: 0,
          newStock: savedItem.totalQuantity,
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

  // Pagination (30 لكل صفحة)
  const PAGE_SIZE = 30;
  const [stockPage, setStockPage] = useState(1);
  const [adjPage, setAdjPage] = useState(1);

  useEffect(() => {
    setStockPage(1);
  }, [activeCategory, selectedBranch, search, lowStockOnly]);

  useEffect(() => {
    setAdjPage(1);
  }, [selectedBranch, logSearch]);

  const paginatedItems = filteredItems.slice((stockPage - 1) * PAGE_SIZE, stockPage * PAGE_SIZE);
  const paginatedAdjustments = filteredAdjustments.slice((adjPage - 1) * PAGE_SIZE, adjPage * PAGE_SIZE);

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

        {/* Tab Navigation — تاب إحصائيات الفروع للأدمن فقط */}
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto pb-px">
          {TABS.filter(t => t.key !== 'stores' || isAdmin).map(t => (
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
                    placeholder="بحث بالاسم، المورد..."
                    className="bg-white border border-slate-300 rounded-xl py-2 pl-3 pr-9 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 w-48"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="space-y-3 md:hidden">
              {paginatedItems.map(item => {
                const available = item.totalQuantity - item.reservedQuantity;
                const isLow = available <= (item.minAlert || 20);
                const isEditing = editingId === item.id;

                if (isEditing && inlineForm) {
                  return (
                    <div key={item.id} className="bg-amber-50/90 border-2 border-amber-400 rounded-2xl p-4 space-y-3 shadow-md">
                      <div className="font-bold text-xs text-amber-950 flex items-center justify-between">
                        <span>✏️ جرد وتعديل مباشر للصنف</span>
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
                    {paginatedItems.map(item => {
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
                              <BranchSelect
                                value={inlineForm.branch}
                                onChange={b => setInlineForm({ ...inlineForm, branch: b })}
                                isAdmin={isAdmin}
                                className="bg-white border border-slate-300 rounded-lg p-1 text-xs font-bold text-slate-900"
                                lockedClassName="text-xs px-1 py-1"
                              />
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
                    {loading ? (
                      <tr>
                        <td colSpan={11} className="p-12 text-center text-slate-500 font-bold">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-3xl animate-spin text-amber-500">progress_activity</span>
                            <span>جاري تحميل بيانات وأصناف المخزن...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-12 text-center text-slate-400 font-bold">
                          لا توجد أصناف مطابقة للبحث أو التصفية الحالية
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={stockPage}
                totalItems={filteredItems.length}
                pageSize={PAGE_SIZE}
                onPageChange={setStockPage}
                itemName="صنف مخزون"
              />
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
                      <th className="p-3.5">الصنف</th>
                      <th className="p-3.5">الفرع</th>
                      <th className="p-3.5 text-center">الرصيد السابق</th>
                      <th className="p-3.5 text-center">الرصيد الجديد</th>
                      <th className="p-3.5 text-center">الفارق (+ / -)</th>
                      <th className="p-3.5">سبب التسوية والجرد</th>
                      <th className="p-3.5">المسؤول</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {paginatedAdjustments.map(log => {
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

              <Pagination
                currentPage={adjPage}
                totalItems={filteredAdjustments.length}
                pageSize={PAGE_SIZE}
                onPageChange={setAdjPage}
                itemName="حركة تسوية"
              />
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

        {/* Categories Management Tab - Grouped by Branch */}
        {tab === 'categories' && (
          <div className="flex flex-col gap-6">
            {/* Header & Add Category Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <span>🏷️</span>
                    <span>إدارة وتعديل تصنيفات المخزون حسب الفروع</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    متابعة وتعديل التصنيفات وتوزيع الأصناف والكميات على مستوى كل فرع من فروع المؤسسة.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={newCategoryBranch}
                      onChange={e => setNewCategoryBranch(e.target.value)}
                      className="border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none focus:border-amber-500 shadow-3xs"
                      title="اختر الفرع الذي تريد إضافة هذا التصنيف له"
                    >
                      <option value="الكل">🏢 كل الفروع</option>
                      {BRANCHES_LIST.map(b => (
                        <option key={b.id} value={b.name}>🏪 {b.name}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewCategory();
                        }
                      }}
                      placeholder="اسم التصنيف الجديد..."
                      className="w-full sm:w-52 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      onClick={handleAddNewCategory}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-xl transition shadow-sm whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>➕</span>
                      <span>إضافة تصنيف</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Branch Filter Tabs & Search */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                  <span className="text-xs font-bold text-slate-500 ml-1 whitespace-nowrap">تصفية الفرع:</span>
                  <button
                    onClick={() => { setCategoryTabBranch('الكل'); setNewCategoryBranch('الكل'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      categoryTabBranch === 'الكل'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    🏢 جميع الفروع ({BRANCHES_LIST.length})
                  </button>
                  {BRANCHES_LIST.map(b => {
                    const branchItemCats = Array.from(new Set(items.filter(i => normalizeBranchName(i.branch) === normalizeBranchName(b.name)).map(i => (i.category || '').trim()).filter(Boolean)));
                    const branchCustomCats = getBranchCustomCategories(b.name);
                    const branchCatsCount = Array.from(new Set([...branchItemCats, ...branchCustomCats])).length;
                    return (
                      <button
                        key={b.id}
                        onClick={() => { setCategoryTabBranch(b.name); setNewCategoryBranch(b.name); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                          categoryTabBranch === b.name
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>🏪</span>
                        <span>{b.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          categoryTabBranch === b.name ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {branchCatsCount} تصنيف
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-full sm:w-72">
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={e => setCategorySearch(e.target.value)}
                      placeholder="🔍 بحث في اسم التصنيف أو اسم الفرع..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 bg-white shadow-2xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Unified Single Categories Table */}
            {(() => {
              const targetBranches = BRANCHES_LIST.filter(b => 
                categoryTabBranch === 'الكل' || normalizeBranchName(b.name) === normalizeBranchName(categoryTabBranch)
              );

              const rows: Array<{
                branch: string;
                branchType: string;
                category: string;
                itemsCount: number;
                totalStock: number;
                branchTotalStock: number;
                stockRatio: number;
                hasItems: boolean;
              }> = [];

              targetBranches.forEach(branchConfig => {
                const branchItems = items.filter(i => normalizeBranchName(i.branch) === normalizeBranchName(branchConfig.name));
                const branchTotalStock = branchItems.reduce((acc, i) => acc + (Number(i.totalQuantity) || 0), 0);
                const branchItemCats = Array.from(new Set(branchItems.map(i => (i.category || '').trim()).filter(Boolean)));
                const branchCustomCats = getBranchCustomCategories(branchConfig.name);
                
                const branchCats = Array.from(new Set([...branchItemCats, ...branchCustomCats])).sort((a, b) => {
                  const countA = branchItems.filter(i => i.category === a).length;
                  const countB = branchItems.filter(i => i.category === b).length;
                  return countB - countA;
                });

                branchCats.forEach(cat => {
                  const catBranchItems = branchItems.filter(i => i.category === cat);
                  const catBranchStock = catBranchItems.reduce((acc, i) => acc + (Number(i.totalQuantity) || 0), 0);
                  const stockRatio = branchTotalStock > 0 ? (catBranchStock / branchTotalStock) * 100 : 0;
                  rows.push({
                    branch: branchConfig.name,
                    branchType: branchConfig.type,
                    category: cat,
                    itemsCount: catBranchItems.length,
                    totalStock: catBranchStock,
                    branchTotalStock,
                    stockRatio,
                    hasItems: catBranchItems.length > 0,
                  });
                });
              });

              const filteredRows = categorySearch.trim()
                ? rows.filter(r => r.category.toLowerCase().includes(categorySearch.trim().toLowerCase()) || r.branch.toLowerCase().includes(categorySearch.trim().toLowerCase()))
                : rows;

              const getBadgeColor = (branchName: string) => {
                if (branchName.includes('الرئيسي')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
                if (branchName.includes('عرابي')) return 'bg-blue-50 text-blue-800 border-blue-200';
                if (branchName.includes('عمر أفندي')) return 'bg-purple-50 text-purple-800 border-purple-200';
                if (branchName.includes('الثلاثيني')) return 'bg-amber-50 text-amber-800 border-amber-200';
                if (branchName.includes('التجاري')) return 'bg-rose-50 text-rose-800 border-rose-200';
                return 'bg-slate-100 text-slate-800 border-slate-200';
              };

              return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  {/* Table Stats Top Bar */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                        🏷️
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          جدول التصنيفات المعتمدة للفروع
                          {categoryTabBranch !== 'الكل' && <span className="text-emerald-700 mr-1.5">({categoryTabBranch})</span>}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          إجمالي التصنيفات المعروضة: <span className="font-bold font-mono text-slate-800">{filteredRows.length}</span> تصنيف
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Single Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-100/90 text-slate-700 text-xs font-bold border-b border-slate-200">
                          <th className="py-3 px-3.5 w-12 text-center">#</th>
                          <th className="py-3 px-3.5 min-w-[140px]">الفرع</th>
                          <th className="py-3 px-3.5 min-w-[180px]">اسم التصنيف</th>
                          <th className="py-3 px-3.5 text-center min-w-[110px]">عدد الأصناف</th>
                          <th className="py-3 px-3.5 text-center min-w-[140px]">الرصيد بالمخزن</th>
                          <th className="py-3 px-3.5 min-w-[140px]">نسبة المخزون بالفرع</th>
                          <th className="py-3 px-3.5 text-center min-w-[110px]">الحالة</th>
                          <th className="py-3 px-3.5 text-center min-w-[190px]">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400 text-xs font-bold">
                              {categoryTabBranch === 'الفرع التجاري' 
                                ? 'لا توجد تصنيفات أو أصناف مسجلة في الفرع التجاري حالياً (يمكنك إضافة تصنيف جديد له من الأعلى)'
                                : 'لا توجد تصنيفات مطابقة للبحث'}
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row, idx) => {
                            const isEditing = editingCategoryKey === `${row.category}__${row.branch}`;

                            return (
                              <tr key={`${row.branch}-${row.category}-${idx}`} className={`hover:bg-slate-50/90 transition-colors ${row.hasItems ? 'bg-white' : 'bg-slate-50/40'}`}>
                                <td className="py-3 px-3.5 text-center text-xs font-mono text-slate-400">
                                  {idx + 1}
                                </td>

                                {/* Branch Column */}
                                <td className="py-3 px-3.5">
                                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border ${getBadgeColor(row.branch)}`}>
                                    <span>🏪</span>
                                    <span>{row.branch}</span>
                                  </span>
                                </td>

                                {/* Category Name Column */}
                                <td className="py-3 px-3.5">
                                  {isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editingCategoryNewName}
                                        onChange={e => setEditingCategoryNewName(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleSaveRenameCategory(row.category, row.branch);
                                          if (e.key === 'Escape') setEditingCategoryKey(null);
                                        }}
                                        autoFocus
                                        className="border border-amber-400 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 w-40"
                                      />
                                      <button
                                        onClick={() => handleSaveRenameCategory(row.category, row.branch)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded transition"
                                      >
                                        حفظ
                                      </button>
                                      <button
                                        onClick={() => setEditingCategoryKey(null)}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold px-2 py-1 rounded transition"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="w-6 h-6 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                                        🏷️
                                      </span>
                                      <span className={`font-bold text-sm ${row.hasItems ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {row.category}
                                      </span>
                                    </div>
                                  )}
                                </td>

                                {/* Items Count */}
                                <td className="py-3 px-3.5 text-center">
                                  <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                                    row.hasItems ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {row.itemsCount} صنف
                                  </span>
                                </td>

                                {/* Total Stock */}
                                <td className="py-3 px-3.5 text-center font-mono font-bold">
                                  <span className={row.hasItems ? 'text-emerald-700' : 'text-slate-400'}>
                                    {row.totalStock.toLocaleString()} متر/قطعة
                                  </span>
                                </td>

                                {/* Stock Ratio Bar */}
                                <td className="py-3 px-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          row.stockRatio > 30 ? 'bg-emerald-500' : row.stockRatio > 10 ? 'bg-amber-500' : 'bg-blue-400'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.max(0, row.stockRatio))}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-mono text-slate-400 w-9 text-left">
                                      {row.stockRatio.toFixed(0)}%
                                    </span>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="py-3 px-3.5 text-center">
                                  {row.hasItems ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                                      <span>●</span>
                                      <span>نشط بالفرع</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full font-medium">
                                      <span>○</span>
                                      <span>بدون رصيد</span>
                                    </span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-3.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setSelectedBranch(row.branch);
                                        setActiveCategory(row.category);
                                        setTab('stock');
                                      }}
                                      className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 hover:border-amber-300 px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1"
                                      title="عرض كافة الأصناف تحت هذا التصنيف في الفرع"
                                    >
                                      <span>الأصناف</span>
                                      <span>↤</span>
                                    </button>

                                    <button
                                      onClick={() => handleStartRenameCategory(row.category, row.branch)}
                                      title="تعديل اسم التصنيف"
                                      className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition text-xs font-bold"
                                    >
                                      ✏️
                                    </button>

                                    <button
                                      onClick={() => handleDeleteCategory(row.category, row.branch)}
                                      title="حذف التصنيف من الفرع"
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-xs font-bold"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
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

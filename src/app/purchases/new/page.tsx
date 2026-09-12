'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';
import { useRouter } from 'next/navigation';
import SearchableSelect, { SearchOption } from '@/components/SearchableSelect';
import { normalizeBranchName } from '@/lib/branches';
import { getTodayDateStr } from '@/lib/dateUtils';

interface PurchaseLineItem {
  id: string;
  code: string;
  name: string;
  category?: string;
  unit?: string;
  meters: number;
  unitCost: number;
  totalCost: number;
}

interface InventoryProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
  costPrice?: number;
  sellPrice?: number;
  branch: string;
}

interface SupplierItem {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  balance?: number;
  branch?: string;
}

interface PurchaseCheckRow {
  id: string;
  checkNumber: string;
  bankName: string;
  amount: number;
  dueDate: string;
  notes?: string;
}

const BANKS = ['QNB', 'البنك الأهلي المصري', 'بنك مصر', 'CIB', 'بنك القاهرة', 'بنك الإسكندرية'];

export default function NewPurchaseInvoicePage() {
  const router = useRouter();

  // Branch & User
  const [branch, setBranch] = useState('الفرع الرئيسي');
  const { user: currentUser, isAdmin } = useCurrentUser();
  useEffect(() => {
    if (!isAdmin && currentUser?.branch) setBranch(currentUser.branch);
  }, [isAdmin, currentUser]);

  // Invoice Code / Number
  const [invoiceNumber, setInvoiceNumber] = useState(() => `PUR-2026-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`);

  // Supplier state
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [suppliersList, setSuppliersList] = useState<SupplierItem[]>([]);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupAddress, setNewSupAddress] = useState('');
  const [newSupBalance, setNewSupBalance] = useState(0);
  const [isSavingSup, setIsSavingSup] = useState(false);

  // Products from Inventory
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [loadingProducts, setLoadingProducts] = useState(true);

  // On-the-fly New Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('ستائر');
  const [newProdUnit, setNewProdUnit] = useState('متر');
  const [newProdCostPrice, setNewProdCostPrice] = useState<number>(0);
  const [newProdSellPrice, setNewProdSellPrice] = useState<number>(0);
  const [isSavingProd, setIsSavingProd] = useState(false);

  // Invoice Line Items
  const [items, setItems] = useState<PurchaseLineItem[]>([]);

  // Discount
  const [discountType, setDiscountType] = useState<'EGP' | 'PERCENT'>('EGP');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Payment Method & Settlement
  const [paymentMethod, setPaymentMethod] = useState<'نقدي (كاش)' | 'شيكات بنكية' | 'على دفعات / آجل' | 'إنستاباي' | 'فودافون كاش' | 'فيزا / كارت'>('نقدي (كاش)');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [purNotes, setPurNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Checks rows
  const [checkRows, setCheckRows] = useState<PurchaseCheckRow[]>([]);

  useEffect(() => {
    if (paymentMethod === 'شيكات بنكية' && checkRows.length === 0) {
      setCheckRows([{ id: `chk-${Date.now()}`, checkNumber: '', bankName: BANKS[0], amount: 0, dueDate: '', notes: '' }]);
    }
  }, [paymentMethod]);

  const addCheckRow = () => setCheckRows(prev => [
    ...prev,
    { id: `chk-${Date.now()}`, checkNumber: '', bankName: BANKS[0], amount: 0, dueDate: '', notes: '' },
  ]);
  const removeCheckRow = (id: string) => setCheckRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  const updateCheckRow = (id: string, field: keyof PurchaseCheckRow, val: any) =>
    setCheckRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));

  // Load Initial Data: Suppliers & Inventory
  useEffect(() => {
    async function initData() {
      try {
        const [supRes, invRes, countRes] = await Promise.all([
          fetch('/api/suppliers', { cache: 'no-store' }),
          fetch('/api/inventory', { cache: 'no-store' }),
          fetch('/api/purchases', { cache: 'no-store' }),
        ]);

        if (supRes.ok) {
          const supJson = await supRes.json();
          if (supJson.success && Array.isArray(supJson.suppliers)) {
            setSuppliersList(supJson.suppliers);
          }
        }

        if (invRes.ok) {
          const invJson = await invRes.json();
          if (invJson.success && Array.isArray(invJson.items)) {
            setProducts(invJson.items);
          }
        }

        setInvoiceNumber(`PUR-2026-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`);
      } catch (err) {
        console.error('Error loading purchase page data:', err);
      } finally {
        setLoadingProducts(false);
      }
    }
    initData();
  }, []);

  // Supplier Autocomplete Options
  const supplierOptions: SearchOption[] = useMemo(() => {
    return suppliersList.map(s => ({
      id: s.id || s.name,
      name: s.name,
      sub: s.phone ? `هاتف: ${s.phone}` : undefined,
      extra: Number(s.balance) > 0 ? `مستحق: ${Number(s.balance).toLocaleString()} ج` : undefined,
      badge: s.branch || undefined,
    }));
  }, [suppliersList]);

  const handleSelectSupplier = (id: string, opt?: SearchOption) => {
    setSupplierId(id);
    if (!id) {
      setSupplierName('');
      setSupplierPhone('');
      return;
    }
    const found = suppliersList.find(s => s.id === id || s.name === id || (opt && s.name === opt.name));
    if (found) {
      setSupplierName(found.name);
      setSupplierPhone(found.phone || '');
    } else if (opt) {
      setSupplierName(opt.name);
      setSupplierPhone('');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim() || isSavingSup) return;
    setIsSavingSup(true);
    const newObj: SupplierItem = {
      id: `SUP-${Date.now()}`,
      name: newSupName.trim(),
      phone: newSupPhone.trim(),
      address: newSupAddress.trim(),
      balance: Number(newSupBalance) || 0,
      branch,
    };
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newObj),
      });
      if (res.ok) {
        setSuppliersList(prev => [newObj, ...prev]);
        setSupplierId(newObj.id);
        setSupplierName(newObj.name);
        setSupplierPhone(newObj.phone || '');
        setShowAddSupplierModal(false);
        setNewSupName('');
        setNewSupPhone('');
        setNewSupAddress('');
        setNewSupBalance(0);
      }
    } catch (err) {
      console.error('Failed to create supplier:', err);
    } finally {
      setIsSavingSup(false);
    }
  };

  // Add Product to Cart / Items
  const handleAddProductToCart = (prod: InventoryProduct) => {
    const cost = Number(prod.costPrice) || Number(prod.sellPrice) || 0;
    const existingIdx = items.findIndex(it => it.code === prod.code || it.name === prod.name);
    if (existingIdx >= 0) {
      const updated = [...items];
      updated[existingIdx].meters = Number((updated[existingIdx].meters + 1).toFixed(2));
      updated[existingIdx].totalCost = Number((updated[existingIdx].meters * updated[existingIdx].unitCost).toFixed(2));
      setItems(updated);
    } else {
      const newItem: PurchaseLineItem = {
        id: `PITM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        code: prod.code,
        name: prod.name,
        category: prod.category,
        unit: prod.unit || 'متر',
        meters: 10,
        unitCost: cost,
        totalCost: Number((10 * cost).toFixed(2)),
      };
      setItems(prev => [newItem, ...prev]);
    }
  };

  // Create on-the-fly New Product in Inventory & add to Cart
  const handleCreateProductOnTheFly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || isSavingProd) return;
    setIsSavingProd(true);

    // #NOTE: كود الصنف بيتولّد من السيرفر فقط دلوقتي (مضمون فريد فعليًا) — مفيش
    // كود بيتبعت من هنا خالص.
    const cost = Number(newProdCostPrice) || 0;
    const sell = Number(newProdSellPrice) || Math.round(cost * 1.35);

    const newProdData: Partial<InventoryProduct> = {
      name: newProdName.trim(),
      category: newProdCategory,
      unit: newProdUnit,
      totalQuantity: 0,
      costPrice: cost,
      sellPrice: sell,
      branch,
    };

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProdData),
      });

      if (res.ok) {
        const json = await res.json();
        const createdProd = json.item || { ...newProdData, id: `INV-${Date.now()}`, code: '' };
        setProducts(prev => [createdProd, ...prev]);

        // Add directly to cart
        handleAddProductToCart(createdProd as InventoryProduct);

        setShowAddProductModal(false);
        setNewProdName('');
        setNewProdCostPrice(0);
        setNewProdSellPrice(0);
      } else {
        const json = await res.json();
        alert(json.error || 'فشل في حفظ الصنف الجديد');
      }
    } catch (err) {
      console.error('Error saving product on the fly:', err);
    } finally {
      setIsSavingProd(false);
    }
  };

  // Cart item modifications
  const updateItem = (id: string, field: keyof PurchaseLineItem, val: any) => {
    setItems(items.map(it => {
      if (it.id === id) {
        const updated = { ...it, [field]: val };
        const meters = field === 'meters' ? Math.max(0.1, Number(val) || 0) : it.meters;
        const unitCost = field === 'unitCost' ? Math.max(0, Number(val) || 0) : it.unitCost;
        updated.meters = meters;
        updated.unitCost = unitCost;
        updated.totalCost = Number((meters * unitCost).toFixed(2));
        return updated;
      }
      return it;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(it => it.id !== id));
  };

  // Dynamic categories strictly belonging to the active branch's available inventory
  const dynamicCategories = useMemo(() => {
    const branchScoped = products.filter(p =>
      !branch || branch === 'الكل' || normalizeBranchName(p.branch) === normalizeBranchName(branch)
    );
    const uniqueCats = Array.from(
      new Set(
        branchScoped
          .map(p => (p.category || '').trim())
          .filter(Boolean)
      )
    );
    return uniqueCats;
  }, [products, branch]);

  // Filtered Products for Catalog Search
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter(p => {
      const matchesBranch = !branch || branch === 'الكل' || normalizeBranchName(p.branch) === normalizeBranchName(branch);
      const matchesCat = selectedCategory === 'الكل' || p.category === selectedCategory;
      const matchesSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q);
      return matchesBranch && matchesCat && matchesSearch;
    });
  }, [products, branch, selectedCategory, productSearch]);

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.meters * item.unitCost), 0);
  const calculatedDiscount = discountType === 'PERCENT' ? (subtotal * (discountValue || 0)) / 100 : (discountValue || 0);
  const totalAmount = Math.max(0, subtotal - calculatedDiscount);
  const remainingAmount = Math.max(0, totalAmount - (paidAmount || 0));

  // Submit Save Purchase Invoice
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      alert('من فضلك اختر أو أضف اسم المورد أولاً');
      return;
    }
    if (items.length === 0) {
      alert('السلة فارغة! أضف صنفاً واحداً على الأقل من جدول الخامات');
      return;
    }
    if (subtotal <= 0) {
      alert('من فضلك أدخل كميات وأسعار شراء صحيحة');
      return;
    }

    if (paymentMethod === 'شيكات بنكية') {
      const bad = checkRows.find(r => !r.checkNumber.trim() || !r.bankName || r.amount <= 0 || !r.dueDate);
      if (bad) {
        alert('من فضلك أكمل بيانات جميع الشيكات (رقم الشيك، البنك، المبلغ، تاريخ الاستحقاق)');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const statusLabel = remainingAmount === 0 ? 'مسدد بالكامل' : paidAmount > 0 ? 'مسدد جزئياً' : 'آجل / غير مسدد';
      const attachedChecks = paymentMethod === 'شيكات بنكية' ? checkRows : [];

      const newPur = {
        id: `PUR-${Date.now()}`,
        invoiceNumber,
        date: getTodayDateStr(),
        supplierName: supplierName.trim(),
        supplierPhone: supplierPhone.trim() || 'غير محدد',
        branch,
        items,
        subtotal,
        discountType,
        discountValue,
        discountAmount: calculatedDiscount,
        totalAmount,
        paidAmount,
        remainingAmount,
        paymentMethod,
        status: statusLabel,
        notes: purNotes.trim(),
        checks: attachedChecks,
      };

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPur),
      });

      if (attachedChecks.length > 0) {
        try {
          const newChecks = attachedChecks.map(c => ({
            checkNumber: c.checkNumber.trim(),
            bankName: c.bankName,
            supplierName: supplierName.trim(),
            amount: Number(c.amount) || 0,
            issueDate: getTodayDateStr(),
            dueDate: c.dueDate,
            notes: c.notes || `شيك فاتورة شراء ${invoiceNumber}`,
            status: 'قيد الانتظار',
          }));
          await fetch('/api/supplier-checks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checks: newChecks }),
          });
        } catch (err) {
          console.error('Check sync error:', err);
        }
      }

      if (res.ok) {
        router.push('/purchases');
      } else {
        const json = await res.json();
        alert(json.error || 'حدث خطأ أثناء حفظ الفاتورة');
      }
    } catch (err) {
      console.error(err);
      alert('فشل في حفظ الفاتورة، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell noHeader fullWidth>
      <div className="w-full max-w-[1600px] mx-auto space-y-2.5 pb-8 pt-1">

        {/* 🌟 Single Ultra-Compact Top Bar (No Double Header) */}
        <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-soft flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-xl">shopping_cart_checkout</span>
            <h1 className="text-sm sm:text-base font-black text-slate-900">فاتورة مشتريات وتوريد</h1>
            <span className="bg-amber-100 text-amber-950 text-xs px-2 py-0.5 rounded-lg font-mono font-black border border-amber-300">
              {invoiceNumber || 'PUR-2026-001'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-40">
              <BranchSelect
                value={branch}
                onChange={setBranch}
                isAdmin={isAdmin}
                className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 text-xs bg-slate-50 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setNewProdName(productSearch.trim());
                setShowAddProductModal(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-3xs whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[15px]">add_box</span>
              <span>+ صنف جديد</span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/purchases')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200 flex items-center gap-1 whitespace-nowrap"
              title="رجوع لسجل فواتير المشتريات"
            >
              <span>↩️ السجل</span>
            </button>
          </div>
        </div>

        {/* 🏢 Dedicated Supplier Selection & Quick Add Bar (Above Catalog / Cart) */}
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-soft flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="flex items-center gap-1.5 text-slate-700 font-black text-xs shrink-0">
              <span className="material-symbols-outlined text-amber-600 text-lg">local_shipping</span>
              <span>المورد / التاجر:</span>
            </div>
            <div className="w-72 max-w-full">
              <SearchableSelect
                options={supplierOptions}
                value={supplierId}
                onChange={handleSelectSupplier}
                placeholder="🔍 ابحث بالاسم، الشركة أو الهاتف..."
                emptyLabel="— اختر المورد —"
                onAddNew={() => setShowAddSupplierModal(true)}
                addNewText="إضافة مورد جديد باسم"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddSupplierModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-3xs"
            >
              <span className="material-symbols-outlined text-[15px]">person_add</span>
              <span>+ مورد جديد</span>
            </button>
          </div>

          {/* Selected Supplier Info Pill */}
          {supplierName ? (
            <div className="flex items-center gap-2 bg-amber-50/70 border border-amber-200/80 px-3 py-1 rounded-xl text-xs">
              <span className="font-bold text-amber-950">
                🏢 {supplierName}
              </span>
              {supplierPhone && (
                <span className="text-slate-600 font-mono text-[11px] border-r border-amber-300 pr-2 mr-1">
                  📞 {supplierPhone}
                </span>
              )}
              {(() => {
                const s = suppliersList.find(sup => sup.id === supplierId || sup.name === supplierName);
                if (s && Number(s.balance) > 0) {
                  return (
                    <span className="text-rose-700 font-mono font-black text-[11px] bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded mr-1">
                      مستحق: {Number(s.balance).toLocaleString()} ج
                    </span>
                  );
                }
                return null;
              })()}
              <button
                type="button"
                onClick={() => {
                  setSupplierId('');
                  setSupplierName('');
                  setSupplierPhone('');
                }}
                className="text-slate-400 hover:text-rose-600 text-xs font-bold mr-1 cursor-pointer"
                title="إلغاء اختيار المورد"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              ⚠️ يرجى اختيار المورد أو إضافته لحفظ الفاتورة
            </div>
          )}
        </div>

        {/* 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">

          {/* ========================================================= */}
          {/* COLUMN 1 (5 cols - RIGHT): High-Density Products Catalog Table */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden flex flex-col" style={{ height: 'calc(100dvh - 135px)' }}>
            
            {/* Search & Dynamic Category Filter Top Bar */}
            <div className="p-2.5 border-b border-slate-200 bg-slate-50/70 space-y-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                    search
                  </span>
                  <input
                    type="text"
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="🔍 ابحث عن صنف بالاسم، الكود، أو الباركود..."
                    className="w-full bg-white border border-slate-300 rounded-xl pr-8 pl-6 py-1.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <span className="text-[11px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-lg shrink-0">
                  {filteredProducts.length} صنف
                </span>
              </div>

              {/* Dynamic Categories: Select Dropdown + All Button */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('الكل')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
                    selectedCategory === 'الكل'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-3xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  🌐 الكل ({products.filter(p => !branch || branch === 'الكل' || normalizeBranchName(p.branch) === normalizeBranchName(branch)).length})
                </button>
                <div className="relative flex-1">
                  <select
                    value={selectedCategory === 'الكل' ? '' : selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value || 'الكل')}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-inner cursor-pointer"
                  >
                    <option value="">📂 كل التصنيفات ({dynamicCategories.length} تصنيف متاح بالفرع)...</option>
                    {dynamicCategories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loadingProducts ? (
                <div className="py-20 text-center text-slate-400 text-xs font-bold">
                  جاري تحميل أصناف المخزن...
                </div>
              ) : filteredProducts.length === 0 ? (
                /* Empty search result -> Quick Add CTA */
                <div className="p-6 text-center space-y-2.5 bg-amber-50/40 m-3 rounded-xl border border-dashed border-amber-300">
                  <span className="material-symbols-outlined text-3xl text-amber-500 block">search_off</span>
                  <div className="text-xs font-bold text-slate-800">
                    لم يتم العثور على صنف مطابق {productSearch ? `لـ "${productSearch}"` : ''}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewProdName(productSearch.trim());
                      setShowAddProductModal(true);
                    }}
                    className="bg-brand-gold hover:bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs shadow-gold cursor-pointer inline-flex items-center gap-1 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    <span>+ إضافة صنف جديد باسم "{productSearch || 'صنف جديد'}"</span>
                  </button>
                </div>
              ) : (
                <table className="w-full text-right text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px]">
                    <tr>
                      <th className="p-2 pr-3">اسم الصنف / الخامة</th>
                      <th className="p-2">التصنيف</th>
                      <th className="p-2 text-center">رصيد المخزن</th>
                      <th className="p-2 text-center">سعر التكلفة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredProducts.map(p => {
                      const cost = Number(p.costPrice) || Number(p.sellPrice) || 0;
                      const inCart = items.find(it => it.code === p.code || it.name === p.name);

                      return (
                        <tr
                          key={p.id || p.code}
                          onClick={() => handleAddProductToCart(p)}
                          className={`hover:bg-amber-50/70 cursor-pointer transition-colors ${
                            inCart ? 'bg-amber-50/90 font-bold' : ''
                          }`}
                          title="اضغط لإضافة هذا الصنف للفاتورة"
                        >
                          <td className="p-2 pr-3 font-bold text-slate-900 max-w-[200px]" title={p.name}>
                            <div className="flex items-center gap-1.5">
                              <span className="truncate">{p.name}</span>
                              {inCart && (
                                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded shadow-3xs shrink-0 font-mono">
                                  ✓ {inCart.meters}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-2 whitespace-nowrap">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                              {p.category || 'عام'}
                            </span>
                          </td>

                          <td className="p-2 text-center whitespace-nowrap font-mono text-slate-700">
                            {p.totalQuantity || 0} {p.unit || 'متر'}
                          </td>

                          <td className="p-2 text-center font-mono font-bold text-emerald-800 whitespace-nowrap">
                            {cost.toLocaleString()} ج
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>

          {/* ========================================================= */}
          {/* COLUMN 2 (7 cols - LEFT): Cart Items Table & Settlement */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden flex flex-col" style={{ height: 'calc(100dvh - 135px)' }}>
            
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-500 text-base">receipt_long</span>
                <span className="font-black text-slate-900 text-xs sm:text-sm">أصناف الفاتورة والتسعير</span>
                <span className="bg-amber-100 text-amber-950 text-xs px-2 py-0.2 rounded-full font-mono font-black border border-amber-300">
                  {items.length}
                </span>
              </div>

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                >
                  مسح الكل ✕
                </button>
              )}
            </div>

            {/* Cart Table Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
              {items.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs font-bold space-y-1">
                  <span className="material-symbols-outlined text-3xl text-slate-300 block">add_shopping_cart</span>
                  <span>السلة فارغة. اضغط على أي صنف من الجدول يميناً لإضافته 👈</span>
                </div>
              ) : (
                <table className="w-full text-right text-xs border-collapse table-fixed">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10 text-[11px]">
                    <tr>
                      <th className="p-2.5 pr-3 w-[36%]">الصنف والكود</th>
                      <th className="p-2.5 text-center w-[24%]">الكمية (متر/قطعة)</th>
                      <th className="p-2.5 text-center w-[20%]">سعر الوحدة (ج)</th>
                      <th className="p-2.5 text-center w-[20%]">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map(it => (
                      <tr key={it.id} className="hover:bg-slate-50/90 transition-colors">
                        {/* 1. الصنف والكود */}
                        <td className="p-2.5 pr-3 align-middle">
                          <div className="font-bold text-slate-900 text-xs leading-snug break-words" title={it.name}>
                            {it.name}
                          </div>
                          {it.code && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5" dir="ltr">
                              {it.code}
                            </div>
                          )}
                        </td>

                        {/* 2. الكمية (متر/قطعة) - Stepper */}
                        <td className="p-2 text-center align-middle">
                          <div className="inline-flex items-center justify-center gap-1 border border-slate-300 rounded-xl p-0.5 bg-white shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateItem(it.id, 'meters', Math.max(0.25, it.meters - 1))}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm flex items-center justify-center cursor-pointer transition-colors"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="any"
                              min="0.01"
                              value={it.meters}
                              onChange={e => updateItem(it.id, 'meters', parseFloat(e.target.value) || 0)}
                              className="w-14 text-center font-mono font-black text-xs sm:text-sm bg-transparent text-slate-900 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateItem(it.id, 'meters', it.meters + 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm flex items-center justify-center cursor-pointer transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* 3. سعر الوحدة */}
                        <td className="p-2 text-center align-middle">
                          <div className="flex justify-center">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.unitCost === 0 ? '' : it.unitCost}
                              onChange={e => updateItem(it.id, 'unitCost', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-full max-w-[100px] border border-slate-300 rounded-xl py-1.5 px-2 text-center font-mono font-black text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:border-amber-500 shadow-2xs"
                            />
                          </div>
                        </td>

                        {/* 4. الإجمالي مع زر الحذف */}
                        <td className="p-2 text-center align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="bg-amber-50 border border-amber-200 text-amber-950 px-2.5 py-1 rounded-xl text-xs font-black inline-block font-mono whitespace-nowrap shadow-3xs">
                              {it.totalCost.toLocaleString()} ج
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(it.id)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 w-7 h-7 rounded-lg font-bold flex items-center justify-center cursor-pointer transition-colors"
                              title="حذف هذا الصنف"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Financials & Settlement Section (Fixed at bottom of left column) */}
            <div className="p-2.5 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0 text-xs">
              
              {/* Payment Methods Pills */}
              <div className="grid grid-cols-3 gap-1 text-center text-[11px]">
                {[
                  { id: 'نقدي (كاش)', label: '💵 نقدي' },
                  { id: 'على دفعات / آجل', label: '⏳ آجل / دفعات' },
                  { id: 'شيكات بنكية', label: '🏦 شيكات' },
                  { id: 'إنستاباي', label: '⚡ إنستاباي' },
                  { id: 'فودافون كاش', label: '📱 فودافون' },
                  { id: 'فيزا / كارت', label: '💳 فيزا' },
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-1 px-1 rounded-lg font-black transition-all border cursor-pointer ${
                      paymentMethod === m.id
                        ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-3xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Checks Manager */}
              {paymentMethod === 'شيكات بنكية' && (
                <div className="bg-amber-50/90 p-2 rounded-xl border border-amber-200 space-y-1.5 max-h-36 overflow-y-auto">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-black text-amber-950">شيكات الفاتورة:</span>
                    <button
                      type="button"
                      onClick={addCheckRow}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] cursor-pointer"
                    >
                      + شيك إضافي
                    </button>
                  </div>
                  {checkRows.map((chk, cIdx) => (
                    <div key={chk.id || cIdx} className="bg-white p-1.5 rounded-lg border border-amber-200 space-y-1">
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="text"
                          placeholder="رقم الشيك *"
                          value={chk.checkNumber}
                          onChange={e => updateCheckRow(chk.id, 'checkNumber', e.target.value)}
                          className="border border-slate-300 rounded px-1.5 py-0.5 font-mono text-[11px]"
                        />
                        <select
                          value={chk.bankName}
                          onChange={e => updateCheckRow(chk.id, 'bankName', e.target.value)}
                          className="border border-slate-300 rounded px-1.5 py-0.5 text-[11px]"
                        >
                          {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="number"
                          min="0"
                          placeholder="المبلغ (ج) *"
                          value={chk.amount || ''}
                          onChange={e => updateCheckRow(chk.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="border border-slate-300 rounded px-1.5 py-0.5 font-mono text-[11px]"
                        />
                        <input
                          type="date"
                          value={chk.dueDate}
                          onChange={e => updateCheckRow(chk.id, 'dueDate', e.target.value)}
                          className="border border-slate-300 rounded px-1.5 py-0.5 font-mono text-[11px]"
                        />
                      </div>
                      {checkRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCheckRow(chk.id)}
                          className="text-rose-600 text-[10px] font-bold"
                        >
                          إزالة الشيك ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Totals Summary */}
              <div className="bg-slate-900 text-white p-2.5 rounded-xl space-y-1.5 border border-slate-800">
                <div className="flex justify-between items-center text-slate-300 text-[11px]">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono font-bold text-xs">{subtotal.toLocaleString()} ج.م</span>
                </div>

                <div className="flex justify-between items-center text-amber-300 text-[11px] pt-1 border-t border-slate-800">
                  <span>خصم المورد:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={discountValue || ''}
                      onChange={e => setDiscountValue(Number(e.target.value))}
                      className="w-20 text-center rounded px-1.5 py-0.5 font-mono font-black text-xs text-slate-950 bg-white focus:outline-none"
                    />
                    <span className="text-[10px] font-mono text-slate-400">ج.م</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-white border-t border-slate-800 pt-1 font-black">
                  <span className="text-xs">الصافي المطلوب:</span>
                  <span className="font-mono text-base text-emerald-400">{totalAmount.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Paid & Remaining */}
              <div className="bg-amber-50/80 border border-amber-200 p-2 rounded-xl space-y-1 text-[11px]">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-black text-amber-950 whitespace-nowrap">المدفوع:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={paidAmount || ''}
                      onChange={e => setPaidAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 bg-white border border-amber-400 rounded-lg px-1.5 py-1 font-mono font-black text-slate-950 text-xs text-center focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setPaidAmount(totalAmount)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-lg font-black cursor-pointer"
                    >
                      كامل ⚡
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-amber-200/80 font-bold">
                  <span className="text-slate-600">المتبقي (آجل):</span>
                  <strong className={`font-mono font-black text-xs ${
                    remainingAmount === 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {remainingAmount.toLocaleString()} ج.م
                  </strong>
                </div>
              </div>

              {/* Notes Input */}
              <input
                type="text"
                placeholder="ملاحظات توريد الخامات (اختياري)..."
                value={purNotes}
                onChange={e => setPurNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 bg-white"
              />

              {/* Submit Save Button */}
              <button
                type="button"
                disabled={isSubmitting || items.length === 0}
                onClick={handleSubmit}
                className="w-full bg-brand-gold hover:bg-amber-400 disabled:opacity-50 text-slate-950 py-2.5 rounded-xl text-xs font-black shadow-gold cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <span>⏳ جاري حفظ الفاتورة...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">save</span>
                    <span>حفظ فاتورة الشراء وتحديث المخزن ✓</span>
                  </>
                )}
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* ➕ Modal: Add New Product on the Fly */}
      {showAddProductModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-500 text-lg">add_circle</span>
                <span>إضافة صنف وقماش جديد للمخزن</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProductOnTheFly} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم الصنف / القماش *:</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  placeholder="مثال: قطيفة جاجوار كوري فاخر..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">التصنيف:</label>
                  <select
                    value={newProdCategory}
                    onChange={e => setNewProdCategory(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="ستائر">ستائر 🪟</option>
                    <option value="سواريه">سواريه ✨</option>
                    <option value="تراكات ومواسير">تراكات ومواسير 🛠️</option>
                    <option value="أشرطة وإكسسوارات">أشرطة وإكسسوارات 🎀</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">سعر الشراء / التكلفة (ج):</label>
                  <input
                    type="number"
                    min="0"
                    value={newProdCostPrice || ''}
                    onChange={e => setNewProdCostPrice(Number(e.target.value))}
                    placeholder="0"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">سعر البيع الافتراضي (ج):</label>
                  <input
                    type="number"
                    min="0"
                    value={newProdSellPrice || ''}
                    onChange={e => setNewProdSellPrice(Number(e.target.value))}
                    placeholder="0"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                💡 سيتم حفظ الصنف فوراً بقاعدة بيانات المخزن وإدراجه مباشرة في بنود الفاتورة الحالية.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingProd}
                  className="flex-1 bg-brand-gold hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl shadow-gold cursor-pointer transition-all"
                >
                  {isSavingProd ? 'جاري الحفظ...' : 'حفظ الصنف وإضافته للفاتورة ✓'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ➕ Modal: Add New Supplier */}
      {showAddSupplierModal && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-500 text-lg">person_add</span>
                <span>إضافة مورد / شركة جديدة</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم المورد أو الشركة *:</label>
                <input
                  type="text"
                  required
                  value={newSupName}
                  onChange={e => setNewSupName(e.target.value)}
                  placeholder="مثال: مصنع النيل للأقمشة..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">رقم الهاتف:</label>
                <input
                  type="text"
                  value={newSupPhone}
                  onChange={e => setNewSupPhone(e.target.value)}
                  placeholder="010..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">العنوان أو المقر:</label>
                <input
                  type="text"
                  value={newSupAddress}
                  onChange={e => setNewSupAddress(e.target.value)}
                  placeholder="العنوان..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">الرصيد الافتتاحي المستحق للمورد (ج):</label>
                <input
                  type="number"
                  min="0"
                  value={newSupBalance || ''}
                  onChange={e => setNewSupBalance(Number(e.target.value))}
                  placeholder="0"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingSup}
                  className="flex-1 bg-brand-gold hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl shadow-gold cursor-pointer transition-all"
                >
                  {isSavingSup ? 'جاري الحفظ...' : 'حفظ المورد واختياره ✓'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </PageShell>
  );
}

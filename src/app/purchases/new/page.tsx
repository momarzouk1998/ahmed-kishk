'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';
import { useRouter } from 'next/navigation';
import SearchableSelect, { SearchOption } from '@/components/SearchableSelect';
import { normalizeBranchName } from '@/lib/branches';

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

const CATEGORIES = ['الكل', 'ستائر', 'سواريه', 'تراكات ومواسير', 'أشرطة وإكسسوارات'];

export default function NewPurchaseInvoicePage() {
  const router = useRouter();

  // Branch & User
  const [branch, setBranch] = useState('الفرع الرئيسي');
  const { user: currentUser, isAdmin } = useCurrentUser();
  useEffect(() => {
    if (!isAdmin && currentUser?.branch) setBranch(currentUser.branch);
  }, [isAdmin, currentUser]);

  // Invoice Code / Number
  const [invoiceNumber, setInvoiceNumber] = useState('');

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
  const [newProdCode, setNewProdCode] = useState('');
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

        let existingCount = 0;
        if (countRes.ok) {
          const countJson = await countRes.json();
          if (Array.isArray(countJson.purchases)) {
            existingCount = countJson.purchases.length;
          }
        }
        setInvoiceNumber(`PUR-2026-${String(existingCount + 1).padStart(3, '0')}`);
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

    const code = newProdCode.trim() || `FAB-${Date.now().toString().slice(-4)}`;
    const cost = Number(newProdCostPrice) || 0;
    const sell = Number(newProdSellPrice) || Math.round(cost * 1.35);

    const newProdData: Partial<InventoryProduct> = {
      code,
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
        const createdProd = json.item || { ...newProdData, id: `INV-${Date.now()}` };
        setProducts(prev => [createdProd, ...prev]);

        // Add directly to cart
        handleAddProductToCart(createdProd as InventoryProduct);

        setShowAddProductModal(false);
        setNewProdName('');
        setNewProdCode('');
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
      alert('السلة فارغة! أضف صنفاً واحداً على الأقل من قائمة الخامات');
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
        date: new Date().toISOString().split('T')[0],
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
            issueDate: new Date().toISOString().split('T')[0],
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
    <PageShell title="إنشاء فاتورة مشتريات جديدة" fullWidth>
      <div className="max-w-[1500px] mx-auto space-y-4 pb-12">

        {/* Top Header Card */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              <span className="material-symbols-outlined text-2xl">add_business</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900">فاتورة مشتريات وتوريد خامات</h1>
                <span className="bg-amber-100 text-amber-950 text-xs px-2.5 py-0.5 rounded-lg font-mono font-black border border-amber-300">
                  {invoiceNumber || 'PUR-2026-001'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">البحث السريع عن الموردين والأصناف وتحديث المخزون تلقائياً عند الحفظ</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setNewProdName(productSearch.trim());
                setShowAddProductModal(true);
              }}
              className="bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
            >
              <span className="material-symbols-outlined text-[16px]">add_box</span>
              <span>+ تعريف صنف جديد</span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/purchases')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer border border-slate-200 flex items-center gap-1"
            >
              <span>↩️</span>
              <span>سجل الفواتير</span>
            </button>
          </div>
        </div>

        {/* 2-Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

          {/* ========================================================= */}
          {/* COLUMN 1 (7 cols): Products Search & Inventory Catalog */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 space-y-3">
            
            {/* Search and Category Filters */}
            <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-soft space-y-3">
              {/* Live Search Input */}
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="🔍 ابحث عن قماش أو صنف بالاسم، الكود، أو الباركود..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-10 pl-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {CATEGORIES.map(cat => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {cat === 'ستائر' && '🪟 '}
                      {cat === 'سواريه' && '✨ '}
                      {cat === 'تراكات ومواسير' && '🛠️ '}
                      {cat === 'أشرطة وإكسسوارات' && '🎀 '}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products Grid */}
            <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-soft">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-500 text-lg">inventory_2</span>
                  <span>الأصناف المتاحة بالمخزن ({filteredProducts.length})</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-bold">اضغط على الصنف لإضافته للسلة</span>
              </div>

              {loadingProducts ? (
                <div className="py-16 text-center text-slate-400 text-xs font-bold">
                  جاري تحميل أصناف المخزن...
                </div>
              ) : filteredProducts.length === 0 ? (
                /* Empty search result -> Quick Add CTA */
                <div className="py-10 px-4 text-center space-y-3 bg-amber-50/50 rounded-2xl border-2 border-dashed border-amber-200">
                  <span className="material-symbols-outlined text-4xl text-amber-500 block">search_off</span>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">
                      لم يتم العثور على صنف مطابق {productSearch ? `لـ "${productSearch}"` : ''}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">هل هذه خامـة جديدة موردة غير مسجلة في المخزن من قبل؟</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewProdName(productSearch.trim());
                      setShowAddProductModal(true);
                    }}
                    className="bg-brand-gold hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-gold cursor-pointer inline-flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    <span>+ إضافة صنف جديد باسم "{productSearch || 'صنف جديد'}" للمخزن والفاتورة</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[580px] overflow-y-auto pr-1">
                  {filteredProducts.map(p => {
                    const cost = Number(p.costPrice) || Number(p.sellPrice) || 0;
                    const inCart = items.find(it => it.code === p.code || it.name === p.name);

                    return (
                      <div
                        key={p.id || p.code}
                        onClick={() => handleAddProductToCart(p)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 text-right ${
                          inCart
                            ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-3xs'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <span className="font-black text-xs sm:text-sm text-slate-900 block truncate" title={p.name}>
                              {p.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{p.code}</span>
                              {p.category && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                                  {p.category}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="bg-emerald-50 text-emerald-800 font-mono font-black text-xs px-2 py-1 rounded-xl border border-emerald-200 shrink-0">
                            {cost.toLocaleString()} ج / {p.unit || 'متر'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-500 font-bold">
                            رصيد المخزن: <strong className="font-mono text-slate-800">{p.totalQuantity || 0}</strong> {p.unit || 'متر'}
                          </span>

                          <span className={`font-bold flex items-center gap-0.5 ${
                            inCart ? 'text-amber-800' : 'text-slate-400'
                          }`}>
                            {inCart ? `✓ بالسلة (${inCart.meters}م)` : '+ إضافة'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* ========================================================= */}
          {/* COLUMN 2 (5 cols): Supplier, Cart Items & Settlement */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 space-y-3">

            {/* Supplier & Branch Card */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-500 text-lg">person</span>
                  <span>1. بيانات المورد والفرع</span>
                </h3>

                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(true)}
                  className="text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-xl transition-colors cursor-pointer border border-amber-300 flex items-center gap-1"
                >
                  <span>➕</span>
                  <span>مورد جديد</span>
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">المورد / الشركة *:</label>
                  <SearchableSelect
                    options={supplierOptions}
                    value={supplierId}
                    onChange={handleSelectSupplier}
                    placeholder="🔍 ابحث بالاسم أو الهاتف..."
                    emptyLabel="— اختر المورد —"
                    onAddNew={() => setShowAddSupplierModal(true)}
                    addNewText="إضافة مورد جديد باسم"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">هاتف المورد:</label>
                    <input
                      type="text"
                      placeholder="010..."
                      value={supplierPhone}
                      onChange={e => setSupplierPhone(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">فرع الاستلام:</label>
                    <BranchSelect
                      value={branch}
                      onChange={setBranch}
                      isAdmin={isAdmin}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-900 text-xs bg-slate-50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cart Items Table Card */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-500 text-lg">shopping_cart</span>
                  <span>2. بنود الفاتورة والخامات ({items.length})</span>
                </h3>

                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setItems([])}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-black bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    مسح السلة
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">add_shopping_cart</span>
                  لم يتم إضافة أصناف بعد. اختر خامات من القائمة يميناً 👈
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {items.map((it, idx) => (
                    <div key={it.id || idx} className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="font-black text-slate-900 block truncate" title={it.name}>
                            {it.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono" dir="ltr">{it.code}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(it.id)}
                          className="text-rose-500 hover:text-rose-700 font-black w-5 h-5 rounded-md hover:bg-rose-100 flex items-center justify-center cursor-pointer transition-colors"
                          title="حذف البند"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-slate-200/70">
                        {/* Quantity Stepper */}
                        <div className="col-span-5">
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">الكمية / الأمتار:</label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateItem(it.id, 'meters', Math.max(0.25, it.meters - 1))}
                              className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-black flex items-center justify-center cursor-pointer active:scale-95"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              step="0.5"
                              min="0.1"
                              value={it.meters}
                              onChange={e => updateItem(it.id, 'meters', parseFloat(e.target.value) || 0)}
                              className="w-full text-center border border-slate-300 rounded-lg py-1 font-mono font-black text-xs bg-white text-slate-900 focus:outline-none focus:border-amber-500"
                            />
                            <button
                              type="button"
                              onClick={() => updateItem(it.id, 'meters', it.meters + 1)}
                              className="w-6 h-6 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-black flex items-center justify-center cursor-pointer active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Unit Cost */}
                        <div className="col-span-4">
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">سعر الشراء (ج):</label>
                          <input
                            type="number"
                            min="0"
                            value={it.unitCost === 0 ? '' : it.unitCost}
                            onChange={e => updateItem(it.id, 'unitCost', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full border border-slate-300 rounded-lg py-1 px-1.5 font-mono font-black text-xs text-center bg-white text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Total per row */}
                        <div className="col-span-3 text-left">
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">الإجمالي:</label>
                          <span className="font-mono font-black text-amber-900 text-xs block py-1">
                            {it.totalCost.toLocaleString()} ج
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financials & Settlement Card */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft space-y-3">
              <h3 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-500 text-lg">payments</span>
                <span>3. الحسابات وطريقة السداد</span>
              </h3>

              {/* Payment Methods */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">طريقة سداد المورد:</label>
                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
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
                      className={`py-1.5 px-1 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checks Manager if Payment Method is Checks */}
              {paymentMethod === 'شيكات بنكية' && (
                <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-amber-950">شيكات الفاتورة:</span>
                    <button
                      type="button"
                      onClick={addCheckRow}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2 py-0.5 rounded-lg text-[11px] cursor-pointer"
                    >
                      + شيك إضافي
                    </button>
                  </div>

                  <div className="space-y-2">
                    {checkRows.map((chk, cIdx) => (
                      <div key={chk.id || cIdx} className="bg-white p-2 rounded-xl border border-amber-200 space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            placeholder="رقم الشيك *"
                            value={chk.checkNumber}
                            onChange={e => updateCheckRow(chk.id, 'checkNumber', e.target.value)}
                            className="border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-xs"
                          />
                          <select
                            value={chk.bankName}
                            onChange={e => updateCheckRow(chk.id, 'bankName', e.target.value)}
                            className="border border-slate-300 rounded-lg px-2 py-1 font-bold text-xs"
                          >
                            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="number"
                            min="0"
                            placeholder="المبلغ (ج) *"
                            value={chk.amount || ''}
                            onChange={e => updateCheckRow(chk.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-xs"
                          />
                          <input
                            type="date"
                            value={chk.dueDate}
                            onChange={e => updateCheckRow(chk.id, 'dueDate', e.target.value)}
                            className="border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-xs"
                          />
                        </div>
                        {checkRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCheckRow(chk.id)}
                            className="text-rose-600 text-[10px] font-bold hover:underline"
                          >
                            إزالة الشيك ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals Summary */}
              <div className="bg-slate-900 text-white p-3 rounded-2xl space-y-2 shadow-md border border-slate-800 text-xs">
                <div className="flex justify-between items-center text-slate-300 font-bold">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono text-sm">{subtotal.toLocaleString()} ج.م</span>
                </div>

                {/* Direct Value Discount */}
                <div className="flex justify-between items-center text-amber-300 font-bold gap-2 pt-1 border-t border-slate-800">
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <span>خصم المورد:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={discountValue || ''}
                      onChange={e => setDiscountValue(Number(e.target.value))}
                      className="w-24 text-center rounded-lg px-2 py-1 font-mono font-black text-xs text-slate-950 bg-white border border-slate-300 focus:outline-none"
                    />
                    <span className="text-[11px] font-mono text-slate-300">ج.م</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-white border-t border-slate-800 pt-1.5 font-black">
                  <span className="text-sm">الصافي المطلوب:</span>
                  <span className="font-mono text-lg text-emerald-400">{totalAmount.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* Paid & Remaining */}
              <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-amber-950 whitespace-nowrap">
                    المدفوع الآن:
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
                    <input
                      type="number"
                      min="0"
                      value={paidAmount || ''}
                      onChange={e => setPaidAmount(Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-white border border-amber-400 focus:border-amber-600 rounded-xl px-2 py-1.5 font-mono font-black text-slate-950 text-sm text-center focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setPaidAmount(totalAmount)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] px-2 py-1.5 rounded-xl font-black whitespace-nowrap cursor-pointer shadow-3xs"
                    >
                      كامل ⚡
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-amber-200/80 font-bold">
                  <span className="text-slate-600">المتبقي (آجل على المؤسسة):</span>
                  <strong className={`font-mono font-black text-sm ${
                    remainingAmount === 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {remainingAmount.toLocaleString()} ج.م
                  </strong>
                </div>
              </div>

              {/* Notes */}
              <div>
                <textarea
                  rows={2}
                  placeholder="ملاحظات توريد الخامات (اختياري)..."
                  value={purNotes}
                  onChange={e => setPurNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 bg-slate-50"
                />
              </div>

              {/* Submit Save Button */}
              <button
                type="button"
                disabled={isSubmitting || items.length === 0}
                onClick={handleSubmit}
                className="w-full bg-brand-gold hover:bg-amber-400 disabled:opacity-50 text-slate-950 py-3.5 rounded-2xl text-xs sm:text-sm font-black shadow-gold cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <span>⏳ جاري حفظ الفاتورة وتحديث المخزن...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">save</span>
                    <span>حفظ فاتورة الشراء وتحديث أرصدة المخزون ✓</span>
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">كود الصنف:</label>
                  <input
                    type="text"
                    value={newProdCode}
                    onChange={e => setNewProdCode(e.target.value)}
                    placeholder="مثال: VLV-990"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none"
                    dir="ltr"
                  />
                </div>

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

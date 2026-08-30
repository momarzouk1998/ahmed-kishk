'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';

interface InvoiceLineItem {
  id: string;
  code: string;
  name: string;
  category?: string;
  meters: number;
  pricePerMeter: number;
  totalPrice: number;
}

interface InventoryProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  totalQuantity: number;
  sellPrice: number;
  costPrice?: number;
  branch: string;
}

const SALES_INVOICES_KEY = 'ahmed_kishk_sales_invoices_v1';

// Default fabric catalog for quick fallback & rich product catalog
const DEFAULT_CATALOG: InventoryProduct[] = [
  { id: '1', code: 'SAT-01', name: 'ستان سواريه تركي لامع', category: 'سواريه', unit: 'متر', totalQuantity: 120, sellPrice: 450, branch: 'الفرع الرئيسي' },
  { id: '2', code: 'SLK-01', name: 'حرير طبيعي فاخر مطرز', category: 'سواريه', unit: 'متر', totalQuantity: 45, sellPrice: 900, branch: 'الفرع الرئيسي' },
  { id: '3', code: 'CRP-01', name: 'كريب كوري سواريه مزدوج', category: 'سواريه', unit: 'متر', totalQuantity: 200, sellPrice: 300, branch: 'الفرع الرئيسي' },
  { id: '4', code: 'CHF-01', name: 'شيفون ناعم سواريه سادة', category: 'سواريه', unit: 'متر', totalQuantity: 180, sellPrice: 250, branch: 'الفرع الرئيسي' },
  { id: '5', code: 'TUL-SW', name: 'تُل سواريه فرنسي مذهب', category: 'سواريه', unit: 'متر', totalQuantity: 90, sellPrice: 380, branch: 'الفرع الرئيسي' },
  { id: '6', code: 'VLV-01', name: 'قطيفة جاجوار تركي ثقيل', category: 'ستائر', unit: 'متر', totalQuantity: 95, sellPrice: 380, branch: 'الفرع الرئيسي' },
  { id: '7', code: 'LNN-01', name: 'كتان بلجيكي معالج فاخر', category: 'ستائر', unit: 'متر', totalQuantity: 110, sellPrice: 320, branch: 'الفرع الرئيسي' },
  { id: '8', code: 'TUL-01', name: 'تول ناعم حريري سادة', category: 'ستائر', unit: 'متر', totalQuantity: 350, sellPrice: 120, branch: 'الفرع الرئيسي' },
  { id: '9', code: 'BLK-01', name: 'بلاك آوت عازل حراري ثلاثي', category: 'ستائر', unit: 'متر', totalQuantity: 160, sellPrice: 280, branch: 'الفرع الرئيسي' },
  { id: '10', code: 'CHF-ST', name: 'شيفون حرير ويفي للستائر', category: 'ستائر', unit: 'متر', totalQuantity: 240, sellPrice: 160, branch: 'الفرع الرئيسي' },
  { id: '11', code: 'TRK-AL', name: 'تراك سقف ألومنيوم ثقيل', category: 'تراكات ومواسير', unit: 'متر', totalQuantity: 150, sellPrice: 100, branch: 'الفرع الرئيسي' },
  { id: '12', code: 'PIP-FR', name: 'ماسورة فورجيه إيطالي سادة', category: 'تراكات ومواسير', unit: 'متر', totalQuantity: 80, sellPrice: 65, branch: 'الفرع الرئيسي' },
  { id: '13', code: 'TP-WAV', name: 'شريط ستائر ويفي شفاف تركي', category: 'أشرطة وإكسسوارات', unit: 'متر', totalQuantity: 500, sellPrice: 50, branch: 'الفرع الرئيسي' },
  { id: '14', code: 'TP-3FT', name: 'شريط ستائر ٣ فتلة قطن أصلي', category: 'أشرطة وإكسسوارات', unit: 'متر', totalQuantity: 400, sellPrice: 40, branch: 'الفرع الرئيسي' },
  { id: '15', code: 'ACC-CAP', name: 'طقم كابات وطبات فورجيه مذهبة', category: 'أشرطة وإكسسوارات', unit: 'طقم', totalQuantity: 60, sellPrice: 120, branch: 'الفرع الرئيسي' },
];

export default function NewSalesInvoicePOSPage() {
  const router = useRouter();

  // Products and Categories
  const [products, setProducts] = useState<InventoryProduct[]>(DEFAULT_CATALOG);
  const [categories, setCategories] = useState<string[]>(['الكل', 'سواريه', 'ستائر', 'تراكات ومواسير', 'أشرطة وإكسسوارات']);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Invoice Header
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [customerType, setCustomerType] = useState<'WALK_IN' | 'REGISTERED'>('WALK_IN');
  const [custName, setCustName] = useState('عميل نقدي');
  const [custPhone, setCustPhone] = useState('');
  const [branch, setBranch] = useState('الفرع الرئيسي');

  // Invoice Line Items (Table rows)
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Touch Screen Mode Keypad
  const [touchMode, setTouchMode] = useState<boolean>(true);
  const [keypadBuffer, setKeypadBuffer] = useState<string>('');

  // Discount States
  const [discountType, setDiscountType] = useState<'EGP' | 'PERCENT'>('EGP');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Payment Method & Settlement
  const [paymentMethod, setPaymentMethod] = useState<'نقدي' | 'إنستاباي' | 'فودافون كاش' | 'فيزا / كارت' | 'بالآجل / دفعات'>('نقدي');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isFullPaid, setIsFullPaid] = useState<boolean>(true);
  const [invNotes, setInvNotes] = useState('');

  // Print Thermal / Receipt Modal State
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [lastSavedInvoice, setLastSavedInvoice] = useState<any>(null);

  // Load Inventory & Generate Invoice Number
  useEffect(() => {
    async function initData() {
      try {
        const res = await fetch('/api/inventory', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.items) && json.items.length > 0) {
            setProducts(json.items);
            const cats = Array.from(new Set(['الكل', ...json.items.map((i: any) => i.category || 'عام')]));
            setCategories(cats);
          }
        }
      } catch (err) {
        console.error('Error loading inventory products:', err);
      }

      // Generate invoice number
      const rand = Math.floor(100 + Math.random() * 900);
      setInvoiceNumber(`INV-2026-${rand}`);
    }
    initData();
  }, []);

  // Calculations
  const subtotal = items.reduce((sum, it) => sum + (it.meters * it.pricePerMeter), 0);
  const calculatedDiscount = discountType === 'PERCENT' ? (subtotal * (discountValue || 0)) / 100 : (discountValue || 0);
  const totalAmount = Math.max(0, subtotal - calculatedDiscount);
  const remainingAmount = Math.max(0, totalAmount - (paidAmount || 0));

  // Auto-sync paid amount if full payment is checked
  useEffect(() => {
    if (isFullPaid) {
      setPaidAmount(totalAmount);
    }
  }, [totalAmount, isFullPaid]);

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'الكل' || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Add Item to Invoice Table
  const handleAddProduct = (p: InventoryProduct) => {
    const existingIdx = items.findIndex(it => it.code === p.code || it.name === p.name);
    if (existingIdx >= 0) {
      const updated = [...items];
      updated[existingIdx].meters = Number((updated[existingIdx].meters + 1).toFixed(2));
      updated[existingIdx].totalPrice = Number((updated[existingIdx].meters * updated[existingIdx].pricePerMeter).toFixed(2));
      setItems(updated);
      setSelectedRowId(updated[existingIdx].id);
    } else {
      const newItem: InvoiceLineItem = {
        id: `ITM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        code: p.code,
        name: p.name,
        category: p.category,
        meters: 1.0,
        pricePerMeter: p.sellPrice,
        totalPrice: p.sellPrice,
      };
      setItems(prev => [newItem, ...prev]);
      setSelectedRowId(newItem.id);
    }
    setKeypadBuffer('');
  };

  // Update item field directly in table
  const handleUpdateItem = (id: string, field: 'meters' | 'pricePerMeter', val: number) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const meters = field === 'meters' ? Math.max(0.1, val) : it.meters;
      const price = field === 'pricePerMeter' ? Math.max(0, val) : it.pricePerMeter;
      return {
        ...it,
        meters,
        pricePerMeter: price,
        totalPrice: Number((meters * price).toFixed(2)),
      };
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
    if (selectedRowId === id) setSelectedRowId(null);
  };

  // Touch Keypad Handling
  const handleKeypadPress = (key: string) => {
    if (!selectedRowId && items.length > 0) {
      setSelectedRowId(items[0].id);
    }
    const targetId = selectedRowId || (items[0] ? items[0].id : null);
    if (!targetId) return;

    if (key === 'CLEAR') {
      setKeypadBuffer('');
      handleUpdateItem(targetId, 'meters', 1);
      return;
    }

    if (key === 'BACKSPACE') {
      const nextBuf = keypadBuffer.slice(0, -1);
      setKeypadBuffer(nextBuf);
      const parsed = parseFloat(nextBuf);
      if (!isNaN(parsed) && parsed > 0) {
        handleUpdateItem(targetId, 'meters', parsed);
      }
      return;
    }

    if (key === '.') {
      if (!keypadBuffer.includes('.')) {
        const nextBuf = keypadBuffer ? keypadBuffer + '.' : '0.';
        setKeypadBuffer(nextBuf);
      }
      return;
    }

    // Number keys 0-9
    const nextBuf = keypadBuffer + key;
    setKeypadBuffer(nextBuf);
    const parsed = parseFloat(nextBuf);
    if (!isNaN(parsed) && parsed > 0) {
      handleUpdateItem(targetId, 'meters', parsed);
    }
  };

  // Quick Fraction Addition to Active Row
  const handleAddFraction = (fraction: number) => {
    if (!selectedRowId && items.length > 0) {
      setSelectedRowId(items[0].id);
    }
    const targetId = selectedRowId || (items[0] ? items[0].id : null);
    if (!targetId) return;

    const targetItem = items.find(it => it.id === targetId);
    if (!targetItem) return;

    const currentMeters = targetItem.meters || 0;
    const newMeters = Number((currentMeters + fraction).toFixed(2));
    handleUpdateItem(targetId, 'meters', newMeters);
    setKeypadBuffer(String(newMeters));
  };

  // Save invoice handler
  const handleSaveInvoice = async (andPrint: boolean = false) => {
    if (items.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل للفاتورة!');
      return;
    }

    const finalCustName = custName.trim() || (customerType === 'WALK_IN' ? 'عميل نقدي' : 'عميل غير مسجل');
    const statusLabel = remainingAmount === 0 ? 'تم السداد بالكامل' : (paidAmount || 0) > 0 ? 'مسدد جزئياً' : 'آجل / غير مسدد';

    const invoicePayload = {
      id: `INV-${Date.now()}`,
      invoiceNumber: invoiceNumber,
      date: new Date().toISOString().split('T')[0],
      customerName: finalCustName,
      phone: custPhone.trim() || '01000000000',
      branch,
      items,
      subtotal,
      discountType,
      discountValue: discountValue || 0,
      discountAmount: calculatedDiscount,
      totalAmount,
      paymentMethod,
      paidAmount: paidAmount || 0,
      remainingAmount,
      status: statusLabel,
      notes: invNotes.trim(),
    };

    try {
      const rawInvoices = localStorage.getItem(SALES_INVOICES_KEY);
      const existingInvoices = rawInvoices ? JSON.parse(rawInvoices) : [];
      const updated = [invoicePayload, ...existingInvoices];
      localStorage.setItem(SALES_INVOICES_KEY, JSON.stringify(updated));

      await fetch('/api/fabric-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      }).catch(err => console.error('DB Sync Error:', err));

      setLastSavedInvoice(invoicePayload);

      if (andPrint) {
        setShowReceiptModal(true);
      } else {
        alert('✅ تم حفظ فاتورة المبيعات بنجاح!');
        router.push('/fabric-sales');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الفاتورة.');
    }
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    if (confirm('هل أنت متأكد من تفريغ كافة أصناف الفاتورة؟')) {
      setItems([]);
      setSelectedRowId(null);
      setDiscountValue(0);
      setPaidAmount(0);
      setKeypadBuffer('');
    }
  };

  const activeSelectedItem = items.find(it => it.id === selectedRowId) || (items.length > 0 ? items[0] : null);

  return (
    <PageShell title="نقطة البيع والكاشير — فواتير المبيعات">
      <div className="max-w-[1600px] mx-auto pb-12">
        {/* Top Header Bar */}
        <div className="flex flex-wrap justify-between items-center bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-soft mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20">
              <span className="material-symbols-outlined text-2xl">point_of_sale</span>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>كاشير بيع الأقمشة السريع</span>
                <span className="bg-amber-100 text-amber-900 text-[11px] px-2.5 py-0.5 rounded-full font-mono font-black border border-amber-300">
                  {invoiceNumber}
                </span>
              </h1>
              <p className="text-xs text-slate-500">نظام فواتير الأقمشة المباشر مع دعم الشاشات اللمسية وتصنيفات السواريه والستائر</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTouchMode(!touchMode)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                touchMode
                  ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/30'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">touch_app</span>
              <span>وضع شاشة التاتش {touchMode ? '✓ مفعّل' : 'مغلق'}</span>
            </button>

            <button
              type="button"
              onClick={() => router.push('/fabric-sales')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-2xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
            >
              ↩️ سجل الفواتير
            </button>
          </div>
        </div>

        {/* 2-Column POS Layout (Right: Catalog & Touch / Left: Live Invoice starting from Top) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* RIGHT COLUMN (7 cols): Categories, Search, Fabric Grid, & Touch Keypad */}
          <div className="lg:col-span-7 space-y-4 order-2 lg:order-1">
            
            {/* Search & Category Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft space-y-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                  search
                </span>
                <input
                  type="text"
                  placeholder="بحث سريع باسم القماش، الكود أو الباركود..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-11 pl-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-200 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map(cat => {
                  const isActive = selectedCategory === cat;
                  const count = cat === 'الكل' ? products.length : products.filter(p => p.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isActive
                          ? 'bg-amber-600 text-white border-amber-700 shadow-md shadow-amber-600/20 scale-[1.02]'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {cat === 'سواريه' && <span>✨</span>}
                      {cat === 'ستائر' && <span>🪟</span>}
                      {cat === 'تراكات ومواسير' && <span>🛠️</span>}
                      {cat === 'أشرطة وإكسسوارات' && <span>🎀</span>}
                      <span>{cat}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isActive ? 'bg-amber-700 text-amber-100' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products Grid */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-soft">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-lg">grid_view</span>
                  <span>الأصناف المتاحة ({filteredProducts.length}) — اضغط على الصنف لإضافته فوراً:</span>
                </h3>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl block mb-1 text-slate-300">inventory_2</span>
                  <p className="text-xs font-bold">لا توجد أقمشة مطابقة للتصنيف أو البحث الحالي</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {filteredProducts.map(prod => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddProduct(prod)}
                      className="text-right p-3 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 hover:to-amber-50/60 hover:border-amber-400 hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between relative overflow-hidden"
                    >
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-mono font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {prod.code}
                          </span>
                          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold text-[9px]">
                            {prod.category}
                          </span>
                        </div>
                        <p className="font-black text-slate-900 text-xs line-clamp-2 group-hover:text-amber-700 transition-colors">
                          {prod.name}
                        </p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-end">
                        <div>
                          <span className="text-[10px] text-slate-400 block">سعر المتر</span>
                          <span className="font-mono font-black text-xs text-emerald-700">
                            {prod.sellPrice.toLocaleString()} ج
                          </span>
                        </div>
                        <span className="w-7 h-7 rounded-xl bg-amber-500 group-hover:bg-amber-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
                          +
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Touch Screen Keypad Panel */}
            {touchMode && (
              <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-xl border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-lg">dialpad</span>
                    <span className="text-xs font-black text-slate-200">لوحة التاتش السريعة لتعديل الأمتار:</span>
                  </div>

                  {activeSelectedItem ? (
                    <div className="bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl text-xs flex items-center gap-2">
                      <span className="text-slate-400 font-bold">الصنف المحدد:</span>
                      <span className="font-black text-amber-400 max-w-[150px] truncate">{activeSelectedItem.name}</span>
                      <span className="bg-emerald-500/20 text-emerald-300 font-mono font-black px-1.5 rounded text-[11px]">
                        {activeSelectedItem.meters} م
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-bold">اختر أو أضف صنفاً لتعديل أمتاره</span>
                  )}
                </div>

                {/* Quick Fraction & Meter Addition Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold block">إضافة سريعة للكسور والأمتار:</span>
                  <div className="grid grid-cols-6 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddFraction(0.25)}
                      className="bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30 font-black py-2 rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      + ¼ متر
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddFraction(0.50)}
                      className="bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30 font-black py-2 rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      + ½ متر
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddFraction(0.75)}
                      className="bg-amber-500/20 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30 font-black py-2 rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      + ¾ متر
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddFraction(1.0)}
                      className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-black py-2 rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      + 1 م
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddFraction(2.0)}
                      className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-black py-2 rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      + 2 م
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddFraction(5.0)}
                      className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-black py-2 rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      + 5 م
                    </button>
                  </div>
                </div>

                {/* Main Numeric Numpad */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {['7', '8', '9'].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleKeypadPress(n)}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-mono font-black text-lg py-2.5 rounded-xl border border-slate-700 active:scale-95 transition-all cursor-pointer"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('BACKSPACE')}
                    className="bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-black py-2.5 rounded-xl border border-rose-500/30 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">backspace</span>
                  </button>

                  {['4', '5', '6'].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleKeypadPress(n)}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-mono font-black text-lg py-2.5 rounded-xl border border-slate-700 active:scale-95 transition-all cursor-pointer"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('CLEAR')}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-black py-2.5 rounded-xl border border-slate-700 text-xs cursor-pointer transition-colors"
                  >
                    تفريغ C
                  </button>

                  {['1', '2', '3'].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleKeypadPress(n)}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-mono font-black text-lg py-2.5 rounded-xl border border-slate-700 active:scale-95 transition-all cursor-pointer"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('.')}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-mono font-black text-lg py-2.5 rounded-xl border border-slate-700 active:scale-95 transition-all cursor-pointer"
                  >
                    .
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="col-span-2 bg-slate-800 hover:bg-slate-700 text-white font-mono font-black text-lg py-2.5 rounded-xl border border-slate-700 active:scale-95 transition-all cursor-pointer"
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (items.length > 0) {
                        const curIdx = items.findIndex(it => it.id === selectedRowId);
                        const nextIdx = (curIdx + 1) % items.length;
                        setSelectedRowId(items[nextIdx].id);
                        setKeypadBuffer('');
                      }
                    }}
                    className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl flex items-center justify-center gap-1 text-xs cursor-pointer shadow-md transition-colors"
                  >
                    <span>الصنف التالي</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LEFT COLUMN (5 cols): Live Invoice Panel (Starts directly from TOP) */}
          <div className="lg:col-span-5 space-y-4 order-1 lg:order-2">
            <div className="bg-white p-4 sm:p-5 rounded-3xl border-2 border-slate-300/80 shadow-soft space-y-4 relative">
              
              {/* Customer & Branch Header */}
              <div className="space-y-3 pb-3 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-500 text-[18px]">receipt_long</span>
                    <span>تفاصيل الفاتورة والعميل:</span>
                  </span>
                  
                  <div className="flex gap-1.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => { setCustomerType('WALK_IN'); setCustName('عميل نقدي'); }}
                      className={`px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
                        customerType === 'WALK_IN' ? 'bg-amber-500 text-white font-black' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      عميل نقدي سريع
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCustomerType('REGISTERED'); setCustName(''); }}
                      className={`px-2.5 py-1 rounded-xl transition-colors cursor-pointer ${
                        customerType === 'REGISTERED' ? 'bg-amber-500 text-white font-black' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      اسم العميل
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-600 font-bold block mb-0.5 text-[11px]">اسم العميل:</label>
                    <input
                      type="text"
                      placeholder="اسم العميل..."
                      value={custName}
                      onChange={e => setCustName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 font-bold block mb-0.5 text-[11px]">هاتف العميل:</label>
                    <input
                      type="text"
                      placeholder="010..."
                      value={custPhone}
                      onChange={e => setCustPhone(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 text-xs"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-600 font-bold block mb-0.5 text-[11px]">الفرع:</label>
                  <select
                    value={branch}
                    onChange={e => setBranch(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 bg-slate-50 text-xs focus:outline-none"
                  >
                    <option value="الفرع الرئيسي">الفرع الرئيسي — القاهرة</option>
                    <option value="فرع عرابي">فرع عرابي — الشيخ زايد</option>
                    <option value="فرع التجمع">فرع التجمع الخامس</option>
                    <option value="فرع الثلاثيني">فرع الثلاثيني</option>
                    <option value="فرع عمر أفندي">فرع عمر أفندي</option>
                  </select>
                </div>
              </div>

              {/* Items Table (جدول الأصناف وليس كاردات) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <span>جدول أصناف الفاتورة ({items.length}):</span>
                  </h3>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                    >
                      مسح الأصناف 🗑️
                    </button>
                  )}
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner max-h-[280px] overflow-y-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-2">الصنف</th>
                        <th className="p-2 font-mono text-center w-[75px]">السعر</th>
                        <th className="p-2 font-mono text-center w-[90px]">الأمتار</th>
                        <th className="p-2 font-mono text-center w-[80px]">الإجمالي</th>
                        <th className="p-2 text-center w-[35px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400 font-bold">
                            لا توجد أصناف مضافة. اضغط على أي قماش لإضافته للفاتورة.
                          </td>
                        </tr>
                      ) : (
                        items.map((it) => {
                          const isSelected = it.id === selectedRowId;
                          return (
                            <tr
                              key={it.id}
                              onClick={() => { setSelectedRowId(it.id); setKeypadBuffer(''); }}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-amber-50/90 font-black ring-1 ring-amber-400' : 'hover:bg-slate-50'
                              }`}
                            >
                              <td className="p-2">
                                <span className="font-bold text-slate-900 block line-clamp-1 text-[11px]">{it.name}</span>
                                <span className="text-[9px] font-mono text-slate-400">{it.code}</span>
                              </td>

                              <td className="p-2 text-center font-mono font-bold text-slate-700">
                                <input
                                  type="number"
                                  min="1"
                                  value={it.pricePerMeter}
                                  onChange={e => handleUpdateItem(it.id, 'pricePerMeter', Number(e.target.value))}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full text-center border border-slate-200 rounded-lg py-0.5 font-mono font-bold text-[11px] focus:outline-none focus:border-amber-500 bg-white"
                                />
                              </td>

                              <td className="p-2 text-center">
                                <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItem(it.id, 'meters', Math.max(0.25, it.meters - 0.25))}
                                    className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    step="0.25"
                                    min="0.1"
                                    value={it.meters}
                                    onChange={e => handleUpdateItem(it.id, 'meters', Number(e.target.value))}
                                    className="w-12 text-center border border-slate-300 rounded-lg py-0.5 font-mono font-black text-xs focus:outline-none focus:border-amber-500 bg-white text-slate-950"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItem(it.id, 'meters', it.meters + 0.25)}
                                    className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs flex items-center justify-center cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              <td className="p-2 text-center font-mono font-black text-slate-950 text-[11px]">
                                {it.totalPrice.toLocaleString()} ج
                              </td>

                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveItem(it.id); }}
                                  className="text-rose-500 hover:text-rose-700 font-black p-1 hover:bg-rose-50 rounded cursor-pointer"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Discount Section */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-amber-500 text-[16px]">percent</span>
                    <span>خصم على الفاتورة:</span>
                  </span>

                  <div className="flex bg-slate-200 p-0.5 rounded-xl text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDiscountType('EGP')}
                      className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                        discountType === 'EGP' ? 'bg-white text-slate-900 font-black shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      مبلغ (ج.م)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('PERCENT')}
                      className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                        discountType === 'PERCENT' ? 'bg-white text-slate-900 font-black shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      نسبة مئوية (%)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountValue || ''}
                    onChange={e => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex gap-1">
                    {[5, 10, 15, 20].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => { setDiscountType('PERCENT'); setDiscountValue(pct); }}
                        className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-1 rounded-lg text-[10px] font-bold border border-amber-300 cursor-pointer"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-2 text-xs font-bold shadow-md">
                <div className="flex justify-between text-slate-300">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono text-sm">{subtotal.toLocaleString()} ج.م</span>
                </div>

                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>قيمة الخصم ({discountType === 'PERCENT' ? `${discountValue}%` : 'مبلغ'}):</span>
                    <span className="font-mono">- {calculatedDiscount.toLocaleString()} ج.م</span>
                  </div>
                )}

                <div className="flex justify-between text-white border-t border-slate-800 pt-2 text-sm font-black">
                  <span>الصافي المستحق:</span>
                  <span className="font-mono text-lg text-emerald-400">{totalAmount.toLocaleString()} ج.م</span>
                </div>

                <div className="border-t border-slate-800 pt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">المدفوع الآن:</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={paidAmount}
                        onChange={e => {
                          setPaidAmount(Number(e.target.value));
                          setIsFullPaid(false);
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 font-mono font-black text-amber-300 text-xs focus:outline-none focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => { setPaidAmount(totalAmount); setIsFullPaid(true); }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] px-1.5 py-1 rounded font-bold whitespace-nowrap cursor-pointer"
                      >
                        كامل
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">المتبقي / آجل:</label>
                    <div className="bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1 font-mono font-black text-xs text-rose-400 flex items-center justify-between">
                      <span>{remainingAmount.toLocaleString()}</span>
                      <span className="text-[10px]">ج</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-black text-slate-700 block">طريقة الدفع:</span>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-center">
                  {[
                    { id: 'نقدي', label: '💵 كاش' },
                    { id: 'فيزا / كارت', label: '💳 فيزا' },
                    { id: 'إنستاباي', label: '⚡ إنستاباي' },
                    { id: 'فودافون كاش', label: '📱 فودافون' },
                    { id: 'بالآجل / دفعات', label: '⏳ آجل' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id as any)}
                      className={`p-2 rounded-xl text-[11px] font-black transition-all border cursor-pointer ${
                        paymentMethod === m.id
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm font-black'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Save & Print */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => handleSaveInvoice(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-3 rounded-2xl text-xs sm:text-sm font-black shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[20px]">print</span>
                  <span>حفظ وطباعة إيصال الكاشير 🖨️</span>
                </button>

                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => handleSaveInvoice(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white py-2.5 rounded-2xl text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>حفظ الفاتورة فقط</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* THERMAL RECEIPT / POS PRINT MODAL */}
      {showReceiptModal && lastSavedInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            {/* Header Actions */}
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <span>🖨️ إيصال كاشير نقطة البيع</span>
              </h3>
              <button
                onClick={() => { setShowReceiptModal(false); router.push('/fabric-sales'); }}
                className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Thermal Slip Content (80mm Style) */}
            <div id="thermal-receipt" className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl font-mono text-xs text-slate-900 space-y-3">
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                <p className="font-black text-sm tracking-wide">أحمد كشك للأقمشة والستائر</p>
                <p className="text-[10px] text-slate-500">Ahmed Kishk Luxury Fabrics</p>
                <p className="text-[10px] text-slate-600 font-bold">{lastSavedInvoice.branch}</p>
                <p className="text-[10px] text-slate-500">فاتورة رقم: {lastSavedInvoice.invoiceNumber}</p>
                <p className="text-[10px] text-slate-500">التاريخ: {lastSavedInvoice.date}</p>
              </div>

              <div className="text-[11px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                <p><span className="font-bold">العميل:</span> {lastSavedInvoice.customerName}</p>
                <p><span className="font-bold">الهاتف:</span> {lastSavedInvoice.phone}</p>
              </div>

              {/* Items Table */}
              <div className="space-y-1 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between font-bold text-[10px] text-slate-500">
                  <span>الصنف</span>
                  <span>الكمية × السعر</span>
                  <span>الإجمالي</span>
                </div>
                {lastSavedInvoice.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[11px] font-bold">
                    <span className="truncate max-w-[110px]">{it.name}</span>
                    <span className="font-mono">{it.meters}م × {it.pricePerMeter}</span>
                    <span className="font-mono">{it.totalPrice} ج</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[11px] font-bold border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between text-slate-600">
                  <span>المجموع الفرعي:</span>
                  <span>{lastSavedInvoice.subtotal} ج.م</span>
                </div>
                {lastSavedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>الخصم:</span>
                    <span>- {lastSavedInvoice.discountAmount} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs text-slate-950 pt-1 border-t border-slate-200">
                  <span>الصافي المستحق:</span>
                  <span>{lastSavedInvoice.totalAmount} ج.م</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>المدفوع ({lastSavedInvoice.paymentMethod}):</span>
                  <span>{lastSavedInvoice.paidAmount} ج.م</span>
                </div>
                {lastSavedInvoice.remainingAmount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>المتبقي:</span>
                    <span>{lastSavedInvoice.remainingAmount} ج.م</span>
                  </div>
                )}
              </div>

              <div className="text-center text-[10px] text-slate-500 pt-1 space-y-0.5">
                <p>شكراً لتعاملكم مع أقمشة أحمد كشك ✨</p>
                <p>البضاعة المباعة تستبدل خلال ١٤ يوماً بالفاتورة</p>
              </div>
            </div>

            {/* Print & Close Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>🖨️ طباعة الآن</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowReceiptModal(false); router.push('/fabric-sales'); }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

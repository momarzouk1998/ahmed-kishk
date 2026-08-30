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
  const [branch, setBranch] = useState('الفرع الرئيسي — سعد زغلول');

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
  const [paymentMethod, setPaymentMethod] = useState<'نقدي' | 'إنستاباي' | 'فودافون كاش' | 'فيزا / كارت' | 'بالآجل / دفعات' | 'دفع متعدد / مزيج'>('نقدي');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [isFullPaid, setIsFullPaid] = useState<boolean>(true);
  const [invNotes, setInvNotes] = useState('');

  // Split Payments Breakdown (عند اختيار دفع متعدد)
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitInstapay, setSplitInstapay] = useState<number>(0);
  const [splitVodafone, setSplitVodafone] = useState<number>(0);
  const [splitVisa, setSplitVisa] = useState<number>(0);

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
      splitPayments: paymentMethod === 'دفع متعدد / مزيج' ? {
        cash: Number(splitCash) || 0,
        instapay: Number(splitInstapay) || 0,
        vodafone: Number(splitVodafone) || 0,
        visa: Number(splitVisa) || 0,
      } : undefined,
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
      <div className="max-w-[1600px] mx-auto pb-4">
        {/* 3-Column POS Layout (Col 1: Catalog / Col 2: Customer & Touch / Col 3: Invoice Items & Actions) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-start">
          
          {/* ------------------------------------------------------------- */}
          {/* COLUMN 1 (5 cols - RIGHT): Products Catalog (الأكبر حظاً) */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-5 space-y-2 order-1">
            
            {/* Search & Category Filter Bar */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-soft space-y-1.5">
              <div className="relative">
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                  search
                </span>
                <input
                  type="text"
                  placeholder="بحث سريع باسم القماش، الكود أو الباركود..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-8 pl-3 py-1 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-200 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                {categories.map(cat => {
                  const isActive = selectedCategory === cat;
                  const count = cat === 'الكل' ? products.length : products.filter(p => p.category === cat).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-0.5 rounded-xl text-[10.5px] font-black whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer border ${
                        isActive
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {cat === 'سواريه' && <span>✨</span>}
                      {cat === 'ستائر' && <span>🪟</span>}
                      {cat === 'تراكات ومواسير' && <span>🛠️</span>}
                      {cat === 'أشرطة وإكسسوارات' && <span>🎀</span>}
                      <span>{cat}</span>
                      <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono font-bold ${
                        isActive ? 'bg-amber-700 text-amber-100' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products Grid — Largest Column */}
            <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-soft">
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="font-black text-slate-900 text-[11.5px] flex items-center gap-1">
                  <span className="material-symbols-outlined text-amber-500 text-base">grid_view</span>
                  <span>الأصناف المتاحة ({filteredProducts.length}) — اضغط على الصنف لإضافته فوراً:</span>
                </h3>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <span className="material-symbols-outlined text-3xl block mb-1 text-slate-300">inventory_2</span>
                  <p className="text-xs font-bold">لا توجد أقمشة مطابقة للتصنيف أو البحث الحالي</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {filteredProducts.map(prod => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddProduct(prod)}
                      className="text-right p-2 rounded-xl border border-slate-200 bg-white hover:bg-amber-50/90 hover:border-amber-400 transition-all group cursor-pointer flex justify-between items-center shadow-3xs"
                    >
                      <span className="font-black text-slate-900 text-[11.5px] leading-tight truncate group-hover:text-amber-900">
                        {prod.name}
                      </span>
                      <span className="font-mono font-black text-xs text-emerald-700 whitespace-nowrap bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-200 mr-1">
                        {prod.sellPrice.toLocaleString()} ج
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 2 (3.5 cols - MIDDLE): Customer Info & Touch Keypad */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-3.5 space-y-2 order-2">
            
            {/* Customer & Branch Header Card */}
            <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-soft space-y-2">
              <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                <div className="flex items-center gap-1 text-[11px] font-black text-slate-900">
                  <span className="material-symbols-outlined text-amber-500 text-base">receipt_long</span>
                  <span>الفاتورة:</span>
                  <span className="bg-amber-100 text-amber-900 text-[10px] px-1 py-0.2 rounded font-mono font-black border border-amber-300">
                    {invoiceNumber}
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={() => router.push('/fabric-sales')}
                  className="text-[9.5px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer border border-slate-200"
                >
                  ↩️ سجل الفواتير
                </button>
              </div>

              {/* Customer Type Toggle */}
              <div className="flex justify-between items-center gap-1 text-[10px] font-bold">
                <span className="text-slate-500">نوع العميل:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => { setCustomerType('WALK_IN'); setCustName('عميل نقدي'); }}
                    className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                      customerType === 'WALK_IN' ? 'bg-amber-500 text-white font-black' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    عميل نقدي
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCustomerType('REGISTERED'); setCustName(''); }}
                    className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                      customerType === 'REGISTERED' ? 'bg-amber-500 text-white font-black' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    عميل آخر
                  </button>
                </div>
              </div>

              {/* Customer Name, Phone & Branch */}
              <div className="space-y-1.5 text-xs">
                <input
                  type="text"
                  placeholder="اسم العميل..."
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 text-[11px]"
                />

                <input
                  type="text"
                  placeholder="رقم الهاتف..."
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1 font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 text-[11px]"
                  dir="ltr"
                />

                <select
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900 bg-slate-50 text-[10.5px] focus:outline-none"
                >
                  <option value="الفرع الرئيسي — سعد زغلول">الفرع الرئيسي — سعد زغلول</option>
                  <option value="فرع عرابي — الشيخ زايد">فرع عرابي — الشيخ زايد</option>
                  <option value="فرع الثلاثيني">فرع الثلاثيني</option>
                  <option value="فرع عمر أفندي">فرع عمر أفندي</option>
                </select>
              </div>
            </div>

            {/* Light Touch Keypad Panel */}
            <div className="bg-slate-50 text-slate-900 p-2.5 rounded-2xl border border-slate-200 shadow-soft space-y-1.5">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTouchMode(!touchMode)}
                    className={`px-1.5 py-0.5 rounded-lg text-[9.5px] font-black transition-all flex items-center gap-0.5 cursor-pointer border ${
                      touchMode
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px]">touch_app</span>
                    <span>تاتش {touchMode ? '✓' : '✕'}</span>
                  </button>
                  <span className="text-[10px] font-black text-slate-700">تعديل الأمتار:</span>
                </div>

                {activeSelectedItem ? (
                  <div className="bg-white border border-slate-200 px-1.5 py-0.5 rounded-lg text-[10px] flex items-center gap-1 shadow-3xs">
                    <span className="font-black text-amber-800 max-w-[100px] truncate">{activeSelectedItem.name}</span>
                    <span className="bg-emerald-100 text-emerald-900 font-mono font-black px-1 rounded text-[9.5px]">
                      {activeSelectedItem.meters}م
                    </span>
                  </div>
                ) : (
                  <span className="text-[9.5px] text-slate-400 font-bold">اختر صنفاً</span>
                )}
              </div>

              {touchMode && (
                <>
                  {/* Quick Fraction Meter Buttons (Only 3: + ¼م, + ½م, + ¾م) */}
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: '+ ¼م', val: 0.25 },
                      { label: '+ ½م', val: 0.50 },
                      { label: '+ ¾م', val: 0.75 },
                    ].map((frac, fIdx) => (
                      <button
                        key={fIdx}
                        type="button"
                        onClick={() => handleAddFraction(frac.val)}
                        className="bg-amber-100 hover:bg-amber-500 hover:text-white text-amber-950 font-black py-1 rounded-lg text-[11px] transition-colors cursor-pointer text-center border border-amber-300 shadow-3xs"
                      >
                        {frac.label}
                      </button>
                    ))}
                  </div>

                  {/* Main Compact Light Numeric Numpad */}
                  <div className="grid grid-cols-4 gap-1 pt-0.5">
                    {['7', '8', '9'].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleKeypadPress(n)}
                        className="bg-white hover:bg-amber-50 text-slate-950 font-mono font-black text-base py-1 rounded-lg border border-slate-200 shadow-3xs active:scale-95 transition-all cursor-pointer"
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('BACKSPACE')}
                      className="bg-rose-50 hover:bg-rose-500 text-rose-700 hover:text-white font-black py-1 rounded-lg border border-rose-200 flex items-center justify-center cursor-pointer transition-colors shadow-3xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">backspace</span>
                    </button>

                    {['4', '5', '6'].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleKeypadPress(n)}
                        className="bg-white hover:bg-amber-50 text-slate-950 font-mono font-black text-base py-1 rounded-lg border border-slate-200 shadow-3xs active:scale-95 transition-all cursor-pointer"
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('CLEAR')}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-900 font-black py-1 rounded-lg border border-amber-200 text-[10px] cursor-pointer transition-colors shadow-3xs"
                    >
                      تفريغ C
                    </button>

                    {['1', '2', '3'].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => handleKeypadPress(n)}
                        className="bg-white hover:bg-amber-50 text-slate-950 font-mono font-black text-base py-1 rounded-lg border border-slate-200 shadow-3xs active:scale-95 transition-all cursor-pointer"
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('.')}
                      className="bg-white hover:bg-amber-50 text-slate-950 font-mono font-black text-base py-1 rounded-lg border border-slate-200 shadow-3xs active:scale-95 transition-all cursor-pointer"
                    >
                      .
                    </button>

                    <button
                      type="button"
                      onClick={() => handleKeypadPress('0')}
                      className="col-span-2 bg-white hover:bg-amber-50 text-slate-950 font-mono font-black text-base py-1 rounded-lg border border-slate-200 shadow-3xs active:scale-95 transition-all cursor-pointer"
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
                      className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-1 rounded-lg flex items-center justify-center gap-1 text-[10.5px] cursor-pointer shadow-xs transition-colors"
                    >
                      <span>الصنف التالي</span>
                      <span className="material-symbols-outlined text-[13px]">arrow_downward</span>
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 3 (3.5 cols - LEFT): Cart Items Table, Totals & Save Actions */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-3.5 space-y-2 order-3">
            <div className="bg-white p-2.5 rounded-2xl border-2 border-slate-300/80 shadow-soft space-y-2 relative">
              
              {/* Items Table — Single Row per Item (NO CODE LINE!) */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-slate-900 text-[11px] flex items-center gap-1">
                    <span>جدول أصناف الفاتورة ({items.length}):</span>
                  </h3>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="text-[9px] text-rose-600 hover:text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 px-1.5 py-0.2 rounded transition-colors cursor-pointer"
                    >
                      مسح الأصناف 🗑️
                    </button>
                  )}
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner max-h-[160px] overflow-y-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10 text-[10px]">
                      <tr>
                        <th className="p-1">الصنف</th>
                        <th className="p-1 font-mono text-center w-[50px]">السعر</th>
                        <th className="p-1 font-mono text-center w-[70px]">الأمتار</th>
                        <th className="p-1 font-mono text-center w-[55px]">الإجمالي</th>
                        <th className="p-1 text-center w-[22px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400 font-bold text-[10.5px]">
                            لا توجد أصناف مضافة. اضغط على أي قماش لإضافته بالفاتورة.
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
                              {/* 1 Clean Row for Item Name ONLY (Code Removed!) */}
                              <td className="p-1">
                                <span className="font-bold text-slate-900 block truncate text-[10.5px] max-w-[95px]" title={it.name}>
                                  {it.name}
                                </span>
                              </td>

                              <td className="p-1 text-center font-mono font-bold text-slate-700">
                                <input
                                  type="number"
                                  min="1"
                                  value={it.pricePerMeter}
                                  onChange={e => handleUpdateItem(it.id, 'pricePerMeter', Number(e.target.value))}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full text-center border border-slate-200 rounded py-0.2 font-mono font-bold text-[10px] focus:outline-none focus:border-amber-500 bg-white"
                                />
                              </td>

                              <td className="p-1 text-center">
                                <div className="flex items-center justify-center gap-0.5" onClick={e => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItem(it.id, 'meters', Math.max(0.25, it.meters - 0.25))}
                                    className="w-3.5 h-3.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-[10px] flex items-center justify-center cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    step="0.25"
                                    min="0.1"
                                    value={it.meters}
                                    onChange={e => handleUpdateItem(it.id, 'meters', Number(e.target.value))}
                                    className="w-9 text-center border border-slate-300 rounded py-0.2 font-mono font-black text-[10.5px] focus:outline-none focus:border-amber-500 bg-white text-slate-950"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateItem(it.id, 'meters', it.meters + 0.25)}
                                    className="w-3.5 h-3.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-[10px] flex items-center justify-center cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              <td className="p-1 text-center font-mono font-black text-slate-950 text-[10px]">
                                {it.totalPrice.toLocaleString()} ج
                              </td>

                              <td className="p-1 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveItem(it.id); }}
                                  className="text-rose-500 hover:text-rose-700 font-black p-0.5 hover:bg-rose-50 rounded cursor-pointer text-[10px]"
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

              {/* Combined Side-by-Side: Discount & Payment Method */}
              <div className="grid grid-cols-1 gap-1.5">
                
                {/* Discount Box */}
                <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-800 text-[10px] flex items-center gap-0.5">
                      <span>خصم الفاتورة:</span>
                    </span>

                    <div className="flex bg-slate-200 p-0.5 rounded text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => setDiscountType('EGP')}
                        className={`px-1 py-0.2 rounded transition-colors cursor-pointer ${
                          discountType === 'EGP' ? 'bg-white text-slate-900 font-black shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        ج.م
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('PERCENT')}
                        className={`px-1 py-0.2 rounded transition-colors cursor-pointer ${
                          discountType === 'PERCENT' ? 'bg-white text-slate-900 font-black shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={discountValue || ''}
                      onChange={e => setDiscountValue(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono font-bold text-slate-900 text-[10.5px] focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex gap-0.5">
                      {[5, 10, 15, 20].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => { setDiscountType('PERCENT'); setDiscountValue(pct); }}
                          className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-1 py-0.2 rounded text-[9px] font-bold border border-amber-300 cursor-pointer"
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-700 block">طريقة الدفع:</span>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    {[
                      { id: 'نقدي', label: '💵 كاش' },
                      { id: 'فيزا / كارت', label: '💳 فيزا' },
                      { id: 'إنستاباي', label: '⚡ إنستا' },
                      { id: 'فودافون كاش', label: '📱 فودافون' },
                      { id: 'بالآجل / دفعات', label: '⏳ آجل' },
                      { id: 'دفع متعدد / مزيج', label: '🔀 متعدد' },
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`py-0.5 px-1 rounded-lg text-[9.5px] font-black transition-all border cursor-pointer ${
                          paymentMethod === m.id
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Split Payment inputs if selected */}
                  {paymentMethod === 'دفع متعدد / مزيج' && (
                    <div className="bg-amber-50 border border-amber-300 p-1.5 rounded-xl space-y-1 mt-1 text-[10px]">
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <label className="text-[9px] font-bold text-slate-700 block">💵 كاش:</label>
                          <input
                            type="number"
                            min="0"
                            value={splitCash || ''}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setSplitCash(val);
                              const sum = val + (splitInstapay || 0) + (splitVodafone || 0) + (splitVisa || 0);
                              setPaidAmount(sum);
                            }}
                            className="w-full bg-white border rounded px-1 py-0.2 font-mono font-bold text-[10px]"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-700 block">⚡ إنستا:</label>
                          <input
                            type="number"
                            min="0"
                            value={splitInstapay || ''}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setSplitInstapay(val);
                              const sum = (splitCash || 0) + val + (splitVodafone || 0) + (splitVisa || 0);
                              setPaidAmount(sum);
                            }}
                            className="w-full bg-white border rounded px-1 py-0.2 font-mono font-bold text-[10px]"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-700 block">📱 فودافون:</label>
                          <input
                            type="number"
                            min="0"
                            value={splitVodafone || ''}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setSplitVodafone(val);
                              const sum = (splitCash || 0) + (splitInstapay || 0) + val + (splitVisa || 0);
                              setPaidAmount(sum);
                            }}
                            className="w-full bg-white border rounded px-1 py-0.2 font-mono font-bold text-[10px]"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-700 block">💳 فيزا:</label>
                          <input
                            type="number"
                            min="0"
                            value={splitVisa || ''}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setSplitVisa(val);
                              const sum = (splitCash || 0) + (splitInstapay || 0) + (splitVodafone || 0) + val;
                              setPaidAmount(sum);
                            }}
                            className="w-full bg-white border rounded px-1 py-0.2 font-mono font-bold text-[10px]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Totals Summary */}
              <div className="bg-slate-900 text-white p-2 rounded-xl space-y-1 text-[10.5px] font-bold shadow-md">
                <div className="flex justify-between text-slate-300">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono text-xs">{subtotal.toLocaleString()} ج.م</span>
                </div>

                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>الخصم:</span>
                    <span className="font-mono">- {calculatedDiscount.toLocaleString()} ج.م</span>
                  </div>
                )}

                <div className="flex justify-between text-white border-t border-slate-800 pt-1 text-xs font-black">
                  <span>الصافي المستحق:</span>
                  <span className="font-mono text-sm text-emerald-400">{totalAmount.toLocaleString()} ج.م</span>
                </div>

                <div className="border-t border-slate-800 pt-1 grid grid-cols-2 gap-1">
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9.5px] text-slate-400">المدفوع:</span>
                      <input
                        type="number"
                        min="0"
                        value={paidAmount}
                        onChange={e => {
                          setPaidAmount(Number(e.target.value));
                          setIsFullPaid(false);
                        }}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-0.2 font-mono font-black text-amber-300 text-[10.5px] text-center focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => { setPaidAmount(totalAmount); setIsFullPaid(true); }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[8.5px] px-1 py-0.2 rounded font-bold cursor-pointer"
                      >
                        كامل
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="bg-slate-800/80 border border-slate-700 rounded px-1.5 py-0.2 font-mono font-black text-[10.5px] text-rose-400 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-sans">المتبقي:</span>
                      <span>{remainingAmount.toLocaleString()}ج</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: 2 Save Buttons Side-by-Side in 1 Single Row! */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => handleSaveInvoice(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-1.5 rounded-xl text-[10.5px] font-black shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[15px]">print</span>
                  <span>حفظ وطباعة 🖨️</span>
                </button>

                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => handleSaveInvoice(false)}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white py-1.5 rounded-xl text-[10.5px] font-black transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">save</span>
                  <span>حفظ فقط</span>
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

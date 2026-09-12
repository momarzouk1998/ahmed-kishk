'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { useRouter } from 'next/navigation';
import { canUserEditPrices } from '@/lib/permissions';
import { useManagerGate, isManagerUnlocked, clearManagerUnlock } from '@/components/ManagerUnlockGate';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';
import { normalizeBranchName, getBranchConfig } from '@/lib/branches';
import { getPersistentCategories } from '@/lib/categories';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Invoice Header
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [customerType, setCustomerType] = useState<'WALK_IN' | 'REGISTERED'>('WALK_IN');
  const [custName, setCustName] = useState('عميل نقدي');
  const [custPhone, setCustPhone] = useState('');
  // #FIX: كانت القيمة الافتراضية "الفرع الرئيسي — سعد زغلول" لا تطابق القيمة
  // القياسية "الفرع الرئيسي" المستخدمة فى كل مكان آخر بالنظام (بما فيها الفلترة
  // حسب الفرع فى الـ API)، فكانت فواتير الفرع الرئيسى تُسجَّل بقيمة فرع مختلفة فعلياً.
  const [branch, setBranch] = useState('الفرع الرئيسي');

  // Invoice Line Items (Table rows)
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Touch Screen Keypad Buffer
  const [keypadBuffer, setKeypadBuffer] = useState<string>('');

  // Discount States
  const [discountType, setDiscountType] = useState<'EGP' | 'PERCENT'>('EGP');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // موظف مقيّد بفرع: الفاتورة تُسجَّل على فرعه هو فقط
  const { user: currentUser, isAdmin } = useCurrentUser();
  useEffect(() => {
    if (!isAdmin && currentUser?.branch) setBranch(currentUser.branch);
  }, [isAdmin, currentUser]);

  // Manager unlock gate — للتحكم فى تعديل الأسعار والخصومات
  const { requestUnlock, Modal: MgrModal } = useManagerGate();
  const [mgrUnlocked, setMgrUnlocked] = useState<boolean>(false);
  useEffect(() => { setMgrUnlocked(isManagerUnlocked()); }, []);
  const priceLocked = !canUserEditPrices('p_fabric_sales') && !mgrUnlocked;
  const requirePriceUnlock = async (): Promise<boolean> => {
    if (!priceLocked) return true;
    const ok = await requestUnlock();
    if (ok) setMgrUnlocked(true);
    return ok;
  };

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

  // Shipping Modal State
  const [showShippingModal, setShowShippingModal] = useState<boolean>(false);

  // Load Inventory & Generate Invoice Number
  useEffect(() => {
    async function initData() {
      try {
        const res = await fetch('/api/inventory', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.items) && json.items.length > 0) {
            setProducts(json.items);
          }
        }
      } catch (err) {
        console.error('Error loading inventory products:', err);
      }

      // Generate unique invoice number with clean short prefix AK-
      const serial = `${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
      setInvoiceNumber(`AK-${serial}`);
    }
    initData();
  }, []);

  // Dynamic categories strictly belonging to the active branch's available inventory (بدون "الكل") + التصنيفات الدائمة المعتمدة
  const dynamicCategories = useMemo(() => {
    const branchScoped = products.filter(p =>
      !branch || branch === 'الكل' || normalizeBranchName(p.branch) === normalizeBranchName(branch)
    );
    const itemCats = branchScoped
      .map(p => (p.category || '').trim())
      .filter(Boolean);
    
    const persistent = getPersistentCategories();
    // دمج تصنيفات الأصناف مع التصنيفات الأساسية لضمان بقاء "خياطة" وتصنيفات الأقمشة متاحة دائماً
    const uniqueCats = Array.from(
      new Set([
        ...itemCats,
        ...persistent.filter(c => ['جوانب الستاير', 'شيفونات وتل', 'بلاك أوت وعوازل', 'خياطة', 'خياطة وتفصيل', 'تراكات ومواسير', 'إكسسوارات ولوازم'].includes(c)),
      ])
    );
    return uniqueCats;
  }, [products, branch]);

  // تعيين أول تصنيف كافتراضي للفرع، وإعادة التعيين لو الفرع اتغير
  useEffect(() => {
    if (dynamicCategories.length > 0) {
      if (!selectedCategory || !dynamicCategories.includes(selectedCategory)) {
        setSelectedCategory(dynamicCategories[0]);
      }
    }
  }, [dynamicCategories, selectedCategory]);

  // Online Order & Shipping States
  const [isOnlineOrder, setIsOnlineOrder] = useState<boolean>(false);
  const [shippingFee, setShippingFee] = useState<number>(110);
  const [shippingCompany, setShippingCompany] = useState<string>('بوسطة (Bosta)');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [shippingAddress, setShippingAddress] = useState<string>('');
  const [receiverPhone, setReceiverPhone] = useState<string>('');
  const [orderSource, setOrderSource] = useState<string>('صفحة الفيسبوك');

  // Commercial Branch Check & Offline confirmation state
  const isCommercialBranch = normalizeBranchName(branch) === 'الفرع التجاري';
  const [showOfflineConfirmModal, setShowOfflineConfirmModal] = useState<boolean>(false);
  const [pendingSaveAndPrint, setPendingSaveAndPrint] = useState<boolean>(false);

  // Auto-toggle online mode if branch is الفرع التجاري, otherwise disable it
  useEffect(() => {
    if (isCommercialBranch) {
      setIsOnlineOrder(true);
    } else {
      setIsOnlineOrder(false);
    }
  }, [isCommercialBranch]);

  // Calculations
  const subtotal = items.reduce((sum, it) => sum + (it.meters * it.pricePerMeter), 0);
  const calculatedDiscount = discountType === 'PERCENT' ? (subtotal * (discountValue || 0)) / 100 : (discountValue || 0);
  const shippingAmount = (isCommercialBranch && isOnlineOrder) ? (Number(shippingFee) || 0) : 0;
  const totalAmount = Math.max(0, subtotal - calculatedDiscount + shippingAmount);
  const remainingAmount = Math.max(0, totalAmount - (paidAmount || 0));

  // Auto-sync paid amount if full payment is checked
  useEffect(() => {
    if (isFullPaid) {
      setPaidAmount(totalAmount);
    }
  }, [totalAmount, isFullPaid]);

  // تصفية الأصناف: عند كتابة نص فى البحث يتم البحث فى كل أصناف الفرع، وبدون بحث يتم عرض أصناف التصنيف المختار فقط
  const filteredProducts = products.filter(p => {
    const matchesBranch = !branch || branch === 'الكل' || normalizeBranchName(p.branch) === normalizeBranchName(branch);
    const isSearching = !!searchQuery.trim();
    const matchesCat = isSearching || p.category === selectedCategory;
    const matchesSearch =
      !isSearching ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesCat && matchesSearch;
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

  // Quick Direct Meters Setting (e.g. 0.5m, 0.75m, 0.25m, 1m)
  const handleSetExactMeters = (meters: number) => {
    if (!selectedRowId && items.length > 0) {
      setSelectedRowId(items[0].id);
    }
    const targetId = selectedRowId || (items[0] ? items[0].id : null);
    if (!targetId) return;

    handleUpdateItem(targetId, 'meters', meters);
    setKeypadBuffer(String(meters));
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

    // إذا كان الصنف مضافاً جديداً بقيمة 1.0 الافتراضية وضغط الكاشير على كسر (مثل ½ أو ¼ أو ¾)، يتم ضبطه مباشرة إلى هذا الكسر
    if (targetItem.meters === 1.0 && !keypadBuffer && fraction < 1) {
      handleUpdateItem(targetId, 'meters', fraction);
      setKeypadBuffer(String(fraction));
      return;
    }

    const currentMeters = targetItem.meters || 0;
    const newMeters = Number((currentMeters + fraction).toFixed(2));
    handleUpdateItem(targetId, 'meters', newMeters);
    setKeypadBuffer(String(newMeters));
  };

  // Save invoice handler with offline confirmation for commercial branch
  const handleSaveInvoice = async (andPrint: boolean = false) => {
    if (items.length === 0) {
      alert('يرجى إضافة صنف واحد على الأقل للفاتورة!');
      return;
    }

    // تنبيه وتأكيد إضافي خاص بالفرع التجاري في حالة تسجيل الفاتورة بدون شحن/أونلاين
    if (isCommercialBranch && !isOnlineOrder) {
      setPendingSaveAndPrint(andPrint);
      setShowOfflineConfirmModal(true);
      return;
    }

    await executeSaveInvoice(andPrint);
  };

  const executeSaveInvoice = async (andPrint: boolean = false) => {
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
      isOnlineOrder: isCommercialBranch ? isOnlineOrder : false,
      shippingFee: (isCommercialBranch && isOnlineOrder) ? Number(shippingFee) || 0 : 0,
      shippingCompany: (isCommercialBranch && isOnlineOrder) ? shippingCompany : undefined,
      trackingNumber: (isCommercialBranch && isOnlineOrder) ? trackingNumber.trim() : undefined,
      shippingAddress: (isCommercialBranch && isOnlineOrder) ? shippingAddress.trim() : undefined,
      receiverPhone: (isCommercialBranch && isOnlineOrder) ? receiverPhone.trim() : undefined,
      orderSource: (isCommercialBranch && isOnlineOrder) ? orderSource : undefined,
      splitPayments: paymentMethod === 'دفع متعدد / مزيج' ? {
        cash: Number(splitCash) || 0,
        instapay: Number(splitInstapay) || 0,
        vodafone: Number(splitVodafone) || 0,
        visa: Number(splitVisa) || 0,
      } : undefined,
      notes: invNotes.trim(),
    };

    try {
      await fetch('/api/fabric-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoicePayload),
      }).catch(err => console.error('DB Sync Error:', err));

      // إعادة قفل صلاحية المدير فوراً بعد انتهاء الفاتورة لطلب الباسورد في الفاتورة القادمة
      clearManagerUnlock();
      setMgrUnlocked(false);

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
      clearManagerUnlock();
      setMgrUnlocked(false);
      const serial = `${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
      setInvoiceNumber(`AK-${serial}`);
    }
  };

  const activeSelectedItem = items.find(it => it.id === selectedRowId) || (items.length > 0 ? items[0] : null);

  return (
    <PageShell title="نقطة البيع والكاشير — فواتير المبيعات" fullWidth noHeader>
      <div className="w-full">
        {/* 3-Column POS Layout (Col 1: Catalog / Col 2: Customer & Touch / Col 3: Invoice Items & Actions) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch w-full">
          
          {/* ------------------------------------------------------------- */}
          {/* COLUMN 1 (4 cols - RIGHT): Products Catalog */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-4 order-1 flex flex-col gap-2" style={{height: 'calc(100dvh - 24px)'}}>
            
            {/* Search Bar */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-soft flex-shrink-0">
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
            </div>

            {/* Categories (right column) + Products Grid (left) — flex-1 to fill remaining height */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-soft flex-1 flex gap-2 min-h-0">
              {/* Category Column */}
              <div className="w-[76px] shrink-0 flex flex-col gap-1.5 overflow-y-auto pl-1 border-l border-slate-100">
                {dynamicCategories.map(cat => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-1 py-2 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                        isActive
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-400/50'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      {cat === 'سواريه' && <span className="text-sm">✨</span>}
                      {cat === 'ستائر' && <span className="text-sm">🪟</span>}
                      {cat === 'تراكات ومواسير' && <span className="text-sm">🛠️</span>}
                      {cat === 'أشرطة وإكسسوارات' && <span className="text-sm">🎀</span>}
                      <span className="leading-snug break-words whitespace-normal font-black">{cat}</span>
                    </button>
                  );
                })}
              </div>

              {/* Products Grid */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-1.5 flex-shrink-0">
                  <h3 className="font-black text-slate-900 text-xs sm:text-[13px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-amber-500 text-base">grid_view</span>
                    <span>الأصناف المتاحة ({filteredProducts.length}) — اضغط على الصنف لإضافته:</span>
                  </h3>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-3xl block mb-1 text-slate-300">inventory_2</span>
                      <p className="text-xs font-bold">لا توجد أقمشة مطابقة للتصنيف أو البحث الحالي</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto pr-1 content-start">
                    {filteredProducts.map(prod => {
                      const stock = Number(prod.totalQuantity) || 0;
                      const outOfStock = stock <= 0;
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => !outOfStock && handleAddProduct(prod)}
                          disabled={outOfStock}
                          title={outOfStock ? 'الصنف خلص من المخزون — مايتضافش للفاتورة' : ''}
                          className={`text-right p-2 rounded-xl border transition-all group flex items-start justify-between gap-1.5 shadow-3xs h-fit ${
                            outOfStock
                              ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
                              : 'border-slate-200 bg-white hover:bg-amber-50/90 hover:border-amber-400 hover:shadow-xs cursor-pointer'
                          }`}
                        >
                          <span className={`font-black text-xs leading-snug break-words whitespace-normal min-w-0 flex-1 ${
                            outOfStock ? 'text-slate-400 line-through decoration-slate-400' : 'text-slate-900 group-hover:text-amber-950'
                          }`}>
                            {prod.name}
                            {outOfStock && <span className="block text-[10px] font-black text-rose-600 no-underline mt-0.5">🔒 خلص</span>}
                          </span>
                          <span className={`font-mono font-black text-xs px-1.5 py-0.5 rounded-lg border shrink-0 ${
                            outOfStock ? 'text-slate-400 bg-slate-100 border-slate-200' : 'text-emerald-800 bg-emerald-50 border-emerald-300'
                          }`}>
                            {prod.sellPrice.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ------------------------------------------------------------- */}
          {/* COLUMN 2 (3 cols - MIDDLE): Customer Info & Touch Keypad */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-3 order-2 flex flex-col gap-2" style={{height: 'calc(100dvh - 24px)'}}>
            
            {/* Customer & Branch Header Card */}
            <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-soft space-y-2">
              {/* Top Row: Invoice Number */}
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                  <span className="material-symbols-outlined text-amber-500 text-base">receipt_long</span>
                  <span>الفاتورة:</span>
                  <span className="bg-amber-100 text-amber-950 text-xs px-2 py-0.5 rounded-lg font-mono font-black border border-amber-300">
                    {invoiceNumber}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 font-bold">
                  {new Date().toLocaleDateString('ar-EG')}
                </div>
              </div>

              {/* Customer Type Toggle: 2 Large Touch Buttons */}
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => { setCustomerType('WALK_IN'); setCustName('عميل نقدي'); }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border text-center ${
                    customerType === 'WALK_IN'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  نقدي 💵
                </button>
                <button
                  type="button"
                  onClick={() => { setCustomerType('REGISTERED'); setCustName(''); }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer border text-center ${
                    customerType === 'REGISTERED'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  مسجل 👤
                </button>
              </div>

              {/* Customer Name, Phone & Branch */}
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="اسم العميل..."
                  value={custName}
                  onChange={e => setCustName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 text-xs"
                />

                <input
                  type="text"
                  placeholder="رقم الهاتف..."
                  value={custPhone}
                  onChange={e => setCustPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 text-xs"
                  dir="ltr"
                />

                <BranchSelect
                  value={branch}
                  onChange={setBranch}
                  isAdmin={isAdmin}
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-900 bg-slate-50 text-xs focus:outline-none"
                />

                {/* Compact Shipping Button - ONLY FOR COMMERCIAL BRANCH */}
                {isCommercialBranch && (
                  <div className="pt-1 border-t border-slate-100 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowShippingModal(true)}
                      className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center justify-between transition-all cursor-pointer border ${
                        isOnlineOrder
                          ? 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>📦</span>
                        <span className="truncate max-w-[130px]">{isOnlineOrder ? `شحن: ${shippingCompany}` : 'إضافة شحن / أونلاين'}</span>
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0 ${
                        isOnlineOrder ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {isOnlineOrder ? `+${shippingFee} (مفعل ✏️)` : '+ شحن'}
                      </span>
                    </button>
                    {isOnlineOrder && (
                      <button
                        type="button"
                        onClick={() => setIsOnlineOrder(false)}
                        className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer shrink-0"
                        title="إلغاء الشحن والتحويل لبيع مباشر بالفرع"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Light Touch Keypad Panel — flex-1 to fill remaining height */}
            <div className="bg-slate-50 text-slate-900 p-2 rounded-2xl border border-slate-200 shadow-soft space-y-1.5 flex-1 flex flex-col min-h-0">
              {/* Active Selected Item Banner - Full Width */}
              <div className="border-b border-slate-200 pb-1.5">
                {activeSelectedItem ? (
                  <div className="bg-white border border-amber-200 bg-amber-50/40 px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between shadow-3xs w-full">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <span className="material-symbols-outlined text-amber-600 text-base flex-shrink-0">straighten</span>
                      <span className="font-black text-slate-900 truncate text-xs" title={activeSelectedItem.name}>
                        {activeSelectedItem.name}
                      </span>
                    </div>
                    <span className="bg-emerald-600 text-white font-mono font-black px-2 py-0.5 rounded-lg text-xs flex-shrink-0 shadow-3xs">
                      {activeSelectedItem.meters} م
                    </span>
                  </div>
                ) : (
                  <div className="bg-white/80 border border-dashed border-slate-300 px-2 py-1.5 rounded-xl text-xs text-center text-slate-500 font-bold w-full">
                    اضغط على أي صنف لتعديل أمتاره مباشرة
                  </div>
                )}
              </div>

              {/* Quick Fraction Meter Buttons (Direct set & Increments) */}
              <div className="space-y-1">
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: '½ م (0.5)', val: 0.50 },
                    { label: '¾ م (0.75)', val: 0.75 },
                    { label: '¼ م (0.25)', val: 0.25 },
                    { label: '1 متر', val: 1.00 },
                  ].map((frac, fIdx) => (
                    <button
                      key={fIdx}
                      type="button"
                      onClick={() => handleSetExactMeters(frac.val)}
                      className="bg-amber-100 hover:bg-amber-500 hover:text-white text-amber-950 font-black py-2 rounded-xl text-xs transition-colors cursor-pointer text-center border border-amber-300 shadow-3xs active:scale-95"
                      title={`ضبط الكمية مباشرة على ${frac.val} متر`}
                    >
                      {frac.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: '+ ½م', val: 0.50 },
                    { label: '+ 1م', val: 1.00 },
                    { label: '+ 5م', val: 5.00 },
                  ].map((frac, fIdx) => (
                    <button
                      key={fIdx}
                      type="button"
                      onClick={() => handleAddFraction(frac.val)}
                      className="bg-slate-100 hover:bg-slate-300 text-slate-800 font-black py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-center border border-slate-200 shadow-3xs active:scale-95"
                      title={`إضافة ${frac.val} متر للكمية الحالية`}
                    >
                      {frac.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Numeric Numpad — Standard Calculator/POS LTR Layout */}
              <div className="grid grid-cols-4 gap-1.5 pt-1" dir="ltr">
                {['7', '8', '9'].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleKeypadPress(n)}
                    className="bg-white hover:bg-amber-50 text-slate-950 font-mono font-black text-2xl py-3 rounded-xl border border-slate-200 shadow-3xs active:scale-95 transition-all cursor-pointer"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('BACKSPACE')}
                  className="bg-rose-50 hover:bg-rose-500 text-rose-700 hover:text-white font-black py-3 rounded-xl border border-rose-200 flex items-center justify-center cursor-pointer transition-colors shadow-3xs"
                >
                  <span className="material-symbols-outlined text-[22px]">backspace</span>
                </button>

                {['4', '5', '6'].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleKeypadPress(n)}
                    className="bg-white hover:bg-amber-50 text-slate-950 font-mono font-black text-2xl py-3 rounded-xl border border-slate-200 shadow-3xs active:scale-95 transition-all cursor-pointer"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('CLEAR')}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-900 font-black py-3 rounded-xl border border-amber-200 text-sm cursor-pointer transition-colors shadow-3xs"
                >
                  C
                </button>

                {['1', '2', '3'].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleKeypadPress(n)}
                    className="bg-white hover:bg-amber-50 text-slate-950 font-mono font-black text-2xl py-3 rounded-xl border border-slate-200 shadow-3xs active:scale-95 transition-all cursor-pointer"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleKeypadPress('.')}
                  className="bg-white hover:bg-amber-50 text-slate-950 font-mono font-black text-2xl py-3 rounded-xl border border-slate-200 shadow-3xs active:scale-95 transition-all cursor-pointer"
                >
                  .
                </button>

                <button
                  type="button"
                  onClick={() => handleKeypadPress('0')}
                  className="col-span-2 bg-white hover:bg-amber-50 text-slate-950 font-mono font-black text-2xl py-3 rounded-xl border border-slate-200 shadow-3xs active:scale-95 transition-all cursor-pointer"
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
                  className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-1 text-sm cursor-pointer shadow-xs transition-colors"
                >
                  <span>الصنف التالي</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                </button>
              </div>
            </div>

          </div>
          {/* ------------------------------------------------------------- */}
          {/* COLUMN 3 (5 cols - LEFT): Cart Items Table, Totals & Save Actions */}
          {/* ------------------------------------------------------------- */}
          <div className="lg:col-span-5 order-3">
            {/* Fixed-height card — same size always regardless of item count */}
            <div className="bg-white rounded-2xl border-2 border-slate-300/80 shadow-soft flex flex-col" style={{height: 'calc(100dvh - 24px)'}}>

              {/* Header */}
              <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center flex-shrink-0 bg-slate-50/50 rounded-t-2xl">
                <h3 className="font-black text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-500 text-base">receipt_long</span>
                  <span>أصناف الفاتورة</span>
                  <span className="bg-amber-100 text-amber-900 text-xs px-2 py-0.5 rounded-full font-black font-mono border border-amber-300">
                    {items.length}
                  </span>
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => router.push('/fabric-sales')}
                    className="text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-xl transition-colors cursor-pointer border border-slate-200 flex items-center gap-1"
                    title="الرجوع لسجل فواتير المبيعات"
                  >
                    <span>↩️</span>
                    <span>السجل</span>
                  </button>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="text-xs text-rose-600 hover:text-rose-700 font-black bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>مسح الكل</span>
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items Table — scrollable, takes all remaining vertical space */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 font-black border-b border-slate-200 sticky top-0 z-10 text-xs">
                    <tr>
                      <th className="px-2.5 py-2">الصنف</th>
                      <th className="px-1 py-2 font-mono text-center w-[85px] sm:w-[95px]">السعر</th>
                      <th className="px-1 py-2 font-mono text-center w-[110px] sm:w-[120px]">الأمتار</th>
                      <th className="px-1.5 py-2 font-mono text-center w-[85px] sm:w-[95px]">الإجمالي</th>
                      <th className="px-1 py-2 text-center w-[30px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-sm">
                          <span className="material-symbols-outlined text-4xl block mb-2 text-slate-300">shopping_cart</span>
                          لا توجد أصناف مضافة بعد
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
                              isSelected ? 'bg-amber-50/95 font-black ring-1 ring-inset ring-amber-400' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-2.5 py-2">
                              <span className="font-black text-slate-900 block truncate text-xs sm:text-sm" title={it.name}>
                                {it.name}
                              </span>
                            </td>

                            <td className="px-1 py-2 text-center font-mono font-bold text-slate-800 w-[85px] sm:w-[95px]">
                              <input
                                type="number"
                                min="0"
                                value={it.pricePerMeter}
                                readOnly={priceLocked}
                                onFocus={async () => { if (priceLocked) await requirePriceUnlock(); }}
                                onClick={async (e) => { e.stopPropagation(); if (priceLocked) await requirePriceUnlock(); }}
                                onChange={e => { if (!priceLocked) handleUpdateItem(it.id, 'pricePerMeter', Number(e.target.value)); }}
                                className={`w-full text-center rounded-lg py-1 px-1 font-mono font-black text-xs sm:text-sm focus:outline-none focus:border-amber-500 ${priceLocked ? 'bg-amber-50 border border-amber-200 cursor-pointer' : 'bg-white border border-slate-200 shadow-3xs'}`}
                                title={priceLocked ? 'تغيير السعر يتطلب باسورد المدير' : ''}
                              />
                            </td>

                            <td className="px-1 py-2 text-center w-[110px] sm:w-[120px]">
                              <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItem(it.id, 'meters', Math.max(0.25, it.meters - 0.25))}
                                  className="w-5 h-5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-3xs shrink-0"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0.1"
                                  value={it.meters}
                                  onChange={e => handleUpdateItem(it.id, 'meters', Number(e.target.value))}
                                  className="w-12 text-center border border-slate-300 rounded-lg py-1 font-mono font-black text-xs sm:text-sm focus:outline-none focus:border-amber-500 bg-white text-slate-950 shadow-3xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateItem(it.id, 'meters', it.meters + 0.25)}
                                  className="w-5 h-5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-3xs shrink-0"
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            <td className="px-1.5 py-2 text-center font-mono font-black text-slate-950 text-xs sm:text-sm whitespace-nowrap w-[85px] sm:w-[95px]">
                              {it.totalPrice.toLocaleString()}
                            </td>

                            <td className="px-1 py-2 text-center w-[30px]">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemoveItem(it.id); }}
                                className="text-rose-500 hover:text-rose-700 font-black p-1 hover:bg-rose-50 rounded-lg cursor-pointer text-sm transition-colors"
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

              {/* Bottom fixed section: Payment + Totals + Dedicated Paid Box + Buttons */}
              <div className="flex-shrink-0 px-3 pb-3 pt-2 space-y-2 border-t border-slate-100">

                {/* Payment Methods */}
                <div className="space-y-1">
                  <span className="text-xs font-black text-slate-800 block">طريقة الدفع:</span>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
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
                        className={`py-1.5 px-1.5 rounded-xl text-xs sm:text-[13px] font-black transition-all border cursor-pointer ${
                          paymentMethod === m.id
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Split Payment inputs if selected */}
                  {paymentMethod === 'دفع متعدد / مزيج' && (
                    <div className="bg-amber-50 border border-amber-300 p-2 rounded-xl mt-1.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: '💵 كاش', val: splitCash, setter: setSplitCash },
                          { label: '⚡ إنستا', val: splitInstapay, setter: setSplitInstapay },
                          { label: '📱 فودافون', val: splitVodafone, setter: setSplitVodafone },
                          { label: '💳 فيزا', val: splitVisa, setter: setSplitVisa },
                        ].map(({ label, val, setter }) => (
                          <div key={label}>
                            <label className="text-[10px] font-black text-slate-700 block">{label}:</label>
                            <input
                              type="number"
                              min="0"
                              value={val || ''}
                              onChange={e => {
                                const v = Number(e.target.value);
                                setter(v);
                                const sum =
                                  (setter === setSplitCash ? v : (splitCash || 0)) +
                                  (setter === setSplitInstapay ? v : (splitInstapay || 0)) +
                                  (setter === setSplitVodafone ? v : (splitVodafone || 0)) +
                                  (setter === setSplitVisa ? v : (splitVisa || 0));
                                setPaidAmount(sum);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-black text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Totals Summary with Integrated Value Discount */}
                <div className="bg-slate-900 text-white p-2.5 sm:p-3 rounded-2xl space-y-1.5 shadow-md border border-slate-800">
                  <div className="flex justify-between items-center text-slate-300 text-xs font-bold">
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono text-sm font-black">{subtotal.toLocaleString()} ج.م</span>
                  </div>

                  {/* خصم قيمة مباشرة */}
                  <div className="flex justify-between items-center text-amber-300 text-xs font-bold gap-2 pt-1 border-t border-slate-800/80">
                    <div className="flex items-center gap-1 whitespace-nowrap">
                      <span>خصم قيمة:</span>
                      {priceLocked && <span className="text-[10px] text-amber-400 font-normal">🔒</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={discountValue || ''}
                        readOnly={priceLocked}
                        onFocus={async () => { if (priceLocked) await requirePriceUnlock(); }}
                        onClick={async () => { if (priceLocked) await requirePriceUnlock(); }}
                        onChange={e => {
                          if (!priceLocked) {
                            setDiscountType('EGP');
                            setDiscountValue(Number(e.target.value));
                          }
                        }}
                        className={`w-24 text-center rounded-lg px-2 py-1 font-mono font-black text-xs sm:text-sm text-slate-950 focus:outline-none focus:border-amber-400 ${
                          priceLocked ? 'bg-amber-100/90 border border-amber-300 cursor-pointer' : 'bg-white border border-slate-300'
                        }`}
                        title={priceLocked ? 'الخصم يتطلب باسورد المدير' : 'أدخل قيمة الخصم بالجنيه'}
                      />
                      <span className="text-[11px] font-mono text-slate-300">ج.م</span>
                    </div>
                  </div>

                  {/* مصاريف الشحن إن وجدت */}
                  {isOnlineOrder && (
                    <div className="flex justify-between items-center text-blue-300 text-xs font-bold pt-1 border-t border-slate-800/80">
                      <span className="flex items-center gap-1">
                        <span>📦</span>
                        <span>مصاريف الشحن ({shippingCompany}):</span>
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-black text-blue-300">+{Number(shippingFee || 0).toLocaleString()} ج.م</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-white border-t border-slate-800 pt-1.5 font-black">
                    <span className="text-xs sm:text-sm">الصافي المستحق:</span>
                    <span className="font-mono text-lg sm:text-xl text-emerald-400">{totalAmount.toLocaleString()} ج.م</span>
                  </div>
                </div>

                {/* Dedicated Paid & Remaining Box */}
                <div className="bg-amber-50/70 border-2 border-amber-200 p-2.5 rounded-2xl space-y-2 shadow-soft">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-black text-amber-950 whitespace-nowrap">
                      المبلغ المدفوع:
                    </span>
                    <div className="flex items-center gap-1.5 flex-1 max-w-[210px]">
                      <input
                        type="number"
                        min="0"
                        value={paidAmount}
                        onChange={e => { setPaidAmount(Number(e.target.value)); setIsFullPaid(false); }}
                        className="w-full bg-white border-2 border-amber-400 focus:border-amber-600 rounded-xl px-2.5 py-1.5 font-mono font-black text-slate-950 text-base sm:text-lg text-center focus:outline-none shadow-inner"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => { setPaidAmount(totalAmount); setIsFullPaid(true); }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-2 rounded-xl font-black cursor-pointer whitespace-nowrap shadow-xs active:scale-95 transition-all"
                        title="سداد المبلغ كاملاً"
                      >
                        كامل ⚡
                      </button>
                    </div>
                  </div>

                  {/* Remaining / Balance Status Indicator */}
                  <div className="pt-0.5">
                    {remainingAmount === 0 ? (
                      <div className="bg-emerald-100/90 border border-emerald-300 text-emerald-950 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black flex justify-between items-center shadow-3xs">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base text-emerald-700">check_circle</span>
                          <span>الحالة: تم السداد بالكامل</span>
                        </span>
                        <span className="font-mono font-black text-sm text-emerald-800">0 ج.م</span>
                      </div>
                    ) : (
                      <div className="bg-rose-100/90 border border-rose-300 text-rose-950 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black flex justify-between items-center shadow-3xs">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base text-rose-700">pending</span>
                          <span>المتبقي (آجل / دفعات):</span>
                        </span>
                        <span className="font-mono font-black text-sm sm:text-base text-rose-700">
                          {remainingAmount.toLocaleString()} ج.م
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2 Save Buttons — side by side */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={() => handleSaveInvoice(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg">print</span>
                    <span>حفظ وطباعة 🖨️</span>
                  </button>

                  <button
                    type="button"
                    disabled={items.length === 0}
                    onClick={() => handleSaveInvoice(false)}
                    className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-base sm:text-lg">save</span>
                    <span>حفظ فقط</span>
                  </button>
                </div>

              </div>
            </div>
          </div>
    
        </div>
      </div>

      {/* SHIPPING DETAILS POPUP MODAL */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-center">
            <div className="relative border-b pb-3 text-center">
              <h3 className="font-black text-slate-900 text-sm flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-lg">local_shipping</span>
                <span>بيانات الشحن والتوصيل (أونلاين / الفرع التجاري)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowShippingModal(false)}
                className="absolute left-0 top-0 text-slate-400 hover:text-slate-700 font-bold cursor-pointer text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 text-center">
                  عنوان الشحن بالتفصيل (المحافظة / المدينة / الشارع) *
                </label>
                <input
                  type="text"
                  placeholder="مثال: الإسماعيلية - الشيخ زايد - شارع الثلاثيني..."
                  value={shippingAddress}
                  onChange={e => setShippingAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-blue-500 text-center placeholder:text-center"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 text-center">شركة الشحن *</label>
                  <select
                    value={shippingCompany}
                    onChange={e => setShippingCompany(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-blue-500 text-center text-center-last"
                  >
                    <option value="بوسطة (Bosta)">بوسطة (Bosta)</option>
                    <option value="أرامكس (Aramex)">أرامكس (Aramex)</option>
                    <option value="مندوب الفرع التجاري">مندوب الفرع التجاري</option>
                    <option value="ريد بوكس (RedBox)">ريد بوكس (RedBox)</option>
                    <option value="شركة شحن أخرى">شركة شحن أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 text-center">مصاريف الشحن (ج.م) *</label>
                  <input
                    type="number"
                    min="0"
                    value={shippingFee}
                    onChange={e => setShippingFee(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-black focus:bg-white focus:outline-none focus:border-blue-500 text-center placeholder:text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 text-center">هاتف المستلم (إن اختلف):</label>
                  <input
                    type="text"
                    placeholder={custPhone || 'رقم إضافي...'}
                    value={receiverPhone}
                    onChange={e => setReceiverPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-500 text-center placeholder:text-center"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1 text-center">مصدر الطلب:</label>
                  <select
                    value={orderSource}
                    onChange={e => setOrderSource(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-blue-500 text-center text-center-last"
                  >
                    <option value="صفحة الفيسبوك">صفحة الفيسبوك</option>
                    <option value="واتساب (WhatsApp)">واتساب</option>
                    <option value="إنستجرام (Instagram)">إنستجرام</option>
                    <option value="تيك توك (TikTok)">تيك توك</option>
                    <option value="الموقع الإلكتروني">الموقع الإلكتروني</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 text-center">رقم البوليصة / التتبع (اختياري):</label>
                <input
                  type="text"
                  placeholder="مثال: BST-982341..."
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-500 text-center placeholder:text-center"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setIsOnlineOrder(false);
                  setShowShippingModal(false);
                }}
                className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                إلغاء الشحن (مباشر)
              </button>
              <button
                type="button"
                onClick={() => setShowShippingModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOnlineOrder(true);
                  setShowShippingModal(false);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                حفظ وتفعيل الشحن ✓
              </button>
            </div>
          </div>
        </div>
      )}

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
              {(() => {
                const bCfg = getBranchConfig(lastSavedInvoice.branch);
                const bPhones = [bCfg.landline ? `ت: ${bCfg.landline}` : '', bCfg.phone ? `م: ${bCfg.phone}` : ''].filter(Boolean).join(' | ');
                const activePayments: { label: string; amount: number; icon: string }[] = [];
                if (lastSavedInvoice.splitPayments && (lastSavedInvoice.paymentMethod === 'دفع متعدد / مزيج' || lastSavedInvoice.paymentMethod?.includes('متعدد'))) {
                  if (Number(lastSavedInvoice.splitPayments.cash) > 0) activePayments.push({ label: 'كاش', amount: Number(lastSavedInvoice.splitPayments.cash), icon: '💵' });
                  if (Number(lastSavedInvoice.splitPayments.instapay) > 0) activePayments.push({ label: 'إنستاباي', amount: Number(lastSavedInvoice.splitPayments.instapay), icon: '⚡' });
                  if (Number(lastSavedInvoice.splitPayments.vodafone) > 0) activePayments.push({ label: 'فودافون كاش', amount: Number(lastSavedInvoice.splitPayments.vodafone), icon: '📱' });
                  if (Number(lastSavedInvoice.splitPayments.visa) > 0) activePayments.push({ label: 'فيزا', amount: Number(lastSavedInvoice.splitPayments.visa), icon: '💳' });
                } else if (lastSavedInvoice.paidAmount > 0) {
                  const m = lastSavedInvoice.paymentMethod || 'نقدي';
                  let ic = '💵';
                  if (m.includes('إنستا')) ic = '⚡';
                  else if (m.includes('فودافون')) ic = '📱';
                  else if (m.includes('فيزا')) ic = '💳';
                  activePayments.push({ label: m, amount: lastSavedInvoice.paidAmount, icon: ic });
                }

                return (
                  <>
                    <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                      <p className="font-black text-sm tracking-wide">مؤسسة كشك للأقمشة والستائر</p>
                      <p className="text-xs font-bold text-slate-800">👑 {bCfg.name}</p>
                      <p className="text-[10px] text-slate-600">{bCfg.address}</p>
                      {bPhones && <p className="text-[10px] font-mono text-slate-700 font-bold">{bPhones}</p>}
                      <div className="flex justify-between text-[10px] text-slate-500 pt-1 font-bold">
                        <span>فاتورة: {lastSavedInvoice.invoiceNumber}</span>
                        <span>{lastSavedInvoice.date || new Date().toLocaleDateString('ar-EG')}</span>
                      </div>
                    </div>

                    <div className="text-[11px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                      <div className="flex justify-between">
                        <span><span className="font-bold">العميل:</span> {lastSavedInvoice.customerName}</span>
                        {lastSavedInvoice.phone && <span className="font-mono">{lastSavedInvoice.phone}</span>}
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-1 border-b border-dashed border-slate-300 pb-2">
                      <table className="w-full border-collapse border border-slate-400 text-[10px]">
                        <thead>
                          <tr className="bg-slate-200 text-slate-900 font-black border-b border-slate-400">
                            <th className="p-1 text-right">الصنف</th>
                            <th className="p-1 text-center border-r border-l border-slate-400">الأمتار</th>
                            <th className="p-1 text-center border-l border-slate-400">السعر</th>
                            <th className="p-1 text-left">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lastSavedInvoice.items.map((it: any, idx: number) => (
                            <tr key={idx} className="border-b border-slate-300 font-bold">
                              <td className="p-1 text-right">
                                <div className="font-black text-slate-950 truncate max-w-[120px]">{it.name}</div>
                              </td>
                              <td className="p-1 text-center font-mono font-black border-r border-l border-slate-300">{it.meters}م</td>
                              <td className="p-1 text-center font-mono border-l border-slate-300">{it.pricePerMeter}</td>
                              <td className="p-1 text-left font-mono font-black whitespace-nowrap">{it.totalPrice} ج</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                      {lastSavedInvoice.isOnlineOrder && (
                        <div className="text-[10px] bg-blue-50 p-1.5 rounded-lg border border-blue-200 text-blue-950 space-y-0.5">
                          <div className="font-black">📦 شحن أونلاين: {lastSavedInvoice.shippingCompany || 'بوسطة'}</div>
                          {lastSavedInvoice.shippingAddress && <div>📍 {lastSavedInvoice.shippingAddress}</div>}
                          {lastSavedInvoice.receiverPhone && <div>📞 مستلم: {lastSavedInvoice.receiverPhone}</div>}
                          {lastSavedInvoice.trackingNumber && <div>🏷️ تتبع: {lastSavedInvoice.trackingNumber}</div>}
                        </div>
                      )}

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
                        {lastSavedInvoice.isOnlineOrder && (
                          <div className="flex justify-between text-blue-700">
                            <span>مصاريف الشحن:</span>
                            <span>+ {lastSavedInvoice.shippingFee || 110} ج.م</span>
                          </div>
                        )}
                        <div className="flex justify-between font-black text-xs text-slate-950 pt-1 border-t border-slate-200">
                          <span>الصافي المستحق:</span>
                          <span>{lastSavedInvoice.totalAmount} ج.م</span>
                        </div>
                      {/* Active Payment Methods Only */}
                      {activePayments.length > 0 && (
                        <div className="space-y-0.5 pt-0.5">
                          {activePayments.map((p, i) => (
                            <div key={i} className="flex justify-between text-emerald-700 text-[10px]">
                              <span>{p.icon} مسدد {p.label}:</span>
                              <span className="font-mono font-bold">{p.amount.toLocaleString()} ج.م</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between text-slate-900 font-black">
                        <span>إجمالي المدفوع:</span>
                        <span>{lastSavedInvoice.paidAmount} ج.م</span>
                      </div>
                      {lastSavedInvoice.remainingAmount > 0 && (
                        <div className="flex justify-between text-rose-600 font-bold">
                          <span>المتبقي:</span>
                          <span>{lastSavedInvoice.remainingAmount} ج.م</span>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-[10px] text-slate-600 pt-1 space-y-0.5">
                      <p className="font-bold">شكراً لتعاملكم مع مؤسسة كشك للأقمشة والستائر ✨</p>
                      <p>البضاعة المباعة لا ترد ولا تستبدل بعد القص</p>
                    </div>
                  </>
                );
              })()}
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
      {/* Offline Order Confirmation Modal for Commercial Branch */}
      {showOfflineConfirmModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-slate-900 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-3xl font-black shadow-inner">
              ⚠️
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-base font-black text-slate-900">
                تأكيد نوع الطلب (الفرع التجاري)
              </h3>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                الفاتورة مسجلة حالياً كـ <span className="text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md font-black border border-amber-200">بيع واستلام مباشر داخل المحل</span> وليست <span className="text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded-md font-black border border-blue-200">طلب أونلاين / شحن</span>.
              </p>
              <p className="text-[11px] text-slate-500 font-bold">
                هل العميل يشتري مباشرة من داخل الفرع، أم نسيت تفعيل وإدخال بيانات الشحن؟
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowOfflineConfirmModal(false);
                  setIsOnlineOrder(true);
                  setShowShippingModal(true);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📦</span>
                <span>الرجوع لتسجيل بيانات الشحن والأونلاين</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOfflineConfirmModal(false);
                  executeSaveInvoice(pendingSaveAndPrint);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🏪</span>
                <span>نعم متأكد، حفظ كبيع مباشر داخل المحل</span>
              </button>

              <button
                type="button"
                onClick={() => setShowOfflineConfirmModal(false)}
                className="w-full py-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors cursor-pointer"
              >
                إلغاء الأمر
              </button>
            </div>
          </div>
        </div>
      )}

      {MgrModal}
    </PageShell>
  );
}

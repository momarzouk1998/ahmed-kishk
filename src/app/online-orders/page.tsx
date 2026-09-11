'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { getBranchConfig } from '@/lib/branches';
import { formatDateOnly } from '@/lib/dateUtils';
import { useCurrentUser } from '@/lib/useCurrentUser';

export interface OnlineOrderItem {
  id: string;
  name: string;
  code?: string;
  meters: number;
  pricePerMeter: number;
  totalPrice: number;
}

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  date: string;
  customerName: string;
  phone: string;
  secondaryPhone?: string;
  governorate: string;
  shippingAddress: string;
  shippingCompany?: string;
  items: OnlineOrderItem[];
  fabricSubtotal: number;
  shippingFee: number; // Flat 110 EGP
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'الدفع عند الاستلام (COD)' | 'إنستاباي مسبق' | 'فودافون كاش مسبق' | 'فيزا / بطاقة';
  paidAmount: number;
  remainingCOD: number;
  status: 'تم الشحن' | 'قيد التجهيز' | 'تم التسليم والتحصيل' | 'مرتجع';
  notes?: string;
}

const ONLINE_ORDERS_KEY = 'ahmed_kishk_online_orders_v1';
const FLAT_SHIPPING_FEE = 110;

const GOVERNORATES = [
  'الإسماعيلية', 'القاهرة', 'الجيزة', 'الإسكندرية', 'بورسعيد', 'السويس', 
  'الشرقية', 'الدقهلية', 'الغربية', 'المنوفية', 'القليوبية', 'البحيرة', 
  'كفر الشيخ', 'دمياط', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 
  'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'مطروح', 'شمال سيناء', 'جنوب سيناء'
];

export default function OnlineOrdersPage() {
  const { user } = useCurrentUser();
  const [orders, setOrders] = useState<OnlineOrder[]>([]);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [governorate, setGovernorate] = useState('الإسماعيلية');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCompany, setShippingCompany] = useState('مندوب الفرع التجاري');
  const [paymentMethod, setPaymentMethod] = useState<OnlineOrder['paymentMethod']>('الدفع عند الاستلام (COD)');
  const [paidAdvance, setPaidAdvance] = useState<string>('0');
  const [orderNotes, setOrderNotes] = useState('');

  // Items State
  const [items, setItems] = useState<OnlineOrderItem[]>([
    { id: '1', name: 'شيفون ناعم سواريه', code: 'CHF-01', meters: 3, pricePerMeter: 250, totalPrice: 750 }
  ]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newItemMeters, setNewItemMeters] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('200');

  // Selected for Waybill / Print
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<OnlineOrder | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ONLINE_ORDERS_KEY);
      if (raw) setOrders(JSON.parse(raw));
    } catch {}
  }, []);

  const saveOrdersToStorage = (newOrders: OnlineOrder[]) => {
    setOrders(newOrders);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONLINE_ORDERS_KEY, JSON.stringify(newOrders));
    }
    fetch('/api/system-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: ONLINE_ORDERS_KEY, data: newOrders }),
    }).catch(() => {});
  };

  const fabricSubtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  }, [items]);

  const totalAmount = fabricSubtotal + FLAT_SHIPPING_FEE;
  const paidNum = parseFloat(paidAdvance || '0');
  const remainingCOD = Math.max(0, totalAmount - paidNum);

  const handleAddItem = () => {
    if (!newItemName) return;
    const m = parseFloat(newItemMeters) || 1;
    const p = parseFloat(newItemPrice) || 0;
    const it: OnlineOrderItem = {
      id: `it_${Date.now()}`,
      name: newItemName,
      code: newItemCode || undefined,
      meters: m,
      pricePerMeter: p,
      totalPrice: m * p,
    };
    setItems([...items, it]);
    setNewItemName('');
    setNewItemCode('');
    setNewItemMeters('1');
    setNewItemPrice('200');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !phone || !shippingAddress) {
      alert('برجاء استكمال بيانات العميل والعنوان ورقم الهاتف');
      return;
    }
    if (items.length === 0) {
      alert('برجاء إضافة صنف واحد على الأقل للطلب');
      return;
    }

    const newOrder: OnlineOrder = {
      id: `ONL-${Date.now()}`,
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      customerName,
      phone,
      secondaryPhone: secondaryPhone || undefined,
      governorate,
      shippingAddress,
      shippingCompany,
      items,
      fabricSubtotal,
      shippingFee: FLAT_SHIPPING_FEE,
      discountAmount: 0,
      totalAmount,
      paymentMethod,
      paidAmount: paidNum,
      remainingCOD,
      status: 'قيد التجهيز',
      notes: orderNotes || undefined,
    };

    const updated = [newOrder, ...orders];
    saveOrdersToStorage(updated);

    // Reset Form
    setCustomerName('');
    setPhone('');
    setSecondaryPhone('');
    setShippingAddress('');
    setPaidAdvance('0');
    setOrderNotes('');
    setItems([]);
    setSelectedOrderForPrint(newOrder);
  };

  // KPI Metrics
  const totalFabricRevenue = useMemo(() => orders.reduce((sum, o) => sum + o.fabricSubtotal, 0), [orders]);
  const totalShippingCollected = useMemo(() => orders.reduce((sum, o) => sum + o.shippingFee, 0), [orders]);

  const handlePrintWaybill = (order: OnlineOrder) => {
    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="UTF-8"><title>بوليصة شحن ${order.orderNumber}</title>
      <style>
        @page { size: 80mm auto; margin: 3mm 4mm; }
        body { font-family: 'Cairo', system-ui, sans-serif; direction:rtl; color:#000; font-size:8.5pt; width:72mm; margin:0 auto; }
        .center { text-align:center; }
        .brand { font-weight:900; font-size:11pt; }
        .divider { border-top:1px dashed #000; margin:2mm 0; }
        .box { border:1.5px solid #000; border-radius:4px; padding:2mm; margin:2mm 0; }
        .cod-box { background:#000; color:#fff; text-align:center; padding:2.5mm; font-size:12pt; font-weight:900; font-family:monospace; margin:2mm 0; }
      </style></head><body>
        <div class="center">
          <div class="brand">مؤسسة كشك للأقمشة والستائر</div>
          <div style="font-weight:bold; font-size:9pt; color:#222;">👑 الفرع التجاري — قسم الشحن والتوصيل</div>
          <div style="font-size:7.5pt; color:#444;">م: 01280042900 | الإسماعيلية: ش التجاري</div>
        </div>
        <div class="divider"></div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:8.5pt;">
          <span>رقم الشحنة: <b style="font-family:monospace;">${order.orderNumber}</b></span>
          <span style="font-size:7.5pt;">${formatDateOnly(order.date)}</span>
        </div>
        <div class="box">
          <div style="font-size:9pt; font-weight:900;">👤 العميل: ${order.customerName}</div>
          <div style="font-size:9pt; font-family:monospace; font-weight:bold; margin-top:1mm;">📱 تليفون: ${order.phone} ${order.secondaryPhone ? ` / ${order.secondaryPhone}` : ''}</div>
          <div style="font-size:8.5pt; font-weight:bold; margin-top:1mm;">📍 المحافظة: ${order.governorate}</div>
          <div style="font-size:8pt; margin-top:1mm; line-height:1.3;">🏠 العنوان: ${order.shippingAddress}</div>
        </div>
        <div style="font-size:8pt; font-weight:bold;">📦 محتويات الطرد (${order.items.length} أصناف):</div>
        <div style="font-size:7.5pt; color:#333; margin-top:1mm;">
          ${order.items.map(it => `• ${it.name} (${it.meters}م × ${it.pricePerMeter}ج = ${it.totalPrice}ج)`).join('<br>')}
        </div>
        <div class="divider"></div>
        <div style="display:flex; justify-content:space-between; font-size:8pt;">
          <span>قيمة الأقمشة:</span>
          <span style="font-family:monospace; font-weight:bold;">${order.fabricSubtotal.toLocaleString()} ج</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:8pt;">
          <span>خدمة الشحن والتوصيل:</span>
          <span style="font-family:monospace; font-weight:bold;">${order.shippingFee} ج</span>
        </div>
        ${order.paidAmount > 0 ? `
        <div style="display:flex; justify-content:space-between; font-size:8pt; color:#059669;">
          <span>المدفوع مسبقاً:</span>
          <span style="font-family:monospace; font-weight:bold;">-${order.paidAmount.toLocaleString()} ج</span>
        </div>` : ''}
        
        <div class="cod-box">
          المبلغ المطلوب تحصيله (COD):<br>
          ${order.remainingCOD.toLocaleString()} ج.م
        </div>
        <div class="center" style="font-size:7.5pt; color:#444;">
          شركة / مندوب الشحن: <b>${order.shippingCompany || 'مندوب الفرع التجاري'}</b><br>
          شكراً لتعاملكم مع مؤسسة كشك للأقمشة والستائر ✨
        </div>
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <PageShell title="الفرع التجاري — مبيعات وطلبات الشحن الأونلاين" badge="شحن موحد 110 ج">
      <div className="space-y-6">
        
        {/* KPI Top Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500 font-bold block">إجمالي عدد شحنات الأونلاين</span>
            <span className="font-mono font-black text-xl text-slate-900">{orders.length} طلب</span>
          </div>
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-sm">
            <span className="text-xs text-emerald-800 font-bold block">إيرادات مبيعات الأقمشة الصافية</span>
            <span className="font-mono font-black text-xl text-emerald-950">{totalFabricRevenue.toLocaleString()} ج.م</span>
          </div>
          <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 shadow-sm">
            <span className="text-xs text-blue-800 font-bold block">إجمالي مصاريف الشحن المحصلة (110 ج/طلب)</span>
            <span className="font-mono font-black text-xl text-blue-950">{totalShippingCollected.toLocaleString()} ج.م</span>
          </div>
        </div>

        {/* Create Online Order Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Order Form */}
          <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-200">
              <span>📦</span>
              <span>إنشاء فاتورة أونلاين وبوليصة شحن جديدة — الفرع التجاري</span>
            </h3>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم العميل *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="اسم العميل الرباعي..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف الأساسي *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المحافظة *</label>
                  <select
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    {GOVERNORATES.map(gov => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم هاتف بديل (اختياري)</label>
                  <input
                    type="tel"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    placeholder="رقم آخر للتوصيل..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان التفصيلي للشحن *</label>
                <input
                  type="text"
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="الشارع، رقم العمارة، الشقة، علامة مميزة..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {/* Items Section */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="font-black text-xs text-slate-900 block">الأقمشة المطلوبة للشحن:</span>

                {/* Add Item Row */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">اسم القماش</label>
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="نوع القماش..."
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الأمتار</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={newItemMeters}
                      onChange={(e) => setNewItemMeters(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">سعر المتر</label>
                    <input
                      type="number"
                      step="5"
                      min="1"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      + إضافة
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                {items.length > 0 && (
                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                        <tr>
                          <th className="p-2">الصنف</th>
                          <th className="p-2 font-mono">الأمتار</th>
                          <th className="p-2 font-mono">السعر</th>
                          <th className="p-2 font-mono">الإجمالي</th>
                          <th className="p-2 text-center">حذف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((it) => (
                          <tr key={it.id}>
                            <td className="p-2 font-bold">{it.name}</td>
                            <td className="p-2 font-mono">{it.meters} م</td>
                            <td className="p-2 font-mono">{it.pricePerMeter} ج</td>
                            <td className="p-2 font-mono font-bold">{it.totalPrice.toLocaleString()} ج</td>
                            <td className="p-2 text-center">
                              <button onClick={() => handleRemoveItem(it.id)} className="text-rose-600 font-bold">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Shipping & Payment Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">شركة / مندوب الشحن</label>
                  <input
                    type="text"
                    value={shippingCompany}
                    onChange={(e) => setShippingCompany(e.target.value)}
                    placeholder="مثال: بوسطة، مندوب..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">طريقة السداد</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="الدفع عند الاستلام (COD)">الدفع عند الاستلام (COD)</option>
                    <option value="إنستاباي مسبق">إنستاباي مسبق</option>
                    <option value="فودافون كاش مسبق">فودافون كاش مسبق</option>
                    <option value="فيزا / بطاقة">فيزا / بطاقة</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عربون مدفوع مسبقاً (ج)</label>
                  <input
                    type="number"
                    min="0"
                    value={paidAdvance}
                    onChange={(e) => setPaidAdvance(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer transition-colors"
              >
                تأكيد الفاتورة وحفظ طلب الشحن 📦
              </button>
            </form>
          </div>

          {/* Realtime Order Summary Card */}
          <div className="bg-slate-900 text-white p-5 md:p-6 rounded-3xl space-y-4 flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h4 className="font-black text-base text-amber-400">الملخص المالي لطلب الشحن</h4>
                <p className="text-xs text-slate-400">الفرع التجاري للأقمشة والشحن</p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300">إجمالي الأقمشة:</span>
                  <span className="font-mono font-bold text-white text-sm">{fabricSubtotal.toLocaleString()} ج.م</span>
                </div>

                <div className="flex justify-between p-2.5 bg-amber-950/60 border border-amber-800/80 rounded-xl text-amber-300">
                  <span className="font-bold">⚡ رسوم الشحن الموحدة:</span>
                  <span className="font-mono font-black text-sm">{FLAT_SHIPPING_FEE} ج.م</span>
                </div>

                <div className="flex justify-between pt-2 border-t border-slate-800 font-black text-sm">
                  <span className="text-slate-200">إجمالي الفاتورة:</span>
                  <span className="font-mono text-base text-white">{totalAmount.toLocaleString()} ج.م</span>
                </div>

                {paidNum > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>المسدد مسبقاً:</span>
                    <span className="font-mono font-bold">-{paidNum.toLocaleString()} ج.م</span>
                  </div>
                )}

                <div className="p-3 bg-emerald-950/80 border border-emerald-700 rounded-2xl space-y-1 text-center">
                  <span className="text-[11px] text-emerald-300 font-bold block">المبلغ المطلوب تحصيله عند التسليم (COD):</span>
                  <span className="font-mono font-black text-2xl text-emerald-400 block">{remainingCOD.toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-slate-800">
              يتم إصدار بوليصة شحن مصغرة مهيأة للطابعات الحرارية (80 مم) للطرود
            </div>
          </div>

        </div>

        {/* Orders History Table */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center justify-between">
            <span>📋 سجل طلبات وشحنات الفرع التجاري</span>
            <span className="text-xs font-normal text-slate-500">إجمالي الشحنات: {orders.length}</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">رقم الطلب</th>
                  <th className="p-3">العميل والمحافظة</th>
                  <th className="p-3">الهاتف</th>
                  <th className="p-3 font-mono">القماش</th>
                  <th className="p-3 font-mono">الشحن</th>
                  <th className="p-3 font-mono font-black text-slate-950">المطلوب تحصيله</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">بوليصة الشحن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">لا توجد طلبات شحن مسجلة حتى الآن</td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{ord.orderNumber}</td>
                      <td className="p-3">
                        <div className="font-black text-slate-900">{ord.customerName}</div>
                        <div className="text-[10px] text-slate-500">{ord.governorate} — {ord.shippingAddress}</div>
                      </td>
                      <td className="p-3 font-mono text-slate-700">{ord.phone}</td>
                      <td className="p-3 font-mono font-bold text-slate-800">{ord.fabricSubtotal.toLocaleString()} ج</td>
                      <td className="p-3 font-mono font-bold text-blue-800">{ord.shippingFee} ج</td>
                      <td className="p-3 font-mono font-black text-emerald-800 text-sm">{ord.remainingCOD.toLocaleString()} ج</td>
                      <td className="p-3">
                        <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handlePrintWaybill(ord)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                        >
                          🏷️ بوليصة
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Waybill Preview */}
        {selectedOrderForPrint && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-sm w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-black text-slate-900 text-base">تم تسجيل الشحنة بنجاح 📦</h3>
                <button onClick={() => setSelectedOrderForPrint(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2 text-xs">
                <div className="text-center font-bold pb-2 border-b">
                  <p className="text-sm font-black text-slate-900">مؤسسة كشك للأقمشة والستائر</p>
                  <p className="text-xs text-amber-800">بوليصة شحن رقم {selectedOrderForPrint.orderNumber}</p>
                </div>
                <div className="flex justify-between">
                  <span>العميل:</span>
                  <span className="font-bold">{selectedOrderForPrint.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>المحافظة:</span>
                  <span>{selectedOrderForPrint.governorate}</span>
                </div>
                <div className="flex justify-between font-black text-emerald-950 bg-emerald-100/80 p-2 rounded-xl text-sm border border-emerald-300">
                  <span>المبلغ المطلوب تحصيله (COD):</span>
                  <span className="font-mono">{selectedOrderForPrint.remainingCOD.toLocaleString()} ج</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintWaybill(selectedOrderForPrint)}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow"
                >
                  🖨️ طباعة بوليصة الطرد (80mm)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForPrint(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  تم
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
}

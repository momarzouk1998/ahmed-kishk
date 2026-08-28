'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';

// Quick Fabric Sale — like Rocket Cashier but custom for Ahmed Kishk
const fabricCategories = [
  {
    category: 'سواريه',
    items: [
      { code: 'SAT-01', name: 'ستان سواريه', pricePerMeter: 450, stock: 120 },
      { code: 'SLK-01', name: 'حرير طبيعي', pricePerMeter: 900, stock: 45 },
      { code: 'CRP-01', name: 'كريب مزدوج', pricePerMeter: 300, stock: 200 },
      { code: 'CHF-01', name: 'شيفون ناعم', pricePerMeter: 250, stock: 180 },
    ]
  },
  {
    category: 'ستائر',
    items: [
      { code: 'VLV-01', name: 'قطيفة ستائر', pricePerMeter: 380, stock: 95 },
      { code: 'LNN-01', name: 'كتان بلجيكي', pricePerMeter: 320, stock: 110 },
      { code: 'TUL-01', name: 'تول ناعم', pricePerMeter: 120, stock: 350 },
      { code: 'BLK-01', name: 'بلاك آوت', pricePerMeter: 280, stock: 160 },
    ]
  },
];

const demoSales = [
  { id: 'FS-001', date: '2026-08-25', branch: 'الفرع الرئيسي — القاهرة', customer: 'بيع سريع', items: [{ name: 'ستان سواريه', meters: 5.5, price: 450 }], total: 2475 },
  { id: 'FS-002', date: '2026-08-25', branch: 'فرع ثانٍ — القاهرة', customer: 'أستاذة هدى', items: [{ name: 'حرير طبيعي', meters: 3, price: 900 }], total: 2700 },
  { id: 'FS-003', date: '2026-08-24', branch: 'الفرع الرئيسي — القاهرة', customer: 'بيع سريع', items: [{ name: 'كريب مزدوج', meters: 8, price: 300 }], total: 2400 },
];

interface CartItem {
  code: string;
  name: string;
  pricePerMeter: number;
  meters: number;
}

export default function FabricSalesPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('سواريه');
  const [customerName, setCustomerName] = useState('');
  const [branch, setBranch] = useState('الفرع الرئيسي — القاهرة');
  const [sales, setSales] = useState(demoSales);
  const [view, setView] = useState<'pos' | 'history'>('pos');
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<any>(null);

  const addToCart = (item: typeof fabricCategories[0]['items'][0]) => {
    setCart(prev => {
      const existing = prev.find(c => c.code === item.code);
      if (existing) {
        return prev.map(c => c.code === item.code ? { ...c, meters: c.meters + 0.5 } : c);
      }
      return [...prev, { code: item.code, name: item.name, pricePerMeter: item.pricePerMeter, meters: 0.5 }];
    });
  };

  const updateMeters = (code: string, meters: number) => {
    if (meters <= 0) {
      setCart(prev => prev.filter(c => c.code !== code));
    } else {
      setCart(prev => prev.map(c => c.code === code ? { ...c, meters } : c));
    }
  };

  const total = cart.reduce((sum, c) => sum + c.pricePerMeter * c.meters, 0);

  const handleSell = () => {
    if (cart.length === 0) return;
    const newSale = {
      id: `FS-${String(sales.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      branch,
      customer: customerName || 'بيع سريع',
      items: cart.map(c => ({ name: c.name, meters: c.meters, price: c.pricePerMeter })),
      total,
    };
    setSales(prev => [newSale, ...prev]);
    setCart([]);
    setCustomerName('');
    setSelectedSaleForPrint(newSale);
  };

  const currentItems = fabricCategories.find(c => c.category === activeCategory)?.items || [];

  return (
    <PageShell title="بيع القماش">
      <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-primary">بيع القماش</h1>
              <p className="text-on-surface-variant text-xs sm:text-sm mt-1">بيع سريع بالمتر مع تتبع المخزون وحساب الأرباح.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => setView('pos')} className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-mono border transition-colors ${view === 'pos' ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant'}`}>نقطة البيع</button>
              <button onClick={() => setView('history')} className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-mono border transition-colors ${view === 'history' ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant'}`}>سجل المبيعات</button>
            </div>
          </div>

          {view === 'pos' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* POS Left — fabric categories */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {/* Customer & Branch */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-on-surface-variant">اسم العميل (اختياري)</label>
                    <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="اتركه فارغاً للبيع السريع" className="border border-outline-variant rounded p-2.5 text-sm focus:outline-none focus:border-primary" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-on-surface-variant">الفرع</label>
                    <select value={branch} onChange={e => setBranch(e.target.value)} className="border border-outline-variant rounded p-2.5 text-sm focus:outline-none focus:border-primary">
                      <option>الفرع الرئيسي — القاهرة</option>
                      <option>فرع الأقمشة الثاني — القاهرة</option>
                      <option>فرع السوارية الثالث — القاهرة</option>
                    </select>
                  </div>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2">
                  {fabricCategories.map(cat => (
                    <button key={cat.category} onClick={() => setActiveCategory(cat.category)} className={`px-5 py-2 rounded-full text-sm font-mono border transition-colors ${activeCategory === cat.category ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary'}`}>
                      {cat.category}
                    </button>
                  ))}
                </div>

                {/* Fabric Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {currentItems.map(item => {
                    const inCart = cart.find(c => c.code === item.code);
                    return (
                      <button
                        key={item.code}
                        onClick={() => addToCart(item)}
                        className={`p-4 rounded-xl border text-right transition-all hover:shadow-md ${inCart ? 'border-primary bg-primary-container/20' : 'border-surface-container-highest bg-surface-container-lowest hover:border-outline-variant'}`}
                      >
                        <div className="text-xs font-mono text-on-surface-variant mb-1">{item.code}</div>
                        <div className="font-bold text-sm text-primary mb-2">{item.name}</div>
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-base text-primary">{item.pricePerMeter} ج</span>
                          <span className="text-xs text-on-surface-variant">{item.stock} م</span>
                        </div>
                        {inCart && (
                          <div className="mt-2 text-xs text-secondary font-bold">{inCart.meters} متر محدد</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cart */}
              <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-4 sm:p-5 flex flex-col gap-4 lg:sticky lg:top-20">
                <h2 className="font-bold text-lg text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">shopping_cart</span>
                  الفاتورة
                </h2>

                {cart.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-variant text-sm">
                    اختر أصناف من القائمة على اليمين
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {cart.map(item => (
                      <div key={item.code} className="border border-surface-container-high rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-bold text-sm text-primary">{item.name}</div>
                          <button onClick={() => updateMeters(item.code, 0)} className="text-error text-xs hover:underline">حذف</button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateMeters(item.code, Math.max(0, item.meters - 0.5))} className="w-8 h-8 border border-outline-variant rounded flex items-center justify-center hover:bg-surface-container transition-colors text-lg font-bold">−</button>
                          <input
                            type="number"
                            value={item.meters}
                            onChange={e => updateMeters(item.code, parseFloat(e.target.value) || 0)}
                            className="w-16 text-center border border-outline-variant rounded p-1.5 text-sm font-mono focus:outline-none focus:border-primary"
                            step="0.5"
                            min="0.5"
                          />
                          <button onClick={() => updateMeters(item.code, item.meters + 0.5)} className="w-8 h-8 border border-outline-variant rounded flex items-center justify-center hover:bg-surface-container transition-colors text-lg font-bold">+</button>
                          <span className="text-xs text-on-surface-variant">متر</span>
                          <span className="font-mono font-bold text-primary mr-auto">{(item.pricePerMeter * item.meters).toLocaleString()} ج</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-surface-container-high pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-mono text-on-surface-variant text-sm">الإجمالي</span>
                    <span className="font-display font-bold text-2xl text-primary">{total.toLocaleString()} ج.م</span>
                  </div>
                  <button
                    onClick={handleSell}
                    disabled={cart.length === 0}
                    className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold text-sm hover:bg-inverse-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✅ تأكيد البيع وإصدار الفاتورة
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full text-right min-w-[600px]">
                <thead className="bg-surface-container-low text-xs font-mono text-on-surface-variant">
                  <tr>
                    <th className="p-4">رقم الفاتورة</th>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4">الفرع</th>
                    <th className="p-4">العميل</th>
                    <th className="p-4">الأصناف</th>
                    <th className="p-4 text-left">الإجمالي</th>
                    <th className="p-4 text-center">طباعة PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id} className="border-t border-surface-container-low hover:bg-surface-container-low transition-colors">
                      <td className="p-4 font-mono text-xs text-on-surface-variant">{s.id}</td>
                      <td className="p-4 text-sm text-on-surface-variant font-mono">{s.date}</td>
                      <td className="p-4 text-sm text-on-surface-variant">{s.branch}</td>
                      <td className="p-4 font-bold text-sm text-primary">{s.customer}</td>
                      <td className="p-4 text-xs text-on-surface-variant">
                        {s.items.map(i => `${i.name} (${i.meters}م)`).join(', ')}
                      </td>
                      <td className="p-4 text-left font-mono font-bold text-primary">{s.total.toLocaleString()} ج</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedSaleForPrint(s)}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-lg shadow-2xs"
                        >
                          🖨️ طباعة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
      </div>

      {/* Printable Receipt Modal */}
      {selectedSaleForPrint && (
        <div className="modal-overlay fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <style>{`
            @media print {
              html, body {
                background: white !important;
                color: black !important;
                overflow: visible !important;
              }
              .modal-overlay {
                position: static !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                display: block !important;
              }
              #printable-sales-receipt {
                position: static !important;
                display: block !important;
                visibility: visible !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 10px !important;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>
          <div id="printable-sales-receipt" className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-900 border border-slate-200">
            <div className="text-center pb-3 border-b-2 border-slate-900">
              <h2 className="font-black text-lg">مؤسسة أحمد كشك للأقمشة والستائر</h2>
              <p className="text-xs text-amber-800 font-bold">إيصال بيع أقمشة (POS)</p>
              <div className="text-[11px] text-slate-500 font-mono mt-1 flex justify-between">
                <span>رقم الفاتورة: {selectedSaleForPrint.id}</span>
                <span>التاريخ: {selectedSaleForPrint.date}</span>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <div><strong>العميل:</strong> {selectedSaleForPrint.customer}</div>
              <div><strong>الفرع:</strong> {selectedSaleForPrint.branch}</div>
            </div>

            <table className="w-full text-right text-xs border-collapse border border-slate-300">
              <thead className="bg-slate-100 font-bold">
                <tr>
                  <th className="p-2 border border-slate-300">الصنف</th>
                  <th className="p-2 border border-slate-300 text-center font-mono">الأمتار</th>
                  <th className="p-2 border border-slate-300 text-left font-mono">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {selectedSaleForPrint.items.map((it: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-300 font-bold">{it.name}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono">{it.meters}م</td>
                    <td className="p-2 border border-slate-300 text-left font-mono font-bold">{(it.meters * it.price).toLocaleString()} ج</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between items-center text-xs font-mono">
              <span>إجمالي الفاتورة:</span>
              <strong className="text-base text-amber-400 font-black">{selectedSaleForPrint.total.toLocaleString()} ج.م</strong>
            </div>

            <div className="flex gap-2 pt-2 no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-slate-900 text-white font-bold py-2 rounded-xl text-xs"
              >
                🖨️ طباعة الإيصال (PDF)
              </button>
              <button
                onClick={() => setSelectedSaleForPrint(null)}
                className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
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

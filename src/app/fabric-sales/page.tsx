'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

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
  { id: 'FS-001', date: '2026-08-25', branch: 'بنها الرئيسي', customer: 'بيع سريع', items: [{ name: 'ستان سواريه', meters: 5.5, price: 450 }], total: 2475 },
  { id: 'FS-002', date: '2026-08-25', branch: 'فرع ثاني', customer: 'أستاذة هدى', items: [{ name: 'حرير طبيعي', meters: 3, price: 900 }], total: 2700 },
  { id: 'FS-003', date: '2026-08-24', branch: 'بنها الرئيسي', customer: 'بيع سريع', items: [{ name: 'كريب مزدوج', meters: 8, price: 300 }], total: 2400 },
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
  const [branch, setBranch] = useState('بنها الرئيسي');
  const [sales, setSales] = useState(demoSales);
  const [view, setView] = useState<'pos' | 'history'>('pos');

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
    alert(`✅ تم البيع بنجاح!\nالإجمالي: ${total.toLocaleString()} ج.م`);
  };

  const currentItems = fabricCategories.find(c => c.category === activeCategory)?.items || [];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header title="بيع القماش" />
      <div className="pr-72 pt-16">
        <main className="px-8 py-8 flex flex-col gap-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="font-display font-bold text-2xl text-primary">بيع القماش</h1>
              <p className="text-on-surface-variant text-sm mt-1">بيع سريع بالمتر مع تتبع المخزون وحساب الأرباح.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView('pos')} className={`px-4 py-2 rounded text-sm font-mono border transition-colors ${view === 'pos' ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant'}`}>نقطة البيع</button>
              <button onClick={() => setView('history')} className={`px-4 py-2 rounded text-sm font-mono border transition-colors ${view === 'history' ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant'}`}>سجل المبيعات</button>
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
                      <option>بنها الرئيسي</option>
                      <option>فرع ثاني</option>
                      <option>فرع ثالث</option>
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
              <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest p-5 flex flex-col gap-4 h-fit sticky top-20">
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
              <table className="w-full text-right">
                <thead className="bg-surface-container-low text-xs font-mono text-on-surface-variant">
                  <tr>
                    <th className="p-4">رقم الفاتورة</th>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4">الفرع</th>
                    <th className="p-4">العميل</th>
                    <th className="p-4">الأصناف</th>
                    <th className="p-4 text-left">الإجمالي</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

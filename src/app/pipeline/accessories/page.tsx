'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { fetchPipelineOrders, updatePipelineOrderStatus } from '@/lib/pipelineStore';

interface AccessoryItemSpec {
  name: string;
  detail: string;
  qty: number;
  prepared: boolean;
}

interface AccessoryKit {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  branch?: string;
  items: AccessoryItemSpec[];
  status: 'جاري التجهيز' | 'تم التجهيز' | 'في التركيبات' | 'في التسليمات';
}

export default function PipelineAccessoriesPage() {
  const [kits, setKits] = useState<AccessoryKit[]>([]);
  const [activeTab, setActiveTab] = useState<'PREPARING' | 'PREPARED' | 'HISTORY'>('PREPARING');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Custom Item Modal State
  const [targetKitId, setTargetKitId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDetail, setNewItemDetail] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');

  // Printable Kit Modal State
  const [printTargetKit, setPrintTargetKit] = useState<AccessoryKit | null>(null);

  useEffect(() => {
    async function load() {
      const stored = await fetchPipelineOrders();
      if (!stored || stored.length === 0) {
        setKits([]);
        return;
      }
      const mapped = stored.map(o => {
        const defaultItems: AccessoryItemSpec[] = [];
        (o.rooms || []).forEach(r => {
          defaultItems.push({ name: `تراك / مجرى ${r.roomName || 'الغرفة'}`, detail: `تراك ألومنيوم سقف (${r.widthCm || 350} سم)`, qty: 2, prepared: false });
          defaultItems.push({ name: `حامل مجوز ${r.roomName || 'الغرفة'}`, detail: 'أوكسيديه مذهب فاخر', qty: 4, prepared: false });
          defaultItems.push({ name: `قم جانبي / كاب ${r.roomName || 'الغرفة'}`, detail: 'أوكسيديه شيك', qty: 2, prepared: false });
        });

        return {
          id: o.id,
          orderId: o.orderId || o.id,
          customerName: o.customerName,
          phone: o.phone,
          address: o.address,
          branch: o.branch || 'الفرع الرئيسي',
          status: (o.status === 'تجهيز الاكسسوارات' || o.status === 'جاري التجهيز' ? 'جاري التجهيز' : 'تم التجهيز') as any,
          items: defaultItems.length > 0 ? defaultItems : [
            { name: 'تراك ألومنيوم سقف', detail: 'مجرى ألومنيوم سادة (مقاس 3.50م)', qty: 2, prepared: false },
            { name: 'حامل مجوز فورجيه', detail: 'أوكسيديه مذهب', qty: 4, prepared: false },
            { name: 'قم جانبي / كاب', detail: 'أوكسيديه شيك', qty: 2, prepared: false },
          ],
        };
      });
      setKits(mapped);
    }
    load();
  }, []);

  const tabFiltered = kits.filter(k => {
    if (activeTab === 'PREPARING') {
      return k.status === 'جاري التجهيز';
    } else if (activeTab === 'PREPARED') {
      return k.status === 'تم التجهيز';
    } else {
      return k.status === 'في التركيبات' || k.status === 'في التسليمات';
    }
  });

  const filtered = tabFiltered.filter(k => {
    const matchesSearch = k.customerName.includes(searchQuery) || k.id.includes(searchQuery) || k.orderId.includes(searchQuery);
    const matchesBranch = selectedBranch === 'ALL' || (k as any).branch === selectedBranch;
    return matchesSearch && matchesBranch;
  });

  const toggleItem = (kitId: string, idx: number) => {
    setKits(prev => prev.map(k => {
      if (k.id !== kitId) return k;
      const updated = [...k.items];
      updated[idx].prepared = !updated[idx].prepared;
      return { ...k, items: updated };
    }));
  };

  const updateKitStatus = (kitId: string, status: AccessoryKit['status']) => {
    setKits(prev => prev.map(k => k.id === kitId ? { ...k, status } : k));
    const nextMaster = status === 'تم التجهيز' ? 'جاهز للاستلام' : 'تجهيز الاكسسوارات';
    updatePipelineOrderStatus(kitId, nextMaster, status);
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetKitId || !newItemName.trim()) return;

    setKits(prev => prev.map(k => {
      if (k.id !== targetKitId) return k;
      const updated = [
        ...k.items,
        {
          name: newItemName.trim(),
          detail: newItemDetail.trim() || 'إكسسوار إضافي',
          qty: newItemQty || 1,
          prepared: false,
        }
      ];
      return { ...k, items: updated };
    }));

    setTargetKitId(null);
    setNewItemName('');
    setNewItemDetail('');
    setNewItemQty(1);
  };

  const preparingCount = kits.filter(k => k.status === 'جاري التجهيز').length;
  const preparedCount = kits.filter(k => k.status === 'تم التجهيز').length;
  const historyCount = kits.filter(k => k.status === 'في التركيبات' || k.status === 'في التسليمات').length;

  return (
    <PageShell title="5. الإكسسوارات" badge="5">
      <div className="flex flex-col gap-5">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2">
          <button
            onClick={() => setActiveTab('PREPARING')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'PREPARING' ? 'border-brand-gold text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>🛠️ جاري التجهيز</span>
            <span className="bg-amber-100 text-amber-950 px-2 rounded-full text-[11px] font-mono font-bold">{preparingCount}</span>
          </button>

          <button
            onClick={() => setActiveTab('PREPARED')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'PREPARED' ? 'border-brand-gold text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>✓ تم التجهيز</span>
            <span className="bg-emerald-100 text-emerald-950 px-2 rounded-full text-[11px] font-mono font-bold">{preparedCount}</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-3 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'HISTORY' ? 'border-brand-gold text-slate-950' : 'border-transparent text-slate-400'
            }`}
          >
            <span>📜 السجل</span>
            <span className="bg-slate-100 text-slate-600 px-2 rounded-full text-[11px] font-mono font-bold">{historyCount}</span>
          </button>
        </div>

        {/* Search & Branch Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="relative sm:col-span-8">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم العميل، رقم الهاتف أو كود الطلب..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-brand-gold shadow-2xs"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-brand-gold shadow-2xs cursor-pointer"
            >
              <option value="ALL">عوامل تصفية: جميع الفروع</option>
              <option value="الفرع الرئيسي">الفرع الرئيسي</option>
              <option value="فرع عرابي">فرع عرابي</option>
            </select>
          </div>
        </div>

        {/* Content Views */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'PREPARING' ? 'لا توجد أطقم إكسسوارات قيد التجهيز حالياً' : activeTab === 'PREPARED' ? 'لا توجد أطقم بانتظار التسليم' : 'السجل فارغ'}
            </h3>
          </div>
        ) : activeTab === 'HISTORY' ? (
          /* TAB 3: History Table View */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">العميل والهاتف</th>
                    <th className="p-3.5">العنوان والفرع</th>
                    <th className="p-3.5 text-center">الأصناف التابعة</th>
                    <th className="p-3.5 text-center">ورقة الإكسسوارات</th>
                    <th className="p-3.5 text-center">واتساب</th>
                    <th className="p-3.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(kit => (
                    <tr key={kit.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="p-3.5 font-bold text-slate-900">{kit.customerName} ({kit.phone})</td>
                      <td className="p-3.5 text-slate-700">{kit.address} ({kit.branch || 'الفرع الرئيسي'})</td>
                      <td className="p-3.5 text-center font-mono">
                        <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                          {kit.items.length} قطعة جهزت
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setPrintTargetKit(kit)}
                          className="bg-slate-900 text-white px-2.5 py-1 rounded-lg text-xs font-bold"
                        >
                          🖨️ طباعة PDF
                        </button>
                      </td>
                      <td className="p-3.5 text-center">
                        <a
                          href={`https://wa.me/2${kit.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-200"
                        >
                          💬 واتساب
                        </a>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                          مكتمل ومحول
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 1 & TAB 2: Active Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(kit => (
              <div key={kit.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-base text-slate-900">{kit.customerName}</h3>
                      <p className="text-xs text-slate-500">{kit.address} ({kit.branch || 'الفرع الرئيسي'})</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                        kit.status === 'جاري التجهيز' ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                      }`}>
                        {kit.status}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPrintTargetKit(kit)}
                          className="text-[11px] bg-brand-gold hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-gold cursor-pointer"
                        >
                          <span>🖨️ طباعة ورقة الإكسسوار (PDF)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTargetKitId(kit.id)}
                          className="text-[11px] bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          <span>+ إضافة إكسسوار</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs my-3">
                    <span className="text-[11px] font-bold text-slate-600 block">الإكسسوارات والمجاري والمواسير المطلوبة:</span>
                    {(kit.items || []).map((item, i) => (
                      <label key={i} className="flex items-center justify-between gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100/70 transition-colors">
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={item.prepared} onChange={() => toggleItem(kit.id, i)} className="w-4 h-4 rounded accent-slate-900 cursor-pointer" />
                          <span className={item.prepared ? 'line-through text-slate-400 font-bold' : 'font-bold text-slate-900'}>
                            {item.name} — <span className="font-normal text-slate-600">{item.detail}</span>
                          </span>
                        </div>
                        <span className="font-mono font-black text-amber-800 text-xs shrink-0">{item.qty} قطعة</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <a
                    href={`https://wa.me/2${kit.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    💬 إرسال تحديث للعميل (واتساب)
                  </a>

                  {activeTab === 'PREPARING' && (
                    <button
                      onClick={() => updateKitStatus(kit.id, 'تم التجهيز')}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
                    >
                      تأكيد تجهيز طقم الإكسسوار بالكامل ✓
                    </button>
                  )}

                  {activeTab === 'PREPARED' && (
                    <button
                      onClick={() => updateKitStatus(kit.id, 'في التسليمات')}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
                    >
                      تحويل للتسليمات / التركيبات ←
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ➕ Modal: Add Custom Extra Accessory Item */}
      {targetKitId && (
        <div className="modal-overlay fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">إضافة إكسسوار / تراك إضافي للطلب</h3>
              <button onClick={() => setTargetKitId(null)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">✕</button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1">اسم الإكسسوار / المجرى:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: حامل مفرد إضافي، قم جانبي، حلقة دبل..."
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">التفاصيل والوصف:</label>
                <input
                  type="text"
                  placeholder="مثال: أوكسيديه مذهب، مقاس 2.50م..."
                  value={newItemDetail}
                  onChange={e => setNewItemDetail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">الكمية المطلوب تجهيزها:</label>
                <input
                  type="number"
                  min="1"
                  value={newItemQty}
                  onChange={e => setNewItemQty(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button type="submit" className="flex-1 bg-brand-gold hover:bg-amber-400 text-slate-950 py-2.5 rounded-xl font-black text-xs shadow-gold cursor-pointer">
                  حفظ وتأكيد الإضافة ✓
                </button>
                <button type="button" onClick={() => setTargetKitId(null)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🖨️ Printable Accessories Worksheet Modal */}
      {printTargetKit && (
        <div className="modal-overlay fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-accessory-worksheet, #printable-accessory-worksheet * { visibility: visible !important; }
              #printable-accessory-worksheet { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 15px !important; background: #ffffff !important; color: #000000 !important; }
              .no-print { display: none !important; }
            }
          `}</style>
          <div id="printable-accessory-worksheet" className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 text-slate-900 border border-slate-200 my-auto shadow-2xl">
            {/* Modal Control Bar */}
            <div className="no-print flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">معاينة وطباعة ورقة الإكسسوارات والمواسير</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-4 py-1.5 rounded-xl text-xs font-black shadow-gold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  طباعة ورقة الإكسسوارات (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintTargetKit(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إغلاق ✕
                </button>
              </div>
            </div>

            {/* Document Header */}
            <div className="flex justify-between items-center pb-4 border-b-2 border-slate-900">
              <div>
                <h2 className="font-display font-black text-xl text-slate-950">مؤسسة أحمد كشك للأقمشة والستائر</h2>
                <p className="text-xs font-bold text-amber-800">أمر ورقة الإكسسوارات والتراكات والمواسير (أمين المخزن)</p>
              </div>
              <div className="text-left font-mono text-xs">
                <div><strong>كود الطلب:</strong> {printTargetKit.orderId || printTargetKit.id}</div>
                <div><strong>الحالة:</strong> {printTargetKit.status}</div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 grid grid-cols-2 gap-3 text-xs">
              <div><strong>اسم العميل:</strong> {printTargetKit.customerName}</div>
              <div><strong>رقم الهاتف:</strong> {printTargetKit.phone}</div>
              <div><strong>العنوان:</strong> {printTargetKit.address}</div>
              <div><strong>الفرع:</strong> {printTargetKit.branch || 'الفرع الرئيسي'}</div>
            </div>

            {/* Items Specs Table */}
            <div className="space-y-3">
              <h3 className="font-black text-sm text-slate-950 border-b border-slate-300 pb-1">
                🛠️ أطقم التراكات والمواسير والحوامل المطلوب صرفها وتجهيزها:
              </h3>
              <table className="w-full text-right text-xs border-collapse border border-slate-300">
                <thead className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border border-slate-300 text-center w-10">#</th>
                    <th className="p-2 border border-slate-300">اسم الإكسسوار / التراك / الماسورة</th>
                    <th className="p-2 border border-slate-300">التفاصيل والتشطيب</th>
                    <th className="p-2 border border-slate-300 text-center font-mono w-24">الكمية</th>
                    <th className="p-2 border border-slate-300 text-center w-24">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {(printTargetKit.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 text-center font-bold">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 font-bold">{item.name}</td>
                      <td className="p-2 border border-slate-300 text-slate-700">{item.detail}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-black text-amber-950">{item.qty} قطعة</td>
                      <td className="p-2 border border-slate-300 text-center font-bold text-xs">
                        {item.prepared ? '✓ جهزت' : 'قيد التجهيز'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

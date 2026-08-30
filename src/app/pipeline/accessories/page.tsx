'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { fetchPipelineOrders, updatePipelineOrderStatus, PipelineMasterOrder } from '@/lib/pipelineStore';
import { fetchQuotations } from '@/lib/inspectionsStore';
import AccessoriesPrintModal from '@/components/AccessoriesPrintModal';

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
      const [storedPipeline, quotations] = await Promise.all([
        fetchPipelineOrders(),
        fetchQuotations(),
      ]);

      const pipelineList = storedPipeline || [];
      const mappedQuotations: PipelineMasterOrder[] = (quotations || [])
        .filter(q => (q.status === 'تجهيز الاكسسوارات' || (q.status as string).includes('اكسسوار')) && !pipelineList.some(p => p.orderId === q.id || p.id === q.id || p.id === `ORD-${q.id}` || p.orderId === q.id.replace(/^ORD-/, '') || (p.customerName && q.customerName && p.customerName.trim().toLowerCase() === q.customerName.trim().toLowerCase())))
        .map((q: any) => ({
          id: `ORD-${q.id}`,
          orderId: q.id,
          customerName: q.customerName || 'عميل',
          phone: q.phone || '',
          address: q.address || '',
          branch: q.branch || 'الفرع الرئيسي',
          deliveryDate: q.deliveryDate || '',
          status: 'تجهيز الاكسسوارات',
          localStatus: 'جاري تجهيز الإكسسوارات',
          rooms: q.rooms || [],
          createdAt: q.date || new Date().toISOString().split('T')[0],
        }));

      const combined = [...pipelineList, ...mappedQuotations];

      const relevant = combined.filter(o => {
        const s = (o.status || '').trim();
        const ls = (o.localStatus || '').trim();
        return (
          s === 'تجهيز الاكسسوارات' ||
          s.includes('اكسسوار') ||
          s === 'جاهز للاستلام' ||
          s === 'جاهز للتركيب' ||
          s === 'في التسليمات' ||
          s === 'في التركيبات' ||
          s === 'مكتمل' ||
          ls.includes('اكسسوار') ||
          ls.includes('تجهيز')
        );
      });

      const mapped = relevant.map(o => {
        const defaultItems: AccessoryItemSpec[] = [];
        (o.rooms || []).forEach((r: any, idx: number) => {
          const roomTitle = r.roomName || r.name || `غرفة ${idx + 1}`;
          const width = r.widthCm || 300;
          const installType = r.installationType || r.installationCategory || 'مجرى / تراك سقف';
          
          defaultItems.push({
            name: `${installType} — ${roomTitle}`,
            detail: `العرض: ${width} سم ${r.pipeColor ? `| اللون: ${r.pipeColor}` : ''}`,
            qty: r.trackMeters || Math.ceil(width / 100) || 2,
            prepared: false,
          });

          if (r.pipeAccessories) {
            if (Number(r.pipeAccessories.sideCaps) > 0) {
              defaultItems.push({ name: `طبات / كاب جانبي — ${roomTitle}`, detail: `لون: ${r.pipeColor || 'فضي'}`, qty: Number(r.pipeAccessories.sideCaps), prepared: false });
            }
            if (Number(r.pipeAccessories.doubleBrackets) > 0) {
              defaultItems.push({ name: `حوامل مجوز — ${roomTitle}`, detail: `تثبيت مواسير/تراك`, qty: Number(r.pipeAccessories.doubleBrackets), prepared: false });
            }
            if (Number(r.pipeAccessories.singleBrackets) > 0) {
              defaultItems.push({ name: `حوامل مفرد — ${roomTitle}`, detail: `تثبيت مواسير/تراك`, qty: Number(r.pipeAccessories.singleBrackets), prepared: false });
            }
            if (Number(r.pipeAccessories.doubleRings) > 0) {
              defaultItems.push({ name: `حلقات ستائر — ${roomTitle}`, detail: `حلقات فورجيه مذهبة`, qty: Number(r.pipeAccessories.doubleRings), prepared: false });
            }
            if (Number(r.pipeAccessories.decorHangers) > 0) {
              defaultItems.push({ name: `أهِلّة / هوكات ديكور — ${roomTitle}`, detail: `لربط الأجناب`, qty: Number(r.pipeAccessories.decorHangers), prepared: false });
            }
          }
        });

        const s = (o.status || '').trim();
        const ls = (o.localStatus || '').trim();
        const isReady = ls.includes('تم تجهيز') || ls === 'تم التجهيز' || s === 'جاهز للاستلام' || s === 'جاهز للتركيب';
        const isPrep = (s === 'تجهيز الاكسسوارات' || s.includes('اكسسوار')) && !isReady && s !== 'جاهز للاستلام' && s !== 'جاهز للتركيب' && s !== 'مكتمل';

        return {
          id: o.id,
          orderId: o.orderId || o.id,
          customerName: o.customerName || 'عميل',
          phone: o.phone || '',
          address: o.address || '',
          branch: o.branch || 'الفرع الرئيسي',
          status: (isPrep ? 'جاري التجهيز' : isReady ? 'تم التجهيز' : 'في التركيبات') as any,
          items: defaultItems.length > 0 ? defaultItems : [
            { name: 'تراك ألومنيوم سقف', detail: 'مجرى ألومنيوم سادة', qty: 2, prepared: false },
            { name: 'حامل مجوز فورجيه', detail: 'أوكسيديه مذهب', qty: 4, prepared: false },
            { name: 'قم جانبي / كاب', detail: 'أوكسيديه شيك', qty: 2, prepared: false },
          ],
        };
      });
      console.log('🔄 [Accessories Pipeline Polling] Loaded data:', {
        pipelineOrdersCount: (storedPipeline || []).length,
        quotationsCount: (quotations || []).length,
        relevantOrdersCount: relevant.length,
        kits: mapped.map(m => ({ id: m.id, customer: m.customerName, status: m.status }))
      });

      setKits(mapped);
    }
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
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
    const name = k.customerName || '';
    const id = k.id || '';
    const orderId = k.orderId || '';
    const phone = k.phone || '';

    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery);

    const matchesBranch =
      selectedBranch === 'ALL' ||
      (k.branch && k.branch.includes(selectedBranch)) ||
      (!k.branch && selectedBranch === 'الفرع الرئيسي');

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

  const updateKitStatus = async (kitId: string, status: AccessoryKit['status']) => {
    console.group('🛠️ [Accessories Pipeline Debug] updateKitStatus Triggered');
    console.log('📌 Kit ID:', kitId);
    console.log('📌 Target Status:', status);
    console.log('📌 Current Active Tab before click:', activeTab);

    setKits(prev => {
      const updated = prev.map(k => k.id === kitId ? { ...k, status } : k);
      console.log('📌 Optimistic Local Kits Updated:', updated);
      return updated;
    });

    if (status === 'تم التجهيز') {
      console.log('🔄 Switching Active Tab to: PREPARED');
      setActiveTab('PREPARED');
    }

    try {
      console.log('📡 Sending update to Pipeline Store & Server DB...');
      await updatePipelineOrderStatus(kitId, 'تجهيز الاكسسوارات', 'تم تجهيز الإكسسوارات');
      console.log('✅ Pipeline Store Update Finished Successfully!');
    } catch (err) {
      console.error('❌ Failed to update pipeline order in DB:', err);
    }
    console.groupEnd();
  };

  const updateKitTransfer = async (kitId: string, destination: 'DELIVERY' | 'INSTALLATION') => {
    console.group('🚀 [Accessories Pipeline Debug] updateKitTransfer Triggered');
    console.log('📌 Kit ID:', kitId);
    console.log('📌 Destination:', destination);

    setKits(prev => prev.map(k => k.id === kitId ? { ...k, status: destination === 'DELIVERY' ? 'في التسليمات' : 'في التركيبات' } : k));

    try {
      if (destination === 'DELIVERY') {
        console.log('📦 Transferring to Delivery (جاهز للاستلام)...');
        await updatePipelineOrderStatus(kitId, 'جاهز للاستلام', 'جاهز للتسليم بالمعرض');
      } else {
        console.log('🛠️ Transferring to Installation (جاهز للتركيب)...');
        await updatePipelineOrderStatus(kitId, 'جاهز للتركيب', 'مُجدول للتركيب');
      }
      console.log('✅ Transfer update finished successfully!');
    } catch (err) {
      console.error('❌ Failed transfer update in DB:', err);
    }
    console.groupEnd();
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => updateKitTransfer(kit.id, 'DELIVERY')}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                        <span>تحويل للتسليمات (بالمعرض) 📦</span>
                      </button>

                      <button
                        onClick={() => updateKitTransfer(kit.id, 'INSTALLATION')}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">build_circle</span>
                        <span>تحويل للتركيبات (بالمنزل) 🛠️</span>
                      </button>
                    </div>
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

      {/* 🖨️ Accessories Printable Modal */}
      <AccessoriesPrintModal
        isOpen={!!printTargetKit}
        onClose={() => setPrintTargetKit(null)}
        data={printTargetKit}
      />
    </PageShell>
  );
}

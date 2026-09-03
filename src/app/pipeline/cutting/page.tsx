'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { getStoredPipelineOrders, fetchPipelineOrders, updatePipelineOrderStatus, normalizeMasterStage } from '@/lib/pipelineStore';
import { fetchQuotations } from '@/lib/inspectionsStore';
import { formatDateOnly } from '@/lib/dateUtils';
import CuttingPrintModal from '@/components/CuttingPrintModal';
import OrderRowActions from '@/components/OrderRowActions';
import { useCurrentUser } from '@/lib/useCurrentUser';
import BranchSelect from '@/components/BranchSelect';

interface RoomFabricItem {
  roomName: string;
  heavyFabric?: { name: string; code: string; meters: number };
  sheerFabric?: { name: string; code: string; meters: number };
  blackoutFabric?: { name: string; code: string; meters: number };
}

interface CuttingOrder {
  id: string;
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  branch: string;
  cutterName: string;
  rooms: RoomFabricItem[];
  status: 'بانتظار القص' | 'تم القص وجاهز للخياطة' | 'في المقص' | 'في الورشة';
  createdAt: string;
}

export default function PipelineCuttingPage() {
  const [orders, setOrders] = useState<CuttingOrder[]>(() => getStoredPipelineOrders() as any);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'SENT'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const { user: currentUser, isAdmin } = useCurrentUser();
  useEffect(() => {
    if (!isAdmin && currentUser?.branch) setSelectedBranch(currentUser.branch);
  }, [isAdmin, currentUser]);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<CuttingOrder | null>(null);

  useEffect(() => {
    async function load() {
      const [storedPipeline, quotations] = await Promise.all([
        fetchPipelineOrders(),
        fetchQuotations(),
      ]);

      const pipelineList = storedPipeline || [];
      const mappedQuotations: CuttingOrder[] = (quotations || [])
        .filter(q => q.status === 'في المقص' && !pipelineList.some(p => p.orderId === q.id || p.id === q.id || p.id === `ORD-${q.id}` || (p.customerName && q.customerName && p.customerName.trim() === q.customerName.trim())))
        .map((q: any) => ({
          id: `ORD-${q.id}`,
          orderId: q.id,
          customerName: q.customerName,
          phone: q.phone,
          address: q.address,
          branch: q.branch || 'الفرع الرئيسي',
          cutterName: '',
          rooms: (q.rooms || []).map((r: any, idx: number) => ({
            roomName: r.name || `غرفة ${idx + 1}`,
            heavyFabric: (r.heavyEnabled !== false && (Number(r.heavyMeters) > 0 || r.heavyFabricName)) ? {
              name: r.heavyFabricName || 'قماش ثقيل',
              code: r.heavyFabricCode || 'HV-101',
              meters: Number(r.heavyMeters) || 0,
            } : undefined,
            sheerFabric: (r.sheerEnabled !== false && (Number(r.sheerMeters) > 0 || r.sheerFabricName)) ? {
              name: r.sheerFabricName || 'شيفون',
              code: r.sheerFabricCode || 'SH-101',
              meters: Number(r.sheerMeters) || 0,
            } : undefined,
            blackoutFabric: (r.blackoutEnabled && (Number(r.blackoutMeters) > 0 || r.blackoutFabricName)) ? {
              name: r.blackoutFabricName || 'بلاك آوت',
              code: r.blackoutFabricCode || 'BK-301',
              meters: Number(r.blackoutMeters) || 0,
            } : undefined,
          })),
          status: 'بانتظار القص',
          createdAt: q.date || new Date().toISOString().split('T')[0],
        }));

      const combined = [...pipelineList, ...mappedQuotations];
      setOrders(combined as any);
    }
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  // #FIX: كان الاعتماد على localStatus وحده (ls === 'بانتظار القص') يُسرّب أوردرات
  // رجعت لمرحلة سابقة (مثلاً أُعيدت للتسعير) لكن بقيت تحمل localStatus قديم من
  // مرحلة قص سابقة، فتظهر خطأً هنا رغم إن status الحقيقى بيقول حاجة تانية.
  // المرجع الوحيد المعتمد الآن هو المرحلة العامة المُطبَّعة (status)، مش localStatus.
  const isWaitingToCut = (o: any) => normalizeMasterStage(o?.status || '') === 'في المقص';

  const isSentFromCutting = (o: any) => {
    const stage = normalizeMasterStage(o?.status || '');
    return ['في الورشة', 'تجهيز الاكسسوارات', 'جاهز للاستلام', 'جاهز للتركيب', 'مكتمل'].includes(stage);
  };

  const tabFiltered = orders.filter(o => activeTab === 'OPEN' ? isWaitingToCut(o) : isSentFromCutting(o));
  const filtered = tabFiltered.filter(o => {
    const matchesSearch =
      (o.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.phone || '').includes(searchQuery) ||
      (o.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = selectedBranch === 'ALL' || (o.branch && o.branch.includes(selectedBranch)) || (!o.branch && selectedBranch === 'الفرع الرئيسي');
    return matchesSearch && matchesBranch;
  });

  const updateOrderStatus = async (id: string, newStatus: CuttingOrder['status']) => {
    // 1. Optimistic update in UI
    setOrders(prev => prev.map(o => {
      if (o.id === id || (o as any).orderId === id || o.id === `ORD-${id}` || (o as any).orderId === id.replace(/^ORD-/, '')) {
        return { ...o, status: newStatus, localStatus: 'جاري الخياطة' };
      }
      return o;
    }));

    // 2. Persist to server across pipeline & quotations
    await updatePipelineOrderStatus(id, 'في الورشة', 'جاري الخياطة');

    // 3. Reload latest orders
    const [storedPipeline, quotations] = await Promise.all([
      fetchPipelineOrders(),
      fetchQuotations(),
    ]);

    const pipelineList = storedPipeline || [];
    const mappedQuotations: CuttingOrder[] = (quotations || [])
      .filter(q => q.status === 'في المقص' && !pipelineList.some(p => p.orderId === q.id || p.id === q.id || p.id === `ORD-${q.id}` || (p.customerName && q.customerName && p.customerName.trim() === q.customerName.trim())))
      .map((q: any) => ({
        id: `ORD-${q.id}`,
        orderId: q.id,
        customerName: q.customerName,
        phone: q.phone,
        address: q.address,
        branch: q.branch || 'الفرع الرئيسي',
        cutterName: '',
        rooms: (q.rooms || []).map((r: any, idx: number) => ({
          roomName: r.name || `غرفة ${idx + 1}`,
          heavyFabric: (r.heavyEnabled !== false && (Number(r.heavyMeters) > 0 || r.heavyFabricName)) ? {
            name: r.heavyFabricName || 'قماش ثقيل',
            code: r.heavyFabricCode || 'HV-101',
            meters: Number(r.heavyMeters) || 0,
          } : undefined,
          sheerFabric: (r.sheerEnabled !== false && (Number(r.sheerMeters) > 0 || r.sheerFabricName)) ? {
            name: r.sheerFabricName || 'شيفون',
            code: r.sheerFabricCode || 'SH-101',
            meters: Number(r.sheerMeters) || 0,
          } : undefined,
          blackoutFabric: (r.blackoutEnabled && (Number(r.blackoutMeters) > 0 || r.blackoutFabricName)) ? {
            name: r.blackoutFabricName || 'بلاك آوت',
            code: r.blackoutFabricCode || 'BK-301',
            meters: Number(r.blackoutMeters) || 0,
          } : undefined,
        })),
        status: 'بانتظار القص',
        createdAt: q.date || new Date().toISOString().split('T')[0],
      }));

    const combined = [...pipelineList, ...mappedQuotations];
    setOrders(combined as any);
  };

  const openCount = orders.filter(o => isWaitingToCut(o)).length;
  const sentCount = orders.filter(o => isSentFromCutting(o)).length;

  // Calculate Fabric Summary for an Order
  const getFabricTotals = (rooms: any[]) => {
    const totals: Record<string, { name: string; code: string; meters: number }> = {};
    (rooms || []).forEach(r => {
      const heavy = r.heavyFabric || (r.heavyEnabled !== false && r.heavyFabricName && Number(r.heavyMeters) > 0 ? { name: r.heavyFabricName, code: r.heavyFabricCode || '', meters: Number(r.heavyMeters) } : null);
      const sheer = r.sheerFabric || (r.sheerEnabled !== false && r.sheerFabricName && Number(r.sheerMeters) > 0 ? { name: r.sheerFabricName, code: r.sheerFabricCode || '', meters: Number(r.sheerMeters) } : null);
      const blackout = r.blackoutFabric || (r.blackoutEnabled && r.blackoutFabricName && Number(r.blackoutMeters) > 0 ? { name: r.blackoutFabricName, code: r.blackoutFabricCode || '', meters: Number(r.blackoutMeters) } : null);

      [heavy, sheer, blackout].forEach(f => {
        if (f && Number(f.meters) > 0) {
          const key = f.name || 'قماش';
          if (!totals[key]) {
            totals[key] = { name: key, code: f.code || '', meters: 0 };
          }
          totals[key].meters += Number(f.meters) || 0;
        }
      });
    });
    return Object.values(totals);
  };

  return (
    <PageShell title="3. قص القماش" badge="3">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto pb-12">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2 pb-1">
          <button
            onClick={() => setActiveTab('OPEN')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'OPEN'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">content_cut</span>
            <span>أوامر القص الجارية</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
              activeTab === 'OPEN' ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-slate-100 text-slate-500'
            }`}>
              {openCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('SENT')}
            className={`pb-2.5 px-4 text-xs sm:text-sm font-black flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'SENT'
                ? 'border-brand-gold text-slate-950'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            <span>سجل المقصوص والمحول للورشة</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
              activeTab === 'SENT' ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' : 'bg-slate-100 text-slate-500'
            }`}>
              {sentCount}
            </span>
          </button>
        </div>

        {/* Search & Branch Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          <div className="relative sm:col-span-8">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم العميل، رقم الهاتف، أو اسم القماش..."
              className="w-full bg-white border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 font-bold text-slate-900 focus:outline-none focus:border-brand-gold shadow-2xs"
            />
          </div>

          <div className="sm:col-span-4">
            <BranchSelect
              value={selectedBranch}
              onChange={setSelectedBranch}
              isAdmin={isAdmin}
              allValue="ALL"
              allLabel="جميع الفروع"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:outline-none focus:border-brand-gold shadow-2xs cursor-pointer"
            />
          </div>
        </div>

        {/* Main Content Area */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">content_cut</span>
            <h3 className="font-bold text-slate-700 text-sm">
              {activeTab === 'OPEN' ? 'لا توجد أوامر قص جارية حالياً' : 'سجل المقصوص فارغ'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">تظهر هنا أوامر الستائر المعتمدة التي تتطلب قص الأقمشة في الفرع أو الورشة</p>
          </div>
        ) : activeTab === 'SENT' ? (
          /* TAB 2: Table Format (سجل المقصوص) - Clean, spacious & no broken badges */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pr-4">العميل</th>
                    <th className="p-3.5">الفرع والعنوان</th>
                    <th className="p-3.5">الأقمشة والأمتار المقصوصة</th>
                    <th className="p-3.5 text-center font-mono">إجمالي الأمتار</th>
                    <th className="p-3.5 text-center">الحالة</th>
                    <th className="p-3.5 text-center w-[160px]">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(order => {
                    const totals = getFabricTotals(order.rooms);
                    const totalMeters = totals.reduce((sum, t) => sum + (t.meters || 0), 0);

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Customer */}
                        <td className="p-3.5 pr-4">
                          <div className="font-black text-slate-900 text-sm">{order.customerName}</div>
                          <div className="text-[11px] text-slate-400 font-mono" dir="ltr">{order.phone}</div>
                        </td>

                        {/* Branch & Address */}
                        <td className="p-3.5 text-slate-700">
                          <div className="font-bold text-slate-800">{order.branch || 'الفرع الرئيسي'}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{order.address || '—'}</div>
                        </td>

                        {/* Fabrics Breakdown Badges */}
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5 max-w-[400px]">
                            {totals.map((t, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 bg-slate-50 hover:bg-amber-50 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-lg text-[11px] font-bold"
                              >
                                <span>{t.name}:</span>
                                <strong className="text-amber-800 font-mono">{t.meters}م</strong>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Total Meters */}
                        <td className="p-3.5 text-center font-mono font-black text-sm text-slate-900">
                          {totalMeters.toFixed(1)} م
                        </td>

                        {/* Status Badge */}
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 whitespace-nowrap shadow-3xs">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            <span>تم القص والتحويل للورشة</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForPrint(order)}
                              className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                              title="طباعة ورقة القص للبياع"
                            >
                              <span className="material-symbols-outlined text-[15px]">print</span>
                              <span>ورقة القص</span>
                            </button>

                            <a
                              href={`https://wa.me/2${order.phone}?text=${encodeURIComponent(`مرحباً ${order.customerName}، تم قص أقمشة أوردر الستائر الخاص بكم بنجاح بمؤسسة أحمد كشك وجاري تحويله للورشة للخياطة. شكراً لثقتكم بنا!`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 p-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center"
                              title="إرسال إشعار للعميل عبر واتساب"
                            >
                              <span className="material-symbols-outlined text-[16px]">chat</span>
                            </a>
                            <OrderRowActions
                              pageId="p_cutting"
                              orderId={(order as any).orderId || order.id}
                              customerName={order.customerName}
                              editHref={`/orders/${encodeURIComponent((order as any).orderId || order.id)}`}
                              onDeleted={() => setOrders(prev => prev.filter((o: any) => o.id !== order.id && o.orderId !== (order as any).orderId))}
                              compact
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 1: Active Cards (أوامر القص الجارية) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(order => {
              const totals = getFabricTotals(order.rooms);
              const totalMeters = totals.reduce((sum, t) => sum + (t.meters || 0), 0);

              return (
                <div key={order.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-amber-400 transition-all">
                  <div>
                    {/* Customer Header */}
                    <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-base text-slate-950">{order.customerName}</h3>
                          <span className="bg-amber-100 text-amber-950 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-300">
                            {order.branch || 'الفرع الرئيسي'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{order.phone} — {order.address || 'غير مسجل'}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedOrderForPrint(order)}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">print</span>
                        <span>ورقة القص (للبياع)</span>
                      </button>
                    </div>

                    {/* Breakdown Per Room */}
                    <div className="my-3 space-y-2.5">
                      <span className="text-[11px] font-black text-slate-700 block">✂️ تفاصيل الأقمشة والأمتار المطلوبة لكل غرفة:</span>
                      {(order.rooms || []).map((room: any, rIdx: number) => {
                        const heavy = room.heavyFabric || (room.heavyEnabled !== false && room.heavyFabricName && Number(room.heavyMeters) > 0 ? { name: room.heavyFabricName, meters: Number(room.heavyMeters) } : null);
                        const sheer = room.sheerFabric || (room.sheerEnabled !== false && room.sheerFabricName && Number(room.sheerMeters) > 0 ? { name: room.sheerFabricName, meters: Number(room.sheerMeters) } : null);
                        const blackout = room.blackoutFabric || (room.blackoutEnabled && room.blackoutFabricName && Number(room.blackoutMeters) > 0 ? { name: room.blackoutFabricName, meters: Number(room.blackoutMeters) } : null);

                        return (
                          <div key={rIdx} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                            <span className="font-bold text-xs text-slate-900 block border-b border-slate-200/80 pb-1">
                              {room.roomName || room.name || `غرفة ${rIdx + 1}`}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                              {heavy && (
                                <div className="bg-amber-100/70 text-amber-950 p-2 rounded-xl border border-amber-200/60 flex justify-between items-center">
                                  <span className="font-bold">ثقيل: {heavy.name}</span>
                                  <strong className="font-mono font-black text-sm">{heavy.meters}م</strong>
                                </div>
                              )}
                              {sheer && (
                                <div className="bg-blue-50 text-blue-950 p-2 rounded-xl border border-blue-200/60 flex justify-between items-center">
                                  <span className="font-bold">تول: {sheer.name}</span>
                                  <strong className="font-mono font-black text-sm">{sheer.meters}م</strong>
                                </div>
                              )}
                              {blackout && (
                                <div className="bg-slate-200/70 text-slate-900 p-2 rounded-xl border border-slate-300 flex justify-between items-center">
                                  <span className="font-bold">بلاك آوت: {blackout.name}</span>
                                  <strong className="font-mono font-black text-sm">{blackout.meters}م</strong>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Total Fabrics Summary */}
                    <div className="bg-amber-500/10 border border-amber-400/30 p-3 rounded-2xl text-xs flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-amber-950">إجمالي الأمتار المجمعة للطلب ({totalMeters.toFixed(1)}م):</span>
                      <div className="flex flex-wrap gap-1.5">
                        {totals.map((t, idx) => (
                          <span key={idx} className="bg-white font-bold text-slate-900 border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs font-mono">
                            {t.name}: <strong className="text-amber-800">{t.meters}م</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <a
                      href={`https://wa.me/2${order.phone}?text=${encodeURIComponent(`مرحباً ${order.customerName}، نود إعلامك بأن أوردر الستائر الخاص بكم في مرحلة قص القماش حالياً بمؤسسة أحمد كشك. شكراً لثقتكم بنا!`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      <span>إرسال تحديث للعميل (واتساب)</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => updateOrderStatus(order.id, 'تم القص وجاهز للخياطة')}
                      className="w-full bg-brand-gold hover:bg-amber-400 text-slate-950 py-3 rounded-2xl text-xs font-black shadow-gold cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>تم قص القماش بالكامل وتحويله للورشة ←</span>
                    </button>

                    {/* Edit / Delete للمدير */}
                    <div className="flex justify-center pt-1">
                      <OrderRowActions
                        pageId="p_cutting"
                        orderId={(order as any).orderId || order.id}
                        customerName={order.customerName}
                        editHref={`/orders/${encodeURIComponent((order as any).orderId || order.id)}`}
                        onDeleted={() => setOrders(prev => prev.filter((o: any) => o.id !== order.id && o.orderId !== (order as any).orderId))}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🖨️ Cutting Worksheet Printable Modal */}
      <CuttingPrintModal
        isOpen={!!selectedOrderForPrint}
        onClose={() => setSelectedOrderForPrint(null)}
        data={selectedOrderForPrint}
      />
    </PageShell>
  );
}

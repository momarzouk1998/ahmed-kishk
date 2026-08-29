'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import ContractPrintModal, { PrintContractData } from '@/components/ContractPrintModal';
import {
  getStoredPipelineOrders,
  saveStoredPipelineOrders,
  updatePipelineOrderStatus,
  normalizeMasterStage,
  GlobalMasterStage,
  PipelineMasterOrder,
  isTodayOrOverdue,
  registerDeletedOrderId
} from '@/lib/pipelineStore';
import {
  getStoredQuotations,
  saveAllQuotations,
  getStoredInspections,
  deleteQuotationOrder,
  QuotationOrder,
} from '@/lib/inspectionsStore';

const GLOBAL_STAGES: { key: GlobalMasterStage | 'الكل'; label: string; badgeColor: string }[] = [
  { key: 'الكل', label: 'كل الطلبات', badgeColor: 'bg-slate-100 text-slate-800 border-slate-300' },
  { key: 'المعاينات', label: '1. المعاينات', badgeColor: 'bg-amber-100 text-amber-950 border-amber-300' },
  { key: 'انتظار تسعير', label: '2. انتظار تسعير', badgeColor: 'bg-blue-100 text-blue-950 border-blue-300' },
  { key: 'في المقص', label: '3. في المقص', badgeColor: 'bg-orange-100 text-orange-950 border-orange-300' },
  { key: 'في الورشة', label: '4. في الورشة', badgeColor: 'bg-purple-100 text-purple-950 border-purple-300' },
  { key: 'تجهيز الاكسسوارات', label: '5. تجهيز الاكسسوارات', badgeColor: 'bg-indigo-100 text-indigo-950 border-indigo-300' },
  { key: 'جاهز للاستلام', label: '6. جاهز للاستلام', badgeColor: 'bg-sky-100 text-sky-950 border-sky-300' },
  { key: 'جاهز للتركيب', label: '7. جاهز للتركيب', badgeColor: 'bg-teal-100 text-teal-950 border-teal-300' },
  { key: 'مكتمل', label: '8. مكتمل', badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300' },
];

export default function CentralOrdersLedgerPage() {
  const [orders, setOrders] = useState<PipelineMasterOrder[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<GlobalMasterStage | 'الكل'>('الكل');
  const [selectedBranch, setSelectedBranch] = useState('الكل');

  // Full Order Editing Drawer State
  const [activeEditingOrder, setActiveEditingOrder] = useState<PipelineMasterOrder | null>(null);

  // Print Modals State
  const [printContractData, setPrintContractData] = useState<PrintContractData | null>(null);
  const [isContractPrintOpen, setIsContractPrintOpen] = useState<boolean>(false);
  const [printWorksheetOrder, setPrintWorksheetOrder] = useState<PipelineMasterOrder | null>(null);
  const [printCuttingOrder, setPrintCuttingOrder] = useState<PipelineMasterOrder | null>(null);

  const loadData = () => {
    const pipelineOrders = getStoredPipelineOrders();
    const quotations = getStoredQuotations();
    const inspections = getStoredInspections();

    // Map quotations into master list if missing
    const quotationMasterItems: PipelineMasterOrder[] = quotations
      .filter(q => !pipelineOrders.some(p => p.orderId === q.id || p.id === q.id))
      .map(q => ({
        id: q.id,
        orderId: q.id,
        customerName: q.customerName,
        phone: q.phone,
        address: q.address,
        branch: q.branch || 'الفرع الرئيسي',
        deliveryDate: q.deliveryDate || '',
        status: normalizeMasterStage(q.status),
        createdAt: q.date || new Date().toISOString().split('T')[0],
        totalAmount: q.totalAmount || 0,
        depositPaid: q.depositPaid || 0,
        remainingAmount: q.remainingAmount || 0,
        rooms: q.rooms || [],
      }));

    // Map un-quoted inspections
    const inspectionMasterItems: PipelineMasterOrder[] = inspections
      .filter(insp => !pipelineOrders.some(p => p.id === insp.id || p.orderId === insp.id) && !quotations.some(q => q.inspectionId === insp.id))
      .map(insp => ({
        id: insp.id,
        orderId: insp.id,
        customerName: insp.customerName,
        phone: insp.phone,
        address: insp.address,
        branch: insp.branch || 'الفرع الرئيسي',
        deliveryDate: insp.scheduledAt || '',
        status: 'المعاينات',
        createdAt: insp.createdAt || new Date().toISOString().split('T')[0],
        totalAmount: 0,
        depositPaid: 0,
        remainingAmount: 0,
        rooms: insp.rooms || [],
      }));

    const combined = [...pipelineOrders, ...quotationMasterItems, ...inspectionMasterItems];
    setOrders(combined);
    saveStoredPipelineOrders(combined);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMasterStageChange = (orderId: string, newStage: GlobalMasterStage) => {
    updatePipelineOrderStatus(orderId, newStage);
    setOrders(prev => prev.map(o => o.id === orderId || o.orderId === orderId ? { ...o, status: newStage } : o));
    if (activeEditingOrder && (activeEditingOrder.id === orderId || activeEditingOrder.orderId === orderId)) {
      setActiveEditingOrder(prev => prev ? { ...prev, status: newStage } : null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`هل أنت أسر بالتأكيد من حذف طلب العميل "${name}" نهائياً من النظام؟`)) {
      deleteQuotationOrder(id);
      registerDeletedOrderId(id);
      if (name) registerDeletedOrderId(name);
      
      const target = orders.find(o => o.id === id || o.orderId === id || o.customerName === name);
      if (target?.orderId) registerDeletedOrderId(target.orderId);

      const updated = orders.filter(o => o.id !== id && o.orderId !== id && o.customerName !== name);
      setOrders(updated);
      saveStoredPipelineOrders(updated);
      if (activeEditingOrder?.id === id || activeEditingOrder?.customerName === name) setActiveEditingOrder(null);
      alert('تم حذف الطلب نهائياً من النظام ولن يظهر مجدداً ✓');
    }
  };

  // Full Edit Sync
  const handleSaveActiveOrderEdits = (updatedOrder: PipelineMasterOrder) => {
    const total = updatedOrder.totalAmount || 0;
    const deposit = updatedOrder.depositPaid || 0;
    const remaining = Math.max(0, total - deposit);
    const finalOrder = { ...updatedOrder, totalAmount: total, depositPaid: deposit, remainingAmount: remaining };

    // 1. Update pipeline orders
    const updatedList = orders.map(o => o.id === finalOrder.id || o.orderId === finalOrder.orderId ? finalOrder : o);
    setOrders(updatedList);
    saveStoredPipelineOrders(updatedList);
    setActiveEditingOrder(finalOrder);

    // 2. Sync quotations store
    const storedQuotations = getStoredQuotations();
    const targetQot = storedQuotations.find(q => q.id === finalOrder.orderId || q.id === finalOrder.id);
    if (targetQot) {
      const updatedQots = storedQuotations.map(q => q.id === targetQot.id ? {
        ...q,
        customerName: finalOrder.customerName,
        phone: finalOrder.phone,
        address: finalOrder.address,
        branch: finalOrder.branch,
        deliveryDate: finalOrder.deliveryDate,
        totalAmount: total,
        depositPaid: deposit,
        remainingAmount: remaining,
        rooms: finalOrder.rooms || [],
      } : q);
      saveAllQuotations(updatedQots);
    }

    alert('تم حفظ التعديلات الشاملة على طلب العميل بنجاح ✓');
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch =
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.phone.includes(search) ||
      o.address.toLowerCase().includes(search.toLowerCase()) ||
      (o.branch && o.branch.toLowerCase().includes(search.toLowerCase()));

    const masterStage = normalizeMasterStage(o.status);
    const matchStage = selectedStage === 'الكل' || masterStage === selectedStage;
    const matchBranch = selectedBranch === 'الكل' || o.branch === selectedBranch;

    return matchSearch && matchStage && matchBranch;
  });

  const totalOrdersCount = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalPaid = filteredOrders.reduce((sum, o) => sum + (o.depositPaid || 0), 0);
  const totalRemaining = filteredOrders.reduce((sum, o) => sum + (o.remainingAmount || 0), 0);

  const openContractPrint = (order: PipelineMasterOrder) => {
    const printData: PrintContractData = {
      id: order.orderId || order.id,
      inspectionId: order.id,
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      date: order.createdAt,
      deliveryDate: order.deliveryDate,
      estimatorName: order.technicianName || 'أحمد كشك',
      totalAmount: order.totalAmount || 0,
      depositPaid: order.depositPaid || 0,
      remainingAmount: order.remainingAmount || 0,
      rooms: (order.rooms || []).map((r, idx) => ({
        id: `rm-${idx}`,
        name: r.roomName || r.name || `غرفة ${idx + 1}`,
        widthCm: r.widthCm || 350,
        heightCm: r.heightCm || 280,
        sides: r.sides || 2,
        heavyFabricName: r.heavyFabric?.name || 'قطيفة تركي',
        heavyMeters: r.heavyFabric?.meters || 6.3,
        heavyPrice: 380,
        sheerFabricName: r.sheerFabric?.name || 'تول مطرز',
        sheerMeters: r.sheerFabric?.meters || 8.75,
        sheerPrice: 160,
        blackoutFabricName: r.blackoutFabric?.name || '',
        blackoutMeters: r.blackoutFabric?.meters || 0,
        blackoutPrice: 0,
        trackMeters: 7,
        trackPrice: 100,
        tapeMeters: 15,
        tapePrice: 50,
        tailorPricePerSide: 0,
        installFee: 125,
        totalSellPrice: (r.heavyFabric?.meters || 6.3) * 380 + (r.sheerFabric?.meters || 8.75) * 160,
      })),
    };
    setPrintContractData(printData);
    setIsContractPrintOpen(true);
  };

  return (
    <PageShell title="8. طلبات الستائر" badge="8">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto">
        {/* Financial Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
            <span className="text-slate-500 font-bold block">إجمالي الطلبات</span>
            <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{totalOrdersCount} طلب</strong>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center shadow-3xs">
            <span className="text-slate-500 font-bold block">إجمالي القيمة المالية</span>
            <strong className="text-xl font-black text-slate-900 mt-1 block font-mono">{totalRevenue.toLocaleString()} ج</strong>
          </div>
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 text-center shadow-3xs">
            <span className="text-emerald-800 font-bold block">المدفوع والعرابين</span>
            <strong className="text-xl font-black text-emerald-950 mt-1 block font-mono">{totalPaid.toLocaleString()} ج</strong>
          </div>
          <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 text-center shadow-3xs">
            <span className="text-rose-800 font-bold block">المتبقي للتحصيل</span>
            <strong className="text-xl font-black text-rose-950 mt-1 block font-mono">{totalRemaining.toLocaleString()} ج</strong>
          </div>
        </div>

        {/* Search & Master Stage Tabs Filter */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
            <div className="relative sm:col-span-8">
              <span className="material-symbols-outlined absolute right-3.5 top-2.5 text-slate-400 text-base">search</span>
              <input
                type="text"
                placeholder="ابحث باسم العميل، رقم الهاتف، العنوان، أو الفرع..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none font-bold text-slate-900 shadow-2xs"
              />
            </div>

            <div className="sm:col-span-4">
              <select
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-bold text-slate-800 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="الكل">جميع الفروع</option>
                <option value="الفرع الرئيسي">الفرع الرئيسي</option>
                <option value="فرع عرابي">فرع عرابي</option>
              </select>
            </div>
          </div>

          {/* Official 8 Master Stages Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-bold pl-2">تصفية بالمرحلة العامة:</span>
            {GLOBAL_STAGES.map(stg => {
              const count = stg.key === 'الكل'
                ? orders.length
                : orders.filter(o => normalizeMasterStage(o.status) === stg.key).length;

              return (
                <button
                  key={stg.key}
                  type="button"
                  onClick={() => setSelectedStage(stg.key)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    selectedStage === stg.key
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-gold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{stg.label}</span>
                  <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-full bg-slate-900/10">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders Table View (Hidden ID code, Clicking row opens full customer edit view) */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-slate-300 block mb-2">inbox</span>
            <h3 className="font-bold text-slate-700 text-sm">لا توجد طلبات تطابق الفلتر المحدد حالياً</h3>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs min-w-[850px]">
                <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">اسم العميل</th>
                    <th className="p-3.5">الهاتف والعنوان والفرع</th>
                    <th className="p-3.5">تاريخ المعاينة</th>
                    <th className="p-3.5">تاريخ التسليم/التركيب</th>
                    <th className="p-3.5 font-mono">الإجمالي والمتبقي</th>
                    <th className="p-3.5 text-center">المرحلة العامة للحالة</th>
                    <th className="p-3.5 text-center">الإجراءات والتحكم</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => {
                    const currentStage = normalizeMasterStage(order.status);
                    const stageObj = GLOBAL_STAGES.find(s => s.key === currentStage) || GLOBAL_STAGES[1];

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setActiveEditingOrder(order)}
                        className="border-t border-slate-100 hover:bg-amber-50/40 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5 font-bold text-slate-900">
                          <span className="text-sm font-black text-indigo-950 block">{order.customerName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">اضغط لفتح التعديل والطباعة 📋</span>
                        </td>
                        <td className="p-3.5 text-slate-700">
                          <div>
                            <div className="font-mono text-slate-800 font-bold" dir="ltr">{order.phone}</div>
                            <div className="text-slate-500 text-[11px]">{order.address} ({order.branch})</div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-800 font-bold">
                          {order.createdAt || 'غير محدد'}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-rose-800">
                          {order.deliveryDate || 'غير محدد'}
                        </td>
                        <td className="p-3.5 font-mono">
                          <div className="font-bold text-slate-900">{(order.totalAmount || 0).toLocaleString()} ج</div>
                          <div className="text-rose-700 text-[11px] font-bold">متبقي: {(order.remainingAmount || 0).toLocaleString()} ج</div>
                        </td>
                        <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                          <select
                            value={currentStage}
                            onChange={(e) => handleMasterStageChange(order.id, e.target.value as GlobalMasterStage)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-black border focus:outline-none cursor-pointer shadow-2xs ${stageObj.badgeColor}`}
                          >
                            <option value="المعاينات">1. المعاينات</option>
                            <option value="انتظار تسعير">2. انتظار تسعير</option>
                            <option value="في المقص">3. في المقص</option>
                            <option value="في الورشة">4. في الورشة</option>
                            <option value="تجهيز الاكسسوارات">5. تجهيز الاكسسوارات</option>
                            <option value="جاهز للاستلام">6. جاهز للاستلام</option>
                            <option value="جاهز للتركيب">7. جاهز للتركيب</option>
                            <option value="مكتمل">8. مكتمل</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveEditingOrder(order)}
                              className="bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              عرض العقد والتعديل 📋
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(order.id, order.customerName)}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="حذف الأوردر"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 🔍 Interactive Full Customer Order Modal Drawer (صفحة العميل الكاملة مع التعديل والطباعة) */}
      {activeEditingOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-6 text-slate-900 shadow-2xl border border-slate-200 my-auto max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div>
                <h2 className="font-display font-black text-xl text-slate-950 flex items-center gap-2">
                  <span>طلب العميل: {activeEditingOrder.customerName}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">شاشة التحكم الكاملة بالبيانات، الأسعار، الأقمشة، والطباعة</p>
              </div>

              <button
                type="button"
                onClick={() => setActiveEditingOrder(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Action PDF Print Buttons Header */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs font-black text-slate-800 block">🖨️ طباعة مستندات الطلب (PDF):</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openContractPrint(activeEditingOrder)}
                  className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black shadow-gold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">description</span>
                  <span>1. طباعة عقد العميل (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintCuttingOrder(activeEditingOrder)}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">content_cut</span>
                  <span>2. ورقة قص القماش (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPrintWorksheetOrder(activeEditingOrder)}
                  className="bg-purple-900 hover:bg-purple-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">precision_manufacturing</span>
                  <span>3. ورقة تفصيل الورشة (PDF)</span>
                </button>
              </div>
            </div>

            {/* Editable Form Fields */}
            <div className="space-y-4 text-xs">
              <h3 className="font-bold text-sm text-slate-900 border-r-4 border-amber-500 pr-2">
                بيانات العميل والمواعيد (قابل للتعديل):
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">اسم العميل:</label>
                  <input
                    type="text"
                    value={activeEditingOrder.customerName}
                    onChange={(e) => setActiveEditingOrder({ ...activeEditingOrder, customerName: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">رقم الهاتف:</label>
                  <input
                    type="text"
                    value={activeEditingOrder.phone}
                    onChange={(e) => setActiveEditingOrder({ ...activeEditingOrder, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">العنوان:</label>
                  <input
                    type="text"
                    value={activeEditingOrder.address}
                    onChange={(e) => setActiveEditingOrder({ ...activeEditingOrder, address: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-500 font-bold block mb-1">الفرع:</label>
                  <select
                    value={activeEditingOrder.branch}
                    onChange={(e) => setActiveEditingOrder({ ...activeEditingOrder, branch: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="الفرع الرئيسي">الفرع الرئيسي</option>
                    <option value="فرع عرابي">فرع عرابي</option>
                  </select>
                </div>
              </div>

              {/* Inspection & Delivery Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/60 p-4 rounded-2xl border border-amber-200">
                <div>
                  <label className="text-amber-950 font-black block mb-1">📅 تاريخ المعاينة:</label>
                  <input
                    type="date"
                    value={activeEditingOrder.createdAt || ''}
                    onChange={(e) => setActiveEditingOrder({ ...activeEditingOrder, createdAt: e.target.value })}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-amber-950 font-black block mb-1">📅 تاريخ التسليم / التركيب:</label>
                  <input
                    type="date"
                    value={activeEditingOrder.deliveryDate || ''}
                    onChange={(e) => setActiveEditingOrder({ ...activeEditingOrder, deliveryDate: e.target.value })}
                    className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Financial Totals & Deposit */}
              <h3 className="font-bold text-sm text-slate-900 border-r-4 border-amber-500 pr-2 pt-2">
                الماليات والتحصيل:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-slate-500 font-bold block mb-1">إجمالي المقايسة:</label>
                  <input
                    type="number"
                    value={activeEditingOrder.totalAmount || 0}
                    onChange={(e) => setActiveEditingOrder({ ...activeEditingOrder, totalAmount: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-mono font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-emerald-800 font-bold block mb-1">العربون المسدد:</label>
                  <input
                    type="number"
                    value={activeEditingOrder.depositPaid || 0}
                    onChange={(e) => setActiveEditingOrder({ ...activeEditingOrder, depositPaid: Number(e.target.value) })}
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-1.5 font-mono font-black text-emerald-950 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-rose-800 font-bold block mb-1">المتبقي للتحصيل:</label>
                  <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 font-mono font-black text-rose-950 text-sm">
                    {Math.max(0, (activeEditingOrder.totalAmount || 0) - (activeEditingOrder.depositPaid || 0)).toLocaleString()} ج
                  </div>
                </div>
              </div>

              {/* Save & Action Footer */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSaveActiveOrderEdits(activeEditingOrder)}
                  className="bg-brand-gold hover:bg-amber-400 text-slate-950 px-6 py-3 rounded-2xl text-xs font-black shadow-gold cursor-pointer transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>حفظ وتحديث التعديلات بالكامل ✓</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveEditingOrder(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ Contract Print Modal */}
      <ContractPrintModal
        isOpen={isContractPrintOpen}
        onClose={() => setIsContractPrintOpen(false)}
        data={printContractData}
      />

      {/* ✂️ Cutting Sheet Printable Modal */}
      {printCuttingOrder && (
        <div className="modal-overlay fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-cutting-worksheet, #printable-cutting-worksheet * { visibility: visible !important; }
              #printable-cutting-worksheet { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 15px !important; background: #ffffff !important; color: #000000 !important; }
              .no-print { display: none !important; }
            }
          `}</style>
          <div id="printable-cutting-worksheet" className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 text-slate-900 border border-slate-200 my-8">
            <div className="no-print flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm">ورقة قص القماش</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => window.print()} className="bg-slate-900 text-white px-3 py-1 rounded-xl text-xs font-bold">طباعة PDF</button>
                <button type="button" onClick={() => setPrintCuttingOrder(null)} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold">إغلاق ✕</button>
              </div>
            </div>

            <div className="flex justify-between items-center pb-3 border-b-2 border-slate-900">
              <div>
                <h2 className="font-black text-xl">مؤسسة أحمد كشك للأقمشة والستائر</h2>
                <p className="text-xs font-bold text-amber-800">أمر ورقة قص القماش (للبياع / أمين المخزن)</p>
              </div>
              <div className="text-left font-mono text-xs">
                <div><strong>التاريخ:</strong> {printCuttingOrder.createdAt}</div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div><strong>اسم العميل:</strong> {printCuttingOrder.customerName}</div>
              <div><strong>رقم الهاتف:</strong> {printCuttingOrder.phone}</div>
              <div><strong>العنوان:</strong> {printCuttingOrder.address}</div>
              <div><strong>الفرع:</strong> {printCuttingOrder.branch}</div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs">بيانات الأقمشة والأمتار المطلوب قصها من التوب:</h4>
              <table className="w-full text-right text-xs border-collapse border border-slate-300">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border border-slate-300">الغرفة</th>
                    <th className="p-2 border border-slate-300">اسم القماش والتفاصيل</th>
                    <th className="p-2 border border-slate-300 text-center font-mono">الأمتار المطلوب قصها</th>
                  </tr>
                </thead>
                <tbody>
                  {(printCuttingOrder.rooms || []).map((r: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 font-bold">{r.roomName || r.name || `غرفة ${idx + 1}`}</td>
                      <td className="p-2 border border-slate-300">
                        {r.heavyFabric && <div>ثقيل: {r.heavyFabric.name}</div>}
                        {r.sheerFabric && <div>خلفية: {r.sheerFabric.name}</div>}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold text-amber-950">
                        {((r.heavyFabric?.meters || 0) + (r.sheerFabric?.meters || 0)).toFixed(2)} متر
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 🧵 Workshop Sheet Printable Modal */}
      {printWorksheetOrder && (
        <div className="modal-overlay fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #printable-tailoring-modal, #printable-tailoring-modal * { visibility: visible !important; }
              #printable-tailoring-modal { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 15px !important; background: #ffffff !important; color: #000000 !important; }
              .no-print { display: none !important; }
            }
          `}</style>
          <div id="printable-tailoring-modal" className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 text-slate-900 border border-slate-200 my-8">
            <div className="no-print flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm">ورقة تفصيل الورشة</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => window.print()} className="bg-purple-900 text-white px-3 py-1 rounded-xl text-xs font-bold">طباعة PDF</button>
                <button type="button" onClick={() => setPrintWorksheetOrder(null)} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold">إغلاق ✕</button>
              </div>
            </div>

            <div className="flex justify-between items-center pb-3 border-b-2 border-slate-900">
              <div>
                <h2 className="font-black text-xl">مؤسسة أحمد كشك للأقمشة والستائر</h2>
                <p className="text-xs font-bold text-purple-900">أمر ورقة التفصيل والورشة (للخياط)</p>
              </div>
              <div className="text-left font-mono text-xs">
                <div><strong>التاريخ:</strong> {printWorksheetOrder.createdAt}</div>
                <div><strong>موعد الاستلام:</strong> {printWorksheetOrder.deliveryDate}</div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div><strong>اسم العميل:</strong> {printWorksheetOrder.customerName}</div>
              <div><strong>رقم الهاتف:</strong> {printWorksheetOrder.phone}</div>
              <div><strong>العنوان:</strong> {printWorksheetOrder.address}</div>
              <div><strong>الفرع:</strong> {printWorksheetOrder.branch}</div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs">تفاصيل الخياطة والارتفاعات المشطبة لكل غرفة:</h4>
              <table className="w-full text-right text-xs border-collapse border border-slate-300">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border border-slate-300">الغرفة</th>
                    <th className="p-2 border border-slate-300">الطبقة والقماش</th>
                    <th className="p-2 border border-slate-300 text-center font-mono">الأمتار والشريط</th>
                    <th className="p-2 border border-slate-300 text-center font-mono">الارتفاع الصافي</th>
                  </tr>
                </thead>
                <tbody>
                  {(printWorksheetOrder.rooms || []).map((r: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-300 font-bold">{r.roomName || r.name || `غرفة ${idx + 1}`}</td>
                      <td className="p-2 border border-slate-300">
                        {r.heavyFabric && <div>ثقيل: {r.heavyFabric.name}</div>}
                        {r.sheerFabric && <div>خلفية: {r.sheerFabric.name}</div>}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono">
                        {r.heavyFabric && <div>{r.heavyFabric.meters}م ({r.heavyFabric.tapeType || '3 فتلة'})</div>}
                        {r.sheerFabric && <div>{r.sheerFabric.meters}م ({r.sheerFabric.tapeType || 'ويفي'})</div>}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-black text-slate-950">
                        {r.heavyFabric?.netHeight || r.sheerFabric?.netHeight || '_______ سم'}
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

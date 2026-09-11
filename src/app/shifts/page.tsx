'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { 
  ShiftSession, getShifts, saveShifts, getActiveShiftForBranch, 
  startNewShift, closeActiveShift 
} from '@/lib/shiftStore';
import { getEmployees } from '@/lib/employeeStore';
import { BRANCHES_LIST, normalizeBranchName, getBranchConfig } from '@/lib/branches';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function ShiftsAndDrawerPage() {
  const { user } = useCurrentUser();
  const [shifts, setShifts] = useState<ShiftSession[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('فرع عمر أفندي');
  const [employees, setEmployees] = useState<any[]>([]);

  // Start Shift Form State
  const [newShiftType, setNewShiftType] = useState<'صباحي' | 'مسائي'>('صباحي');
  const [newShiftEmployeeId, setNewShiftEmployeeId] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<string>('0');

  // Close Shift Form State
  const [actualClosingCash, setActualClosingCash] = useState<string>('');
  const [handoverDestination, setHandoverDestination] = useState<'تسليم لوردية المساء' | 'توريد لخزينة الإدارة' | 'إبقاء بالدرج لليوم التالي'>('تسليم لوردية المساء');
  const [handoverReceiver, setHandoverReceiver] = useState<string>('');
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');

  // Z-Report Modal / Print State
  const [selectedShiftForZReport, setSelectedShiftForZReport] = useState<ShiftSession | null>(null);

  useEffect(() => {
    setShifts(getShifts());
    setEmployees(getEmployees());
  }, []);

  const activeShift = useMemo(() => {
    return shifts.find(s => normalizeBranchName(s.branch) === normalizeBranchName(selectedBranch) && s.status === 'OPEN');
  }, [shifts, selectedBranch]);

  const branchEmployees = useMemo(() => {
    return employees.filter(e => normalizeBranchName(e.branch) === normalizeBranchName(selectedBranch));
  }, [employees, selectedBranch]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === newShiftEmployeeId);
    if (!emp) {
      alert('برجاء اختيار الموظف / الكاشير المسؤول عن الوردية');
      return;
    }

    const created = startNewShift({
      branch: selectedBranch,
      shiftType: newShiftType,
      employeeId: emp.id,
      employeeName: emp.name,
      openingDrawerBalance: parseFloat(openingBalance) || 0,
    });

    setShifts(getShifts());
    alert(`تم فتح الوردية الـ (${newShiftType}) بنجاح للموظف ${emp.name} بعهدة ${created.openingDrawerBalance} ج`);
  };

  const handleClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    const actual = parseFloat(actualClosingCash);
    if (isNaN(actual)) {
      alert('برجاء إدخال النقدية الفعلية الموجودة بالدرج');
      return;
    }

    const closed = closeActiveShift({
      shiftId: activeShift.id,
      actualClosingCash: actual,
      discrepancyReason,
      handoverDestination,
      handoverReceiverName: handoverReceiver,
      closingNotes,
    });

    setShifts(getShifts());
    setActualClosingCash('');
    setDiscrepancyReason('');
    setClosingNotes('');
    setSelectedShiftForZReport(closed);
  };

  // Discrepancy calculation for active closing
  const expectedCash = activeShift ? (activeShift.openingDrawerBalance + activeShift.cashSales - (activeShift.expensesPaid + activeShift.advancesPaid)) : 0;
  const currentActual = parseFloat(actualClosingCash || '0');
  const currentDiff = activeShift && actualClosingCash ? currentActual - expectedCash : 0;

  const handlePrintZReport = (shift: ShiftSession) => {
    const bCfg = getBranchConfig(shift.branch);
    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="UTF-8"><title>تقرير إغلاق وردية - ${shift.id}</title>
      <style>
        @page { size: 80mm auto; margin: 3mm 4mm; }
        body { font-family: 'Cairo', system-ui, sans-serif; direction:rtl; color:#000; font-size:8.5pt; width:72mm; margin:0 auto; }
        .center { text-align:center; }
        .brand { font-weight:900; font-size:11pt; }
        .divider { border-top:1px dashed #000; margin:2mm 0; }
        table { width:100%; border-collapse:collapse; }
        td { padding:1mm 0; }
        .lbl { color:#333; }
        .v { text-align:left; font-family:monospace; font-weight:bold; }
        .total-row td { font-size:10pt; font-weight:900; border-top:1px solid #000; border-bottom:1px solid #000; padding:1.5mm 0; }
        .foot { text-align:center; font-size:7.5pt; color:#444; margin-top:3mm; }
      </style></head><body>
        <div class="center">
          <div class="brand">مؤسسة كشك للأقمشة والستائر</div>
          <div style="font-weight:bold; font-size:9.5pt; margin-top:1mm;">تقرير إغلاق وردية (Z-Report)</div>
          <div style="font-size:8pt; color:#333;">👑 ${shift.branch}</div>
        </div>
        <div class="divider"></div>
        <table>
          <tr><td class="lbl">رقم الوردية:</td><td class="v">${shift.id}</td></tr>
          <tr><td class="lbl">نوع الوردية:</td><td class="v">${shift.shiftType}</td></tr>
          <tr><td class="lbl">المسؤول:</td><td class="v">${shift.employeeName}</td></tr>
          <tr><td class="lbl">وقت البداية:</td><td class="v" style="font-size:7.5pt;">${new Date(shift.startTime).toLocaleString('ar-EG')}</td></tr>
          ${shift.endTime ? `<tr><td class="lbl">وقت الإغلاق:</td><td class="v" style="font-size:7.5pt;">${new Date(shift.endTime).toLocaleString('ar-EG')}</td></tr>` : ''}
        </table>
        <div class="divider"></div>
        <table>
          <tr><td class="lbl">عهدة البداية (افتتاح):</td><td class="v">${shift.openingDrawerBalance.toLocaleString()} ج</td></tr>
          <tr><td class="lbl">💵 مبيعات كاش بالدرج:</td><td class="v">${shift.cashSales.toLocaleString()} ج</td></tr>
          <tr><td class="lbl">⚡ مبيعات إنستاباي:</td><td class="v">${shift.instapaySales.toLocaleString()} ج</td></tr>
          <tr><td class="lbl">📱 مبيعات فودافون:</td><td class="v">${shift.vodafoneSales.toLocaleString()} ج</td></tr>
          <tr><td class="lbl">💳 مبيعات فيزا:</td><td class="v">${shift.visaSales.toLocaleString()} ج</td></tr>
          <tr class="total-row"><td>إجمالي مبيعات الوردية:</td><td class="v">${shift.totalSales.toLocaleString()} ج</td></tr>
          <tr><td class="lbl">مصروفات وسلف خارجة:</td><td class="v">-${(shift.expensesPaid + shift.advancesPaid).toLocaleString()} ج</td></tr>
          <tr style="border-top:1px solid #000;"><td class="lbl" style="font-weight:bold;">النقدية المحسوبة بالدرج:</td><td class="v">${shift.expectedCashInDrawer.toLocaleString()} ج</td></tr>
          <tr><td class="lbl" style="font-weight:bold;">النقدية الفعلية المحصية:</td><td class="v">${(shift.actualClosingCash || 0).toLocaleString()} ج</td></tr>
          <tr style="border-top:1px dashed #000;"><td class="lbl" style="font-weight:900;">الفارق (عجز / زيادة):</td><td class="v" style="font-weight:900;">${(shift.cashDiscrepancy || 0) >= 0 ? `+${shift.cashDiscrepancy}` : shift.cashDiscrepancy} ج</td></tr>
          ${shift.handoverDestination ? `<tr><td class="lbl">جهة التسليم:</td><td class="v">${shift.handoverDestination}</td></tr>` : ''}
          ${shift.handoverReceiverName ? `<tr><td class="lbl">المستلم:</td><td class="v">${shift.handoverReceiverName}</td></tr>` : ''}
        </table>
        <div class="divider"></div>
        <div class="foot">
          <div>شكراً لتعاملكم مع مؤسسة كشك للأقمشة والستائر ✨</div>
          <div>تمت مراجعة وتسليم الخزينة والدرج بنجاح</div>
        </div>
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <PageShell title="نظام الورديات وتسليم وتسلم الأدراج (Z-Report)" badge="إغلاق ومطابقة الخزائن">
      <div className="space-y-6">
        
        {/* Branch Selector Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <span className="text-sm font-black text-slate-800">اختر الفرع لمتابعة الورديات:</span>
          </div>

          <div className="flex items-center gap-2">
            {BRANCHES_LIST.map(b => (
              <button
                key={b.id}
                onClick={() => setSelectedBranch(b.name)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  normalizeBranchName(selectedBranch) === normalizeBranchName(b.name)
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        {/* Current Active Shift or Open New Shift Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Active Shift Card */}
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>⏱️</span>
                <span>حالة الوردية الحالية — {selectedBranch}</span>
              </h3>
              {activeShift ? (
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-full text-xs font-black animate-pulse">
                  ● وردية مفتوحة الآن
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                  لا توجد وردية مفتوحة
                </span>
              )}
            </div>

            {activeShift ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-bold block">نوع الوردية</span>
                    <span className="font-black text-sm text-slate-900">{activeShift.shiftType === 'صباحي' ? '☀️ صباحية' : '🌙 مسائية'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-bold block">المسؤول / الكاشير</span>
                    <span className="font-black text-sm text-slate-900">{activeShift.employeeName}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-bold block">عهدة بداية الوردية</span>
                    <span className="font-mono font-black text-sm text-slate-900">{activeShift.openingDrawerBalance.toLocaleString()} ج</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-bold block">وقت البدء</span>
                    <span className="font-mono font-bold text-xs text-slate-700" dir="ltr">{new Date(activeShift.startTime).toLocaleTimeString('ar-EG')}</span>
                  </div>
                </div>

                {/* Live Sales Breakdown */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <span className="font-black text-xs text-emerald-950 block">مبيعات الوردية المسجلة:</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600">💵 كاش بالدرج:</span>
                      <span className="font-mono font-black text-emerald-900">{activeShift.cashSales.toLocaleString()} ج</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">⚡ إنستاباي:</span>
                      <span className="font-mono font-black text-blue-900">{activeShift.instapaySales.toLocaleString()} ج</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">📱 فودافون كاش:</span>
                      <span className="font-mono font-black text-red-900">{activeShift.vodafoneSales.toLocaleString()} ج</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">💳 فيزا / كارت:</span>
                      <span className="font-mono font-black text-purple-900">{activeShift.visaSales.toLocaleString()} ج</span>
                    </div>
                  </div>
                  <div className="border-t border-emerald-200 pt-2 flex justify-between font-black text-sm text-emerald-950">
                    <span>إجمالي المبيعات:</span>
                    <span className="font-mono">{activeShift.totalSales.toLocaleString()} ج</span>
                  </div>
                </div>

                {/* Expected In Drawer */}
                <div className="p-3 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400 block">النقدية المتوقع وجودها بالدرج:</span>
                    <span className="text-[10px] text-slate-400">عهدة أولية + كاش مبيعات - سلف ومصروفات</span>
                  </div>
                  <span className="font-mono font-black text-lg text-amber-400">{expectedCash.toLocaleString()} ج.م</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleStart} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع الوردية *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewShiftType('صباحي')}
                      className={`py-3 rounded-2xl text-xs font-black border-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        newShiftType === 'صباحي' ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>☀️</span>
                      <span>وردية الصباح (المدير / مسؤول الصباح)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewShiftType('مسائي')}
                      className={`py-3 rounded-2xl text-xs font-black border-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        newShiftType === 'مسائي' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>🌙</span>
                      <span>وردية المساء (الكاشير)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الموظف المسؤول عن الوردية *</label>
                  <select
                    required
                    value={newShiftEmployeeId}
                    onChange={(e) => setNewShiftEmployeeId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="">-- اختر موظف / كاشير الفرع --</option>
                    {branchEmployees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عهدة بداية الوردية (الدرج نقداً) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="10"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="أدخل عهدة أول المدة بالدرج..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  بدء الوردية واستلام الدرج ▶️
                </button>
              </form>
            )}
          </div>

          {/* Close Shift / Handover Card */}
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-200">
              <span>🧾</span>
              <span>تسليم الدرج وتقفيل الوردية (Z-Report)</span>
            </h3>

            {activeShift ? (
              <form onSubmit={handleClose} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    النقدية الفعلية المحصية بالدرج الآن *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={actualClosingCash}
                    onChange={(e) => setActualClosingCash(e.target.value)}
                    placeholder="أدخل المبلغ الفعلي نقداً بالدرج..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-black text-slate-900"
                  />
                </div>

                {/* Live Audit Tag */}
                {actualClosingCash && (
                  <div className={`p-3 rounded-2xl border text-xs font-black flex items-center justify-between ${
                    currentDiff === 0 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                      : currentDiff < 0 
                      ? 'bg-rose-50 border-rose-300 text-rose-900' 
                      : 'bg-blue-50 border-blue-300 text-blue-900'
                  }`}>
                    <span>حالة مطابقة الدرج:</span>
                    <span className="font-mono text-sm">
                      {currentDiff === 0 ? '✓ مطابق تماماً (0 ج)' : currentDiff < 0 ? `⚠️ عجز بالدرج (${currentDiff} ج)` : `🔵 زيادة بالدرج (+${currentDiff} ج)`}
                    </span>
                  </div>
                )}

                {currentDiff !== 0 && actualClosingCash && (
                  <div>
                    <label className="block text-xs font-bold text-rose-800 mb-1">سبب العجز / الزيادة</label>
                    <input
                      type="text"
                      value={discrepancyReason}
                      onChange={(e) => setDiscrepancyReason(e.target.value)}
                      placeholder="توضيح سبب الفارق..."
                      className="w-full p-2.5 bg-rose-50/50 border border-rose-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وجهة تسليم نقدية الإغلاق *</label>
                  <select
                    value={handoverDestination}
                    onChange={(e) => setHandoverDestination(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="تسليم لوردية المساء">تسليم لوردية المساء (كاشير المساء)</option>
                    <option value="توريد لخزينة الإدارة">توريد لخزينة الإدارة (الفرع الرئيسي)</option>
                    <option value="إبقاء بالدرج لليوم التالي">إبقاء بالدرج كعهدة افتتاحية لليوم التالي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستلم للعهدة</label>
                  <input
                    type="text"
                    value={handoverReceiver}
                    onChange={(e) => setHandoverReceiver(e.target.value)}
                    placeholder="اسم الموظف أو الكاشير المستلم..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات إضافية عند الإغلاق</label>
                  <input
                    type="text"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="أي ملاحظات تخص الوردية..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  إغلاق الوردية وتوليد تقرير Z-Report 🔒
                </button>
              </form>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <span className="text-3xl block mb-2">🔒</span>
                <span>لا يمكن تقفيل الدرج لأنه لا توجد وردية مفتوحة حالياً لهذا الفرع.</span>
              </div>
            )}
          </div>

        </div>

        {/* Shift History Log */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center justify-between">
            <span>📋 سجل تقفيل الورديات والأدراج السابقة</span>
            <span className="text-xs font-normal text-slate-500">إجمالي الورديات: {shifts.length}</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">رقم الوردية</th>
                  <th className="p-3">الفرع</th>
                  <th className="p-3">النوع</th>
                  <th className="p-3">المسؤول</th>
                  <th className="p-3 font-mono">افتتاح</th>
                  <th className="p-3 font-mono">المبيعات</th>
                  <th className="p-3 font-mono">الفعلي بالدرج</th>
                  <th className="p-3 font-mono">الفارق</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">طباعة Z-Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">{s.id}</td>
                    <td className="p-3 font-bold text-slate-800">{s.branch}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.shiftType === 'صباحي' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {s.shiftType}
                      </span>
                    </td>
                    <td className="p-3 font-bold">{s.employeeName}</td>
                    <td className="p-3 font-mono">{s.openingDrawerBalance.toLocaleString()} ج</td>
                    <td className="p-3 font-mono font-black text-emerald-800">{s.totalSales.toLocaleString()} ج</td>
                    <td className="p-3 font-mono font-black text-slate-900">{(s.actualClosingCash ?? s.expectedCashInDrawer).toLocaleString()} ج</td>
                    <td className="p-3 font-mono font-bold">
                      {s.cashDiscrepancy !== undefined ? (
                        <span className={s.cashDiscrepancy === 0 ? 'text-emerald-700' : s.cashDiscrepancy < 0 ? 'text-rose-700' : 'text-blue-700'}>
                          {s.cashDiscrepancy >= 0 ? `+${s.cashDiscrepancy}` : s.cashDiscrepancy} ج
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {s.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handlePrintZReport(s)}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        🧾 Z-Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Z-Report Modal */}
        {selectedShiftForZReport && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-sm w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-black text-slate-900 text-base">تم إغلاق الوردية بنجاح ✅</h3>
                <button onClick={() => setSelectedShiftForZReport(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2 text-xs font-mono">
                <div className="text-center font-bold pb-2 border-b">
                  <p className="text-sm font-black text-slate-900">مؤسسة كشك للأقمشة والستائر</p>
                  <p className="text-xs text-amber-800">إيصال تقفيل وردية {selectedShiftForZReport.id}</p>
                </div>
                <div className="flex justify-between">
                  <span>الفرع:</span>
                  <span>{selectedShiftForZReport.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span>المسؤول:</span>
                  <span>{selectedShiftForZReport.employeeName}</span>
                </div>
                <div className="flex justify-between font-black text-emerald-900 border-t pt-1">
                  <span>إجمالي المبيعات:</span>
                  <span>{selectedShiftForZReport.totalSales.toLocaleString()} ج</span>
                </div>
                <div className="flex justify-between font-black text-slate-900">
                  <span>الفعلي بالدرج:</span>
                  <span>{(selectedShiftForZReport.actualClosingCash || 0).toLocaleString()} ج</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>الفارق:</span>
                  <span>{(selectedShiftForZReport.cashDiscrepancy || 0) >= 0 ? `+${selectedShiftForZReport.cashDiscrepancy}` : selectedShiftForZReport.cashDiscrepancy} ج</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintZReport(selectedShiftForZReport)}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow"
                >
                  🖨️ طباعة Z-Report (80mm)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShiftForZReport(null)}
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

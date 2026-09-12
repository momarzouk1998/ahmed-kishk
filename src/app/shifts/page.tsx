'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { 
  ShiftSession,
  startNewShift, closeActiveShift, fetchShiftsFromServer 
} from '@/lib/shiftStore';
import { getEmployees } from '@/lib/employeeStore';
import { BRANCHES_LIST, normalizeBranchName, getBranchConfig } from '@/lib/branches';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function ShiftsAndDrawerPage() {
  const { user, isAdmin, isSuperAdmin } = useCurrentUser();
  const canManage = isAdmin || isSuperAdmin;

  const [shifts, setShifts] = useState<ShiftSession[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('الفرع الرئيسي');
  const [employees, setEmployees] = useState<any[]>([]);

  // Start Shift Form State
  const [newShiftType, setNewShiftType] = useState<'صباحي' | 'مسائي'>('صباحي');
  const [newShiftEmployeeId, setNewShiftEmployeeId] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<string>('0');

  // Close Shift Form State
  const [actualClosingCash, setActualClosingCash] = useState<string>('');
  const [handoverDestination, setHandoverDestination] = useState<string>('توريد لخزينة الإدارة (فرع عمر أفندي)');
  const [handoverReceiver, setHandoverReceiver] = useState<string>('');
  const [discrepancyReason, setDiscrepancyReason] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');

  // Shift Details / Edit / Print Modal State
  const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<ShiftSession | null>(null);
  const [isEditingShift, setIsEditingShift] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{
    openingDrawerBalance: number;
    actualClosingCash: number;
    discrepancyReason: string;
    handoverDestination: string;
    handoverReceiverName: string;
    closingNotes: string;
  }>({
    openingDrawerBalance: 0,
    actualClosingCash: 0,
    discrepancyReason: '',
    handoverDestination: '',
    handoverReceiverName: '',
    closingNotes: '',
  });

  // Table Filters & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const loadData = async () => {
    try {
      const serverShifts = await fetchShiftsFromServer();
      setShifts(serverShifts);
      setEmployees(getEmployees());
    } catch (e) {
      console.error('Error loading shifts from DB:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user?.branch) {
      setSelectedBranch(user.branch);
      if (!isAdmin && !isSuperAdmin) {
        setBranchFilter(user.branch);
      } else {
        setBranchFilter('all');
      }
    }
  }, [user, isAdmin, isSuperAdmin]);

  const activeShift = useMemo(() => {
    return shifts.find(s => normalizeBranchName(s.branch) === normalizeBranchName(selectedBranch) && s.status === 'OPEN');
  }, [shifts, selectedBranch]);

  const previousShiftBalance = useMemo(() => {
    const prev = shifts.find(s => 
      normalizeBranchName(s.branch) === normalizeBranchName(selectedBranch) && 
      s.status === 'CLOSED'
    );
    if (!prev) return 0;
    return Number(prev.actualClosingCash !== null && prev.actualClosingCash !== undefined ? prev.actualClosingCash : prev.expectedCashInDrawer) || 0;
  }, [shifts, selectedBranch]);

  useEffect(() => {
    if (!activeShift && previousShiftBalance > 0 && (openingBalance === '0' || openingBalance === '')) {
      setOpeningBalance(String(previousShiftBalance));
    }
  }, [selectedBranch, previousShiftBalance, activeShift]);

  const branchEmployees = useMemo(() => {
    return employees.filter(e => normalizeBranchName(e.branch) === normalizeBranchName(selectedBranch));
  }, [employees, selectedBranch]);

  const allEmployeesList = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach(e => {
      if (e.name) map.set(e.id || e.name, e.name);
    });
    shifts.forEach(s => {
      if (s.employeeName && s.employeeId) {
        map.set(s.employeeId, s.employeeName);
      } else if (s.employeeName) {
        map.set(s.employeeName, s.employeeName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [employees, shifts]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (branchFilter !== 'all') count++;
    if (typeFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (employeeFilter !== 'all') count++;
    if (startDateFilter) count++;
    if (endDateFilter) count++;
    if (dateFilter !== 'all') count++;
    return count;
  }, [branchFilter, typeFilter, statusFilter, employeeFilter, startDateFilter, endDateFilter, dateFilter]);

  const handleResetFilters = () => {
    setBranchFilter('all');
    setTypeFilter('all');
    setStatusFilter('all');
    setEmployeeFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
    setDateFilter('all');
    setSearchQuery('');
  };

  // Filter shifts based on filters & quick date buttons
  const filteredShifts = useMemo(() => {
    return shifts.filter(s => {
      // Branch filter
      if (branchFilter !== 'all' && normalizeBranchName(s.branch) !== normalizeBranchName(branchFilter)) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && s.shiftType !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false;
      }

      // Employee filter
      if (employeeFilter !== 'all') {
        if (s.employeeId !== employeeFilter && s.employeeName !== employeeFilter) {
          return false;
        }
      }

      // Specific Date Range
      if (startDateFilter) {
        const shiftDateStr = new Date(s.startTime).toISOString().split('T')[0];
        if (shiftDateStr < startDateFilter) return false;
      }
      if (endDateFilter) {
        const shiftDateStr = new Date(s.startTime).toISOString().split('T')[0];
        if (shiftDateStr > endDateFilter) return false;
      }

      // Quick Date filter
      if (dateFilter !== 'all') {
        const shiftDate = new Date(s.startTime);
        const shiftEndDate = s.endTime ? new Date(s.endTime) : shiftDate;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
        const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        if (dateFilter === 'today') {
          const isToday = shiftDate >= startOfToday || shiftEndDate >= startOfToday || s.status === 'OPEN';
          if (!isToday) return false;
        } else if (dateFilter === 'yesterday') {
          if ((shiftDate < startOfYesterday || shiftDate >= startOfToday) && (shiftEndDate < startOfYesterday || shiftEndDate >= startOfToday)) return false;
        } else if (dateFilter === 'week') {
          if (shiftDate < startOfWeek && shiftEndDate < startOfWeek) return false;
        } else if (dateFilter === 'month') {
          if (shiftDate < startOfMonth && shiftEndDate < startOfMonth) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchEmp = s.employeeName?.toLowerCase().includes(q);
        const matchBranch = s.branch?.toLowerCase().includes(q);
        const matchType = s.shiftType?.toLowerCase().includes(q);
        const matchReceiver = s.handoverReceiverName?.toLowerCase().includes(q);
        const matchNotes = s.closingNotes?.toLowerCase().includes(q);
        const matchReason = s.discrepancyReason?.toLowerCase().includes(q);
        if (!matchEmp && !matchBranch && !matchType && !matchReceiver && !matchNotes && !matchReason) {
          return false;
        }
      }

      return true;
    });
  }, [shifts, branchFilter, typeFilter, statusFilter, employeeFilter, startDateFilter, endDateFilter, dateFilter, searchQuery]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [branchFilter, typeFilter, statusFilter, employeeFilter, startDateFilter, endDateFilter, dateFilter, searchQuery, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / pageSize));
  const paginatedShifts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredShifts.slice(start, start + pageSize);
  }, [filteredShifts, currentPage, pageSize]);

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return `${d.toLocaleDateString('ar-EG')} - ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoStr;
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === newShiftEmployeeId);
    if (!emp) {
      alert('برجاء اختيار الموظف / الكاشير المسؤول عن الوردية');
      return;
    }

    const created = await startNewShift({
      branch: selectedBranch,
      shiftType: newShiftType,
      employeeId: emp.id,
      employeeName: emp.name,
      openingDrawerBalance: parseFloat(openingBalance) || 0,
    });

    await loadData();
    alert(`تم فتح الوردية الـ (${newShiftType}) بنجاح للموظف ${emp.name} بعهدة ${created.openingDrawerBalance} ج وحفظها بقاعدة البيانات`);
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    const actual = parseFloat(actualClosingCash);
    if (isNaN(actual)) {
      alert('برجاء إدخال النقدية الفعلية الموجودة بالدرج');
      return;
    }

    const closePayload = {
      shiftId: activeShift.id,
      actualClosingCash: actual,
      discrepancyReason,
      handoverDestination,
      handoverReceiverName: handoverReceiver,
      closingNotes,
    };

    const closed = await closeActiveShift(closePayload);
    await loadData();
    setActualClosingCash('');
    setDiscrepancyReason('');
    setClosingNotes('');
    if (closed) setSelectedShiftForDetails(closed);
  };

  const handleOpenEdit = (s: ShiftSession) => {
    setEditForm({
      openingDrawerBalance: s.openingDrawerBalance || 0,
      actualClosingCash: s.actualClosingCash ?? s.expectedCashInDrawer,
      discrepancyReason: s.discrepancyReason || '',
      handoverDestination: s.handoverDestination || 'توريد لخزينة الإدارة (فرع عمر أفندي)',
      handoverReceiverName: s.handoverReceiverName || '',
      closingNotes: s.closingNotes || '',
    });
    setIsEditingShift(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShiftForDetails) return;

    const expected = (Number(editForm.openingDrawerBalance) || 0) + (selectedShiftForDetails.cashSales || 0) - ((selectedShiftForDetails.expensesPaid || 0) + (selectedShiftForDetails.advancesPaid || 0));
    const discrepancy = Number(editForm.actualClosingCash) - expected;

    const updated: ShiftSession = {
      ...selectedShiftForDetails,
      openingDrawerBalance: Number(editForm.openingDrawerBalance) || 0,
      actualClosingCash: Number(editForm.actualClosingCash) || 0,
      expectedCashInDrawer: expected,
      cashDiscrepancy: discrepancy,
      discrepancyReason: editForm.discrepancyReason,
      handoverDestination: editForm.handoverDestination,
      handoverReceiverName: editForm.handoverReceiverName,
      closingNotes: editForm.closingNotes,
    };

    try {
      await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {}

    await loadData();
    setSelectedShiftForDetails(updated);
    setIsEditingShift(false);
    alert('تم تحديث وتثبيت بيانات الوردية في قاعدة البيانات بنجاح 💾');
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل من سجل الورديات نهائياً؟')) return;

    try {
      await fetch(`/api/shifts?id=${encodeURIComponent(shiftId)}`, {
        method: 'DELETE',
      });
    } catch (err) {}

    await loadData();
    setSelectedShiftForDetails(null);
    alert('تم حذف الوردية من قاعدة البيانات بنجاح');
  };

  // Discrepancy calculation for active closing
  const expectedCash = activeShift ? (activeShift.openingDrawerBalance + activeShift.cashSales - (activeShift.expensesPaid + activeShift.advancesPaid)) : 0;
  const currentActual = parseFloat(actualClosingCash || '0');
  const currentDiff = activeShift && actualClosingCash ? currentActual - expectedCash : 0;

  const handlePrintZReport = (shift: ShiftSession) => {
    const bCfg = getBranchConfig(shift.branch);
    const branchPhones = [bCfg.landline ? `ت: ${bCfg.landline}` : '', bCfg.phone ? `م: ${bCfg.phone}` : ''].filter(Boolean).join(' | ');
    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
      <meta charset="UTF-8"><title>تقرير إغلاق وردية - ${shift.id}</title>
      <style>
        @page { size: 80mm 297mm; margin: 0; }
        * { box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
        body { font-family: 'Cairo', system-ui, -apple-system, sans-serif; direction:rtl; color:#000; font-size:8.5pt; width:68mm; max-width:68mm; margin:0 auto; padding: 2mm 1.5mm; }
        .center { text-align:center; }
        .brand { font-weight:900; font-size:11pt; letter-spacing:-0.2px; }
        .branch-title { font-weight:800; font-size:9.5pt; margin-top:0.5mm; }
        .sub { font-size:7.5pt; color:#222; margin-top:0.5mm; line-height:1.2; }
        .divider { border-top:1px dashed #000; margin:1.5mm 0; }
        .badge { display:inline-block; font-weight:900; font-size:8.5pt; margin-top:1.5mm; background:#000; color:#fff; padding:0.8mm 2.5mm; border-radius:3px; }
        .totals { width:100%; border-collapse:collapse; margin-top:1mm; }
        .totals td { padding: 0.8mm 0.5mm; font-size:8.5pt; }
        .totals .lbl { color:#111; font-weight:700; }
        .totals .v { text-align:left; font-family:monospace; font-weight:900; white-space:nowrap; padding-left:1mm; }
        .total-row td { font-size:10pt; font-weight:900; border-top:1.5px solid #000; border-bottom:1.5px solid #000; padding:1.5mm 0.5mm; }
        .foot { text-align:center; font-size:7.5pt; color:#222; margin-top:2.5mm; line-height:1.3; }
      </style></head><body>
        <div class="center">
          <div class="brand">مؤسسة كشك للأقمشة والستائر</div>
          <div class="branch-title">👑 ${bCfg.name}</div>
          <div class="sub">${bCfg.address}</div>
          ${branchPhones ? `<div class="sub" style="font-family:monospace; font-weight:bold;">${branchPhones}</div>` : ''}
          <div class="badge">تقرير تقفيل الوردية (Z-Report)</div>
        </div>
        <div class="divider"></div>
        <div style="display:flex; justify-content:space-between; font-size:8pt; font-weight:bold;">
          <span>الوردية: <b style="font-family:monospace;">#${shift.id.slice(-6)}</b></span>
          <span style="font-weight:900; background:#f0f0f0; padding:0.5mm 1.5mm; border-radius:2px;">${shift.shiftType === 'صباحي' ? '☀️ صباحي' : '🌙 مسائي'}</span>
        </div>
        <div style="font-size:8.5pt; margin-top:1mm; display:flex; justify-content:space-between;">
          <span>المسؤول: <b>${shift.employeeName}</b></span>
          <span style="font-size:7.5pt; color:#555;">${shift.status === 'CLOSED' ? '🔒 مغلقة ومسلمة' : '🟢 قيد التشغيل'}</span>
        </div>
        <div style="font-size:7.5pt; margin-top:0.5mm; display:flex; justify-content:space-between; color:#333;">
          <span>بداية الوردية:</span>
          <span style="font-family:monospace;">${new Date(shift.startTime).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
        ${shift.endTime ? `
        <div style="font-size:7.5pt; margin-top:0.5mm; display:flex; justify-content:space-between; color:#333;">
          <span>إغلاق الوردية:</span>
          <span style="font-family:monospace;">${new Date(shift.endTime).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>` : ''}
        
        <div class="divider"></div>
        <div style="font-weight:900; font-size:8pt; margin-bottom:0.5mm;">📊 تفاصيل مبيعات الوردية:</div>
        <table class="totals">
          <tr><td class="lbl">عهدة البداية (افتتاح):</td><td class="v">${(shift.openingDrawerBalance || 0).toLocaleString()} ج.م</td></tr>
          <tr><td class="lbl">💵 مبيعات كاش بالدرج:</td><td class="v">${(shift.cashSales || 0).toLocaleString()} ج.م</td></tr>
          ${(shift.instapaySales || 0) > 0 ? `<tr><td class="lbl">⚡ مبيعات إنستاباي:</td><td class="v">${shift.instapaySales.toLocaleString()} ج.م</td></tr>` : ''}
          ${(shift.vodafoneSales || 0) > 0 ? `<tr><td class="lbl">📱 مبيعات فودافون كاش:</td><td class="v">${shift.vodafoneSales.toLocaleString()} ج.م</td></tr>` : ''}
          ${(shift.visaSales || 0) > 0 ? `<tr><td class="lbl">💳 مبيعات فيزا / شبكة:</td><td class="v">${shift.visaSales.toLocaleString()} ج.م</td></tr>` : ''}
          <tr class="total-row"><td>إجمالي مبيعات الوردية:</td><td class="v">${(shift.totalSales || 0).toLocaleString()} ج.م</td></tr>
        </table>

        <div class="divider"></div>
        <div style="font-weight:900; font-size:8pt; margin-bottom:0.5mm;">💰 جرد وتسوية نقدية الدرج:</div>
        <table class="totals">
          ${(shift.expensesPaid + shift.advancesPaid) > 0 ? `
            <tr><td class="lbl">مصروفات وسلف خارجة:</td><td class="v">-${(shift.expensesPaid + shift.advancesPaid).toLocaleString()} ج.م</td></tr>
          ` : ''}
          <tr><td class="lbl" style="font-weight:800;">النقدية المحسوبة بالدرج:</td><td class="v">${(shift.expectedCashInDrawer || 0).toLocaleString()} ج.م</td></tr>
          <tr style="background:#f5f5f5;"><td class="lbl" style="font-weight:900;">النقدية الفعلية المحصية:</td><td class="v" style="font-weight:900; font-size:9pt;">${((shift.actualClosingCash ?? shift.expectedCashInDrawer) || 0).toLocaleString()} ج.م</td></tr>
          <tr class="total-row">
            <td>حالة المطابقة (الفارق):</td>
            <td class="v" style="font-size:9pt;">
              ${(shift.cashDiscrepancy || 0) === 0 ? '✓ مطابق (0)' : (shift.cashDiscrepancy || 0) > 0 ? `+${shift.cashDiscrepancy} (زيادة)` : `${shift.cashDiscrepancy} (عجز)`}
            </td>
          </tr>
          ${shift.discrepancyReason ? `<tr><td colspan="2" style="font-size:7.5pt; color:#555; padding-top:1mm;">سبب الفارق: <b>${shift.discrepancyReason}</b></td></tr>` : ''}
          ${shift.handoverDestination ? `<tr><td class="lbl">جهة التسليم:</td><td class="v" style="font-family:sans-serif; font-size:7.5pt;">${shift.handoverDestination}</td></tr>` : ''}
          ${shift.handoverReceiverName ? `<tr><td class="lbl">المستلم:</td><td class="v" style="font-family:sans-serif; font-size:7.5pt;">${shift.handoverReceiverName}</td></tr>` : ''}
          ${shift.closingNotes ? `<tr><td colspan="2" style="font-size:7.5pt; color:#555; padding-top:1mm;">ملاحظات: ${shift.closingNotes}</td></tr>` : ''}
        </table>

        <div class="divider"></div>
        <div class="foot">
          <div style="font-weight:bold; font-size:8pt;">شكراً لتعاملكم مع مؤسسة كشك للأقمشة والستائر ✨</div>
          <div>تمت مراجعة وتسليم الخزينة والدرج بنجاح</div>
          <div style="font-family:monospace; font-size:7pt; color:#666; margin-top:1mm;">تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}</div>
        </div>
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <PageShell title="الورديات" badge="الورديات والدرج">
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
                    <span className="font-black text-sm text-slate-900">{activeShift.shiftType === 'صباحي' ? '☀️ صباحي' : '🌙 مسائي'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-bold block">المسؤول / الكاشير</span>
                    <span className="font-black text-sm text-slate-900">{activeShift.employeeName}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 font-bold block">عهدة بداية الوردية</span>
                    <span className="font-mono font-black text-sm text-slate-900">{activeShift.openingDrawerBalance.toLocaleString()}</span>
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
                      <span className="font-mono font-black text-emerald-900">{activeShift.cashSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">⚡ إنستاباي:</span>
                      <span className="font-mono font-black text-blue-900">{activeShift.instapaySales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">📱 فودافون كاش:</span>
                      <span className="font-mono font-black text-red-900">{activeShift.vodafoneSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">💳 فيزا / كارت:</span>
                      <span className="font-mono font-black text-purple-900">{activeShift.visaSales.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="border-t border-emerald-200 pt-2 flex justify-between font-black text-sm text-emerald-950">
                    <span>إجمالي المبيعات:</span>
                    <span className="font-mono">{activeShift.totalSales.toLocaleString()}</span>
                  </div>
                </div>

                {/* Expected In Drawer */}
                <div className="p-3 bg-slate-900 text-white rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400 block">النقدية المتوقع وجودها بالدرج:</span>
                    <span className="text-[10px] text-slate-400">عهدة أولية + كاش مبيعات - سلف ومصروفات</span>
                  </div>
                  <span className="font-mono font-black text-lg text-amber-400">{expectedCash.toLocaleString()}</span>
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
                      <span>صباحي</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewShiftType('مسائي')}
                      className={`py-3 rounded-2xl text-xs font-black border-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        newShiftType === 'مسائي' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span>🌙</span>
                      <span>مسائي</span>
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
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700">عهدة بداية الوردية (الدرج نقداً) *</label>
                    {previousShiftBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setOpeningBalance(String(previousShiftBalance))}
                        className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                      >
                        💡 استلام عهدة الوردية السابقة ({previousShiftBalance.toLocaleString()} ج) ⤵️
                      </button>
                    )}
                  </div>
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
              <span>تسليم الدرج وتقفيل الوردية</span>
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
                      {currentDiff === 0 ? '✓ مطابق تماماً (0)' : currentDiff < 0 ? `⚠️ عجز بالدرج (${currentDiff})` : `🔵 زيادة بالدرج (+${currentDiff})`}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">جهة تسليم نقدية الإغلاق *</label>
                  <select
                    value={handoverDestination}
                    onChange={(e) => setHandoverDestination(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="توريد لخزينة الإدارة (فرع عمر أفندي)">توريد لخزينة الإدارة (فرع عمر أفندي)</option>
                    <option value="تسليم لوردية المساء">تسليم لوردية المساء (كاشير المساء)</option>
                    <option value="إبقاء بالدرج لليوم التالي">إبقاء بالدرج كعهدة افتتاحية لليوم التالي</option>
                    <option value="توريد لخزينة الفرع الرئيسي">توريد لخزينة الفرع الرئيسي</option>
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

        {/* Shift History Log Table with Search, Date Quick Filters, and Pagination */}
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          
          {/* Header & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>📋</span>
                <span>سجل تقفيل الورديات والأدراج السابقة</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">انقر على أي وردية لعرض كافة الحركات والتفاصيل أو التعديل والطباعة</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                المعروض: {filteredShifts.length} من {shifts.length} وردية
              </span>
            </div>
          </div>

          {/* Quick Branch Filter Bar for Admin */}
          {canManage && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap ml-1">تصفية الفرع:</span>
              <button
                type="button"
                onClick={() => setBranchFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  branchFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs font-black'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                🏢 جميع الفروع
              </button>
              {BRANCHES_LIST.map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranchFilter(b.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    branchFilter === b.name
                      ? 'bg-emerald-700 text-white shadow-xs font-black'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>🏪</span>
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Date Filters, Search Toolbar & Filter Modal Trigger */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            
            {/* Quick Date Range Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap ml-1">الفترة:</span>
              {[
                { id: 'yesterday', label: 'أمس' },
                { id: 'today', label: 'اليوم' },
                { id: 'week', label: 'الأسبوع' },
                { id: 'month', label: 'الشهر' },
                { id: 'all', label: 'الكل' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDateFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    dateFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs font-black'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Box & Filter Button */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input
                  type="text"
                  placeholder="بحث بالمسؤول، الفرع، الملاحظات..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
                <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  search
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  activeFiltersCount > 0
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-2 ring-amber-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                }`}
              >
                <span>⚙️</span>
                <span>تصفية</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-slate-950 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active Filter Tags Bar (Shows when filters are applied) */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="text-[11px] font-bold text-slate-500">الفلاتر المطبقة:</span>
              
              {branchFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px]">
                  <span>الفرع: {branchFilter}</span>
                  <button type="button" onClick={() => setBranchFilter('all')} className="hover:text-amber-700 font-bold">✕</button>
                </span>
              )}

              {typeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold text-[11px]">
                  <span>النوع: {typeFilter}</span>
                  <button type="button" onClick={() => setTypeFilter('all')} className="hover:text-indigo-700 font-bold">✕</button>
                </span>
              )}

              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-[11px]">
                  <span>الحالة: {statusFilter === 'OPEN' ? 'مفتوحة' : 'مغلقة'}</span>
                  <button type="button" onClick={() => setStatusFilter('all')} className="hover:text-emerald-700 font-bold">✕</button>
                </span>
              )}

              {employeeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 font-bold text-[11px]">
                  <span>الموظف: {allEmployeesList.find(e => e.id === employeeFilter)?.name || employeeFilter}</span>
                  <button type="button" onClick={() => setEmployeeFilter('all')} className="hover:text-purple-700 font-bold">✕</button>
                </span>
              )}

              {(startDateFilter || endDateFilter) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 font-bold text-[11px]">
                  <span>التاريخ: {startDateFilter || 'البداية'} ⬅️ {endDateFilter || 'الآن'}</span>
                  <button type="button" onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }} className="hover:text-blue-700 font-bold">✕</button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold underline mr-2 cursor-pointer"
              >
                مسح كل الفلاتر
              </button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">بداية الوردية</th>
                  <th className="p-3">نهاية الوردية</th>
                  <th className="p-3">الفرع</th>
                  <th className="p-3">النوع</th>
                  <th className="p-3">المسؤول</th>
                  <th className="p-3 font-mono">افتتاح</th>
                  <th className="p-3 font-mono">المبيعات</th>
                  <th className="p-3 font-mono">الفعلي بالدرج</th>
                  <th className="p-3 font-mono">الفارق</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedShifts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                      لا توجد نتائج مطابقة لخيارات البحث والتصفية
                    </td>
                  </tr>
                ) : (
                  paginatedShifts.map((s) => (
                    <tr 
                      key={s.id} 
                      onClick={() => { setSelectedShiftForDetails(s); setIsEditingShift(false); }}
                      className="hover:bg-amber-50/70 transition-colors cursor-pointer group"
                      title="انقر لعرض تفاصيل وحركات الوردية"
                    >
                      <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                        {formatDateTime(s.startTime)}
                      </td>
                      <td className="p-3 font-bold text-slate-700 whitespace-nowrap">
                        {s.endTime ? (
                          formatDateTime(s.endTime)
                        ) : (
                          <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            قيد التشغيل
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-800">{s.branch}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.shiftType === 'صباحي' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {s.shiftType}
                        </span>
                      </td>
                      <td className="p-3 font-bold">{s.employeeName}</td>
                      <td className="p-3 font-mono">{s.openingDrawerBalance.toLocaleString()}</td>
                      <td className="p-3 font-mono font-black text-emerald-800">{s.totalSales.toLocaleString()}</td>
                      <td className="p-3 font-mono font-black text-slate-900">{(s.actualClosingCash ?? s.expectedCashInDrawer).toLocaleString()}</td>
                      <td className="p-3 font-mono font-bold">
                        {s.cashDiscrepancy !== undefined && s.cashDiscrepancy !== null ? (
                          <span className={s.cashDiscrepancy === 0 ? 'text-emerald-700' : s.cashDiscrepancy < 0 ? 'text-rose-700' : 'text-blue-700'}>
                            {s.cashDiscrepancy > 0 ? `+${s.cashDiscrepancy}` : s.cashDiscrepancy}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {s.status === 'OPEN' ? 'مفتوحة' : 'مغلقة'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">
                عرض {filteredShifts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredShifts.length)} من {filteredShifts.length} وردية
              </span>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-bold">عدد السطور:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-slate-100 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 self-center sm:self-auto">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  السابق
                </button>
                <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 font-mono font-black rounded-xl">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  التالي
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Shift Details & Actions Popup Modal */}
        {selectedShiftForDetails && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white max-w-lg w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">
                      {isEditingShift ? '✏️ تعديل بيانات الوردية' : `تفاصيل حركات الوردية (${selectedShiftForDetails.shiftType})`}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">👑 {selectedShiftForDetails.branch}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedShiftForDetails(null); setIsEditingShift(false); }} 
                  className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {isEditingShift ? (
                /* Admin Edit Form */
                <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">عهدة الافتتاح بالدرج (ج.م) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editForm.openingDrawerBalance}
                        onChange={e => setEditForm({ ...editForm, openingDrawerBalance: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">النقدية الفعلية المحصية (ج.م) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={editForm.actualClosingCash}
                        onChange={e => setEditForm({ ...editForm, actualClosingCash: Number(e.target.value) })}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-black text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">سبب العجز أو الزيادة</label>
                    <input
                      type="text"
                      value={editForm.discrepancyReason}
                      onChange={e => setEditForm({ ...editForm, discrepancyReason: e.target.value })}
                      placeholder="توضيح سبب الفارق إن وجد..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">جهة تسليم النقدية</label>
                    <input
                      type="text"
                      value={editForm.handoverDestination}
                      onChange={e => setEditForm({ ...editForm, handoverDestination: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">اسم المستلم للعهدة</label>
                    <input
                      type="text"
                      value={editForm.handoverReceiverName}
                      onChange={e => setEditForm({ ...editForm, handoverReceiverName: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">ملاحظات التقفيل</label>
                    <textarea
                      rows={2}
                      value={editForm.closingNotes}
                      onChange={e => setEditForm({ ...editForm, closingNotes: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-black rounded-xl cursor-pointer"
                    >
                      حفظ وتأكيد التعديلات 💾
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingShift(false)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                /* Shift Details View */
                <div className="space-y-3.5 text-xs">
                  {/* Meta Bar */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 block text-[11px]">المسؤول عن الوردية:</span>
                      <strong className="text-slate-900 font-black">{selectedShiftForDetails.employeeName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">نوع الوردية:</span>
                      <strong className="text-slate-900 font-bold">{selectedShiftForDetails.shiftType}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">وقت البداية:</span>
                      <span className="font-mono text-slate-700 font-bold">{formatDateTime(selectedShiftForDetails.startTime)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">وقت الإغلاق:</span>
                      <span className="font-mono text-slate-700 font-bold">{selectedShiftForDetails.endTime ? formatDateTime(selectedShiftForDetails.endTime) : 'قيد التشغيل'}</span>
                    </div>
                  </div>

                  {/* Financial & Sales Breakdown */}
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl space-y-2">
                    <span className="font-black text-xs text-emerald-950 block">حركات ومبيعات الوردية:</span>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div className="flex justify-between">
                        <span>💵 كاش بالدرج:</span>
                        <span className="font-mono font-bold">{selectedShiftForDetails.cashSales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>⚡ إنستاباي:</span>
                        <span className="font-mono font-bold">{selectedShiftForDetails.instapaySales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>📱 فودافون كاش:</span>
                        <span className="font-mono font-bold">{selectedShiftForDetails.vodafoneSales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>💳 فيزا / كارت:</span>
                        <span className="font-mono font-bold">{selectedShiftForDetails.visaSales.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="border-t border-emerald-200 pt-1.5 flex justify-between font-black text-sm text-emerald-950">
                      <span>إجمالي المبيعات المحققة:</span>
                      <span className="font-mono">{selectedShiftForDetails.totalSales.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Drawer Balancing Card */}
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2 font-mono">
                    <div className="flex justify-between text-slate-600 font-sans">
                      <span>عهدة الافتتاح (أول المدة):</span>
                      <span className="font-mono font-bold">{selectedShiftForDetails.openingDrawerBalance.toLocaleString()}</span>
                    </div>
                    {(selectedShiftForDetails.expensesPaid + selectedShiftForDetails.advancesPaid) > 0 && (
                      <div className="flex justify-between text-rose-700 font-sans">
                        <span>مصروفات وسلف مسحوبة من الدرج:</span>
                        <span className="font-mono font-bold">-{(selectedShiftForDetails.expensesPaid + selectedShiftForDetails.advancesPaid).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-900 font-bold border-t pt-1 font-sans">
                      <span>النقدية المتوقعة بالدرج:</span>
                      <span className="font-mono">{selectedShiftForDetails.expectedCashInDrawer.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-950 font-black text-sm font-sans">
                      <span>النقدية الفعلية المحصية:</span>
                      <span className="font-mono text-emerald-900">{(selectedShiftForDetails.actualClosingCash ?? selectedShiftForDetails.expectedCashInDrawer).toLocaleString()}</span>
                    </div>
                    {selectedShiftForDetails.cashDiscrepancy !== undefined && selectedShiftForDetails.cashDiscrepancy !== null && (
                      <div className={`flex justify-between font-black font-sans p-2 rounded-xl border ${
                        selectedShiftForDetails.cashDiscrepancy === 0 
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                          : selectedShiftForDetails.cashDiscrepancy < 0 
                          ? 'bg-rose-100 text-rose-900 border-rose-300' 
                          : 'bg-blue-100 text-blue-900 border-blue-300'
                      }`}>
                        <span>حالة الدرج (الفارق):</span>
                        <span className="font-mono text-sm">
                          {selectedShiftForDetails.cashDiscrepancy === 0 
                            ? 'مطابق تماماً (0)' 
                            : selectedShiftForDetails.cashDiscrepancy < 0 
                            ? `عجز: ${selectedShiftForDetails.cashDiscrepancy}` 
                            : `زيادة: +${selectedShiftForDetails.cashDiscrepancy}`}
                        </span>
                      </div>
                    )}
                    {selectedShiftForDetails.discrepancyReason && (
                      <div className="text-[11px] text-rose-800 font-sans">
                        <span className="font-bold">سبب الفارق: </span>
                        <span>{selectedShiftForDetails.discrepancyReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Handover Details */}
                  {(selectedShiftForDetails.handoverDestination || selectedShiftForDetails.handoverReceiverName || selectedShiftForDetails.closingNotes) && (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1 text-[11px] text-slate-700">
                      {selectedShiftForDetails.handoverDestination && (
                        <div><span className="font-bold text-slate-900">جهة التسليم: </span>{selectedShiftForDetails.handoverDestination}</div>
                      )}
                      {selectedShiftForDetails.handoverReceiverName && (
                        <div><span className="font-bold text-slate-900">المستلم: </span>{selectedShiftForDetails.handoverReceiverName}</div>
                      )}
                      {selectedShiftForDetails.closingNotes && (
                        <div><span className="font-bold text-slate-900">ملاحظات: </span>{selectedShiftForDetails.closingNotes}</div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => handlePrintZReport(selectedShiftForDetails)}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>🖨️ طباعة تقرير الوردية (Z-Report)</span>
                    </button>

                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(selectedShiftForDetails)}
                          className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                          title="تعديل بيانات الوردية (للإدارة)"
                        >
                          <span>✏️ تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShift(selectedShiftForDetails.id)}
                          className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 cursor-pointer"
                          title="حذف الوردية (للإدارة)"
                        >
                          <span>🗑️</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedShiftForDetails(null)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Filter Popup Modal */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white max-w-lg w-full rounded-3xl p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚙️</span>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">تصفية سجل الورديات والأدراج</h3>
                    <p className="text-xs text-slate-500">اختر معايير التصفية والبحث المتقدم</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFilterModal(false)} 
                  className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              {/* Filter Form Controls */}
              <div className="space-y-4 text-xs">
                
                {/* 1. Branch Filter */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
                    <span>🏪 الفرع:</span>
                    {branchFilter !== 'all' && (
                      <span className="text-amber-800 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded">محدد</span>
                    )}
                  </label>
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                  >
                    <option value="all">🌐 كل الفروع (الـ 5 فروع)</option>
                    {BRANCHES_LIST.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                {/* 2. Shift Type Filter */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1.5">⏰ نوع الوردية:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'all', label: 'الكل' },
                      { id: 'صباحي', label: '☀️ صباحي' },
                      { id: 'مسائي', label: '🌙 مسائي' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTypeFilter(t.id)}
                        className={`py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                          typeFilter === t.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Shift Status Filter */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1.5">🔒 حالة الوردية:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'all', label: 'كل الحالات' },
                      { id: 'OPEN', label: '🟢 قيد التشغيل' },
                      { id: 'CLOSED', label: '🔒 مغلقة ومسلّمة' },
                    ].map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setStatusFilter(s.id)}
                        className={`py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                          statusFilter === s.id
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Employee Filter */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1.5 flex items-center justify-between">
                    <span>👤 الموظف / المسؤول عن الوردية:</span>
                    {employeeFilter !== 'all' && (
                      <span className="text-purple-800 font-bold text-[11px] bg-purple-50 px-2 py-0.5 rounded">محدد</span>
                    )}
                  </label>
                  <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                  >
                    <option value="all">👥 كل الموظفين والمسؤولين</option>
                    {allEmployeesList.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>

                {/* 5. Date Range Filter */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <span className="font-black text-slate-800 block text-xs">🗓️ تحديد الفترة والتاريخ:</span>
                  
                  {/* Quick Tabs inside modal */}
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { id: 'yesterday', label: 'أمس' },
                      { id: 'today', label: 'اليوم' },
                      { id: 'week', label: 'الأسبوع' },
                      { id: 'month', label: 'الشهر' },
                      { id: 'all', label: 'الكل' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setDateFilter(tab.id as any);
                          setStartDateFilter('');
                          setEndDateFilter('');
                        }}
                        className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          dateFilter === tab.id && !startDateFilter && !endDateFilter
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Date Inputs */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ:</span>
                      <input
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => {
                          setStartDateFilter(e.target.value);
                          setDateFilter('all');
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ:</span>
                      <input
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => {
                          setEndDateFilter(e.target.value);
                          setDateFilter('all');
                        }}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer text-center"
                >
                  تطبيق الفلاتر ({filteredShifts.length} وردية مطابقة) ✨
                </button>

                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors cursor-pointer"
                  >
                    مسح الكل
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
}

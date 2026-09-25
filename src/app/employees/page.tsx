'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import {
  Employee, AttendanceRecord, EmployeeAdvance,
  getEmployees, saveEmployee, deleteEmployee,
  getAttendance, saveAttendanceRecord, deleteAttendanceRecord,
  getAdvances, saveAdvance, deleteAdvance,
} from '@/lib/employeeStore';
import { BRANCHES_LIST, normalizeBranchName } from '@/lib/branches';
import { formatDateOnly, getTodayDateStr, getYesterdayDateStr } from '@/lib/dateUtils';
import { useCurrentUser } from '@/lib/useCurrentUser';
import Pagination from '@/components/Pagination';

export default function EmployeesManagementPage() {
  const { user, isAdmin, isSuperAdmin } = useCurrentUser();
  const canViewWages = isAdmin || isSuperAdmin;

  const formatTimeAr = (timeStr?: string): string => {
    if (!timeStr) return '—';
    return timeStr
      .replace(/AM/i, 'ص')
      .replace(/PM/i, 'م')
      .trim();
  };

  const getArabicDayName = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T12:00:00');
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      return days[d.getDay()] || '';
    } catch {
      return '';
    }
  };

  const arabicDigitsToEnglish = (s: string): string =>
    s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  const arabicTimeTo24h = (t?: string): string => {
    if (!t) return '';
    const normalized = arabicDigitsToEnglish(t).trim();
    const m = normalized.match(/(\d{1,2}):(\d{2})\s*(ص|م|AM|PM)?/i);
    if (!m) return '';
    let h = parseInt(m[1], 10);
    const min = m[2];
    const period = (m[3] || '').toUpperCase();
    if (period === 'م' || period === 'PM') { if (h !== 12) h += 12; }
    else if (period === 'ص' || period === 'AM') { if (h === 12) h = 0; }
    return `${String(h).padStart(2, '0')}:${min}`;
  };

  const time24hToArabic = (t: string): string => {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    if (hStr === undefined || mStr === undefined) return '';
    const d = new Date();
    d.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);

  const [activeTab, setActiveTab] = useState<'attendance' | 'advances' | 'statement' | 'directory' | 'log'>('attendance');
  const [selectedBranch, setSelectedBranch] = useState<string>('الكل');
  const [attendanceDate, setAttendanceDate] = useState<string>(() => getTodayDateStr());

  // ── Tab 5: Attendance Log tab (سجل الحضور) ──
  const [logSearch, setLogSearch] = useState<string>('');
  const [logBranchFilter, setLogBranchFilter] = useState<string>('الكل');
  const [logStatusFilter, setLogStatusFilter] = useState<string>('الكل');
  const [logDateFrom, setLogDateFrom] = useState<string>('');
  const [logDateTo, setLogDateTo] = useState<string>('');
  const [logQuickFilter, setLogQuickFilter] = useState<'yesterday' | 'today' | 'week' | 'month' | 'all' | 'custom'>('all');
  const [logCurrentPage, setLogCurrentPage] = useState<number>(1);
  const logPageSize = 20;
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [editingLogRecord, setEditingLogRecord] = useState<AttendanceRecord | null>(null);
  const [logForm, setLogForm] = useState<{
    employeeId: string;
    date: string;
    status: AttendanceRecord['status'];
    checkInTime: string;
    checkOutTime: string;
    notes: string;
  }>({
    employeeId: '',
    date: getTodayDateStr(),
    status: 'حاضر',
    checkInTime: '',
    checkOutTime: '',
    notes: '',
  });
  const [savingLog, setSavingLog] = useState<boolean>(false);

  // ── Tab 2: Financial Movements Form State (سلفة / خصم / مكافأة / قبض) ──
  const [advanceEmployeeId, setAdvanceEmployeeId] = useState<string>('');
  const [advanceType, setAdvanceType] = useState<'سلفة' | 'خصم' | 'مكافأة' | 'قبض'>('سلفة');
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advanceDate, setAdvanceDate] = useState<string>(() => getTodayDateStr());
  const [advanceReason, setAdvanceReason] = useState<string>('');

  // Selected Employee for Slip Modal
  const [selectedEmpForSlip, setSelectedEmpForSlip] = useState<any | null>(null);

  // Employee Add / Edit Modal State (Admin only)
  const [showEmpModal, setShowEmpModal] = useState<boolean>(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState<{
    id?: string;
    name: string;
    branch: string;
    dailyWage: number;
    payType: 'شهري' | 'أسبوعي';
    workStartTime: string;
    workEndTime: string;
    phone: string;
    role: string;
    isActive: boolean;
  }>({
    name: '',
    branch: 'الفرع الرئيسي',
    dailyWage: 300,
    payType: 'أسبوعي',
    workStartTime: '11:00 AM',
    workEndTime: '11:30 PM',
    phone: '',
    role: 'مبيعات',
    isActive: true,
  });

  useEffect(() => {
    async function loadAll() {
      const [emps, att, adv] = await Promise.all([
        getEmployees(),
        getAttendance(),
        getAdvances(),
      ]);
      setEmployees(emps);
      setAttendance(att);
      setAdvances(adv);
    }

    loadAll();
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAdmin && !isSuperAdmin && user?.branch) {
      setSelectedBranch(user.branch);
    }
    if (!canViewWages && (activeTab === 'statement' || activeTab === 'directory' || activeTab === 'log')) {
      setActiveTab('attendance');
    }
  }, [isAdmin, isSuperAdmin, user, canViewWages, activeTab]);

  useEffect(() => { setLogCurrentPage(1); }, [logSearch, logStatusFilter, logDateFrom, logDateTo, logBranchFilter]);

  const branchFilteredEmployees = useMemo(() => {
    const activeBranch = (!isAdmin && !isSuperAdmin && user?.branch) ? user.branch : selectedBranch;
    if (activeBranch === 'الكل') return employees;
    return employees.filter(e => normalizeBranchName(e.branch) === normalizeBranchName(activeBranch));
  }, [employees, selectedBranch, isAdmin, isSuperAdmin, user]);

  const employeesByBranch = useMemo(() => {
    const map: Record<string, Employee[]> = {};
    BRANCHES_LIST.forEach(b => {
      map[b.name] = [];
    });
    
    branchFilteredEmployees.forEach(emp => {
      const bName = emp.branch || 'الفرع الرئيسي';
      if (!map[bName]) map[bName] = [];
      map[bName].push(emp);
    });

    if (selectedBranch !== 'الكل') {
      const singleMap: Record<string, Employee[]> = {};
      singleMap[selectedBranch] = map[selectedBranch] || [];
      return singleMap;
    }

    return map;
  }, [branchFilteredEmployees, selectedBranch]);

  // ── Employee Financial Calculation Helper (حساب مستحقات ومتبقي الموظف ببساطة) ──
  const getEmployeeFinancialSummary = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return null;

    // 1. حساب أيام الحضور من كافة السجلات (بما فيها الجمعة)
    const empAttendance = attendance.filter(a => a.employeeId === empId);
    let attendedDays = 0;
    let presentCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let leaveCount = 0;

    empAttendance.forEach(a => {
      if (a.status === 'حاضر') {
        attendedDays += 1;
        presentCount += 1;
      } else if (a.status === 'نصف يوم') {
        attendedDays += 0.5;
        halfDayCount += 1;
      } else if (a.status === 'غياب') {
        absentCount += 1;
      } else if (a.status === 'إجازة') {
        leaveCount += 1;
      }
    });

    const dailyWage = Number(emp.dailyWage) || 0;
    const earnedWages = attendedDays * dailyWage;

    // 2. حساب الحركات المالية (سلف، خصومات، مكافآت، وقبض سابق)
    const empMovements = advances.filter(a => a.employeeId === empId);
    let totalAdvances = 0;
    let totalDeductions = 0;
    let totalBonuses = 0;
    let totalPaid = 0;

    empMovements.forEach(m => {
      const amt = Number(m.amount) || 0;
      if (m.type === 'سلفة') totalAdvances += amt;
      else if (m.type === 'خصم') totalDeductions += amt;
      else if (m.type === 'مكافأة') totalBonuses += amt;
      else if (m.type === 'قبض') totalPaid += amt;
    });

    const totalDue = earnedWages + totalBonuses;
    const netRemaining = totalDue - (totalAdvances + totalDeductions + totalPaid);

    return {
      employee: emp,
      attendedDays,
      presentCount,
      halfDayCount,
      absentCount,
      leaveCount,
      dailyWage,
      earnedWages,
      totalAdvances,
      totalDeductions,
      totalBonuses,
      totalPaid,
      totalDue,
      netRemaining,
    };
  };

  // ── Advances/Deductions/Payrolls log — بحث + تصفية + تاريخ + باجنيشن + تعديل/حذف ──
  const [advSearch, setAdvSearch] = useState<string>('');
  const [advBranchFilter, setAdvBranchFilter] = useState<string>('الكل');
  const [advEmployeeFilter, setAdvEmployeeFilter] = useState<string>('الكل');
  const [advTypeFilter, setAdvTypeFilter] = useState<string>('الكل');
  const [advDateFrom, setAdvDateFrom] = useState<string>('');
  const [advDateTo, setAdvDateTo] = useState<string>('');
  const [advQuickDate, setAdvQuickDate] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'>('all');
  const [showAdvFilterModal, setShowAdvFilterModal] = useState<boolean>(false);
  const [advCurrentPage, setAdvCurrentPage] = useState<number>(1);
  const advPageSize = 20;
  const [showAdvEditModal, setShowAdvEditModal] = useState<boolean>(false);
  const [editingAdv, setEditingAdv] = useState<EmployeeAdvance | null>(null);
  const [advEditForm, setAdvEditForm] = useState<{
    date: string;
    type: 'سلفة' | 'خصم' | 'مكافأة' | 'قبض';
    amount: string;
    reason: string;
  }>({
    date: getTodayDateStr(),
    type: 'سلفة',
    amount: '',
    reason: '',
  });
  const [savingAdvEdit, setSavingAdvEdit] = useState<boolean>(false);

  const employeeFilterOptions = useMemo(() => {
    const activeBranch = (!isAdmin && !isSuperAdmin && user?.branch) ? user.branch : selectedBranch;
    const filtered = activeBranch === 'الكل'
      ? employees
      : employees.filter(e => normalizeBranchName(e.branch) === normalizeBranchName(activeBranch));
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [employees, selectedBranch, isAdmin, isSuperAdmin, user]);

  const activeAdvFiltersCount = useMemo(() => {
    let count = 0;
    if (advEmployeeFilter !== 'الكل') count++;
    if (advTypeFilter !== 'الكل') count++;
    if (advBranchFilter !== 'الكل') count++;
    if (advDateFrom || advDateTo || advQuickDate !== 'all') count++;
    if (advSearch.trim()) count++;
    return count;
  }, [advEmployeeFilter, advTypeFilter, advBranchFilter, advDateFrom, advDateTo, advQuickDate, advSearch]);

  const handleResetAdvFilters = () => {
    setAdvEmployeeFilter('الكل');
    setAdvTypeFilter('الكل');
    setAdvBranchFilter('الكل');
    setAdvDateFrom('');
    setAdvDateTo('');
    setAdvQuickDate('all');
    setAdvSearch('');
  };

  const setAdvQuickFilter = (mode: 'all' | 'today' | 'yesterday' | 'week' | 'month') => {
    setAdvQuickDate(mode);
    const today = getTodayDateStr();
    if (mode === 'all') {
      setAdvDateFrom('');
      setAdvDateTo('');
    } else if (mode === 'today') {
      setAdvDateFrom(today);
      setAdvDateTo(today);
    } else if (mode === 'yesterday') {
      const yesterday = getYesterdayDateStr();
      setAdvDateFrom(yesterday);
      setAdvDateTo(yesterday);
    } else if (mode === 'week') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      setAdvDateFrom(getTodayDateStr(d));
      setAdvDateTo(today);
    } else if (mode === 'month') {
      const monthStart = `${today.substring(0, 7)}-01`;
      setAdvDateFrom(monthStart);
      setAdvDateTo(today);
    }
  };

  useEffect(() => { setAdvCurrentPage(1); }, [advSearch, advBranchFilter, advEmployeeFilter, advTypeFilter, advDateFrom, advDateTo, selectedBranch]);

  const filteredAdvances = useMemo(() => {
    const activeBranch = (!isAdmin && !isSuperAdmin && user?.branch) ? user.branch : selectedBranch;
    const branchScoped = activeBranch === 'الكل'
      ? advances
      : advances.filter(a => normalizeBranchName(a.branch) === normalizeBranchName(activeBranch));
    return branchScoped
      .filter(a => advBranchFilter === 'الكل' || normalizeBranchName(a.branch) === normalizeBranchName(advBranchFilter))
      .filter(a => {
        if (advEmployeeFilter === 'الكل') return true;
        return a.employeeId === advEmployeeFilter || a.employeeName === advEmployeeFilter;
      })
      .filter(a => {
        if (advTypeFilter === 'الكل') return true;
        return a.type === advTypeFilter;
      })
      .filter(a => {
        if (advDateFrom && a.date < advDateFrom) return false;
        if (advDateTo && a.date > advDateTo) return false;
        return true;
      })
      .filter(a => {
        if (!advSearch.trim()) return true;
        const q = advSearch.trim().toLowerCase();
        return (a.employeeName || '').toLowerCase().includes(q) || (a.reason || '').toLowerCase().includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.branch.localeCompare(b.branch, 'ar'));
  }, [advances, selectedBranch, isAdmin, isSuperAdmin, user, advBranchFilter, advEmployeeFilter, advTypeFilter, advSearch, advDateFrom, advDateTo]);

  const paginatedAdvances = filteredAdvances.slice((advCurrentPage - 1) * advPageSize, advCurrentPage * advPageSize);

  const openEditRecord = (rec: EmployeeAdvance) => {
    setEditingAdv(rec);
    setAdvEditForm({
      date: rec.date,
      type: rec.type,
      amount: String(rec.amount),
      reason: rec.reason || '',
    });
    setShowAdvEditModal(true);
  };

  const handleSaveAdvEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advEditForm.amount || Number(advEditForm.amount) <= 0) {
      alert('من فضلك أدخل مبلغ صحيح أكبر من صفر');
      return;
    }
    setSavingAdvEdit(true);

    if (editingAdv) {
      const updated: EmployeeAdvance = {
        ...editingAdv,
        date: advEditForm.date,
        type: advEditForm.type,
        amount: parseFloat(advEditForm.amount),
        reason: advEditForm.reason,
        treasuryDeducted: advEditForm.type !== 'خصم',
      };
      const ok = await saveAdvance(updated);
      setSavingAdvEdit(false);
      if (!ok) {
        alert('فشل حفظ التعديل — من فضلك حاول مرة أخرى');
        return;
      }
      setAdvances(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      setShowAdvEditModal(false);
      setEditingAdv(null);
    }
  };

  const handleDeleteRecord = async (rec: EmployeeAdvance) => {
    if (!confirm(`هل أنت متأكد من حذف هذا السجل (${rec.type} للموظف ${rec.employeeName}) بقيمة ${rec.amount.toLocaleString()} ج؟`)) return;
    const previous = advances;
    setAdvances(advances.filter(a => a.id !== rec.id));
    const ok = await deleteAdvance(rec.id);
    if (!ok) {
      setAdvances(previous);
      alert('فشل حذف السجل على السيرفر — من فضلك حاول مرة أخرى');
    }
  };

  // Handlers for switching employee or type in Advance Form
  const handleSelectEmployeeForAdvance = (empId: string) => {
    setAdvanceEmployeeId(empId);
    if (advanceType === 'قبض' && empId) {
      const summary = getEmployeeFinancialSummary(empId);
      if (summary) {
        setAdvanceAmount(summary.netRemaining > 0 ? String(summary.netRemaining) : '0');
      }
    }
  };

  const handleSelectAdvanceType = (type: 'سلفة' | 'خصم' | 'مكافأة' | 'قبض') => {
    setAdvanceType(type);
    if (type === 'قبض' && advanceEmployeeId) {
      const summary = getEmployeeFinancialSummary(advanceEmployeeId);
      if (summary) {
        setAdvanceAmount(summary.netRemaining > 0 ? String(summary.netRemaining) : '0');
      }
    }
  };

  const handleQuickPayForEmployee = (empId: string) => {
    const summary = getEmployeeFinancialSummary(empId);
    setAdvanceEmployeeId(empId);
    setAdvanceType('قبض');
    setAdvanceDate(getTodayDateStr());
    setAdvanceAmount(summary && summary.netRemaining > 0 ? String(summary.netRemaining) : '0');
    setAdvanceReason('قبض راتب نقداً');
    setActiveTab('advances');
  };

  // Employee CRUD handlers
  const handleOpenAddEmp = () => {
    setEditingEmp(null);
    setEmpForm({
      name: '',
      branch: selectedBranch !== 'الكل' ? selectedBranch : 'الفرع الرئيسي',
      dailyWage: 300,
      payType: 'أسبوعي',
      workStartTime: '11:00 AM',
      workEndTime: '11:30 PM',
      phone: '',
      role: 'مبيعات',
      isActive: true,
    });
    setShowEmpModal(true);
  };

  const handleOpenEditEmp = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpForm({
      id: emp.id,
      name: emp.name,
      branch: emp.branch,
      dailyWage: emp.dailyWage,
      payType: emp.payType || 'أسبوعي',
      workStartTime: emp.workStartTime,
      workEndTime: emp.workEndTime,
      phone: emp.phone || '',
      role: emp.role || '',
      isActive: emp.isActive !== false,
    });
    setShowEmpModal(true);
  };

  const handleSaveEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name.trim()) return;

    const savedEmp: Employee = editingEmp
      ? {
          ...editingEmp,
          ...empForm,
          name: empForm.name.trim(),
          dailyWage: Number(empForm.dailyWage) || 0,
          payType: empForm.payType,
          phone: empForm.phone.trim(),
          role: empForm.role.trim(),
        }
      : {
          id: `emp_${Date.now()}`,
          name: empForm.name.trim(),
          branch: empForm.branch,
          dailyWage: Number(empForm.dailyWage) || 0,
          payType: empForm.payType,
          workStartTime: empForm.workStartTime,
          workEndTime: empForm.workEndTime,
          phone: empForm.phone.trim(),
          role: empForm.role.trim(),
          isActive: empForm.isActive,
        };

    const previousList = employees;
    const updatedList = editingEmp
      ? employees.map(e => (e.id === editingEmp.id ? savedEmp : e))
      : [...employees, savedEmp];
    setEmployees(updatedList);
    setShowEmpModal(false);

    const ok = await saveEmployee(savedEmp);
    if (ok) {
      alert(editingEmp ? 'تم تحديث وتثبيت بيانات الموظف بنجاح 💾' : 'تمت إضافة الموظف الجديد بنجاح ✨');
    } else {
      setEmployees(previousList);
      alert('فشل حفظ بيانات الموظف على السيرفر — من فضلك حاول مرة أخرى');
    }
  };

  const handleDeleteEmp = async (empId: string, empName: string) => {
    if (!confirm(`هل أنت متأكد من حذف الموظف "${empName}" من النظام؟`)) return;
    const previousList = employees;
    setEmployees(employees.filter(e => e.id !== empId));
    const ok = await deleteEmployee(empId);
    if (!ok) {
      setEmployees(previousList);
      alert('فشل حذف الموظف على السيرفر — من فضلك حاول مرة أخرى');
    }
  };

  // Attendance logic
  const handleMarkAttendance = async (emp: Employee, status: AttendanceRecord['status']) => {
    const existing = attendance.find(a => a.employeeId === emp.id && a.date === attendanceDate);
    const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const record: AttendanceRecord = existing
      ? {
          ...existing,
          status,
          checkInTime: status === 'حاضر' ? (existing.checkInTime || nowTime) : undefined,
          recordedBy: user?.name || 'مدير الفرع',
        }
      : {
          id: `att_${Date.now()}_${emp.id}`,
          date: attendanceDate,
          employeeId: emp.id,
          employeeName: emp.name,
          branch: emp.branch,
          status,
          checkInTime: status === 'حاضر' ? nowTime : undefined,
          recordedBy: user?.name || 'مدير الفرع',
        };

    const previous = attendance;
    setAttendance(existing ? attendance.map(a => (a.id === existing.id ? record : a)) : [...attendance, record]);

    const ok = await saveAttendanceRecord(record);
    if (!ok) {
      setAttendance(previous);
      alert('فشل حفظ الحضور على السيرفر — من فضلك حاول مرة أخرى');
    }
  };

  const getAttendanceForEmp = (empId: string, dateStr: string) => {
    return attendance.find(a => a.employeeId === empId && a.date === dateStr);
  };

  // ── Attendance Log (سجل الحضور): بحث + تصفية + باجنيشن ──
  const filteredLogRecords = useMemo(() => {
    const activeBranch = (!isAdmin && !isSuperAdmin && user?.branch) ? user.branch : logBranchFilter;
    return attendance
      .filter(a => activeBranch === 'الكل' || normalizeBranchName(a.branch) === normalizeBranchName(activeBranch))
      .filter(a => logStatusFilter === 'الكل' || a.status === logStatusFilter)
      .filter(a => !logDateFrom || a.date >= logDateFrom)
      .filter(a => !logDateTo || a.date <= logDateTo)
      .filter(a => {
        if (!logSearch.trim()) return true;
        const q = logSearch.trim().toLowerCase();
        return a.employeeName.toLowerCase().includes(q) || (a.recordedBy || '').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        if (dateCmp !== 0) return dateCmp;
        const branchCmp = a.branch.localeCompare(b.branch, 'ar');
        if (branchCmp !== 0) return branchCmp;
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
  }, [attendance, isAdmin, isSuperAdmin, user, logBranchFilter, logStatusFilter, logDateFrom, logDateTo, logSearch]);

  const paginatedLogRecords = filteredLogRecords.slice((logCurrentPage - 1) * logPageSize, logCurrentPage * logPageSize);

  const applyLogQuickFilter = (key: 'yesterday' | 'today' | 'week' | 'month' | 'all') => {
    setLogQuickFilter(key);
    const today = getTodayDateStr();
    if (key === 'yesterday') {
      const y = getYesterdayDateStr();
      setLogDateFrom(y);
      setLogDateTo(y);
    } else if (key === 'today') {
      setLogDateFrom(today);
      setLogDateTo(today);
    } else if (key === 'week') {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      setLogDateFrom(d.toISOString().slice(0, 10));
      setLogDateTo(today);
    } else if (key === 'month') {
      setLogDateFrom(`${today.substring(0, 7)}-01`);
      setLogDateTo(today);
    } else {
      setLogDateFrom('');
      setLogDateTo('');
    }
  };

  const openAddLog = () => {
    setEditingLogRecord(null);
    setLogForm({ employeeId: '', date: getTodayDateStr(), status: 'حاضر', checkInTime: '', checkOutTime: '', notes: '' });
    setShowLogModal(true);
  };

  const openEditLog = (record: AttendanceRecord) => {
    setEditingLogRecord(record);
    setLogForm({
      employeeId: record.employeeId,
      date: record.date,
      status: record.status,
      checkInTime: arabicTimeTo24h(record.checkInTime),
      checkOutTime: arabicTimeTo24h(record.checkOutTime),
      notes: record.notes || '',
    });
    setShowLogModal(true);
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(x => x.id === logForm.employeeId);
    if (!emp && !editingLogRecord) {
      alert('من فضلك اختر الموظف');
      return;
    }
    setSavingLog(true);
    const record: AttendanceRecord = {
      id: editingLogRecord?.id || `att-${Date.now()}-${logForm.employeeId}`,
      date: logForm.date,
      employeeId: logForm.employeeId || editingLogRecord!.employeeId,
      employeeName: emp?.name || editingLogRecord!.employeeName,
      branch: emp?.branch || editingLogRecord!.branch,
      status: logForm.status,
      checkInTime: time24hToArabic(logForm.checkInTime) || undefined,
      checkOutTime: time24hToArabic(logForm.checkOutTime) || undefined,
      notes: logForm.notes || undefined,
      recordedBy: user?.name || 'أدمن',
    };
    const ok = await saveAttendanceRecord(record);
    setSavingLog(false);
    if (!ok) {
      alert('فشل حفظ السجل — من فضلك حاول مرة أخرى');
      return;
    }
    setAttendance(prev => {
      const exists = prev.some(a => a.id === record.id);
      return exists ? prev.map(a => (a.id === record.id ? record : a)) : [...prev, record];
    });
    setShowLogModal(false);
  };

  const handleDeleteLog = async (record: AttendanceRecord) => {
    if (!confirm(`تأكيد حذف سجل حضور "${record.employeeName}" بتاريخ ${record.date}؟`)) return;
    const previous = attendance;
    setAttendance(prev => prev.filter(a => a.id !== record.id));
    const ok = await deleteAttendanceRecord(record.id);
    if (!ok) {
      setAttendance(previous);
      alert('فشل حذف السجل — من فضلك حاول مرة أخرى');
    }
  };

  // Advance submission
  const handleAddAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === advanceEmployeeId);
    if (!emp || !advanceAmount) {
      alert('من فضلك اختر الموظف وأدخل المبلغ');
      return;
    }
    const amtNum = parseFloat(advanceAmount);
    if (isNaN(amtNum) || amtNum <= 0) {
      alert('المبلغ يجب أن يكون أكبر من صفر');
      return;
    }

    const defaultReason =
      advanceType === 'قبض' ? 'قبض راتب نقداً' :
      advanceType === 'سلفة' ? 'سلفة نقدية من الدرج' :
      advanceType === 'خصم' ? 'خصم إداري' : 'مكافأة وتشجيع';

    const newAdv: EmployeeAdvance = {
      id: `adv_${Date.now()}`,
      date: advanceDate || getTodayDateStr(),
      employeeId: emp.id,
      employeeName: emp.name,
      branch: emp.branch,
      type: advanceType,
      amount: amtNum,
      reason: advanceReason.trim() || defaultReason,
      treasuryDeducted: advanceType !== 'خصم',
      recordedBy: user?.name || 'مدير الفرع',
    };

    const previous = advances;
    setAdvances([newAdv, ...advances]);
    setAdvanceAmount('');
    setAdvanceReason('');

    const ok = await saveAdvance(newAdv);
    if (ok) {
      alert(`✅ تم تسجيل ${advanceType} بقيمة ${newAdv.amount.toLocaleString()} ج للموظف "${emp.name}" بنجاح`);
    } else {
      setAdvances(previous);
      alert('فشل حفظ السجل على السيرفر — من فضلك حاول مرة أخرى');
    }
  };

  // WhatsApp Statement Share
  const getWhatsAppStatementUrl = (summary: any) => {
    if (!summary) return '#';
    const { employee, attendedDays, dailyWage, earnedWages, totalBonuses, totalAdvances, totalDeductions, totalPaid, netRemaining } = summary;

    const text = `📋 *كشف حساب ومستحقات - مؤسسة كشك للأقمشة والستائر*
👤 *الموظف:* ${employee.name} (${employee.branch})
💵 *اليومية المقررة:* ${dailyWage} ج
📅 *أيام الحضور الفعلية:* ${attendedDays} يوم
💰 *إجمالي الأجر المستحق:* ${earnedWages.toLocaleString()} ج
${totalBonuses > 0 ? `🎁 *مكافآت:* +${totalBonuses.toLocaleString()} ج\n` : ''}${totalAdvances > 0 ? `🔻 *سلف نقدية:* -${totalAdvances.toLocaleString()} ج\n` : ''}${totalDeductions > 0 ? `🔻 *خصومات:* -${totalDeductions.toLocaleString()} ج\n` : ''}${totalPaid > 0 ? `💵 *مقبوض سابقاً:* -${totalPaid.toLocaleString()} ج\n` : ''}----------------------------------------
⭐ *صافي المتبقي لك:* ${netRemaining >= 0 ? '+' : ''}${netRemaining.toLocaleString()} ج
----------------------------------------
مؤسسة كشك للأقمشة والستائر ✨`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const currentSelectedEmpSummary = advanceEmployeeId ? getEmployeeFinancialSummary(advanceEmployeeId) : null;

  return (
    <PageShell title="شؤون الموظفين والرواتب" badge={`${employees.length} موظفاً`}>
      <div className="space-y-6">
        
        {/* Top Control Bar & Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'attendance' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>📋</span>
              <span>تسجيل الحضور اليومي</span>
            </button>
            <button
              onClick={() => setActiveTab('advances')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'advances' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>💸</span>
              <span>الحركات المالية (سلف، خصومات، قبض)</span>
            </button>
            {canViewWages && (
              <>
                <button
                  onClick={() => setActiveTab('statement')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'statement' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>💰</span>
                  <span>كشف حساب ومستحقات الموظفين</span>
                </button>
                <button
                  onClick={() => setActiveTab('directory')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'directory' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>👥</span>
                  <span>دليل الموظفين</span>
                </button>
                <button
                  onClick={() => setActiveTab('log')}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'log' ? 'bg-purple-700 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>🗂️</span>
                  <span>سجل الحضور</span>
                </button>
              </>
            )}
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-600 shrink-0">الفرع:</span>
            {canViewWages ? (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 w-full md:w-48 shadow-xs"
              >
                <option value="الكل">🌐 كل الفروع</option>
                {BRANCHES_LIST.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            ) : (
              <div className="p-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 w-full md:w-48">
                👑 {selectedBranch}
              </div>
            )}
          </div>
        </div>

        {/* ── TAB 1: ATTENDANCE ── */}
        {activeTab === 'attendance' && (
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>📝</span>
                  <span>تسجيل حضور وانصراف موظفي الفروع</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">يسجل مدير كل فرع حضور موظفيه طوال أيام الأسبوع بما فيها يوم الجمعة</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-600">تاريخ الحضور:</span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                  getArabicDayName(attendanceDate) === 'الجمعة'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-slate-100 text-slate-800 border-slate-200'
                }`}>
                  🗓️ {getArabicDayName(attendanceDate)}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">اسم الموظف</th>
                    <th className="p-3">الفرع</th>
                    {canViewWages && <th className="p-3 font-mono">اليومية</th>}
                    <th className="p-3 font-mono">مواعيد العمل</th>
                    <th className="p-3">الحالة اليوم</th>
                    <th className="p-3 text-center">إجراءات الحضور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {branchFilteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">لا يوجد موظفون في هذا الفرع</td>
                    </tr>
                  ) : (
                    branchFilteredEmployees.map((emp, idx) => {
                      const record = getAttendanceForEmp(emp.id, attendanceDate);
                      const status = record?.status;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">
                            <div className="font-extrabold text-sm">{emp.name}</div>
                            <div className="text-[10px] text-slate-500">{emp.role}</div>
                          </td>
                          <td className="p-3">
                            <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700">
                              {emp.branch}
                            </span>
                          </td>
                          {canViewWages && (
                            <td className="p-3 font-mono font-black text-emerald-800 text-sm">
                              {emp.dailyWage} ج
                            </td>
                          )}
                          <td className="p-3 font-bold text-[11px] text-slate-700" dir="rtl">
                            <span>من </span>
                            <span className="font-mono text-slate-900">{formatTimeAr(emp.workStartTime)}</span>
                            <span> إلى </span>
                            <span className="font-mono text-slate-900">{formatTimeAr(emp.workEndTime)}</span>
                          </td>
                          <td className="p-3">
                            {status ? (
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                                status === 'حاضر' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                status === 'غياب' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                status === 'إجازة' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                'bg-amber-100 text-amber-800 border-amber-300'
                              }`}>
                                {status === 'حاضر' ? `✓ حاضر (${record?.checkInTime || ''})` : status}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-bold">لم يسجل بعد</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleMarkAttendance(emp, 'حاضر')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  status === 'حاضر' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                                title="تسجيل حضور كامل"
                              >
                                حاضر 👍
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(emp, 'نصف يوم')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  status === 'نصف يوم' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                }`}
                                title="تسجيل نصف يوم"
                              >
                                نصف يوم
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(emp, 'غياب')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  status === 'غياب' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                                }`}
                                title="تسجيل غياب"
                              >
                                غياب ❌
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(emp, 'إجازة')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                  status === 'إجازة' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                                }`}
                                title="تسجيل إجازة رسمية"
                              >
                                إجازة 🏖️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: ADVANCES, DEDUCTIONS & PAYOUTS ── */}
        {activeTab === 'advances' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* New Movement Form */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>💸</span>
                  <span>تسجيل حركة مالية (سلفة / خصم / قبض)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">عند اختيار "قبض" يتم جلب وحساب المتبقي للموظف تلقائياً</p>
              </div>

              <form onSubmit={handleAddAdvance} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الموظف *</label>
                  <select
                    required
                    value={advanceEmployeeId}
                    onChange={(e) => handleSelectEmployeeForAdvance(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="">-- اختر الموظف --</option>
                    {branchFilteredEmployees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.branch})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الحركة *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(['سلفة', 'خصم', 'مكافأة', 'قبض'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleSelectAdvanceType(type)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                          advanceType === type 
                            ? type === 'قبض' ? 'bg-purple-700 text-white border-purple-700 shadow-xs' :
                              type === 'سلفة' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' :
                              type === 'خصم' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' :
                              'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {type === 'قبض' ? '💰 قبض' : type === 'سلفة' ? '💵 سلفة' : type === 'خصم' ? '✂️ خصم' : '🎁 مكافأة'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto Financial Status Box for Selected Employee */}
                {currentSelectedEmpSummary && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] space-y-1.5">
                    <div className="flex justify-between font-bold text-slate-700 border-b border-slate-200/80 pb-1">
                      <span>أيام الحضور: <strong className="text-slate-950 font-mono">{currentSelectedEmpSummary.attendedDays} يوم</strong></span>
                      <span>إجمالي الأجر: <strong className="text-emerald-800 font-mono">{currentSelectedEmpSummary.earnedWages.toLocaleString()} ج</strong></span>
                    </div>
                    <div className="flex justify-between text-slate-600 text-[10.5px]">
                      <span>سلف: <strong className="text-amber-800 font-mono">{currentSelectedEmpSummary.totalAdvances.toLocaleString()} ج</strong></span>
                      <span>خصومات: <strong className="text-rose-700 font-mono">{currentSelectedEmpSummary.totalDeductions.toLocaleString()} ج</strong></span>
                      <span>مقبوض سابقاً: <strong className="text-purple-800 font-mono">{currentSelectedEmpSummary.totalPaid.toLocaleString()} ج</strong></span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 font-black text-xs text-slate-900">
                      <span>صافي المتبقي له:</span>
                      <span className={`font-mono text-sm px-2 py-0.5 rounded-lg ${
                        currentSelectedEmpSummary.netRemaining > 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {currentSelectedEmpSummary.netRemaining.toLocaleString()} ج
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">التاريخ *</label>
                    <input
                      type="date"
                      required
                      value={advanceDate}
                      onChange={(e) => setAdvanceDate(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ بالجنيه *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      placeholder="المبلغ..."
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السبب / البيان / ملاحظات</label>
                  <input
                    type="text"
                    value={advanceReason}
                    onChange={(e) => setAdvanceReason(e.target.value)}
                    placeholder={advanceType === 'قبض' ? 'قبض راتب نقداً...' : 'سبب السلفة أو الخصم...'}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  حفظ وتسجيل الحركة 💾
                </button>
              </form>
            </div>

            {/* Advances & Movements Log Table */}
            <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>📋</span>
                    <span>سجل الحركات المالية المسجلة</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">متابعة وإدارة السلف النقدية، الخصومات، المكافآت، وسندات القبض مع إمكانية التعديل والحذف</p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                  إجمالي: {filteredAdvances.length} حركة
                </span>
              </div>

              {/* Filter Bar */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={advSearch}
                        onChange={(e) => setAdvSearch(e.target.value)}
                        placeholder="🔍 ابحث بالملاحظات أو السبب أو الموظف..."
                        className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:bg-white"
                      />
                      {advSearch && (
                        <button
                          type="button"
                          onClick={() => setAdvSearch('')}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                          title="مسح البحث"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Filter Modal Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setShowAdvFilterModal(true)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-xs ${
                        activeAdvFiltersCount > 0
                          ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-amber-200'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                      }`}
                    >
                      <span className="text-sm">⚡</span>
                      <span>تصفية الفلاتر</span>
                      {activeAdvFiltersCount > 0 && (
                        <span className="bg-white text-amber-700 px-1.5 py-0.2 rounded-full text-[10.5px] font-black min-w-[18px] text-center">
                          {activeAdvFiltersCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {activeAdvFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetAdvFilters}
                      className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      title="إعادة تعيين كافة الفلاتر"
                    >
                      ✕ مسح الفلاتر ({activeAdvFiltersCount})
                    </button>
                  )}
                </div>

                {/* Active Filter Chips */}
                {activeAdvFiltersCount > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] font-bold text-slate-400">الفلاتر المفعلة:</span>
                    {advEmployeeFilter !== 'الكل' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-[11px] font-bold">
                        <span>👤 الموظف: {employees.find(e => e.id === advEmployeeFilter)?.name || advEmployeeFilter}</span>
                        <button onClick={() => setAdvEmployeeFilter('الكل')} className="text-amber-700 hover:text-amber-900 font-black cursor-pointer">✕</button>
                      </span>
                    )}
                    {advTypeFilter !== 'الكل' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-900 rounded-lg text-[11px] font-bold">
                        <span>🏷️ النوع: {advTypeFilter}</span>
                        <button onClick={() => setAdvTypeFilter('الكل')} className="text-purple-700 hover:text-purple-900 font-black cursor-pointer">✕</button>
                      </span>
                    )}
                    {advBranchFilter !== 'الكل' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-[11px] font-bold">
                        <span>🏢 الفرع: {advBranchFilter}</span>
                        <button onClick={() => setAdvBranchFilter('الكل')} className="text-blue-700 hover:text-blue-900 font-black cursor-pointer">✕</button>
                      </span>
                    )}
                    {(advDateFrom || advDateTo || advQuickDate !== 'all') && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-[11px] font-bold">
                        <span>📅 الفترة: {advQuickDate !== 'custom' && advQuickDate !== 'all' ? (advQuickDate === 'today' ? 'اليوم' : advQuickDate === 'yesterday' ? 'أمس' : advQuickDate === 'week' ? 'آخر 7 أيام' : 'هذا الشهر') : `${advDateFrom || '...'} إلى ${advDateTo || '...'}`}</span>
                        <button onClick={() => { setAdvDateFrom(''); setAdvDateTo(''); setAdvQuickDate('all'); }} className="text-emerald-700 hover:text-emerald-900 font-black cursor-pointer">✕</button>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">الموظف</th>
                      <th className="p-2.5">الفرع</th>
                      <th className="p-2.5 text-center">النوع</th>
                      <th className="p-2.5 font-mono">المبلغ</th>
                      <th className="p-2.5">السبب / البيان</th>
                      {canViewWages && <th className="p-2.5 text-center">إجراءات</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedAdvances.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">لا توجد حركات مالية مطابقة</td>
                      </tr>
                    ) : (
                      paginatedAdvances.map(adv => (
                        <tr key={adv.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-600">{adv.date}</td>
                          <td className="p-2.5 font-bold text-slate-900">{adv.employeeName}</td>
                          <td className="p-2.5 text-slate-600">{adv.branch}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold border ${
                              adv.type === 'قبض' ? 'bg-purple-100 text-purple-900 border-purple-300 font-black' :
                              adv.type === 'سلفة' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                              adv.type === 'خصم' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                              'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}>
                              {adv.type}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-black text-slate-900">{adv.amount.toLocaleString()} ج</td>
                          <td className="p-2.5 text-slate-600 text-[11px] font-medium">{adv.reason}</td>
                          {canViewWages && (
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openEditRecord(adv)}
                                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                                  title="تعديل السند"
                                >
                                  ✏️ تعديل
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(adv)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                                  title="حذف السجل"
                                >
                                  ✕ حذف
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={advCurrentPage}
                totalItems={filteredAdvances.length}
                pageSize={advPageSize}
                onPageChange={setAdvCurrentPage}
                itemName="حركة"
              />
            </div>
          </div>
        )}

        {/* ── TAB 3: EMPLOYEE STATEMENT & DUES (كشف حساب ومستحقات الموظفين) ── */}
        {activeTab === 'statement' && canViewWages && (
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>💰</span>
                  <span>كشف حساب ومستحقات الموظفين</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  حساب مباشر ودقيق لجميع أيام الحضور الفعلية، الأجور المكتسبة، الخصومات، السلف، وما تم قبضه، وصافي المتبقي لكل موظف
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">الموظف والفرع</th>
                    <th className="p-3 font-mono">اليومية</th>
                    <th className="p-3 font-mono">أيام الحضور</th>
                    <th className="p-3 font-mono">إجمالي الأجر</th>
                    <th className="p-3 font-mono text-emerald-700">مكافآت</th>
                    <th className="p-3 font-mono text-amber-800">السلف المسحوبة</th>
                    <th className="p-3 font-mono text-rose-700">الخصومات</th>
                    <th className="p-3 font-mono text-purple-800">مقبوض سابقاً</th>
                    <th className="p-3 font-mono text-slate-950 font-black text-sm bg-emerald-50">صافي المتبقي له</th>
                    <th className="p-3 text-center">إجراء سريع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {branchFilteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">لا يوجد موظفون في هذا الفرع</td>
                    </tr>
                  ) : (
                    branchFilteredEmployees.map((emp) => {
                      const summary = getEmployeeFinancialSummary(emp.id);
                      if (!summary) return null;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="font-black text-slate-900 text-sm">{emp.name}</div>
                            <div className="text-[10px] text-slate-500">{emp.branch}</div>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-700">{summary.dailyWage} ج</td>
                          <td className="p-3 font-mono font-bold text-slate-900">
                            {summary.attendedDays} يوم
                          </td>
                          <td className="p-3 font-mono font-black text-slate-900">{summary.earnedWages.toLocaleString()} ج</td>
                          <td className="p-3 font-mono text-emerald-700 font-bold">+{summary.totalBonuses.toLocaleString()} ج</td>
                          <td className="p-3 font-mono text-amber-800 font-bold">-{summary.totalAdvances.toLocaleString()} ج</td>
                          <td className="p-3 font-mono text-rose-700 font-bold">-{summary.totalDeductions.toLocaleString()} ج</td>
                          <td className="p-3 font-mono text-purple-800 font-bold">-{summary.totalPaid.toLocaleString()} ج</td>
                          <td className="p-3 font-mono font-black text-sm bg-emerald-50/80 text-emerald-950 border-r border-l border-emerald-200">
                            <span className={`px-2 py-0.5 rounded-lg ${
                              summary.netRemaining > 0 ? 'text-emerald-900 font-black' : 'text-slate-600'
                            }`}>
                              {summary.netRemaining >= 0 ? `+${summary.netRemaining.toLocaleString()}` : summary.netRemaining.toLocaleString()} ج
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleQuickPayForEmployee(emp.id)}
                                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-black text-[11px] cursor-pointer whitespace-nowrap shadow-xs"
                                title="صرف / قبض المتبقي للموظف"
                              >
                                💰 قبض
                              </button>
                              <button
                                onClick={() => setSelectedEmpForSlip(summary)}
                                className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                                title="معاينة إيصال كشف الحساب"
                              >
                                👁️
                              </button>
                              <a
                                href={getWhatsAppStatementUrl(summary)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px]"
                                title="إرسال كشف الحساب للموظف على واتساب"
                              >
                                📱
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: DIRECTORY ── */}
        {activeTab === 'directory' && (
          <div className="space-y-6">
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>👥</span>
                  <span>دليل موظفي الفروع</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">إدارة ومتابعة بيانات موظفي الفروع، المسميات الوظيفية ومواعيد العمل (مقسمة حسب الفروع)</p>
              </div>

              {canViewWages && (
                <button
                  type="button"
                  onClick={handleOpenAddEmp}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>➕</span>
                  <span>إضافة موظف جديد</span>
                </button>
              )}
            </div>

            {/* Render each branch section */}
            {Object.entries(employeesByBranch).map(([branchName, branchEmps]) => {
              if (selectedBranch !== 'الكل' && selectedBranch !== branchName) return null;
              return (
                <div key={branchName} className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center text-lg font-bold">
                        🏪
                      </span>
                      <div>
                        <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                          <span>{branchName}</span>
                          <span className="text-[11px] bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                            {branchEmps.filter(e => e.isActive !== false).length} موظف
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">فريق عمل {branchName}</p>
                      </div>
                    </div>

                    {canViewWages && branchEmps.length > 0 && (
                      <div className="text-left font-mono text-xs">
                        <span className="text-slate-400 block text-[10px]">إجمالي اليوميات:</span>
                        <strong className="text-emerald-800 font-black text-sm">
                          {branchEmps.filter(e => e.isActive !== false).reduce((s, e) => s + (Number(e.dailyWage) || 0), 0).toLocaleString()} ج / يوم
                        </strong>
                      </div>
                    )}
                  </div>

                  {branchEmps.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-bold bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                      لا يوجد موظفون مسجلون بهذا الفرع حالياً
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {branchEmps.map((emp) => (
                        <div key={emp.id} className="p-4 bg-slate-50/80 hover:bg-white rounded-2xl border border-slate-200 space-y-3 hover:border-amber-300 hover:shadow-xs transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-950 text-base">{emp.name}</h4>
                                {emp.isActive === false && (
                                  <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">متوقف</span>
                                )}
                              </div>
                              <p className="text-xs text-amber-800 font-bold mt-0.5">{emp.role || 'موظف'}</p>
                              {emp.phone && (
                                <p className="text-[11px] font-mono text-slate-500 font-bold mt-0.5" dir="ltr">📞 {emp.phone}</p>
                              )}
                            </div>
                            <span className="bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                              {emp.branch}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                            <div>
                              <span className="text-slate-500 block text-[11px]">الراتب اليومي:</span>
                              {canViewWages ? (
                                <span className="font-mono font-black text-emerald-800 text-sm">{emp.dailyWage} ج / يوم</span>
                              ) : (
                                <span className="text-[11px] font-bold text-slate-400">🔒 محمي للسرية</span>
                              )}
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[11px]">مواعيد العمل:</span>
                              <span className="text-slate-700 font-bold text-[11px]" dir="rtl">
                                {formatTimeAr(emp.workStartTime)} - {formatTimeAr(emp.workEndTime)}
                              </span>
                            </div>
                          </div>

                          {canViewWages && (
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                              <button
                                type="button"
                                onClick={() => handleOpenEditEmp(emp)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                              >
                                ✏️ تعديل
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEmp(emp.id, emp.name)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 cursor-pointer transition-colors"
                                title="حذف الموظف"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB 5: ATTENDANCE LOG (سجل الحضور) — أدمن فقط ── */}
        {activeTab === 'log' && canViewWages && (
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>🗂️</span>
                  <span>سجل الحضور الكامل</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">بحث وتصفية فى كل سجلات الحضور مع إمكانية التعديل والحذف والإضافة اليدوية</p>
              </div>
              <button
                type="button"
                onClick={openAddLog}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              >
                <span>➕</span>
                <span>إضافة سجل حضور</span>
              </button>
            </div>

            {/* Quick date filters */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200 text-xs font-bold overflow-x-auto w-fit">
              {([
                { key: 'yesterday', label: 'أمس' },
                { key: 'today', label: 'اليوم' },
                { key: 'week', label: 'الأسبوع' },
                { key: 'month', label: 'الشهر' },
                { key: 'all', label: 'الكل' },
              ] as { key: 'yesterday' | 'today' | 'week' | 'month' | 'all'; label: string }[]).map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => applyLogQuickFilter(t.key)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    logQuickFilter === t.key ? 'bg-purple-700 text-white font-black shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="🔍 ابحث باسم الموظف أو مسجّل الحضور..."
                className="flex-1 min-w-[200px] p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
              {canViewWages && (
                <select
                  value={logBranchFilter}
                  onChange={(e) => setLogBranchFilter(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="الكل">🌐 كل الفروع</option>
                  {BRANCHES_LIST.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              )}
              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              >
                <option value="الكل">كل الحالات</option>
                <option value="حاضر">حاضر</option>
                <option value="غياب">غياب</option>
                <option value="إجازة">إجازة</option>
                <option value="نصف يوم">نصف يوم</option>
              </select>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">من</span>
                <input
                  type="date"
                  value={logDateFrom}
                  onChange={(e) => { setLogDateFrom(e.target.value); setLogQuickFilter('custom'); }}
                  className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">إلى</span>
                <input
                  type="date"
                  value={logDateTo}
                  onChange={(e) => { setLogDateTo(e.target.value); setLogQuickFilter('custom'); }}
                  className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>
              {(logSearch || logBranchFilter !== 'الكل' || logStatusFilter !== 'الكل' || logDateFrom || logDateTo) && (
                <button
                  type="button"
                  onClick={() => { setLogSearch(''); setLogBranchFilter('الكل'); setLogStatusFilter('الكل'); setLogDateFrom(''); setLogDateTo(''); setLogQuickFilter('all'); }}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  ✕ مسح التصفية
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">التاريخ واليوم</th>
                    <th className="p-3">اسم الموظف</th>
                    <th className="p-3">الفرع</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 font-mono">الحضور</th>
                    <th className="p-3 font-mono">الانصراف</th>
                    <th className="p-3">سجّله</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedLogRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400 font-bold">لا توجد سجلات مطابقة</td>
                    </tr>
                  ) : (
                    paginatedLogRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-800">
                          <span className="font-mono text-slate-600">{record.date}</span>
                          <span className="text-[11px] text-slate-500 mr-1.5">({getArabicDayName(record.date)})</span>
                        </td>
                        <td className="p-3 font-extrabold text-slate-900">{record.employeeName}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700">
                            {record.branch}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                            record.status === 'حاضر' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            record.status === 'غياب' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                            record.status === 'إجازة' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                            'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-700">{record.checkInTime || '—'}</td>
                        <td className="p-3 font-mono text-slate-700">{record.checkOutTime || '—'}</td>
                        <td className="p-3 text-slate-500">{record.recordedBy || '—'}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditLog(record)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span>✏️</span>
                              <span>تعديل</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(record)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 cursor-pointer"
                              title="حذف السجل"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={logCurrentPage}
              totalItems={filteredLogRecords.length}
              pageSize={logPageSize}
              onPageChange={setLogCurrentPage}
              itemName="سجل"
            />
          </div>
        )}

        {/* ── MODALS ── */}

        {/* Advances / Financial Movements Filter Modal */}
        {showAdvFilterModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-lg w-full rounded-3xl p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-base shadow-xs">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">تصفية سجل الحركات المالية</h3>
                    <p className="text-[11px] text-slate-500 font-bold">تصفية السلف والخصومات والمكافآت وسندات القبض</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvFilterModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Body: Filters */}
              <div className="space-y-4">
                {/* 1. Employee Filter */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                    <span>👤</span>
                    <span>تصفية بالموظف</span>
                  </label>
                  <select
                    value={advEmployeeFilter}
                    onChange={(e) => setAdvEmployeeFilter(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 cursor-pointer focus:bg-white"
                  >
                    <option value="الكل">👤 جميع الموظفين ({employees.length})</option>
                    {employeeFilterOptions.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.branch}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Type Filter */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                    <span>🏷️</span>
                    <span>نوع الحركة</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {[
                      { label: 'الكل', value: 'الكل' },
                      { label: 'سلفة', value: 'سلفة' },
                      { label: 'خصم', value: 'خصم' },
                      { label: 'مكافأة', value: 'مكافأة' },
                      { label: 'قبض', value: 'قبض' },
                    ].map(item => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setAdvTypeFilter(item.value)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                          advTypeFilter === item.value
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Branch Filter (if allowed) */}
                {canViewWages && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                      <span>🏢</span>
                      <span>الفرع</span>
                    </label>
                    <select
                      value={advBranchFilter}
                      onChange={(e) => setAdvBranchFilter(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 cursor-pointer focus:bg-white"
                    >
                      <option value="الكل">🌐 كل الفروع</option>
                      {BRANCHES_LIST.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 4. Date Range & Quick Presets */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                    <span>📅</span>
                    <span>الفترة والتاريخ</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                    {(['all', 'today', 'yesterday', 'week', 'month'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setAdvQuickFilter(mode)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          advQuickDate === mode && !advDateFrom && mode === 'all'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : advQuickDate === mode
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {mode === 'all' ? 'الكل' : mode === 'today' ? 'اليوم' : mode === 'yesterday' ? 'أمس' : mode === 'week' ? 'آخر 7 أيام' : 'هذا الشهر'}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">من تاريخ:</span>
                      <input
                        type="date"
                        value={advDateFrom}
                        onChange={(e) => { setAdvDateFrom(e.target.value); setAdvQuickDate('custom'); }}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">إلى تاريخ:</span>
                      <input
                        type="date"
                        value={advDateTo}
                        onChange={(e) => { setAdvDateTo(e.target.value); setAdvQuickDate('custom'); }}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetAdvFilters}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  🔄 مسح الفلاتر
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvFilterModal(false)}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  ✅ تطبيق ({filteredAdvances.length} حركة)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Advance / Movement Edit Modal (Admin Only) */}
        {showAdvEditModal && editingAdv && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveAdvEdit}
              className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>✏️</span>
                <span>تعديل السند المالي</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                {editingAdv.employeeName} — {editingAdv.branch}
              </p>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">التاريخ</label>
                <input
                  type="date"
                  value={advEditForm.date}
                  onChange={(e) => setAdvEditForm({ ...advEditForm, date: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">نوع الحركة</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['سلفة', 'خصم', 'مكافأة', 'قبض'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAdvEditForm({ ...advEditForm, type })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                        advEditForm.type === type
                          ? type === 'قبض' ? 'bg-purple-700 text-white border-purple-700 shadow-xs' :
                            type === 'سلفة' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' :
                            type === 'خصم' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' :
                            'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">المبلغ بالجنيه *</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={advEditForm.amount}
                  onChange={(e) => setAdvEditForm({ ...advEditForm, amount: e.target.value })}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">السبب / البيان / ملاحظات</label>
                <input
                  type="text"
                  value={advEditForm.reason}
                  onChange={(e) => setAdvEditForm({ ...advEditForm, reason: e.target.value })}
                  placeholder="سبب الحركة أو الملاحظات..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingAdvEdit}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  {savingAdvEdit ? 'جاري الحفظ...' : 'حفظ التعديل'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvEditModal(false);
                    setEditingAdv(null);
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Employee Add / Edit Modal (Admin Only) */}
        {showEmpModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-lg w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <span>{editingEmp ? '✏️ تعديل بيانات موظف' : '➕ إضافة موظف جديد'}</span>
                </h3>
                <button onClick={() => setShowEmpModal(false)} className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleSaveEmp} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم الموظف *</label>
                    <input
                      type="text"
                      required
                      value={empForm.name}
                      onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                      placeholder="مثال: محمد كشك"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الفرع *</label>
                    <select
                      required
                      value={empForm.branch}
                      onChange={(e) => setEmpForm({ ...empForm, branch: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                    >
                      {BRANCHES_LIST.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">المسمى الوظيفي</label>
                    <input
                      type="text"
                      value={empForm.role}
                      onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                      placeholder="مثال: مدير الفرع / مبيعات / سائق"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">نظام صرف الراتب *</label>
                    <select
                      value={empForm.payType}
                      onChange={(e) => setEmpForm({ ...empForm, payType: e.target.value as 'شهري' | 'أسبوعي' })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    >
                      <option value="أسبوعي">📅 أسبوعي</option>
                      <option value="شهري">🗓️ شهري</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الراتب اليومي (اليومية بالجنيه) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="10"
                      value={empForm.dailyWage}
                      onChange={(e) => setEmpForm({ ...empForm, dailyWage: Number(e.target.value) })}
                      placeholder="350"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-emerald-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">رقم الهاتف (واتساب)</label>
                    <input
                      type="tel"
                      value={empForm.phone}
                      onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                      placeholder="010xxxxxxxx"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">حالة العمل</label>
                  <select
                    value={empForm.isActive ? 'true' : 'false'}
                    onChange={(e) => setEmpForm({ ...empForm, isActive: e.target.value === 'true' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="true">نشط بالعمل</option>
                    <option value="false">متوقف / إجازة طويلة</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">وقت الحضور</label>
                    <input
                      type="text"
                      value={empForm.workStartTime}
                      onChange={(e) => setEmpForm({ ...empForm, workStartTime: e.target.value })}
                      placeholder="11:00 AM"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">وقت الانصراف</label>
                    <input
                      type="text"
                      value={empForm.workEndTime}
                      onChange={(e) => setEmpForm({ ...empForm, workEndTime: e.target.value })}
                      placeholder="11:30 PM"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowEmpModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-black rounded-xl shadow-md cursor-pointer"
                  >
                    {editingEmp ? 'حفظ التعديلات 💾' : 'إضافة الموظف ✨'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Slip Modal Preview */}
        {selectedEmpForSlip && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-black text-slate-900 text-base">إيصال كشف حساب الموظف</h3>
                <button onClick={() => setSelectedEmpForSlip(null)} className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer">✕</button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3 text-xs">
                <div className="text-center border-b pb-2">
                  <p className="font-black text-base text-slate-900">مؤسسة كشك للأقمشة والستائر</p>
                  <p className="text-xs text-amber-800 font-bold">كشف حساب ومستحقات الموظف</p>
                </div>

                <div className="flex justify-between font-bold text-slate-900">
                  <span>الموظف: {selectedEmpForSlip.employee.name}</span>
                  <span>الفرع: {selectedEmpForSlip.employee.branch}</span>
                </div>

                <div className="space-y-1.5 border-t border-b py-2 text-slate-700">
                  <div className="flex justify-between">
                    <span>أيام الحضور الفعلية:</span>
                    <span className="font-mono font-bold">{selectedEmpForSlip.attendedDays} يوم × {selectedEmpForSlip.dailyWage}ج</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>إجمالي الأجر المكتسب:</span>
                    <span className="font-mono">{selectedEmpForSlip.earnedWages.toLocaleString()} ج</span>
                  </div>
                  {selectedEmpForSlip.totalBonuses > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>مكافآت إضافية:</span>
                      <span className="font-mono">+{selectedEmpForSlip.totalBonuses.toLocaleString()} ج</span>
                    </div>
                  )}
                  {selectedEmpForSlip.totalAdvances > 0 && (
                    <div className="flex justify-between text-amber-800 font-bold">
                      <span>سلف نقدية (مسحوبة):</span>
                      <span className="font-mono">-{selectedEmpForSlip.totalAdvances.toLocaleString()} ج</span>
                    </div>
                  )}
                  {selectedEmpForSlip.totalDeductions > 0 && (
                    <div className="flex justify-between text-rose-700 font-bold">
                      <span>خصومات إدارية:</span>
                      <span className="font-mono">-{selectedEmpForSlip.totalDeductions.toLocaleString()} ج</span>
                    </div>
                  )}
                  {selectedEmpForSlip.totalPaid > 0 && (
                    <div className="flex justify-between text-purple-800 font-bold">
                      <span>مقبوض سابقاً:</span>
                      <span className="font-mono">-{selectedEmpForSlip.totalPaid.toLocaleString()} ج</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-300 font-black text-emerald-950 text-sm">
                  <span>صافي المتبقي للموظف:</span>
                  <span className="font-mono text-base">{selectedEmpForSlip.netRemaining.toLocaleString()} ج.م</span>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={getWhatsAppStatementUrl(selectedEmpForSlip)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5"
                >
                  <span>📱 إرسال واتساب</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedEmpForSlip(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
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

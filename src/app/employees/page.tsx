'use client';

import React, { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/PageShell';
import { 
  Employee, AttendanceRecord, EmployeeAdvance, WeeklyPayrollSettlement,
  getEmployees, saveEmployees, getAttendance, saveAttendance,
  getAdvances, saveAdvances, getPayrolls, savePayrolls, INITIAL_EMPLOYEES
} from '@/lib/employeeStore';
import { BRANCHES_LIST, normalizeBranchName } from '@/lib/branches';
import { formatDateOnly } from '@/lib/dateUtils';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function EmployeesManagementPage() {
  const { user, isAdmin, isSuperAdmin } = useCurrentUser();
  const canViewWages = isAdmin || isSuperAdmin;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [payrolls, setPayrolls] = useState<WeeklyPayrollSettlement[]>([]);

  const [activeTab, setActiveTab] = useState<'attendance' | 'advances' | 'payroll' | 'directory'>('attendance');
  const [selectedBranch, setSelectedBranch] = useState<string>('الكل');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Advance Form State
  const [advanceEmployeeId, setAdvanceEmployeeId] = useState<string>('');
  const [advanceType, setAdvanceType] = useState<'سلفة' | 'خصم' | 'مكافأة'>('سلفة');
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [advanceReason, setAdvanceReason] = useState<string>('');

  // Selected Employee for Modal / Share
  const [selectedEmpForSlip, setSelectedEmpForSlip] = useState<any | null>(null);

  // Employee Add / Edit Modal State (Admin only)
  const [showEmpModal, setShowEmpModal] = useState<boolean>(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [empForm, setEmpForm] = useState<{
    id?: string;
    name: string;
    branch: string;
    dailyWage: number;
    workStartTime: string;
    workEndTime: string;
    phone: string;
    role: string;
    isActive: boolean;
  }>({
    name: '',
    branch: 'الفرع الرئيسي',
    dailyWage: 300,
    workStartTime: '11:00 AM',
    workEndTime: '11:30 PM',
    phone: '',
    role: 'مبيعات',
    isActive: true,
  });

  useEffect(() => {
    setEmployees(getEmployees());
    setAttendance(getAttendance());
    setAdvances(getAdvances());
    setPayrolls(getPayrolls());
  }, []);

  const branchFilteredEmployees = useMemo(() => {
    if (selectedBranch === 'الكل') return employees;
    return employees.filter(e => normalizeBranchName(e.branch) === normalizeBranchName(selectedBranch));
  }, [employees, selectedBranch]);

  // Employee CRUD handlers
  const handleOpenAddEmp = () => {
    setEditingEmp(null);
    setEmpForm({
      name: '',
      branch: selectedBranch !== 'الكل' ? selectedBranch : 'الفرع الرئيسي',
      dailyWage: 300,
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
      workStartTime: emp.workStartTime,
      workEndTime: emp.workEndTime,
      phone: emp.phone || '',
      role: emp.role || '',
      isActive: emp.isActive !== false,
    });
    setShowEmpModal(true);
  };

  const handleSaveEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name.trim()) return;

    let updatedList: Employee[];
    if (editingEmp) {
      updatedList = employees.map(e => e.id === editingEmp.id ? { 
        ...e, 
        ...empForm, 
        name: empForm.name.trim(), 
        dailyWage: Number(empForm.dailyWage) || 0,
        phone: empForm.phone.trim(),
        role: empForm.role.trim() 
      } : e);
    } else {
      const newEmp: Employee = {
        id: `emp_${Date.now()}`,
        name: empForm.name.trim(),
        branch: empForm.branch,
        dailyWage: Number(empForm.dailyWage) || 0,
        workStartTime: empForm.workStartTime,
        workEndTime: empForm.workEndTime,
        phone: empForm.phone.trim(),
        role: empForm.role.trim(),
        isActive: empForm.isActive,
      };
      updatedList = [...employees, newEmp];
    }
    setEmployees(updatedList);
    saveEmployees(updatedList);
    setShowEmpModal(false);
    alert(editingEmp ? 'تم تحديث وتثبيت بيانات الموظف بنجاح 💾' : 'تمت إضافة الموظف الجديد بنجاح ✨');
  };

  const handleDeleteEmp = (empId: string, empName: string) => {
    if (!confirm(`هل أنت متأكد من حذف الموظف "${empName}" من النظام؟`)) return;
    const updatedList = employees.filter(e => e.id !== empId);
    setEmployees(updatedList);
    saveEmployees(updatedList);
  };

  // Attendance logic
  const handleMarkAttendance = (emp: Employee, status: AttendanceRecord['status']) => {
    const existingIdx = attendance.findIndex(a => a.employeeId === emp.id && a.date === attendanceDate);
    const updated = [...attendance];
    const nowTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    if (existingIdx >= 0) {
      updated[existingIdx] = {
        ...updated[existingIdx],
        status,
        checkInTime: status === 'حاضر' ? (updated[existingIdx].checkInTime || nowTime) : undefined,
        recordedBy: user?.name || 'مدير الفرع',
      };
    } else {
      updated.push({
        id: `att_${Date.now()}_${emp.id}`,
        date: attendanceDate,
        employeeId: emp.id,
        employeeName: emp.name,
        branch: emp.branch,
        status,
        checkInTime: status === 'حاضر' ? nowTime : undefined,
        recordedBy: user?.name || 'مدير الفرع',
      });
    }
    setAttendance(updated);
    saveAttendance(updated);
  };

  const getAttendanceForEmp = (empId: string, dateStr: string) => {
    return attendance.find(a => a.employeeId === empId && a.date === dateStr);
  };

  // Advance submission
  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === advanceEmployeeId);
    if (!emp || !advanceAmount) return;

    const newAdv: EmployeeAdvance = {
      id: `adv_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      employeeId: emp.id,
      employeeName: emp.name,
      branch: emp.branch,
      type: advanceType,
      amount: parseFloat(advanceAmount),
      reason: advanceReason || (advanceType === 'سلفة' ? 'سلفة نقدية من الدرج' : 'إداري'),
      treasuryDeducted: true,
      recordedBy: user?.name || 'مدير الفرع',
    };

    const updated = [newAdv, ...advances];
    setAdvances(updated);
    saveAdvances(updated);
    setAdvanceAmount('');
    setAdvanceReason('');
    alert(`تم تسجيل الـ (${advanceType}) بقيمة ${newAdv.amount} ج للموظف ${emp.name} بنجاح`);
  };

  const handleDeleteAdvance = (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    const updated = advances.filter(a => a.id !== id);
    setAdvances(updated);
    saveAdvances(updated);
  };

  // Weekly Payroll calculation (Saturday to Thursday)
  const currentThursday = useMemo(() => {
    const d = new Date();
    const day = d.getDay(); // 0 is Sunday, 4 is Thursday, 6 is Saturday
    const diff = (4 - day + 7) % 7;
    const thurs = new Date(d);
    thurs.setDate(d.getDate() + diff);
    return thurs.toISOString().split('T')[0];
  }, []);

  const [settlementThursday, setSettlementThursday] = useState<string>(currentThursday);

  const weeklySummary = useMemo(() => {
    // Determine Saturday (start of week) based on selected Thursday
    const thurs = new Date(settlementThursday);
    const sat = new Date(thurs);
    sat.setDate(thurs.getDate() - 5);
    const satStr = sat.toISOString().split('T')[0];
    const thursStr = settlementThursday;

    return branchFilteredEmployees.map(emp => {
      // Count attended days between satStr and thursStr
      const empAtt = attendance.filter(a => 
        a.employeeId === emp.id && 
        a.date >= satStr && 
        a.date <= thursStr
      );

      let attendedDays = 0;
      empAtt.forEach(a => {
        if (a.status === 'حاضر') attendedDays += 1;
        else if (a.status === 'نصف يوم') attendedDays += 0.5;
      });

      // Calculate earned base wage
      const baseEarned = attendedDays * emp.dailyWage;

      // Advances and Deductions in this period
      const empAdvances = advances.filter(a => 
        a.employeeId === emp.id && 
        a.date >= satStr && 
        a.date <= thursStr
      );

      let totalAdv = 0;
      let totalDed = 0;
      let totalBon = 0;

      empAdvances.forEach(a => {
        if (a.type === 'سلفة') totalAdv += a.amount;
        else if (a.type === 'خصم') totalDed += a.amount;
        else if (a.type === 'مكافأة') totalBon += a.amount;
      });

      const netPayout = (baseEarned + totalBon) - (totalAdv + totalDed);

      return {
        employee: emp,
        satStr,
        thursStr,
        attendedDays,
        baseEarned,
        totalAdv,
        totalDed,
        totalBon,
        netPayout,
      };
    });
  }, [branchFilteredEmployees, attendance, advances, settlementThursday]);

  const getWhatsAppShareUrl = (row: any) => {
    const text = `📋 *مستحقات أسبوعية - مؤسسة كشك للأقمشة والستائر*
👤 *الموظف:* ${row.employee.name} (${row.employee.branch})
🗓️ *الفترة:* من السبت ${row.satStr} إلى الخميس ${row.thursStr}
----------------------------------------
💵 *اليومية المقررة:* ${row.employee.dailyWage} ج
📅 *أيام الحضور الفعلية:* ${row.attendedDays} يوم
💰 *إجمالي الأجر المستحق:* ${row.baseEarned.toLocaleString()} ج
🎁 *المكافآت:* +${row.totalBon.toLocaleString()} ج
🔻 *السلف المسحوبة:* -${row.totalAdv.toLocaleString()} ج
🔻 *الخصومات:* -${row.totalDed.toLocaleString()} ج
----------------------------------------
⭐ *صافي القبض المستحق:* ${row.netPayout >= 0 ? '+' : ''}${row.netPayout.toLocaleString()} ج
----------------------------------------
مؤسسة كشك للأقمشة والستائر ✨`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  return (
    <PageShell title="شؤون الموظفين والرواتب الأسبوعية" badge="18 موظفاً">
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
              <span>السلف والخصومات</span>
            </button>
            <button
              onClick={() => setActiveTab('payroll')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'payroll' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>💰</span>
              <span>تقفيل رواتب الخميس</span>
              {!canViewWages && <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">🔒 للإدارة</span>}
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
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-600 shrink-0">الفرع:</span>
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
                <p className="text-xs text-slate-500 mt-0.5">يسجل مدير كل فرع حضور موظفيه وتثبيت الحضور بضغطة زر</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">تاريخ الحضور:</span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">اسم الموظف</th>
                    <th className="p-3">الفرع</th>
                    <th className="p-3 font-mono">اليومية</th>
                    <th className="p-3 font-mono">مواعيد العمل</th>
                    <th className="p-3">الحالة اليوم</th>
                    <th className="p-3 text-center">إجراءات الحضور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {branchFilteredEmployees.map((emp, idx) => {
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
                        <td className="p-3 font-mono font-black text-emerald-800 text-sm">
                          {canViewWages ? (
                            `${emp.dailyWage} ج`
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              🔒 سرية
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-600" dir="ltr">
                          {emp.workStartTime} - {emp.workEndTime}
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: ADVANCES & DEDUCTIONS ── */}
        {activeTab === 'advances' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* New Advance Form */}
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>💸</span>
                <span>تسجيل سلفة / خصم / مكافأة</span>
              </h3>
              <p className="text-xs text-slate-500">تخصم السلفة تلقائياً من درج الفرع وتثبت على حساب الموظف لتقفيل الخميس</p>

              <form onSubmit={handleAddAdvance} className="space-y-3.5 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الموظف *</label>
                  <select
                    required
                    value={advanceEmployeeId}
                    onChange={(e) => setAdvanceEmployeeId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="">-- اختر الموظف --</option>
                    {branchFilteredEmployees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.branch}{canViewWages ? ` - ${e.dailyWage}ج` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نوع الحركة *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['سلفة', 'خصم', 'مكافأة'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAdvanceType(type)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          advanceType === type 
                            ? type === 'سلفة' ? 'bg-amber-600 text-white border-amber-600 shadow-xs' :
                              type === 'خصم' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' :
                              'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {type === 'سلفة' ? 'سلفة نقداً' : type === 'خصم' ? 'خصم إداري' : 'مكافأة +'}
                      </button>
                    ))}
                  </div>
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
                    placeholder="مثال: 100"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السبب / البيان</label>
                  <input
                    type="text"
                    value={advanceReason}
                    onChange={(e) => setAdvanceReason(e.target.value)}
                    placeholder="سبب السلفة أو الخصم..."
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

            {/* Advances Log */}
            <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-black text-slate-900 flex items-center justify-between">
                <span>📋 سجل السلف والخصومات المسجلة</span>
                <span className="text-xs font-normal text-slate-500">إجمالي: {advances.length} حركة</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">الموظف</th>
                      <th className="p-2.5">الفرع</th>
                      <th className="p-2.5">النوع</th>
                      <th className="p-2.5 font-mono">المبلغ</th>
                      <th className="p-2.5">السبب</th>
                      {canViewWages && <th className="p-2.5 text-center">حذف</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {advances.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">لا توجد سلف أو خصومات مسجلة حتى الآن</td>
                      </tr>
                    ) : (
                      advances.map(adv => (
                        <tr key={adv.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono text-slate-600">{adv.date}</td>
                          <td className="p-2.5 font-bold text-slate-900">{adv.employeeName}</td>
                          <td className="p-2.5 text-slate-600">{adv.branch}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              adv.type === 'سلفة' ? 'bg-amber-100 text-amber-800' :
                              adv.type === 'خصم' ? 'bg-rose-100 text-rose-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {adv.type}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-black text-slate-900">{adv.amount.toLocaleString()} ج</td>
                          <td className="p-2.5 text-slate-500 text-[11px]">{adv.reason}</td>
                          {canViewWages && (
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => handleDeleteAdvance(adv.id)}
                                className="text-rose-600 hover:text-rose-800 font-bold text-xs p-1"
                              >
                                ✕
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: THURSDAY PAYROLL SETTLEMENT ── */}
        {activeTab === 'payroll' && (
          !canViewWages ? (
            <div className="bg-linear-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-3xl p-10 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-amber-100 text-amber-900 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-amber-300 shadow-inner">
                🔒
              </div>
              <h3 className="text-lg font-black text-slate-950">شاشة مقفلة — صلاحية خاصة بالمدير العام فقط</h3>
              <p className="text-xs md:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed font-medium">
                حفاظاً على سرية وخصوصية رواتب ويوميات الموظفين، كشف حساب الخميس وتقفيل الرواتب متاح لمدير النظام فقط.
                <br />
                مديرو الفروع مخولون بتسجيل <span className="font-bold text-slate-900">الحضور والانصراف</span> و <span className="font-bold text-slate-900">السلف النقدية</span> فقط.
              </p>
            </div>
          ) : (
            <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>💰</span>
                    <span>كشف حساب وتقفيل رواتب الخميس الأسبوعي</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    احتساب آلي: (أيام الحضور × الأجر اليومي + المكافآت) - (السلف + الخصومات)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">تاريخ خميس التقفيل:</span>
                  <input
                    type="date"
                    value={settlementThursday}
                    onChange={(e) => setSettlementThursday(e.target.value)}
                    className="py-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />
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
                      <th className="p-3 font-mono text-slate-950 font-black text-sm bg-emerald-50">صافي المستحق</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {weeklySummary.map((row) => (
                      <tr key={row.employee.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-black text-slate-900 text-sm">{row.employee.name}</div>
                          <div className="text-[10px] text-slate-500">{row.employee.branch}</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">{row.employee.dailyWage} ج</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{row.attendedDays} يوم</td>
                        <td className="p-3 font-mono font-black text-slate-900">{row.baseEarned.toLocaleString()} ج</td>
                        <td className="p-3 font-mono text-emerald-700 font-bold">+{row.totalBon.toLocaleString()} ج</td>
                        <td className="p-3 font-mono text-amber-800 font-bold">-{row.totalAdv.toLocaleString()} ج</td>
                        <td className="p-3 font-mono text-rose-700 font-bold">-{row.totalDed.toLocaleString()} ج</td>
                        <td className="p-3 font-mono font-black text-sm bg-emerald-50/80 text-emerald-950 border-r border-l border-emerald-200">
                          {row.netPayout >= 0 ? `+${row.netPayout.toLocaleString()}` : row.netPayout.toLocaleString()} ج
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedEmpForSlip(row)}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                              title="معاينة إيصال القبض"
                            >
                              👁️ إيصال
                            </button>
                            <a
                              href={getWhatsAppShareUrl(row)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
                              title="إرسال الحساب للموظف واتساب"
                            >
                              <span>📱</span>
                              <span>واتساب</span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* ── TAB 4: DIRECTORY ── */}
        {activeTab === 'directory' && (
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>👥</span>
                  <span>دليل موظفي الفروع</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">إدارة ومتابعة بيانات موظفي الفروع، المسميات الوظيفية ومواعيد العمل</p>
              </div>

              {canViewWages && (
                <button
                  type="button"
                  onClick={handleOpenAddEmp}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span>➕</span>
                  <span>إضافة موظف جديد</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {branchFilteredEmployees.map((emp) => (
                <div key={emp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 hover:border-slate-400 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-950 text-base">{emp.name}</h4>
                        {emp.isActive === false && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">متوقف</span>
                        )}
                      </div>
                      <p className="text-xs text-amber-800 font-bold">{emp.role}</p>
                      {emp.phone && (
                        <p className="text-[11px] font-mono text-slate-500 font-bold mt-0.5">📞 {emp.phone}</p>
                      )}
                    </div>
                    <span className="bg-white border border-slate-300 text-slate-800 px-2.5 py-1 rounded-xl text-xs font-bold">
                      👑 {emp.branch}
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
                      <span className="font-mono font-bold text-slate-700 text-[11px]" dir="ltr">{emp.workStartTime} - {emp.workEndTime}</span>
                    </div>
                  </div>

                  {canViewWages && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleOpenEditEmp(emp)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>✏️</span>
                        <span>تعديل البيانات</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEmp(emp.id, emp.name)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 cursor-pointer"
                        title="حذف الموظف"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
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
                <button onClick={() => setShowEmpModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
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
                <button onClick={() => setSelectedEmpForSlip(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3 text-xs">
                <div className="text-center border-b pb-2">
                  <p className="font-black text-base text-slate-900">مؤسسة كشك للأقمشة والستائر</p>
                  <p className="text-xs text-amber-800 font-bold">كشف حساب الأسبوع المنتهي: {selectedEmpForSlip.thursStr}</p>
                </div>

                <div className="flex justify-between font-bold text-slate-900">
                  <span>الموظف: {selectedEmpForSlip.employee.name}</span>
                  <span>الفرع: {selectedEmpForSlip.employee.branch}</span>
                </div>

                <div className="space-y-1.5 border-t border-b py-2 text-slate-700">
                  <div className="flex justify-between">
                    <span>أيام الحضور الفعلية:</span>
                    <span className="font-mono font-bold">{selectedEmpForSlip.attendedDays} يوم × {selectedEmpForSlip.employee.dailyWage}ج</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>إجمالي الأجر المكتسب:</span>
                    <span className="font-mono">{selectedEmpForSlip.baseEarned.toLocaleString()} ج</span>
                  </div>
                  {selectedEmpForSlip.totalBon > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>مكافآت إضافية:</span>
                      <span className="font-mono">+{selectedEmpForSlip.totalBon.toLocaleString()} ج</span>
                    </div>
                  )}
                  {selectedEmpForSlip.totalAdv > 0 && (
                    <div className="flex justify-between text-amber-800 font-bold">
                      <span>سلف مسحوبة:</span>
                      <span className="font-mono">-{selectedEmpForSlip.totalAdv.toLocaleString()} ج</span>
                    </div>
                  )}
                  {selectedEmpForSlip.totalDed > 0 && (
                    <div className="flex justify-between text-rose-700 font-bold">
                      <span>خصومات إدارية:</span>
                      <span className="font-mono">-{selectedEmpForSlip.totalDed.toLocaleString()} ج</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl border border-emerald-300 font-black text-emerald-950 text-sm">
                  <span>صافي المستحق للقبض:</span>
                  <span className="font-mono text-base">{selectedEmpForSlip.netPayout.toLocaleString()} ج.م</span>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={getWhatsAppShareUrl(selectedEmpForSlip)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5"
                >
                  <span>📱 إرسال واتساب</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedEmpForSlip(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
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

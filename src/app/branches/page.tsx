'use client';

import React, { useState, useEffect } from 'react';
import PageShell from '@/components/PageShell';
import { ALL_SYSTEM_PAGES } from '@/lib/permissions';
import { BRANCHES_LIST, BranchConfig, normalizeBranchName } from '@/lib/branches';
import BranchPricePasswordsCard from '@/components/BranchPricePasswordsCard';
import CurtainTechniciansCard from '@/components/CurtainTechniciansCard';
import CurtainWorkshopsCard from '@/components/CurtainWorkshopsCard';
import { useCurrentUser } from '@/lib/useCurrentUser';

interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  branch: string;
  restrictToBranch: boolean; // Data isolation: can only see their own branch data
  allowedPageIds: string[];
}

const initialEmployees: Employee[] = [
  {
    id: 'EMP-01',
    name: 'openappo',
    phone: '01558282760',
    role: 'مطور النظام',
    branch: 'الفرع الرئيسي',
    restrictToBranch: false,
    allowedPageIds: ALL_SYSTEM_PAGES.map(p => p.id),
  },
  {
    id: 'EMP-02',
    name: 'أحمد كشك',
    phone: '01063821000',
    role: 'المدير العام للمؤسسة',
    branch: 'الفرع الرئيسي',
    restrictToBranch: false,
    allowedPageIds: ALL_SYSTEM_PAGES.map(p => p.id),
  },
  // ═════════ الفرع الرئيسي (سعد زغلول) ═════════
  {
    id: 'EMP-03',
    name: 'يوسف ياسر',
    phone: '01279549182',
    role: 'مدير فرع سعد زغلول (الرئيسي)',
    branch: 'الفرع الرئيسي',
    restrictToBranch: true,
    allowedPageIds: ALL_SYSTEM_PAGES.map(p => p.id),
  },
  // ═════════ فرع عرابي ═════════
  {
    id: 'EMP-04',
    name: 'أحمد عبدالله',
    phone: '01023232370',
    role: 'مدير فرع عرابي',
    branch: 'فرع عرابي',
    restrictToBranch: true,
    allowedPageIds: ALL_SYSTEM_PAGES.filter(p => p.id !== 'p_dashboard').map(p => p.id),
  },
  {
    id: 'EMP-05',
    name: 'محمد نصار',
    phone: '01055288214',
    role: 'كاشير فرع عرابي',
    branch: 'فرع عرابي',
    restrictToBranch: true,
    // كاشير: بدون صلاحية تعديل الأسعار — يحتاج باسورد المدير
    allowedPageIds: ['p_inspections', 'p_pricing', 'p_fabric_sales', 'p_customers', 'p_inventory', 'p_dashboard'],
  },
  // ═════════ فرع عمر أفندي (فرع أقمشة فقط — بدون مراحل الستائر) ═════════
  {
    id: 'EMP-06',
    name: 'محمد كشك',
    phone: '01018728640',
    role: 'مدير فرع عمر أفندي',
    branch: 'فرع عمر أفندي',
    restrictToBranch: true,
    allowedPageIds: ['p_fabric_sales', 'p_purchases', 'p_customers', 'p_suppliers', 'p_inventory', 'p_dashboard'],
  },
  {
    id: 'EMP-07',
    name: 'أحمد عبدالعال',
    phone: '01275763008',
    role: 'كاشير فرع عمر أفندي',
    branch: 'فرع عمر أفندي',
    restrictToBranch: true,
    allowedPageIds: ['p_fabric_sales', 'p_customers', 'p_inventory', 'p_dashboard'],
  },
  // ═════════ فرع الثلاثيني (فرع أقمشة فقط — بدون مراحل الستائر) ═════════
  {
    id: 'EMP-08',
    name: 'عبدالله كشك',
    phone: '01033447262',
    role: 'مدير فرع الثلاثيني',
    branch: 'فرع الثلاثيني',
    restrictToBranch: true,
    allowedPageIds: ['p_fabric_sales', 'p_purchases', 'p_customers', 'p_suppliers', 'p_inventory', 'p_dashboard'],
  },
  // ═════════ الفرع التجاري (أقمشة وشحن أونلاين) ═════════
  {
    id: 'EMP-09',
    name: 'عبدالرحمن كشك',
    phone: '01280042900',
    role: 'مدير الفرع التجاري',
    branch: 'الفرع التجاري',
    restrictToBranch: true,
    allowedPageIds: ['p_fabric_sales', 'p_purchases', 'p_customers', 'p_suppliers', 'p_inventory', 'p_reports', 'p_shifts', 'p_dashboard'],
  },
  {
    id: 'EMP-10',
    name: 'محمد على',
    phone: '01220999355',
    role: 'كاشير الفرع التجاري',
    branch: 'الفرع التجاري',
    restrictToBranch: true,
    allowedPageIds: ['p_fabric_sales', 'p_customers', 'p_inventory', 'p_shifts', 'p_dashboard'],
  },
];

export default function BranchesAndPermissionsPage() {
  const { isAdmin, loading: userLoading } = useCurrentUser();
  const [branches] = useState<BranchConfig[]>(BRANCHES_LIST);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [showPermsModal, setShowPermsModal] = useState(false);

  // Edit Permissions Form State
  const [activeBranch, setActiveBranch] = useState('الفرع الرئيسي');
  const [restrictToBranch, setRestrictToBranch] = useState(true);
  const [activePerms, setActivePerms] = useState<string[]>([]);

  useEffect(() => {
    // اقرأ الصلاحيات من السيرفر (persistent per-user)
    (async () => {
      const withServerPerms = await Promise.all(initialEmployees.map(async emp => {
        try {
          const res = await fetch(`/api/user-permissions?phone=${encodeURIComponent(emp.phone)}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.allowedPageIds)) {
              return {
                ...emp,
                branch: data.branch || emp.branch,
                restrictToBranch: typeof data.restrictToBranch === 'boolean' ? data.restrictToBranch : emp.restrictToBranch,
                allowedPageIds: data.allowedPageIds,
              };
            }
          }
        } catch {}
        return emp;
      }));
      setEmployees(withServerPerms);
    })();
  }, []);

  const quickChangeBranch = async (emp: Employee, newBranch: string) => {
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, branch: newBranch } : e));
    try {
      localStorage.setItem(`user_branch_${emp.phone}`, newBranch);
    } catch {}
    try {
      await fetch('/api/user-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: emp.phone,
          allowedPageIds: emp.allowedPageIds,
          restrictToBranch: emp.restrictToBranch,
          branch: newBranch,
        }),
      });
    } catch (e: any) {
      alert('فشل حفظ الفرع الجديد بالسيرفر: ' + (e?.message || ''));
    }
  };

  const openPermsModal = (emp: Employee) => {
    setSelectedEmp(emp);
    setActiveBranch(emp.branch);
    setRestrictToBranch(emp.restrictToBranch);
    setActivePerms(emp.allowedPageIds || []);
    setShowPermsModal(true);
  };

  const togglePagePerm = (pageId: string) => {
    setActivePerms(prev => {
      if (prev.includes(pageId)) {
        // شيل الصفحة + كل sub-perms المرتبطة بيها
        return prev.filter(id =>
          id !== pageId &&
          id !== `${pageId}_edit_price` &&
          id !== `${pageId}_edit` &&
          id !== `${pageId}_delete`
        );
      } else {
        // فعّل الصفحة + تعديل السعر افتراضياً (بس بدون حذف)
        return [...prev, pageId, `${pageId}_edit_price`, `${pageId}_edit`];
      }
    });
  };

  const toggleSubPerm = (subKey: string) => {
    setActivePerms(prev =>
      prev.includes(subKey) ? prev.filter(id => id !== subKey) : [...prev, subKey]
    );
  };

  const applyPreset = (presetType: 'ALL' | 'INSPECTOR' | 'WORKSHOP' | 'INSTALLER' | 'FABRIC_ONLY') => {
    if (presetType === 'ALL') {
      const allPages = ALL_SYSTEM_PAGES.map(p => p.id);
      const allPrices = ALL_SYSTEM_PAGES.filter(p => p.hasPriceControl).map(p => `${p.id}_edit_price`);
      const allEdits = ALL_SYSTEM_PAGES.filter(p => p.hasEditControl).map(p => `${p.id}_edit`);
      const allDeletes = ALL_SYSTEM_PAGES.filter(p => p.hasDeleteControl).map(p => `${p.id}_delete`);
      setActivePerms([...allPages, ...allPrices, ...allEdits, ...allDeletes]);
    } else if (presetType === 'INSPECTOR') {
      setActivePerms(['p_inspections', 'p_inspections_edit_price', 'p_dashboard']);
    } else if (presetType === 'WORKSHOP') {
      setActivePerms(['p_cutting', 'p_tailoring', 'p_accessories']);
    } else if (presetType === 'INSTALLER') {
      setActivePerms(['p_installation', 'p_accessories']);
    } else if (presetType === 'FABRIC_ONLY') {
      setActivePerms([
        'p_dashboard',
        'p_fabric_sales',
        'p_fabric_sales_edit_price',
        'p_fabric_sales_edit',
        'p_purchases',
        'p_purchases_edit_price',
        'p_purchases_edit',
        'p_customers',
        'p_customers_edit',
        'p_suppliers',
        'p_suppliers_edit',
        'p_inventory',
        'p_inventory_edit_price',
        'p_inventory_edit',
        'p_reports',
      ]);
    }
  };

  const savePermissions = async () => {
    if (!selectedEmp) return;
    const empPhone = selectedEmp.phone;
    const newPerms = [...activePerms];
    const newBranch = activeBranch;
    const newRestrict = restrictToBranch;

    setEmployees(prev => prev.map(e => e.id === selectedEmp.id ? {
      ...e,
      branch: newBranch,
      restrictToBranch: newRestrict,
      allowedPageIds: newPerms,
    } : e));

    try {
      localStorage.setItem(`user_perms_${empPhone}`, JSON.stringify(newPerms));
      localStorage.setItem(`user_branch_${empPhone}`, newBranch);
      localStorage.setItem(`user_restrict_${empPhone}`, String(newRestrict));
      window.dispatchEvent(new Event('storage'));
    } catch {}

    try {
      const res = await fetch('/api/user-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: empPhone,
          allowedPageIds: newPerms,
          restrictToBranch: newRestrict,
          branch: newBranch,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert('تعذر حفظ الصلاحيات على السيرفر: ' + (err?.error || 'تحقق من صلاحيات المدير'));
      }
    } catch (e: any) {
      alert('فشل الاتصال بالسيرفر لحفظ الصلاحيات: ' + (e?.message || ''));
    }

    setShowPermsModal(false);
  };

  // #GUARD: الصفحة دي بتتحكم فى فروع وصلاحيات كل الموظفين — الأدمن بس.
  if (userLoading) {
    return (
      <PageShell title="الفروع وصلاحيات الموظفين وعزل البيانات">
        <div className="flex items-center justify-center py-24 text-slate-400 font-bold text-sm">جارِ التحقق...</div>
      </PageShell>
    );
  }
  if (!isAdmin) {
    return (
      <PageShell title="الفروع وصلاحيات الموظفين وعزل البيانات">
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <span className="material-symbols-outlined text-5xl text-rose-400">lock</span>
          <p className="text-slate-700 font-bold">هذه الصفحة متاحة للأدمن فقط</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="الفروع وصلاحيات الموظفين وعزل البيانات">
      <div className="flex flex-col gap-8">
        {/* Concise Modern Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900 flex items-center gap-2.5">
              <span>🏢</span>
              <span>فروع المؤسسة وصلاحيات الوصول</span>
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              إدارة الفروع الـ 5، وتوزيع الموظفين، وضبط الصلاحيات وعزل البيانات
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold font-mono">
              5 فروع رسمية
            </span>
            <span className="bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-bold font-mono">
              {employees.length} مستخدم مسجل
            </span>
          </div>
        </div>

        {/* 5 Official Branches Cards */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {branches.map(b => {
              const branchStaff = employees.filter(e => normalizeBranchName(e.branch) === normalizeBranchName(b.name));
              const isMain = b.isMain;
              const isComm = b.name === 'الفرع التجاري';
              return (
                <div key={b.id} className={`bg-white rounded-2xl border p-4 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                  isMain ? 'border-amber-300 ring-1 ring-amber-200/60' : isComm ? 'border-indigo-200' : 'border-slate-200'
                }`}>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        b.type === 'ستائر وأقمشة تنجيد' 
                          ? 'bg-amber-50 text-amber-900 border-amber-200' 
                          : b.type === 'أقمشة وشحن أونلاين'
                          ? 'bg-indigo-50 text-indigo-900 border-indigo-200'
                          : 'bg-blue-50 text-blue-900 border-blue-200'
                      }`}>
                        {b.type}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                        {branchStaff.length} مستخدم
                      </span>
                    </div>

                    <h3 className="font-display font-black text-base text-slate-900 mt-1 flex items-center gap-1.5">
                      <span>{isMain ? '👑' : isComm ? '🌐' : '🏬'}</span>
                      <span>{b.name}</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 flex items-start gap-1 mt-1 leading-snug">
                      <span className="material-symbols-outlined text-[13px] shrink-0 text-slate-400 mt-0.5">location_on</span>
                      <span>{b.address}</span>
                    </p>
                  </div>

                  <div className="pt-2.5 mt-3 border-t border-slate-100 text-xs text-slate-600">
                    <span className="block font-bold mb-1 text-slate-700 text-[11px]">الموظفون المسجلون:</span>
                    {branchStaff.length > 0 ? (
                      <div className="space-y-1">
                        {branchStaff.map(s => (
                          <div key={s.id} className="text-slate-800 font-bold text-[11px] truncate flex items-center justify-between">
                            <span className="truncate">• {s.name}</span>
                            <span className="text-[9px] text-slate-500 bg-slate-100 px-1 py-0.2 rounded shrink-0">{s.role.includes('مدير') ? 'مدير' : s.role.includes('كاشير') ? 'كاشير' : 'موظف'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">لا يوجد موظفون مخصصون</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manager Password Change Card */}
        <BranchPricePasswordsCard />

        {/* Dynamic Technicians & Workshops Management Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CurtainTechniciansCard />
          <CurtainWorkshopsCard />
        </div>

        {/* Employees & Permissions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-base text-slate-900">قائمة موظفي الفروع ومستوى الوصول</h2>
              <p className="text-xs text-slate-500 mt-0.5">حدد فرع كل موظف وصفحات السايد بار المسموح له بفتحها</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs min-w-[760px]">
              <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                <tr>
                  <th className="p-3.5">الموظف</th>
                  <th className="p-3.5 text-center">الوظيفة</th>
                  <th className="p-3.5">الفرع المخصص</th>
                  <th className="p-3.5 text-center">عزل البيانات</th>
                  <th className="p-3.5 text-center">الصفحات المسموحة</th>
                  <th className="p-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => {
                  const isAdminUser = emp.phone === '01558282760' || emp.phone === '01063821000' || emp.role.includes('Admin') || emp.role.includes('المدير العام');
                  const isManager = !isAdminUser && emp.role.includes('مدير');
                  const isCashier = !isAdminUser && emp.role.includes('كاشير');
                  const isTopRow = idx < 3;

                  return (
                    <tr key={emp.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-sm text-slate-900">{emp.name}</div>
                        <div className="text-slate-400 font-mono mt-0.5" dir="ltr">{emp.phone}</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black border inline-flex items-center gap-1 ${
                          isAdminUser 
                            ? 'bg-amber-100 text-amber-950 border-amber-300' 
                            : isManager 
                            ? 'bg-blue-100 text-blue-950 border-blue-300' 
                            : isCashier 
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-300' 
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          <span>{isAdminUser ? '👑' : isManager ? '👔' : isCashier ? '💼' : '👤'}</span>
                          <span>{isAdminUser ? 'ادمن' : isManager ? 'مدير' : isCashier ? 'كاشير' : 'موظف'}</span>
                        </span>
                      </td>
                      <td className="p-3.5">
                        <select
                          value={emp.branch}
                          onChange={(e) => quickChangeBranch(emp, e.target.value)}
                          className="bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                          title="انقر لتغيير فرع الموظف فوراً"
                        >
                          {branches.map(b => (
                            <option key={b.id} value={b.name}>{b.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3.5 text-center">
                        {emp.restrictToBranch ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-900 border border-purple-200">
                            🔒 فرعه فقط
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            🌐 كل الفروع (Admin)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {(() => {
                          const activePages = ALL_SYSTEM_PAGES.filter(p => emp.allowedPageIds.includes(p.id));
                          return (
                            <div className="relative inline-block group">
                              <span className="font-mono font-black text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs">
                                <span>{activePages.length} من {ALL_SYSTEM_PAGES.length} صفحة</span>
                                <span className="material-symbols-outlined text-[14px] text-amber-700">visibility</span>
                              </span>

                              {/* Hover Popover Box */}
                              <div className={`invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 delay-75 absolute ${
                                isTopRow ? 'top-full mt-2' : 'bottom-full mb-2'
                              } left-1/2 -translate-x-1/2 w-84 sm:w-[460px] p-3.5 bg-slate-950 text-white rounded-2xl shadow-2xl border border-slate-700/80 text-right z-50 pointer-events-none`}>
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                                  <div>
                                    <span className="font-black text-xs text-amber-400 block">الصفحات والأذونات المفتوحة ({activePages.length})</span>
                                    <span className="text-[10px] text-slate-400 font-bold">{emp.name} — {emp.branch}</span>
                                  </div>
                                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                                    {Math.round((activePages.length / ALL_SYSTEM_PAGES.length) * 100)}%
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-80 overflow-y-auto pr-0.5 text-right">
                                  {activePages.map(page => {
                                    const hasPrice = emp.allowedPageIds.includes(`${page.id}_edit_price`);
                                    const hasEdit = emp.allowedPageIds.includes(`${page.id}_edit`);
                                    const hasDelete = emp.allowedPageIds.includes(`${page.id}_delete`);

                                    return (
                                      <div key={page.id} className="flex items-center justify-between gap-1 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="material-symbols-outlined text-amber-400 text-xs shrink-0">{page.icon}</span>
                                          <span className="font-bold text-slate-100 truncate text-[10px]">{page.name}</span>
                                        </div>
                                        {(hasPrice || hasEdit || hasDelete) && (
                                          <span className="flex items-center gap-0.5 text-[9px] shrink-0 font-mono">
                                            {hasPrice && <span title="تعديل السعر">💰</span>}
                                            {hasEdit && <span title="تعديل السجلات">✏️</span>}
                                            {hasDelete && <span title="حذف">🗑️</span>}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Arrow Pointer */}
                                {isTopRow ? (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-slate-950"></div>
                                ) : (
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-950"></div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => openPermsModal(emp)}
                          className="bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-2.5 py-1.5 rounded-xl font-bold shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer text-xs"
                          title="تعديل الصلاحيات والفرع"
                        >
                          <span className="material-symbols-outlined text-[14px]">tune</span>
                          <span>الصلاحيات</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Permissions & Branch Modal */}
      {showPermsModal && selectedEmp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-slate-400">{selectedEmp.id}</span>
                <h2 className="font-display font-black text-xl text-slate-900">
                  تحديد فرع وصلاحيات: {selectedEmp.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5" dir="ltr">{selectedEmp.phone}</p>
              </div>
              <button onClick={() => setShowPermsModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Branch Assignment & Data Isolation Controls */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">الفرع المخصص للموظف:</label>
                  <select
                    value={activeBranch}
                    onChange={(e) => setActiveBranch(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name} ({b.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">نطاق رؤية البيانات (Data Scoping):</label>
                  <label className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl p-2.5 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={restrictToBranch}
                      onChange={(e) => setRestrictToBranch(e.target.checked)}
                      className="rounded"
                    />
                    <span>عزل البيانات (رؤية داتا فرعه فقط) 🔒</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="mb-5 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600 block mb-2">قوالب الصلاحيات والصفحات:</span>
              <div className="flex flex-wrap gap-2 text-xs">
                <button onClick={() => applyPreset('ALL')} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-800">
                  إظهار كل الصفحات (مدير)
                </button>
                <button onClick={() => applyPreset('FABRIC_ONLY')} className="bg-blue-100 text-blue-950 border border-blue-200 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200">
                  فروع الأقمشة فقط (عمر أفندي / الثلاثيني)
                </button>
                <button onClick={() => applyPreset('INSPECTOR')} className="bg-amber-100 text-amber-950 border border-amber-200 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-200">
                  فني معاينات ومقاسات
                </button>
                <button onClick={() => applyPreset('WORKSHOP')} className="bg-purple-100 text-purple-950 border border-purple-200 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-200">
                  فني ورشة وتفصيل
                </button>
                <button onClick={() => applyPreset('INSTALLER')} className="bg-emerald-100 text-emerald-950 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-200">
                  فني تركيبات وتسليم
                </button>
              </div>
            </div>

            {/* Pages Matrix */}
            <div className="space-y-4">
              {['مراحل الستائر', 'المبيعات والحسابات', 'الإدارة والمخزون'].map((cat) => {
                const pagesInCat = ALL_SYSTEM_PAGES.filter(p => p.category === cat);
                return (
                  <div key={cat} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <h3 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-3">
                      {cat} ({pagesInCat.filter(p => activePerms.includes(p.id)).length} من {pagesInCat.length} مفعل)
                    </h3>

                    <div className="space-y-2">
                      {pagesInCat.map(page => {
                        const isAllowed = activePerms.includes(page.id);
                        const priceEditAllowed = activePerms.includes(`${page.id}_edit_price`);
                        const editAllowed = activePerms.includes(`${page.id}_edit`);
                        const deleteAllowed = activePerms.includes(`${page.id}_delete`);

                        return (
                          <div
                            key={page.id}
                            className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                              isAllowed
                                ? 'bg-white border-amber-300 ring-1 ring-amber-300/30 shadow-xs'
                                : 'bg-slate-100/70 border-slate-200 opacity-60 hover:opacity-80'
                            }`}
                          >
                            <div className="flex items-center justify-between" onClick={() => togglePagePerm(page.id)}>
                              <div className="flex items-center gap-3">
                                <span className={`material-symbols-outlined text-[20px] ${isAllowed ? 'text-slate-950' : 'text-slate-400'}`}>
                                  {page.icon}
                                </span>
                                <div>
                                  <div className={`font-bold text-xs ${isAllowed ? 'text-slate-900' : 'text-slate-600'}`}>{page.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{page.href}</div>
                                </div>
                              </div>

                              <span className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
                                isAllowed
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : 'bg-slate-300 text-slate-700'
                              }`}>
                                {isAllowed ? 'ظهور 🟢' : 'إخفاء ⚪'}
                              </span>
                            </div>

                            {/* Sub-Permissions: تعديل السعر / تعديل السجل / حذف السجل */}
                            {isAllowed && (page.hasPriceControl || page.hasEditControl || page.hasDeleteControl) && (
                              <div onClick={e => e.stopPropagation()} className="mt-1 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                {page.hasPriceControl && (
                                  <label className={`flex items-center gap-2 text-[11px] font-bold cursor-pointer select-none p-2 rounded-lg border ${priceEditAllowed ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                    <input type="checkbox" checked={priceEditAllowed}
                                      onChange={() => toggleSubPerm(`${page.id}_edit_price`)}
                                      className="w-3.5 h-3.5 rounded text-amber-600 cursor-pointer" />
                                    <span>💵 تعديل الأسعار</span>
                                  </label>
                                )}
                                {page.hasEditControl && (
                                  <label className={`flex items-center gap-2 text-[11px] font-bold cursor-pointer select-none p-2 rounded-lg border ${editAllowed ? 'bg-blue-50 border-blue-300 text-blue-950' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                    <input type="checkbox" checked={editAllowed}
                                      onChange={() => toggleSubPerm(`${page.id}_edit`)}
                                      className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer" />
                                    <span>✏️ تعديل السجلات</span>
                                  </label>
                                )}
                                {page.hasDeleteControl && (
                                  <label className={`flex items-center gap-2 text-[11px] font-bold cursor-pointer select-none p-2 rounded-lg border ${deleteAllowed ? 'bg-red-50 border-red-300 text-red-950' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                    <input type="checkbox" checked={deleteAllowed}
                                      onChange={() => toggleSubPerm(`${page.id}_delete`)}
                                      className="w-3.5 h-3.5 rounded text-red-600 cursor-pointer" />
                                    <span>🗑️ حذف السجلات</span>
                                  </label>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={savePermissions}
                className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 py-3 rounded-xl font-bold text-sm shadow-gold"
              >
                حفظ الفرع والصلاحيات وعزل البيانات
              </button>
              <button
                onClick={() => setShowPermsModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

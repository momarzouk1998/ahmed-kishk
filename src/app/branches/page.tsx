'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';
import { ALL_SYSTEM_PAGES } from '@/lib/permissions';
import { BRANCHES_LIST, BranchConfig } from '@/lib/branches';

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
    role: 'المدير العام ومطور النظام (Super Admin)',
    branch: 'الفرع الرئيسي',
    restrictToBranch: false, // Admin sees all branches
    allowedPageIds: ALL_SYSTEM_PAGES.map(p => p.id),
  },
  {
    id: 'EMP-02',
    name: 'أحمد كشك',
    phone: '01063821000',
    role: 'مدير (Store Manager)',
    branch: 'الفرع الرئيسي',
    restrictToBranch: false, // Store Manager sees all branches
    allowedPageIds: ALL_SYSTEM_PAGES.map(p => p.id),
  },
  {
    id: 'EMP-03',
    name: 'موظف فرع عرابي 1',
    phone: '01011111111',
    role: 'مسؤول مبيعات ومعاينات',
    branch: 'فرع عرابي',
    restrictToBranch: true,
    allowedPageIds: ['p_inspections', 'p_pricing', 'p_fabric_sales', 'p_customers', 'p_dashboard'],
  },
  {
    id: 'EMP-04',
    name: 'موظف فرع عرابي 2',
    phone: '01022222222',
    role: 'فني تفصيل وتركيبات',
    branch: 'فرع عرابي',
    restrictToBranch: true,
    allowedPageIds: ['p_cutting', 'p_tailoring', 'p_accessories', 'p_installation'],
  },
  {
    id: 'EMP-05',
    name: 'موظف فرع عمر أفندي 1',
    phone: '01033333333',
    role: 'كاشير ومبيعات أقمشة',
    branch: 'فرع عمر أفندي',
    restrictToBranch: true,
    allowedPageIds: ['p_fabric_sales', 'p_customers', 'p_inventory', 'p_dashboard'],
  },
  {
    id: 'EMP-06',
    name: 'موظف فرع عمر أفندي 2',
    phone: '01044444444',
    role: 'بائع أقمشة',
    branch: 'فرع عمر أفندي',
    restrictToBranch: true,
    allowedPageIds: ['p_fabric_sales', 'p_customers', 'p_inventory', 'p_dashboard'],
  },
  {
    id: 'EMP-07',
    name: 'موظف فرع الثلاثيني',
    phone: '01055555555',
    role: 'مسؤول فرع الثلاثيني (أقمشة)',
    branch: 'فرع الثلاثيني',
    restrictToBranch: true,
    allowedPageIds: ['p_fabric_sales', 'p_customers', 'p_inventory', 'p_dashboard'],
  },
];

export default function BranchesAndPermissionsPage() {
  const [branches] = useState<BranchConfig[]>(BRANCHES_LIST);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [showPermsModal, setShowPermsModal] = useState(false);

  // Edit Permissions Form State
  const [activeBranch, setActiveBranch] = useState('الفرع الرئيسي');
  const [restrictToBranch, setRestrictToBranch] = useState(true);
  const [activePerms, setActivePerms] = useState<string[]>([]);

  const openPermsModal = (emp: Employee) => {
    setSelectedEmp(emp);
    setActiveBranch(emp.branch);
    setRestrictToBranch(emp.restrictToBranch);
    setActivePerms(emp.allowedPageIds);
    setShowPermsModal(true);
  };

  const togglePagePerm = (pageId: string) => {
    setActivePerms(prev =>
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  const applyPreset = (presetType: 'ALL' | 'INSPECTOR' | 'WORKSHOP' | 'INSTALLER' | 'FABRIC_ONLY') => {
    if (presetType === 'ALL') {
      setActivePerms(ALL_SYSTEM_PAGES.map(p => p.id));
    } else if (presetType === 'INSPECTOR') {
      setActivePerms(['p_inspections', 'p_dashboard']);
    } else if (presetType === 'WORKSHOP') {
      setActivePerms(['p_cutting', 'p_tailoring', 'p_accessories']);
    } else if (presetType === 'INSTALLER') {
      setActivePerms(['p_installation', 'p_accessories']);
    } else if (presetType === 'FABRIC_ONLY') {
      // For Omar Effendi and Thalatheny branches (fabrics only)
      setActivePerms(['p_fabric_sales', 'p_customers', 'p_inventory', 'p_dashboard']);
    }
  };

  const savePermissions = () => {
    if (!selectedEmp) return;
    setEmployees(prev => prev.map(e => e.id === selectedEmp.id ? {
      ...e,
      branch: activeBranch,
      restrictToBranch,
      allowedPageIds: activePerms,
    } : e));

    try {
      localStorage.setItem(`user_perms_${selectedEmp.phone}`, JSON.stringify(activePerms));
      localStorage.setItem(`user_branch_${selectedEmp.phone}`, activeBranch);
      localStorage.setItem(`user_restrict_${selectedEmp.phone}`, String(restrictToBranch));
    } catch {}

    setShowPermsModal(false);
    alert(`تم حفظ صلاحيات الموظف (${selectedEmp.name}) وتحديد فرعه (${activeBranch}) وعزل البيانات بنجاح!`);
  };

  return (
    <PageShell title="الفروع وصلاحيات الموظفين وعزل البيانات">
      <div className="flex flex-col gap-8">
        {/* Top Overview */}
        <div>
          <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-block mb-1">
            الفروع الـ 4 الرسمية وهيكل الصلاحيات
          </span>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-slate-900">
            فروع مؤسسة أحمد كشك وصلاحيات الموظفين
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 max-w-3xl">
            توزيع الموظفين على الفروع الـ 4، تطبيق عزل البيانات (لكل موظف رؤية بيانات فرعه فقط)، وتحديد الصفحات المسموحة في السايد بار (ظهور / إخفاء).
          </p>
        </div>

        {/* 4 Official Branches Cards */}
        <div>
          <h2 className="font-bold text-base text-slate-900 mb-3">فروع المؤسسة الرسمية وتخصصاتها (4 فروع):</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {branches.map(b => {
              const branchStaff = employees.filter(e => e.branch === b.name);
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                        b.type === 'ستائر وأقمشة تنجيد' ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-blue-100 text-blue-900 border-blue-200'
                      }`}>
                        {b.type}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {branchStaff.length}/{b.userCapacity} مستخدم
                      </span>
                    </div>

                    <h3 className="font-display font-black text-lg text-slate-900 mt-1">{b.name}</h3>
                    <p className="text-xs text-slate-500 flex items-start gap-1 mt-1">
                      <span className="material-symbols-outlined text-[15px] shrink-0 text-slate-400">location_on</span>
                      <span>{b.address}</span>
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 text-xs text-slate-600">
                    <span className="block font-bold mb-1 text-slate-700">الموظفون المسجلون:</span>
                    {branchStaff.length > 0 ? (
                      <div className="space-y-0.5">
                        {branchStaff.map(s => (
                          <div key={s.id} className="text-slate-800 font-medium truncate">• {s.name} ({s.role})</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">لا يوجد موظفون مخصصون بعد</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
            <table className="w-full text-right text-xs min-w-[720px]">
              <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                <tr>
                  <th className="p-4">الموظف</th>
                  <th className="p-4">الدور الوظيفي</th>
                  <th className="p-4">الفرع المخصص</th>
                  <th className="p-4 text-center">عزل البيانات</th>
                  <th className="p-4 text-center">الصفحات المسموحة</th>
                  <th className="p-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-sm text-slate-900">{emp.name}</div>
                      <div className="text-slate-400 font-mono mt-0.5" dir="ltr">{emp.phone}</div>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{emp.role}</td>
                    <td className="p-4">
                      <span className="font-bold text-slate-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                        {emp.branch}
                      </span>
                    </td>
                    <td className="p-4 text-center">
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
                    <td className="p-4 text-center">
                      <span className="font-mono font-black text-brand-gold-dark bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                        {emp.allowedPageIds.length} من {ALL_SYSTEM_PAGES.length} صفحة
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => openPermsModal(emp)}
                        className="bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-4 py-2 rounded-xl font-bold shadow-gold transition-all flex items-center gap-1.5 mx-auto"
                      >
                        <span className="material-symbols-outlined text-[16px]">tune</span>
                        تعديل الفرع والصفحات
                      </button>
                    </td>
                  </tr>
                ))}
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
                        return (
                          <div
                            key={page.id}
                            onClick={() => togglePagePerm(page.id)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isAllowed
                                ? 'bg-white border-brand-gold ring-1 ring-brand-gold/30 shadow-xs'
                                : 'bg-slate-100/70 border-slate-200 opacity-60 hover:opacity-80'
                            }`}
                          >
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

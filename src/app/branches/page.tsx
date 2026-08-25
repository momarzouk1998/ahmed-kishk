'use client';

import React, { useState } from 'react';
import PageShell from '@/components/PageShell';
import { ALL_SYSTEM_PAGES, PagePermission } from '@/lib/permissions';

interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string;
  branch: string;
  allowedPageIds: string[];
}

const initialEmployees: Employee[] = [
  {
    id: 'EMP-01',
    name: 'أحمد كشك',
    phone: '01558282760',
    role: 'المدير العام (Admin)',
    branch: 'الفرع الرئيسي — القاهرة',
    allowedPageIds: ALL_SYSTEM_PAGES.map(p => p.id), // All pages
  },
  {
    id: 'EMP-02',
    name: 'أحمد حسن',
    phone: '01012345670',
    role: 'فني معاينات ورفع مقاسات',
    branch: 'الفرع الرئيسي — القاهرة',
    allowedPageIds: ['p_inspections', 'p_dashboard'],
  },
  {
    id: 'EMP-03',
    name: 'محمد علي',
    phone: '01123456780',
    role: 'مسؤول مبيعات وكاشير',
    branch: 'الفرع الرئيسي — القاهرة',
    allowedPageIds: ['p_pricing', 'p_fabric_sales', 'p_customers', 'p_dashboard'],
  },
  {
    id: 'EMP-04',
    name: 'عم مصطفى',
    phone: '01234567890',
    role: 'مسؤول الورشة والتفصيل',
    branch: 'الفرع الرئيسي — القاهرة',
    allowedPageIds: ['p_cutting', 'p_tailoring', 'p_accessories'],
  },
  {
    id: 'EMP-05',
    name: 'علي إبراهيم',
    phone: '01098765430',
    role: 'فني تركيبات وتسليم',
    branch: 'الفرع الرئيسي — القاهرة',
    allowedPageIds: ['p_installation', 'p_accessories'],
  }
];

export default function BranchesAndPermissionsPage() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [showPermsModal, setShowPermsModal] = useState(false);

  // Edit Permissions Form State
  const [activePerms, setActivePerms] = useState<string[]>([]);

  const openPermsModal = (emp: Employee) => {
    setSelectedEmp(emp);
    setActivePerms(emp.allowedPageIds);
    setShowPermsModal(true);
  };

  const togglePagePerm = (pageId: string) => {
    setActivePerms(prev =>
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  const applyPreset = (presetType: 'ALL' | 'INSPECTOR' | 'WORKSHOP' | 'INSTALLER' | 'SALES') => {
    if (presetType === 'ALL') {
      setActivePerms(ALL_SYSTEM_PAGES.map(p => p.id));
    } else if (presetType === 'INSPECTOR') {
      setActivePerms(['p_inspections', 'p_dashboard']);
    } else if (presetType === 'WORKSHOP') {
      setActivePerms(['p_cutting', 'p_tailoring', 'p_accessories']);
    } else if (presetType === 'INSTALLER') {
      setActivePerms(['p_installation', 'p_accessories']);
    } else if (presetType === 'SALES') {
      setActivePerms(['p_pricing', 'p_fabric_sales', 'p_customers', 'p_dashboard']);
    }
  };

  const savePermissions = () => {
    if (!selectedEmp) return;
    setEmployees(prev => prev.map(e => e.id === selectedEmp.id ? { ...e, allowedPageIds: activePerms } : e));
    // Persist to localStorage for runtime demo
    try {
      localStorage.setItem(`user_perms_${selectedEmp.phone}`, JSON.stringify(activePerms));
    } catch {}
    setShowPermsModal(false);
    alert(`تم حفظ صلاحيات الموظف (${selectedEmp.name}) بنجاح! سيتم إظهار الصفحات المحددة فقط في السايد بار.`);
  };

  return (
    <PageShell title="الفروع وصلاحيات ظهور الصفحات للموظفين">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-block mb-1">
              إدارة الصلاحيات والأذونات (ظهور / إخفاء)
            </span>
            <h1 className="font-display font-black text-2xl text-slate-900">صلاحيات الموظفين وصفحات دورة العمل</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              تحديد الصفحات المسموحة لكل موظف وفني في السايد بار بضغطة زر (ظهور / إخفاء).
            </p>
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="font-bold text-base text-slate-900">قائمة موظفي وفنيي المؤسسة</h2>
              <p className="text-xs text-slate-500 mt-0.5">اضغط على زر &quot;تعديل الصلاحيات&quot; لتحديد الصفحات المتاحة لكل مستخدم</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-mono border-b border-slate-200">
                <tr>
                  <th className="p-4">كود الموظف</th>
                  <th className="p-4">الاسم</th>
                  <th className="p-4">الدور الوظيفي</th>
                  <th className="p-4">الفرع</th>
                  <th className="p-4 text-center">الصفحات المفعلة</th>
                  <th className="p-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-400">{emp.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-sm text-slate-900">{emp.name}</div>
                      <div className="text-slate-400 font-mono mt-0.5" dir="ltr">{emp.phone}</div>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {emp.role}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 font-medium">{emp.branch}</td>
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
                        تعديل الصلاحيات والظهور
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Permissions Show / Hide Toggle Matrix */}
      {showPermsModal && selectedEmp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-slate-400">{selectedEmp.id}</span>
                <h2 className="font-display font-black text-xl text-slate-900">
                  تحديد صلاحيات صفحات الموظف: {selectedEmp.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  الدور: <strong className="text-slate-800">{selectedEmp.role}</strong> • الفرع: {selectedEmp.branch}
                </p>
              </div>
              <button onClick={() => setShowPermsModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="mb-5 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-600 block mb-2">تطبيق قوالب صلاحيات جاهزة:</span>
              <div className="flex flex-wrap gap-2 text-xs">
                <button onClick={() => applyPreset('ALL')} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-800">
                  إظهار كل الصفحات (مدير)
                </button>
                <button onClick={() => applyPreset('INSPECTOR')} className="bg-amber-100 text-amber-950 border border-amber-200 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-200">
                  فني معاينات (صفحة المقاسات فقط)
                </button>
                <button onClick={() => applyPreset('WORKSHOP')} className="bg-purple-100 text-purple-950 border border-purple-200 px-3 py-1.5 rounded-lg font-bold hover:bg-purple-200">
                  فني ورشة (القص والخياطة)
                </button>
                <button onClick={() => applyPreset('INSTALLER')} className="bg-blue-100 text-blue-950 border border-blue-200 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-200">
                  فني تركيبات وتسليم
                </button>
                <button onClick={() => applyPreset('SALES')} className="bg-emerald-100 text-emerald-950 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-200">
                  كاشير ومبيعات
                </button>
              </div>
            </div>

            {/* Matrix of all system pages */}
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

                            {/* Show / Hide Toggle Badge */}
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-3 py-1 rounded-full font-bold transition-all ${
                                isAllowed
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : 'bg-slate-300 text-slate-700'
                              }`}>
                                {isAllowed ? 'ظهور 🟢' : 'إخفاء ⚪'}
                              </span>
                            </div>
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
                حفظ الصلاحيات وتطبيق الظهور فوراً
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

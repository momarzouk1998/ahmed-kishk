'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface Branch {
  id: string;
  name: string;
  type: 'بيع أقمشة' | 'ستائر ومعاينات' | 'ورشة تصنيع';
  city: string;
  manager: string;
  staffCount: number;
}

interface AppUser {
  id: string;
  name: string;
  phone: string;
  role: 'ADMIN' | 'TECHNICIAN' | 'BRANCH_STAFF' | 'WORKSHOP';
  branch: string;
}

const initialBranches: Branch[] = [
  { id: 'BR-01', name: 'الفرع الرئيسي — بنها', type: 'بيع أقمشة', city: 'بنها', manager: 'أحمد كشك', staffCount: 2 },
  { id: 'BR-02', name: 'فرع الأقمشة الثاني — بنها', type: 'بيع أقمشة', city: 'بنها', manager: 'محمود السيد', staffCount: 1 },
  { id: 'BR-03', name: 'فرع السوارية والستائر الثالث — بنها', type: 'بيع أقمشة', city: 'بنها', manager: 'إبراهيم علي', staffCount: 1 },
  { id: 'BR-04', name: 'مركز الستائر والمعاينات', type: 'ستائر ومعاينات', city: 'بنها', manager: 'أحمد حسن', staffCount: 2 },
  { id: 'BR-05', name: 'الورشة المركزية للتفصيل', type: 'ورشة تصنيع', city: 'بنها', manager: 'عم مصطفى', staffCount: 2 },
];

const initialUsers: AppUser[] = [
  { id: 'USR-01', name: 'openappo', phone: '01558282760', role: 'ADMIN', branch: 'المدير العام' },
  { id: 'USR-02', name: 'أحمد كشك (مدير المحل)', phone: '01063821000', role: 'ADMIN', branch: 'الفرع الرئيسي — بنها' },
  { id: 'USR-03', name: 'أحمد حسن (فني معاينات)', phone: '01011111111', role: 'TECHNICIAN', branch: 'مركز المعاينات والتركيبات' },
  { id: 'USR-04', name: 'محمد علي (فني تركيبات)', phone: '01022222222', role: 'TECHNICIAN', branch: 'مركز المعاينات والتركيبات' },
  { id: 'USR-05', name: 'موظف الفرع الثاني', phone: '01033333333', role: 'BRANCH_STAFF', branch: 'فرع الأقمشة الثاني — بنها' },
  { id: 'USR-06', name: 'موظف الفرع الثالث', phone: '01044444444', role: 'BRANCH_STAFF', branch: 'فرع السوارية الثالث — بنها' },
  { id: 'USR-07', name: 'مشرف الورشة المركزية', phone: '01055555555', role: 'WORKSHOP', branch: 'الورشة المركزية للتفصيل' },
];

const roleLabels: Record<string, string> = {
  ADMIN: 'مدير النظام (كامل الصلاحيات)',
  TECHNICIAN: 'فني معاينات وتركيبات',
  BRANCH_STAFF: 'موظف فرع بيع أقمشة',
  WORKSHOP: 'مسؤول ورشة التفصيل',
};

const rolePermissions: Record<string, string[]> = {
  ADMIN: ['كل شيء', 'إدارة المستخدمين والفروع', 'التقارير المكتملة والأرباح', 'إدارة الديون والحسابات'],
  TECHNICIAN: ['المعاينات والمقاسات الخاصة به', 'أوامر التركيب', 'تسجيل مواعيد زيارة العميل'],
  BRANCH_STAFF: ['نقطة بيع القماش بالمتر', 'إصدار الفواتير السريعة والآجلة', 'عرض مخزون الفرع', 'ملفات العملاء'],
  WORKSHOP: ['عرض أوامر تصنيع الستائر', 'تحديث حالة الطلب (قيد التصنيع / جاهز للتركيب)'],
};

export default function BranchesPage() {
  const [branches] = useState<Branch[]>(initialBranches);
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [activeTab, setActiveTab] = useState<'users' | 'branches' | 'roles'>('users');
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // New user form
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userRole, setUserRole] = useState<'ADMIN' | 'TECHNICIAN' | 'BRANCH_STAFF' | 'WORKSHOP'>('BRANCH_STAFF');
  const [userBranch, setUserBranch] = useState('الفرع الرئيسي — بنها');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userPhone) return;

    const newUser: AppUser = {
      id: `USR-${String(users.length + 1).padStart(2, '0')}`,
      name: userName,
      phone: userPhone,
      role: userRole,
      branch: userBranch,
    };

    setUsers([...users, newUser]);
    setShowAddUserModal(false);
    setUserName('');
    setUserPhone('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header title="الفروع والمستخدمين والصلاحيات" />
      <div className="pr-72 pt-16">
        <main className="px-8 py-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-2xl text-primary">إدارة الفروع والمستخدمين والصلاحيات</h1>
              <p className="text-on-surface-variant text-sm mt-1">
                التحكم في فروع الأقمشة والستائر، الـ 6 مستخدمين المحددين، وتوزيع أدوار الفنيين وموظفي الفروع والورشة.
              </p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="bg-primary text-on-primary px-5 py-2.5 rounded-lg hover:bg-inverse-surface transition-colors flex items-center gap-2 font-bold text-sm shadow"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              إضافة مستخدم جديد
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-surface-container-high">
            {[
              { id: 'users', label: `المستخدمون (${users.length})`, icon: 'group' },
              { id: 'branches', label: `الفروع والورش (${branches.length})`, icon: 'storefront' },
              { id: 'roles', label: 'مصفوفة الصلاحيات والأدوار', icon: 'admin_panel_settings' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Users */}
          {activeTab === 'users' && (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container-highest overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-surface-container-low text-xs font-mono text-on-surface-variant border-b border-surface-container-high">
                  <tr>
                    <th className="p-3.5">الكود</th>
                    <th className="p-3.5">اسم المستخدم</th>
                    <th className="p-3.5">رقم الهاتف (تسجيل الدخول)</th>
                    <th className="p-3.5">الدور / الصلاحية</th>
                    <th className="p-3.5">الفرع المخصص</th>
                    <th className="p-3.5 text-center">كلمة السر الافتراضية</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-surface-container-low hover:bg-surface-container-low transition-colors">
                      <td className="p-3.5 font-mono text-xs text-on-surface-variant">{u.id}</td>
                      <td className="p-3.5 font-bold text-sm text-primary">{u.name}</td>
                      <td className="p-3.5 font-mono text-sm text-on-surface-variant" dir="ltr">
                        {u.phone}
                      </td>
                      <td className="p-3.5 text-xs font-bold text-secondary">
                        {roleLabels[u.role]}
                      </td>
                      <td className="p-3.5 text-xs text-on-surface-variant">{u.branch}</td>
                      <td className="p-3.5 text-center font-mono text-xs text-on-surface-variant">123456</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: Branches */}
          {activeTab === 'branches' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {branches.map((b) => (
                <div key={b.id} className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono text-on-surface-variant">{b.id}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-primary-container text-on-primary-container">
                      {b.type}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-primary">{b.name}</h3>
                  <div className="text-xs text-on-surface-variant space-y-1">
                    <div>المسؤول: <span className="font-bold text-primary">{b.manager}</span></div>
                    <div>الموقع: {b.city}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Permissions Matrix */}
          {activeTab === 'roles' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(roleLabels).map(([roleKey, label]) => (
                <div key={roleKey} className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container-highest flex flex-col gap-3">
                  <div className="font-bold text-lg text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary">verified_user</span>
                    {label}
                  </div>
                  <div className="text-xs text-on-surface-variant font-mono">الصلاحيات المتاحة لهذا الدور:</div>
                  <ul className="space-y-1.5 text-xs text-primary">
                    {rolePermissions[roleKey]?.map((perm, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-primary font-bold">✓</span>
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="font-display font-bold text-xl text-primary mb-4">إضافة مستخدم جديد</h2>
            <form onSubmit={handleAddUser} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">اسم المستخدم *</label>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">رقم الهاتف (اسم الدخول) *</label>
                <input
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                  dir="ltr"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">الدور / الصلاحية</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as any)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="BRANCH_STAFF">موظف فرع</option>
                  <option value="TECHNICIAN">فني معاينات وتركيبات</option>
                  <option value="WORKSHOP">مسؤول ورشة</option>
                  <option value="ADMIN">مدير النظام</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-on-surface-variant">الفرع المخصص</label>
                <select
                  value={userBranch}
                  onChange={(e) => setUserBranch(e.target.value)}
                  className="border border-outline-variant rounded p-2 text-sm focus:outline-none focus:border-primary"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-surface-container-low p-3 rounded-lg text-xs text-on-surface-variant mt-1">
                كلمة السر الافتراضية هي: <span className="font-mono font-bold text-primary">123456</span> ويمكن للمستخدم تعديلها لاحقاً من صفحته الشخصية.
              </div>

              <div className="flex gap-2 mt-4">
                <button type="submit" className="flex-1 bg-primary text-on-primary py-2.5 rounded font-bold text-sm">
                  حفظ المستخدم
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 border border-outline-variant text-on-surface-variant py-2.5 rounded text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

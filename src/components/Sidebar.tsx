'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface CurrentUser {
  name: string;
  phone: string;
  role: string;
  branch: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { label: 'لوحة التحكم', icon: 'dashboard', href: '/' },
    { label: 'المعاينات والمقاسات', icon: 'square_foot', href: '/inspections' },
    { label: 'الطلبات (Pipeline)', icon: 'pending_actions', href: '/orders' },
    { label: 'بيع القماش (POS)', icon: 'storefront', href: '/fabric-sales' },
    { label: 'سجل العملاء والديون', icon: 'group', href: '/customers' },
    { label: 'الموردون والحسابات', icon: 'local_shipping', href: '/suppliers' },
    { label: 'المخزون (الأقمشة بالمتر)', icon: 'texture', href: '/inventory' },
    { label: 'التقارير والإحصائيات', icon: 'bar_chart', href: '/reports' },
    { label: 'الفروع والمستخدمين', icon: 'corporate_fare', href: '/branches' },
    { label: 'إعدادات الهوية والتطبيق', icon: 'settings', href: '/settings' },
  ];

  const roleLabels: Record<string, string> = {
    ADMIN: 'مدير النظام',
    TECHNICIAN: 'فني معاينات',
    BRANCH_STAFF: 'موظف فرع',
    WORKSHOP: 'مسؤول ورشة',
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <aside className="fixed right-0 top-0 h-full w-72 bg-surface-container-lowest border-l border-surface-container-highest z-50 flex flex-col">
      {/* Logo Header */}
      <div className="p-6 flex items-center gap-3 border-b border-surface-container-low">
        <div className="w-10 h-10 bg-primary text-on-primary rounded-lg flex items-center justify-center font-bold text-xl">
          AK
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg text-primary leading-tight">أحمد كشك</span>
          <span className="text-xs text-on-surface-variant">للأقمشة والستائر — بنها</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined ml-3 text-[20px]">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-surface-container-low space-y-2">
        <Link
          href="/profile"
          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-surface-container-high ${
            pathname === '/profile' ? 'bg-primary-container' : 'bg-surface-container-low'
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-outline-variant flex items-center justify-center font-bold text-primary text-sm">
            {user?.name?.charAt(0) || 'م'}
          </div>
          <div className="flex flex-col overflow-hidden flex-1">
            <span className="text-sm font-bold truncate text-primary">{user?.name || 'مدير النظام'}</span>
            <span className="text-xs text-on-surface-variant font-mono">
              {user ? roleLabels[user.role] || user.role : 'مدير'}
            </span>
          </div>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">person</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-xs text-error hover:bg-error-container py-2 rounded-lg transition-colors font-mono"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}

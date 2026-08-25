'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { useSidebar } from '@/components/SidebarContext';

interface CurrentUser {
  name: string;
  phone: string;
  role: string;
  branch: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, close } = useSidebar();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch('/api/auth/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
      })
      .catch(() => {});
  }, []);

  // Close drawer when route changes
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const navItems = [
    { label: 'لوحة التحكم', icon: 'dashboard', href: '/' },
    { label: 'المعاينات والمقاسات', icon: 'square_foot', href: '/inspections' },
    { label: 'الطلبات والـ Pipeline', icon: 'pending_actions', href: '/orders' },
    { label: 'الورشة والتفصيل', icon: 'precision_manufacturing', href: '/workshop' },
    { label: 'بيع الأقمشة بالمتر (POS)', icon: 'storefront', href: '/fabric-sales' },
    { label: 'سجل العملاء والديون', icon: 'group', href: '/customers' },
    { label: 'الموردون والحسابات', icon: 'local_shipping', href: '/suppliers' },
    { label: 'المخزون والأصناف', icon: 'texture', href: '/inventory' },
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

  const sidebarContent = (
    <>
      {/* Logo Header */}
      <div className="p-5 flex items-center gap-3.5 border-b border-slate-800">
        <div className="w-12 h-12 bg-white p-1 rounded-2xl flex items-center justify-center border-2 border-brand-gold shadow-gold text-primary shrink-0">
          <Logo size="md" />
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg text-white leading-tight flex items-center gap-1.5">
            أحمد كشك
            <span className="w-2 h-2 rounded-full bg-brand-gold inline-block animate-pulse"></span>
          </span>
          <span className="text-xs text-brand-gold font-medium">للأقمشة والستائر الفاخرة</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-brand-gold text-slate-950 font-bold shadow-gold lg:translate-x-[-2px]'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined ml-3 text-[20px] ${isActive ? 'text-slate-950' : 'text-slate-400'}`}>
                {item.icon}
              </span>
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer Card */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/50 space-y-2">
        <Link
          href="/profile"
          className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors border ${
            pathname === '/profile'
              ? 'bg-slate-800 border-brand-gold text-white'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-brand-gold text-slate-950 flex items-center justify-center font-bold text-sm shadow">
            {user?.name?.charAt(0) || 'م'}
          </div>
          <div className="flex flex-col overflow-hidden flex-1">
            <span className="text-sm font-bold truncate text-white">{user?.name || 'مدير النظام'}</span>
            <span className="text-xs text-brand-gold font-medium truncate">
              {user ? roleLabels[user.role] || user.role : 'مدير عام'}
            </span>
          </div>
          <span className="material-symbols-outlined text-[16px] text-slate-400 hidden lg:inline">arrow_back_ios</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 py-2 rounded-lg transition-colors font-medium"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          تسجيل الخروج
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar (>= lg) - always visible */}
      <aside className="hidden lg:flex fixed right-0 top-0 h-full w-72 bg-[#0f172a] text-slate-100 border-l border-slate-800/80 z-50 flex-col shadow-2xl">
        {sidebarContent}
      </aside>

      {/* Mobile drawer (< lg) */}
      <div
        className={`lg:hidden fixed inset-0 z-[60] ${isOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!isOpen}
      >
        {/* Backdrop */}
        <div
          onClick={close}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Drawer panel - slides from right (RTL start) */}
        <aside
          className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-[#0f172a] text-slate-100 border-l border-slate-800/80 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-4 left-4 w-9 h-9 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-white flex items-center justify-center transition-colors z-10"
            aria-label="إغلاق القائمة"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          {sidebarContent}
        </aside>
      </div>
    </>
  );
}

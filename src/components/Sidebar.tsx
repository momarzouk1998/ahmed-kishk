'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { useSidebar } from '@/components/SidebarContext';
import { ALL_SYSTEM_PAGES } from '@/lib/permissions';

interface CurrentUser {
  id?: string;
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
  const [allowedPageIds, setAllowedPageIds] = useState<string[] | null>(null);

  useEffect(() => {
    fetch('/api/auth/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          // Check if custom permissions are saved in localStorage for this user
          try {
            const savedPerms = localStorage.getItem(`user_perms_${d.user.phone}`);
            if (savedPerms) {
              setAllowedPageIds(JSON.parse(savedPerms));
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Close drawer when route changes
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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

  // Filter system pages according to user's permissions
  const visiblePages = ALL_SYSTEM_PAGES.filter(p => {
    if (!allowedPageIds) return true; // Show all by default (e.g. Admin)
    return allowedPageIds.includes(p.id);
  });

  const pipelinePages = visiblePages.filter(p => p.category === 'مراحل الستائر');
  const salesPages = visiblePages.filter(p => p.category === 'المبيعات والحسابات');
  const adminPages = visiblePages.filter(p => p.category === 'الإدارة والمخزون');

  const renderNavGroup = (title: string, items: typeof ALL_SYSTEM_PAGES) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <div className="px-3.5 pt-3 pb-1 text-[11px] font-bold text-slate-400 font-mono tracking-wider uppercase">
          {title}
        </div>
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.id}
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
              <span className="text-xs sm:text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo Header */}
      <div className="p-5 flex items-center gap-3.5 border-b border-slate-800 shrink-0">
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
      <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">
        {renderNavGroup('مراحل دورة الستائر والورشة', pipelinePages)}
        {renderNavGroup('المبيعات ونقاط البيع', salesPages)}
        {renderNavGroup('الإدارة والمخزون', adminPages)}
      </nav>

      {/* User Footer Card */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/50 space-y-2 shrink-0">
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

        {/* Drawer panel */}
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

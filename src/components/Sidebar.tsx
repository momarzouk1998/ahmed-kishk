'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { useSidebar } from '@/components/SidebarContext';
import { ALL_SYSTEM_PAGES, PagePermission } from '@/lib/permissions';

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
  const [allowedPageIds, setAllowedPageIds] = useState<string[] | null>(null);

  // Accordion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pipeline: true,
    sales: false,
    admin: false,
  });

  useEffect(() => {
    fetch('/api/auth/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
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

  // Auto-expand section according to current route
  useEffect(() => {
    if (pathname.startsWith('/pipeline') || pathname === '/orders' || pathname === '/inspections' || pathname === '/workshop') {
      setExpandedSections(prev => ({ ...prev, pipeline: true }));
    } else if (pathname === '/fabric-sales' || pathname === '/customers' || pathname === '/suppliers') {
      setExpandedSections(prev => ({ ...prev, sales: true }));
    } else if (pathname === '/inventory' || pathname === '/reports' || pathname === '/branches' || pathname === '/settings') {
      setExpandedSections(prev => ({ ...prev, admin: true }));
    }
  }, [pathname]);

  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const isAllowed = (pageId: string) => {
    if (!allowedPageIds) return true;
    return allowedPageIds.includes(pageId);
  };

  const pipelinePages = ALL_SYSTEM_PAGES.filter(p => p.category === 'مراحل الستائر' && isAllowed(p.id));
  const salesPages = ALL_SYSTEM_PAGES.filter(p => p.category === 'المبيعات والحسابات' && isAllowed(p.id) && p.id !== 'p_dashboard');
  const adminPages = ALL_SYSTEM_PAGES.filter(p => p.category === 'الإدارة والمخزون' && isAllowed(p.id));

  const roleLabels: Record<string, string> = {
    ADMIN: 'مدير النظام',
    TECHNICIAN: 'فني معاينات',
    BRANCH_STAFF: 'موظف فرع',
    WORKSHOP: 'مسؤول ورشة',
  };

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white p-1 rounded-xl flex items-center justify-center border border-brand-gold shadow-gold text-primary shrink-0">
            <Logo size="md" />
          </div>
          <div>
            <span className="font-display font-black text-base text-white flex items-center leading-tight">
              أحمد كشك
            </span>
            <span className="text-[11px] text-brand-gold font-bold">للأقمشة والستائر</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-2 overflow-y-auto custom-scrollbar">
        {/* Main Dashboard */}
        {isAllowed('p_dashboard') && (
          <Link
            href="/"
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all ${
              pathname === '/'
                ? 'bg-brand-gold text-slate-950 font-black shadow-gold'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <span className={`material-symbols-outlined text-[19px] ${pathname === '/' ? 'text-slate-950' : 'text-slate-400'}`}>
              dashboard
            </span>
            <span className="text-xs sm:text-sm font-bold">الرئيسية</span>
          </Link>
        )}

        {/* 1. Pipeline Stages (مراحل الستائر) */}
        {pipelinePages.length > 0 && (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
            <button
              onClick={() => toggleSection('pipeline')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-colors text-right ${
                expandedSections.pipeline ? 'bg-slate-800/60 text-brand-gold font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[19px] text-brand-gold">
                  linear_scale
                </span>
                <span className="text-xs sm:text-sm font-bold">مراحل الستائر</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-gold/20 text-brand-gold font-mono font-bold">
                  {pipelinePages.length}
                </span>
                <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 ${
                  expandedSections.pipeline ? 'rotate-180' : ''
                }`}>
                  expand_more
                </span>
              </div>
            </button>

            {expandedSections.pipeline && (
              <div className="px-2 py-1.5 space-y-1 bg-slate-950/40 border-t border-slate-800/60">
                {pipelinePages.map((page, idx) => {
                  const isActive = pathname === page.href || pathname.startsWith(page.href + '/');
                  return (
                    <Link
                      key={page.id}
                      href={page.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-brand-gold text-slate-950 font-black shadow-gold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`material-symbols-outlined text-[16px] shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-500'}`}>
                          {page.icon}
                        </span>
                        <span className="truncate">{page.name}</span>
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 mr-1 ${isActive ? 'text-slate-900 font-black' : 'text-slate-600'}`}>
                        0{idx + 1}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. Sales & POS (المبيعات) */}
        {salesPages.length > 0 && (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
            <button
              onClick={() => toggleSection('sales')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-colors text-right ${
                expandedSections.sales ? 'bg-slate-800/60 text-brand-gold font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[19px] text-emerald-400">
                  point_of_sale
                </span>
                <span className="text-xs sm:text-sm font-bold">المبيعات</span>
              </div>
              <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 ${
                expandedSections.sales ? 'rotate-180' : ''
              }`}>
                expand_more
              </span>
            </button>

            {expandedSections.sales && (
              <div className="px-2 py-1.5 space-y-1 bg-slate-950/40 border-t border-slate-800/60">
                {salesPages.map((page) => {
                  const isActive = pathname === page.href || pathname.startsWith(page.href + '/');
                  return (
                    <Link
                      key={page.id}
                      href={page.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-brand-gold text-slate-950 font-black shadow-gold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-slate-950' : 'text-slate-500'}`}>
                        {page.icon}
                      </span>
                      <span className="truncate">{page.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. Administration & Inventory (الإدارة) */}
        {adminPages.length > 0 && (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
            <button
              onClick={() => toggleSection('admin')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 transition-colors text-right ${
                expandedSections.admin ? 'bg-slate-800/60 text-brand-gold font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[19px] text-blue-400">
                  admin_panel_settings
                </span>
                <span className="text-xs sm:text-sm font-bold">الإدارة والمخزون</span>
              </div>
              <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 ${
                expandedSections.admin ? 'rotate-180' : ''
              }`}>
                expand_more
              </span>
            </button>

            {expandedSections.admin && (
              <div className="px-2 py-1.5 space-y-1 bg-slate-950/40 border-t border-slate-800/60">
                {adminPages.map((page) => {
                  const isActive = pathname === page.href || pathname.startsWith(page.href + '/');
                  return (
                    <Link
                      key={page.id}
                      href={page.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-brand-gold text-slate-950 font-black shadow-gold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-slate-950' : 'text-slate-500'}`}>
                        {page.icon}
                      </span>
                      <span className="truncate">{page.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2 shrink-0">
        <Link
          href="/profile"
          className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-brand-gold/60 text-slate-300 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-gold text-slate-950 flex items-center justify-center font-black text-xs shadow">
            {user?.name?.charAt(0) || 'أ'}
          </div>
          <div className="flex flex-col overflow-hidden flex-1">
            <span className="text-xs font-bold truncate text-white">{user?.name || 'أحمد كشك'}</span>
            <span className="text-[10px] text-brand-gold font-bold truncate">
              {user ? roleLabels[user.role] || user.role : 'مدير'} • {user?.branch || 'الفرع الرئيسي'}
            </span>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-1 text-[11px] text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 py-1.5 rounded-lg transition-colors font-bold"
        >
          <span className="material-symbols-outlined text-[15px]">logout</span>
          تسجيل الخروج
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden lg:flex fixed right-0 top-0 h-full w-64 bg-[#0f172a] text-slate-100 border-l border-slate-800/80 z-50 flex-col shadow-2xl">
        {sidebarContent}
      </aside>

      <div className={`lg:hidden fixed inset-0 z-[60] ${isOpen ? '' : 'pointer-events-none'}`} aria-hidden={!isOpen}>
        <div
          onClick={close}
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            isOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <aside
          className={`absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-[#0f172a] text-slate-100 border-l border-slate-800/80 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <button
            onClick={close}
            className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center transition-colors z-10"
            aria-label="إغلاق"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
          {sidebarContent}
        </aside>
      </div>
    </>
  );
}

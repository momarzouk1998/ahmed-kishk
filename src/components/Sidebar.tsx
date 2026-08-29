'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { useSidebar } from '@/components/SidebarContext';
import { ALL_SYSTEM_PAGES, PagePermission } from '@/lib/permissions';
import IosInstallModal from '@/components/IosInstallModal';

interface CurrentUser {
  name: string;
  phone: string;
  role: string;
  branch: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, close, isCollapsed, toggleCollapse } = useSidebar();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [allowedPageIds, setAllowedPageIds] = useState<string[] | null>(null);

  // PWA & iOS install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosModal, setShowIosModal] = useState<boolean>(false);

  // Accordion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    pipeline: true,
    sales: false,
    admin: false,
  });

  useEffect(() => {
    // Purge old stale permission caches to prevent old sidebar items from appearing
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('user_perms_')) {
            localStorage.removeItem(key);
          }
        });
      } catch {}
    }

    fetch('/api/auth/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          // Always show all system pages to ADMIN and logged in staff
          setAllowedPageIds(null);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    const ua = window.navigator.userAgent;
    const isIosDevice = /iPhone|iPad|iPod/i.test(ua) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult?.outcome === 'accepted') {
        console.log('PWA installation accepted');
      }
      setDeferredPrompt(null);
    } else {
      setShowIosModal(true);
    }
  };



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
    if (!user || user.role === 'ADMIN') return true;
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
      {/* Brand Header & Toggle Button */}
      <div className="p-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 bg-white p-1 rounded-xl flex items-center justify-center border border-brand-gold shadow-gold text-primary shrink-0">
            <Logo size="md" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <span className="font-display font-black text-sm text-white flex items-center leading-tight">
                أحمد كشك
              </span>
              <span className="text-[10px] text-brand-gold font-bold">للأقمشة والستائر</span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Button */}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white items-center justify-center transition-colors shrink-0 cursor-pointer"
          title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isCollapsed ? 'menu_open' : 'chevron_right'}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-3 space-y-2 overflow-y-auto custom-scrollbar">
        {/* Main Dashboard */}
        {isAllowed('p_dashboard') && (
          <Link
            href="/"
            onClick={close}
            title="الرئيسية"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all ${
              pathname === '/'
                ? 'bg-brand-gold text-slate-950 font-black shadow-gold'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            } ${isCollapsed ? 'justify-center' : ''}`}
          >
            <span className={`material-symbols-outlined text-[19px] shrink-0 ${pathname === '/' ? 'text-slate-950' : 'text-slate-400'}`}>
              dashboard
            </span>
            {!isCollapsed && <span className="text-xs sm:text-sm font-bold truncate">الرئيسية</span>}
          </Link>
        )}

        {/* 1. Pipeline Stages (مراحل الستائر) */}
        {pipelinePages.length > 0 && (
          <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 overflow-hidden">
            <button
              onClick={() => toggleSection('pipeline')}
              className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors text-right cursor-pointer ${
                expandedSections.pipeline ? 'bg-slate-800/60 text-brand-gold font-bold' : 'text-slate-300 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="مراحل الستائر"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[19px] text-brand-gold shrink-0">
                  linear_scale
                </span>
                {!isCollapsed && <span className="text-xs sm:text-sm font-bold truncate">مراحل الستائر</span>}
              </div>
              {!isCollapsed && (
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
              )}
            </button>

            {(expandedSections.pipeline || isCollapsed) && (
              <div className="px-1.5 py-1.5 space-y-1 bg-slate-950/40 border-t border-slate-800/60">
                {pipelinePages.map((page, idx) => {
                  const isActive = pathname === page.href || pathname.startsWith(page.href + '/');
                  return (
                    <Link
                      key={page.id}
                      href={page.href}
                      onClick={close}
                      title={page.name}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-brand-gold text-slate-950 font-black shadow-gold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`material-symbols-outlined text-[16px] shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-500'}`}>
                          {page.icon}
                        </span>
                        {!isCollapsed && <span className="truncate">{page.name}</span>}
                      </div>
                      {!isCollapsed && (
                        <span className={`text-[10px] font-mono shrink-0 mr-1 ${isActive ? 'text-slate-900 font-black' : 'text-slate-600'}`}>
                          0{idx + 1}
                        </span>
                      )}
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
              className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors text-right cursor-pointer ${
                expandedSections.sales ? 'bg-slate-800/60 text-brand-gold font-bold' : 'text-slate-300 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="المبيعات"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[19px] text-emerald-400 shrink-0">
                  point_of_sale
                </span>
                {!isCollapsed && <span className="text-xs sm:text-sm font-bold truncate">المبيعات</span>}
              </div>
              {!isCollapsed && (
                <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 ${
                  expandedSections.sales ? 'rotate-180' : ''
                }`}>
                  expand_more
                </span>
              )}
            </button>

            {(expandedSections.sales || isCollapsed) && (
              <div className="px-1.5 py-1.5 space-y-1 bg-slate-950/40 border-t border-slate-800/60">
                {salesPages.map((page) => {
                  const isActive = pathname === page.href || pathname.startsWith(page.href + '/');
                  return (
                    <Link
                      key={page.id}
                      href={page.href}
                      onClick={close}
                      title={page.name}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-brand-gold text-slate-950 font-black shadow-gold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                      <span className={`material-symbols-outlined text-[16px] shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-500'}`}>
                        {page.icon}
                      </span>
                      {!isCollapsed && <span className="truncate">{page.name}</span>}
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
              className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors text-right cursor-pointer ${
                expandedSections.admin ? 'bg-slate-800/60 text-brand-gold font-bold' : 'text-slate-300 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title="الإدارة والمخزون"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[19px] text-blue-400 shrink-0">
                  admin_panel_settings
                </span>
                {!isCollapsed && <span className="text-xs sm:text-sm font-bold truncate">الإدارة والمخزون</span>}
              </div>
              {!isCollapsed && (
                <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform duration-200 ${
                  expandedSections.admin ? 'rotate-180' : ''
                }`}>
                  expand_more
                </span>
              )}
            </button>

            {(expandedSections.admin || isCollapsed) && (
              <div className="px-1.5 py-1.5 space-y-1 bg-slate-950/40 border-t border-slate-800/60">
                {adminPages.map((page) => {
                  const isActive = pathname === page.href || pathname.startsWith(page.href + '/');
                  return (
                    <Link
                      key={page.id}
                      href={page.href}
                      onClick={close}
                      title={page.name}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-brand-gold text-slate-950 font-black shadow-gold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                      <span className={`material-symbols-outlined text-[16px] shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-500'}`}>
                        {page.icon}
                      </span>
                      {!isCollapsed && <span className="truncate">{page.name}</span>}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-950/70 space-y-2 shrink-0">
        <Link
          href="/profile"
          onClick={close}
          className={`flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-brand-gold/60 text-slate-300 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title="الملف الشخصي"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-gold text-slate-950 flex items-center justify-center font-black text-xs shadow shrink-0">
            {user?.name?.charAt(0) || 'أ'}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden flex-1">
              <span className="text-xs font-bold truncate text-white">{user?.name || 'أحمد كشك'}</span>
              <span className="text-[10px] text-brand-gold font-bold truncate">
                {user ? roleLabels[user.role] || user.role : 'مدير'} • {user?.branch || 'الفرع الرئيسي'}
              </span>
            </div>
          )}
        </Link>
        <div className={`grid ${isCollapsed ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5 pt-0.5`}>
          {!isStandalone ? (
            <button
              onClick={handleInstallClick}
              className="flex items-center justify-center gap-1 text-[11px] bg-brand-gold/15 hover:bg-brand-gold text-brand-gold hover:text-slate-950 border border-brand-gold/30 py-1.5 px-2 rounded-lg transition-all font-bold shadow-xs truncate cursor-pointer"
              title="تثبيت التطبيق"
            >
              <span className="material-symbols-outlined text-[15px] shrink-0">
                {isIos ? 'phone_iphone' : 'download_for_offline'}
              </span>
              {!isCollapsed && <span className="truncate">تثبيت</span>}
            </button>
          ) : (
            <div
              className="flex items-center justify-center gap-1 text-[11px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 py-1.5 px-2 rounded-lg font-bold truncate cursor-default"
              title="مُثبَّت"
            >
              <span className="material-symbols-outlined text-[15px] shrink-0">check_circle</span>
              {!isCollapsed && <span className="truncate">مُثبَّت</span>}
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1 text-[11px] text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 border border-rose-500/20 py-1.5 px-2 rounded-lg transition-colors font-bold truncate cursor-pointer"
            title="خروج"
          >
            <span className="material-symbols-outlined text-[15px] shrink-0">logout</span>
            {!isCollapsed && <span className="truncate">خروج</span>}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <aside className={`hidden lg:flex fixed right-0 top-0 h-full transition-all duration-300 bg-[#0f172a] text-slate-100 border-l border-slate-800/80 z-50 flex-col shadow-2xl ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
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

      <IosInstallModal isOpen={showIosModal} onClose={() => setShowIosModal(false)} />
    </>
  );
}

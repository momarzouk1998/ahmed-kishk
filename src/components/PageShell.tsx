'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { SidebarProvider, useSidebar } from '@/components/SidebarContext';
import { initCentralSync, onSyncReady } from '@/lib/syncService';

interface PageShellProps {
  title?: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
  noHeader?: boolean;
}

function ShellContent({ title, badge, action, children, fullWidth, noHeader }: PageShellProps) {
  const { isCollapsed, hideBottomNav } = useSidebar();

  // Track whether the first server→localStorage sync has completed
  const [syncReady, setSyncReady] = React.useState(false);

  React.useEffect(() => {
    // Start sync engine (idempotent — only runs once per browser session)
    initCentralSync();

    // When the initial pull from the server is done, flip the flag so
    // child pages re-read their data from a fully-hydrated localStorage.
    onSyncReady(() => setSyncReady(true));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      {!noHeader && <Header title={title} badge={badge} action={action} />}
      <div className={`${noHeader ? 'pt-1' : 'pt-[calc(4rem+env(safe-area-inset-top))]'} transition-all duration-300 ${isCollapsed ? 'lg:pr-20' : 'lg:pr-64'}`}>
        {/* pb الإضافي هنا (موبايل بس) عشان يعوّض ارتفاع شريط التنقل السريع الثابت
            أسفل الشاشة (Sidebar.tsx) + الـ safe-area، عشان آخر محتوى فى أي صفحة
            ميتغطّاش بيه. على lg+ الشريط أصلاً مش ظاهر فبيرجع للـ padding العادي. */}
        <main className={
          fullWidth
            ? `p-1.5 sm:p-2 lg:pb-2.5 w-full max-w-full overflow-x-hidden ${hideBottomNav ? 'pb-1.5 sm:pb-2' : 'pb-[calc(4.5rem+env(safe-area-inset-bottom))]'}`
            : `px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 lg:pb-8 max-w-full overflow-x-hidden ${hideBottomNav ? 'pb-6' : 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]'}`
        }>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function PageShell({ title, badge, action, children, fullWidth, noHeader }: PageShellProps) {
  return (
    <SidebarProvider hideBottomNav={!!noHeader}>
      <ShellContent title={title} badge={badge} action={action} fullWidth={fullWidth} noHeader={noHeader}>{children}</ShellContent>
    </SidebarProvider>
  );
}

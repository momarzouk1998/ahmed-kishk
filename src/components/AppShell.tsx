'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { SidebarProvider } from '@/components/SidebarContext';

// #FIX: كان كل PageShell بيركّب SidebarProvider + Sidebar من جديد بنفسه — يعني
// أي تنقل بين صفحتين كان بيهدم القائمة الجانبية بالكامل ويبنيها تاني من الصفر
// (بما فيها طلبين API لجلب بيانات المستخدم والصلاحيات)، فتظهر القائمة فاضية
// لحظة وترجع تظهر تاني، وده اللي كان يبان "بيختفي شوية وبعدين يظهر تاني" مع
// كل ضغطة. AppShell دلوقتى بيتركّب مرة واحدة بس فى جذر التطبيق (layout.tsx)،
// فالقائمة وبيانات المستخدم بتفضل موجودة زي ما هي عبر كل تنقلات الصفحات —
// الـ App Router بيستبدل محتوى {children} بس، من غير ما يعيد تركيب أي حاجة هنا.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <Sidebar />
      {children}
    </SidebarProvider>
  );
}

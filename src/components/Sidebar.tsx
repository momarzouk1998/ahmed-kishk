'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'لوحة التحكم', icon: 'dashboard', href: '/' },
    { label: 'المعاينات والمقاسات', icon: 'square_foot', href: '/inspections' },
    { label: 'الطلبات والفواتير', icon: 'shopping_bag', href: '/orders' },
    { label: 'العملاء', icon: 'group', href: '/customers' },
    { label: 'المخزون (الأقمشة)', icon: 'texture', href: '/inventory' },
    { label: 'الإعدادات', icon: 'settings', href: '/settings' },
  ];

  return (
    <aside className="fixed right-0 top-0 h-full w-72 bg-surface-container-lowest border-l border-surface-container-highest z-50 flex flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-surface-container-low">
        <div className="w-10 h-10 bg-primary text-on-primary rounded-lg flex items-center justify-center font-bold text-xl">
          AK
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-lg text-primary leading-tight">أحمد كشك</span>
          <span className="text-xs text-on-surface-variant">للأقمشة والستائر</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary-container text-on-primary-container shadow-sm font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined ml-4 text-[22px]">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-surface-container-low">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-outline-variant flex items-center justify-center font-bold text-primary">
            م.ع
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold truncate">مدير النظام</span>
            <span className="text-xs text-on-surface-variant">فرع بنها / الرئيسي</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

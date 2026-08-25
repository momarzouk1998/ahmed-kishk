'use client';

import React from 'react';
import Link from 'next/link';

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="fixed top-0 right-72 left-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 z-40 flex items-center justify-between px-8 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-brand-gold"></div>
        {title && <h1 className="font-display font-bold text-base text-slate-900 tracking-tight">{title}</h1>}
      </div>

      <div className="flex items-center gap-4">
        {/* Quick Action */}
        <Link
          href="/fabric-sales"
          className="hidden sm:flex items-center gap-1.5 bg-brand-gold hover:bg-brand-gold-hover text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs"
        >
          <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
          بيع سريع بالمتر
        </Link>

        <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
          الفرع الرئيسي — القاهرة
        </span>
      </div>
    </header>
  );
}

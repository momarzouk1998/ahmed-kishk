'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface SearchOption {
  id: string;
  name: string;
  sub?: string | null;
  extra?: string | null;
  badge?: string | null;
}

interface Props {
  options: SearchOption[];
  value: string;
  onChange: (value: string, option?: SearchOption) => void;
  placeholder?: string;
  emptyLabel?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  onAddNew?: () => void;
  addNewText?: string;
}

function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u0652]/g, '')
    .trim();
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '🔍 ابحث...',
  emptyLabel = '— بدون —',
  required = false,
  autoFocus = false,
  disabled = false,
  className = '',
  onAddNew,
  addNewText = '+ إضافة جديد',
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (value && !open) {
      const opt = options.find(o => o.id === value || o.name === value);
      if (opt) setQuery(opt.name);
    } else if (!value && !open) {
      setQuery('');
    }
  }, [value, options, open]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (value) {
          const opt = options.find(o => o.id === value || o.name === value);
          if (opt) setQuery(opt.name);
        } else {
          setQuery('');
        }
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value, options]);

  const filtered = query.trim() === '' && !open
    ? options
    : options.filter(o => {
        const q = normalizeArabic(query);
        if (!q) return true;
        return (
          normalizeArabic(o.name).includes(q) ||
          normalizeArabic(o.sub || '').includes(q) ||
          normalizeArabic(o.extra || '').includes(q) ||
          normalizeArabic(o.badge || '').includes(q)
        );
      });

  function choose(opt: SearchOption) {
    onChange(opt.id, opt);
    setQuery(opt.name);
    setOpen(false);
    setHighlight(0);
  }

  function clearValue(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setQuery('');
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight(h => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) {
        choose(filtered[highlight]);
      } else if (onAddNew && query.trim()) {
        onAddNew();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          disabled={disabled}
          required={required}
          onFocus={() => { setOpen(true); setHighlight(0); }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
            if (e.target.value === '') onChange('');
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs sm:text-sm transition-all shadow-2xs pr-4 pl-9"
        />
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={clearValue}
              className="text-slate-400 hover:text-rose-600 text-xs font-black bg-slate-100 hover:bg-rose-50 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors"
              tabIndex={-1}
              title="مسح الاختيار"
            >
              ✕
            </button>
          )}
          <span className="material-symbols-outlined text-slate-400 text-base pointer-events-none">
            arrow_drop_down
          </span>
        </div>
      </div>

      {open && (
        <div className="absolute z-50 right-0 left-0 mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
          {emptyLabel && (
            <button
              type="button"
              onClick={() => { onChange(''); setQuery(''); setOpen(false); }}
              className="w-full text-right px-3.5 py-2 text-xs text-slate-400 hover:bg-slate-50 font-bold flex items-center justify-between"
            >
              <span>{emptyLabel}</span>
            </button>
          )}

          {filtered.length === 0 ? (
            <div className="p-3.5 text-center space-y-2">
              <p className="text-xs font-bold text-slate-500">لا توجد نتائج مطابقة لـ "{query}"</p>
              {onAddNew && (
                <button
                  type="button"
                  onClick={() => { setOpen(false); onAddNew(); }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 mx-auto shadow-xs cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>{addNewText} "{query}"</span>
                </button>
              )}
            </div>
          ) : (
            filtered.map((opt, idx) => {
              const isSelected = opt.id === value || opt.name === value;
              const isHighlighted = idx === highlight;
              return (
                <button
                  key={opt.id || idx}
                  type="button"
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => choose(opt)}
                  className={`w-full text-right px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 text-amber-950 font-black'
                      : isHighlighted
                      ? 'bg-slate-50 text-slate-900 font-bold'
                      : 'text-slate-800'
                  }`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-900 text-xs sm:text-[13px] truncate">
                      {opt.name}
                    </span>
                    {opt.sub && (
                      <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                        {opt.sub}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {opt.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono border border-slate-200">
                        {opt.badge}
                      </span>
                    )}
                    {opt.extra && (
                      <span className="text-[11px] font-black font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        {opt.extra}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}

          {onAddNew && filtered.length > 0 && (
            <div className="p-2 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setOpen(false); onAddNew(); }}
                className="w-full bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-amber-950 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px] text-amber-600">add_circle</span>
                <span>{addNewText}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

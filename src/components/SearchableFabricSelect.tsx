'use client';

import React, { useState, useEffect, useRef } from 'react';
import { normalizeBranchName } from '@/lib/branches';

export interface FabricItem {
  id?: string;
  code: string;
  name: string;
  category?: string;
  unit?: string;
  branch?: string;
  sellPrice?: number;
  pricePerMeter?: number;
  totalQuantity?: number;
  stockMeters?: number;
}

interface SearchableFabricSelectProps {
  value: string;
  onChange: (code: string, item?: FabricItem) => void;
  options: FabricItem[];
  placeholder?: string;
  targetBranch?: string;
  disabled?: boolean;
  className?: string;
  /** الأدمن فقط يقدر يتصفح فروع تانية غير فرعه — الموظف المقيّد يفضل مقفول على فرعه بدون تجاوز. */
  isAdmin?: boolean;
}

export default function SearchableFabricSelect({
  value,
  onChange,
  options = [],
  placeholder = '-- اختر القماش من المخزون --',
  targetBranch,
  disabled = false,
  className = '',
  isAdmin = false,
}: SearchableFabricSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllBranches, setShowAllBranches] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeBranch = normalizeBranchName(targetBranch || 'الفرع الرئيسي');

  // Strict branch filtering: only show items matching the target branch unless showAllBranches is checked.
  // غير الأدمن ممنوع يتجاوز فرعه إطلاقًا — الزر نفسه بيظهر للأدمن بس.
  const filteredByBranch = options.filter(item => {
    if ((isAdmin && showAllBranches) || activeBranch === 'الكل') return true;
    const itemBranch = normalizeBranchName(item.branch);
    return itemBranch === activeBranch;
  });

  // Search filter
  const filteredOptions = filteredByBranch.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.branch && item.branch.toLowerCase().includes(q))
    );
  });

  const selectedItem = options.find(o => o.code === value || o.id === value);

  const handleSelect = (item: FabricItem) => {
    onChange(item.code, item);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Branch Scoping Info */}
      {activeBranch && activeBranch !== 'الكل' && (
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-amber-600">location_on</span>
            <span>أصناف فرع: <strong className="text-slate-900">{activeBranch}</strong></span>
            {!showAllBranches && filteredByBranch.length === 0 && (
              <span className="text-rose-600 font-bold mr-1">(لا تتوفر أقمشة متناسبة بمخزون هذا الفرع)</span>
            )}
          </span>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAllBranches(!showAllBranches)}
              className="text-[11px] text-blue-700 hover:underline font-bold"
            >
              {showAllBranches ? `تصفية لـ (${activeBranch})` : 'إظهار كل الفروع'}
            </button>
          )}
        </div>
      )}

      {/* Trigger / Input Button */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between border rounded-xl p-2.5 bg-white transition-all cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'hover:border-slate-400 focus-within:ring-2 focus-within:ring-amber-500'
        } ${isOpen ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-300'}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0">search</span>
          {selectedItem ? (
            <div className="flex items-center gap-2 truncate text-xs font-bold text-slate-900">
              <span className="bg-amber-100 text-amber-950 font-mono text-[11px] px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                {selectedItem.code}
              </span>
              <span className="truncate">{selectedItem.name}</span>
              {selectedItem.branch && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                  {selectedItem.branch}
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-bold truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedItem && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-100"
              title="إلغاء الاختيار"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
          <span className={`material-symbols-outlined text-slate-400 text-[20px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>
            arrow_drop_down
          </span>
        </div>
      </div>

      {/* Floating Searchable Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-2xl shadow-2xl max-h-72 flex flex-col overflow-hidden">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-200 bg-slate-50">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute right-2.5 text-slate-400 text-[18px]">search</span>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="اكتب اسم القماش، الكود، أو التصنيف للبحث..."
                className="w-full pl-3 pr-8 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-bold">
                {searchQuery ? `لا توجد نتائج مطابقة لـ "${searchQuery}"` : 'لا توجد أقمشة مسجلة بالمخزون لهذا الفرع'}
              </div>
            ) : (
              filteredOptions.map(item => {
                const isSelected = item.code === value || item.id === value;
                const price = item.sellPrice ?? item.pricePerMeter ?? 0;
                const stock = item.totalQuantity ?? item.stockMeters ?? 0;

                return (
                  <div
                    key={item.code || item.id}
                    onClick={() => handleSelect(item)}
                    className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs ${
                      isSelected ? 'bg-amber-50 border border-amber-300 text-amber-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="bg-slate-100 text-slate-800 font-mono font-bold text-[11px] px-2 py-0.5 rounded border border-slate-200 shrink-0">
                        {item.code}
                      </span>
                      <div className="truncate">
                        <span className="font-bold block truncate">{item.name}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                          {item.category && <span>{item.category}</span>}
                          {item.branch && <span className="bg-slate-100 px-1 rounded">{item.branch}</span>}
                          {stock > 0 && <span className="text-emerald-700">المتوفر: {stock} {item.unit || 'متر'}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-left font-mono font-bold shrink-0 pr-2">
                      <span className="text-amber-900 block">{price} ج</span>
                      {isSelected && <span className="text-[10px] text-emerald-600 block">محدد ✓</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

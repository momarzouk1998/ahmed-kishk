'use client';

import React from 'react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemName = 'عنصر',
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalItems === 0 || totalPages <= 1) {
    return null;
  }

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safeCurrentPage - 1) * pageSize + 1;
  const endIdx = Math.min(safeCurrentPage * pageSize, totalItems);

  return (
    <div className="p-3.5 sm:p-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      <div className="text-slate-500 font-bold">
        عرض من <span className="font-mono text-slate-900">{startIdx}</span> إلى{' '}
        <span className="font-mono text-slate-900">{endIdx}</span> من أصل{' '}
        <span className="font-mono text-amber-900 font-black">{totalItems}</span> {itemName}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage <= 1}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-3xs text-xs"
        >
          ← السابق
        </button>

        <div className="flex items-center gap-1 font-mono font-bold">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              const isActive = p === safeCurrentPage;
              return (
                <React.Fragment key={p}>
                  {prev && p - prev > 1 && <span className="px-1 text-slate-400 select-none">...</span>}
                  <button
                    type="button"
                    onClick={() => onPageChange(p)}
                    className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage >= totalPages}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shadow-3xs text-xs"
        >
          التالي →
        </button>
      </div>
    </div>
  );
}


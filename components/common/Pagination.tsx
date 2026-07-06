import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  className?: string;
  isDarkTheme?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  itemsPerPage,
  onPageChange,
  className = '',
  isDarkTheme
}) => {
  if (totalPages <= 1) return null;

  // Calculate range to display
  const hasRange = itemsPerPage !== undefined && itemsPerPage > 0;
  const from = hasRange ? ((currentPage - 1) * itemsPerPage + 1) : 0;
  const to = hasRange ? Math.min(currentPage * itemsPerPage, totalCount) : 0;

  return (
    <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isDarkTheme ? 'border-slate-800/80 bg-slate-900/10' : 'border-slate-100 bg-white'} ${className}`}>
      <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
        {hasRange ? (
          <>
            Hiển thị <span className="font-extrabold text-slate-700 dark:text-slate-350">{from.toLocaleString()}</span> - <span className="font-extrabold text-slate-700 dark:text-slate-350">{to.toLocaleString()}</span> trên <span className="font-extrabold text-slate-700 dark:text-slate-350">{totalCount.toLocaleString()}</span>
          </>
        ) : (
          <>
            Tất cả: <span className="font-extrabold text-slate-750 dark:text-slate-300">{totalCount.toLocaleString()}</span> kết quả (Trang {currentPage}/{totalPages})
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 font-sans">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
            isDarkTheme 
              ? 'border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300 disabled:opacity-20' 
              : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-50'
          } disabled:cursor-not-allowed`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {(() => {
          const range: number[] = [];
          const maxVisible = 5;
          let start = Math.max(1, currentPage - 2);
          let end = Math.min(totalPages, start + maxVisible - 1);
          if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
          }
          for (let i = start; i <= end; i++) {
            range.push(i);
          }
          return range;
        })().map(pageNum => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
              currentPage === pageNum
                ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm font-extrabold'
                : isDarkTheme
                  ? 'border border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:bg-slate-850'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-550'
            }`}
          >
            {pageNum}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
            isDarkTheme 
              ? 'border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300 disabled:opacity-20' 
              : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50 disabled:opacity-50'
          } disabled:cursor-not-allowed`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

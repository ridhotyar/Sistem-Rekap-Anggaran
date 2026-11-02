import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../atoms/Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 py-3 px-1">
      <div className="flex items-center gap-2">
        <span>
          Menampilkan <strong className="text-slate-900 dark:text-slate-100 font-semibold">{startItem}</strong> -{' '}
          <strong className="text-slate-900 dark:text-slate-100 font-semibold">{endItem}</strong> dari{' '}
          <strong className="text-slate-900 dark:text-slate-100 font-semibold">{totalItems}</strong> data
        </span>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 ml-3 border-l pl-3 border-slate-200 dark:border-slate-700">
            <span>Baris per halaman:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="xs"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          icon={<ChevronLeft className="w-3.5 h-3.5" />}
        >
          Sebelumnya
        </Button>

        <span className="px-2 text-xs font-medium">
          Halaman <span className="font-semibold text-slate-800 dark:text-slate-200">{currentPage}</span> dari{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages || 1}</span>
        </span>

        <Button
          variant="outline"
          size="xs"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalPages === 0}
          icon={<ChevronRight className="w-3.5 h-3.5" />}
          iconPosition="right"
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
};

import React from 'react';
import { FileSearch } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Heading, Text } from '../atoms/Typography';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Tidak ada data anggaran yang ditemukan',
  description = 'Coba ubah kata kunci pencarian atau bersihkan filter yang sedang aktif.',
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-md mx-auto">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
        {icon || <FileSearch className="w-6 h-6" />}
      </div>
      <Heading level={4} className="mb-1 text-slate-800 dark:text-slate-200">
        {title}
      </Heading>
      <Text variant="muted" className="mb-5 max-w-sm">
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

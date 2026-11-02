import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../atoms/Input';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Cari uraian, kode standar harga, spesifikasi, atau nama akun...',
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        leftIcon={<Search className="w-4 h-4" />}
        rightIcon={
          value ? (
            <button
              type="button"
              onClick={() => onChange('')}
              className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded transition-colors"
              title="Bersihkan pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          ) : undefined
        }
      />
    </div>
  );
};

import React from 'react';

export interface CurrencyTextProps {
  amount: number;
  prefix?: string;
  className?: string;
  compact?: boolean;
}

export const formatRupiah = (amount: number, prefix: string = 'Rp '): string => {
  if (isNaN(amount) || amount === null || amount === undefined) return `${prefix}0`;
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${prefix}${formatted}`;
};

export const formatCompactRupiah = (amount: number): string => {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(2)} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(2)} Jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(1)} Rb`;
  }
  return `Rp ${amount}`;
};

export const CurrencyText: React.FC<CurrencyTextProps> = ({
  amount,
  prefix = 'Rp ',
  className = '',
  compact = false,
}) => {
  const display = compact ? formatCompactRupiah(amount) : formatRupiah(amount, prefix);
  return <span className={`font-mono font-semibold tabular-nums tracking-tight ${className}`}>{display}</span>;
};

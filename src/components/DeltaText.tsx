import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

interface DeltaTextProps {
  value: number | null;
  unit?: '%' | 'pp';
  suffix?: string;
  compact?: boolean;
}

export function DeltaText({ value, unit = '%', suffix = '', compact = false }: DeltaTextProps) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="font-mono-num text-slate-400">—</span>;
  }

  const isNeutral = Math.abs(value) < 0.05;
  const isPositive = value >= 0.05;

  const colorClass = isNeutral
    ? 'text-slate-500'
    : isPositive
      ? 'text-emerald-700'
      : 'text-rose-700';

  const sign = value > 0 ? '+' : '';
  const formatted =
    unit === 'pp' ? `${sign}${value.toFixed(2)} pp` : `${sign}${value.toFixed(1)}%`;

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono-num font-medium whitespace-nowrap ${colorClass} ${
        compact ? 'text-xs' : 'text-sm'
      }`}
    >
      {isNeutral ? (
        <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      ) : isPositive ? (
        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <ArrowDownRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>
        {formatted}
        {suffix ? ` ${suffix}` : ''}
      </span>
    </span>
  );
}

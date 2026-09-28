import { cn } from '@/lib/utils';
import { clamp } from '@/lib/utils';

/**
 * A meter, not a chart: one ratio against a limit.
 * `tone` carries meaning (over-limit reads critical), never decoration.
 */
export function Meter({
  value,
  max = 100,
  tone = 'primary',
  className,
  label,
}: {
  value: number;
  max?: number;
  tone?: 'primary' | 'good' | 'warning' | 'critical';
  className?: string;
  label?: string;
}) {
  const pct = clamp((value / (max || 1)) * 100, 0, 100);
  const bar = {
    primary: 'bg-primary',
    good: 'bg-good',
    warning: 'bg-warning',
    critical: 'bg-critical',
  }[tone];
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-inset', className)}
      role="meter"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

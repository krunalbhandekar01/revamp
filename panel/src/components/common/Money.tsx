import { money, moneyCompact, moneyExact } from '@/lib/format';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Paisa } from '@/types/domain';

/**
 * Money always renders tabular so columns line up, and the compact form
 * always carries the exact figure in a tooltip — a reader should never have
 * to trust "₹1.2 Cr" without being able to see the rupees behind it.
 */
export function Money({
  value,
  compact,
  className,
  tone,
}: {
  value: Paisa;
  compact?: boolean;
  className?: string;
  tone?: 'default' | 'good' | 'critical' | 'muted';
}) {
  const cls = cn(
    'tnum',
    tone === 'good' && 'text-good',
    tone === 'critical' && 'text-critical',
    tone === 'muted' && 'text-ink-muted',
    className,
  );
  if (!compact) return <span className={cls}>{money(value)}</span>;
  return (
    <Tooltip content={moneyExact(value)}>
      <span className={cn(cls, 'cursor-help')}>{moneyCompact(value)}</span>
    </Tooltip>
  );
}

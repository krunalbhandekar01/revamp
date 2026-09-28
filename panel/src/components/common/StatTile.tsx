import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Tooltip } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { signedPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * A single current value, its movement, and optionally its shape over time.
 * This is deliberately NOT a one-bar bar chart — a headline number is a number.
 */
export function StatTile({
  label,
  value,
  sublabel,
  delta,
  /** Which direction is good. Cost and DSO go down to improve. */
  deltaGoodWhen = 'up',
  spark,
  hint,
  loading,
  emphasis,
  className,
}: {
  label: string;
  value: ReactNode;
  sublabel?: ReactNode;
  delta?: number;
  deltaGoodWhen?: 'up' | 'down' | 'neutral';
  spark?: number[];
  hint?: string;
  loading?: boolean;
  emphasis?: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <Card className={cn('p-4', className)}>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-7 w-32" />
        <Skeleton className="mt-2.5 h-3 w-20" />
      </Card>
    );
  }

  const good =
    delta === undefined || deltaGoodWhen === 'neutral'
      ? null
      : deltaGoodWhen === 'up'
        ? delta > 0
        : delta < 0;

  const DeltaIcon = delta === undefined ? Minus : delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;

  return (
    <Card className={cn('relative overflow-hidden p-4', emphasis && 'border-primary/35', className)}>
      <div className="flex items-start justify-between gap-2">
        <Tooltip content={hint}>
          <span
            className={cn(
              'text-[11px] font-medium uppercase tracking-wide text-ink-muted',
              hint && 'cursor-help decoration-dotted underline-offset-4 hover:underline',
            )}
          >
            {label}
          </span>
        </Tooltip>
      </div>

      <div className={cn('tnum mt-2 font-semibold tracking-tight text-ink', emphasis ? 'text-3xl' : 'text-2xl')}>
        {value}
      </div>

      <div className="mt-1.5 flex min-h-5 items-center gap-2">
        {delta !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-medium',
              good === null ? 'text-ink-secondary' : good ? 'text-good' : 'text-critical',
            )}
          >
            <DeltaIcon className="size-3" aria-hidden />
            {signedPercent(delta)}
          </span>
        )}
        {sublabel && <span className="truncate text-xs text-ink-muted">{sublabel}</span>}
      </div>

      {spark && spark.length > 1 && (
        <div className="pointer-events-none absolute bottom-0 right-0 h-10 w-24 opacity-70" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark.map((v, i) => ({ i, v }))}>
              <defs>
                <linearGradient id={`spark-${label.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--series-1)"
                strokeWidth={2}
                fill={`url(#spark-${label.replace(/\W/g, '')})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/** The one number a screen leads with. */
export function HeroFigure({
  label,
  value,
  caption,
  tone = 'default',
}: {
  label: string;
  value: string;
  caption?: ReactNode;
  tone?: 'default' | 'good' | 'critical';
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</div>
      <div
        className={cn(
          'tnum mt-1 text-[2.75rem] font-semibold leading-none tracking-tight',
          tone === 'good' && 'text-good',
          tone === 'critical' && 'text-critical',
          tone === 'default' && 'text-ink',
        )}
      >
        {value}
      </div>
      {caption && <div className="mt-2 text-xs text-ink-secondary">{caption}</div>}
    </div>
  );
}

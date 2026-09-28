import { useState, type ReactNode } from 'react';
import { Table2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface LegendEntry {
  label: string;
  color: string;
}

/**
 * Wraps every chart so the accessibility guarantees are structural, not per-chart:
 *
 *  - a legend whenever there are 2+ series (identity is never colour alone)
 *  - a table view toggle — required relief for the light-mode series that sit
 *    below 3:1 against the surface, and useful for everyone
 *  - consistent header, action slot and empty state
 */
export function ChartFrame({
  title,
  description,
  legend,
  actions,
  table,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  legend?: LegendEntry[];
  actions?: ReactNode;
  /** Same numbers as the chart. Rendered when the viewer switches to table view. */
  table?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {actions}
          {table && (
            <Tooltip content={view === 'chart' ? 'View as table' : 'View as chart'}>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setView((v) => (v === 'chart' ? 'table' : 'chart'))}
                aria-label={view === 'chart' ? 'View as table' : 'View as chart'}
              >
                {view === 'chart' ? <Table2 /> : <BarChart3 />}
              </Button>
            </Tooltip>
          )}
        </div>
      </CardHeader>

      {legend && legend.length > 1 && view === 'chart' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 pb-2">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 text-[11px] text-ink-secondary">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: l.color }}
                aria-hidden
              />
              {l.label}
            </span>
          ))}
        </div>
      )}

      <CardContent className={cn('flex-1', bodyClassName)}>
        {view === 'chart' ? children : table}
      </CardContent>
    </Card>
  );
}

/** The tooltip body every chart shares — one row per series, value right-aligned. */
export function ChartTooltip({
  label,
  rows,
}: {
  label?: string;
  rows: { name: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-md border border-line bg-surface-2 px-2.5 py-2 text-xs shadow-lg">
      {label && <div className="mb-1 font-medium text-ink">{label}</div>}
      <div className="space-y-0.5">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-ink-secondary">
              {r.color && <span className="size-2 rounded-[2px]" style={{ background: r.color }} aria-hidden />}
              {r.name}
            </span>
            <span className="tnum font-medium text-ink">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Plain table rendering of a chart's own numbers. */
export function ChartDataTable<T extends Record<string, unknown>>({
  rows,
  columns,
}: {
  rows: T[];
  columns: { key: string; label: string; align?: 'left' | 'right'; render?: (row: T) => ReactNode }[];
}) {
  return (
    <div className="max-h-64 overflow-auto rounded-md border border-line">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-surface-3">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'px-2.5 py-1.5 font-medium text-ink-secondary',
                  c.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-line">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-2.5 py-1.5 text-ink',
                    c.align === 'right' ? 'tnum text-right' : 'text-left',
                  )}
                >
                  {c.render ? c.render(row) : String(row[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

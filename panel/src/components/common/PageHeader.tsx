import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  actions,
  filters,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Filters live in ONE row directly above the content they affect. */
  filters?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-0.5 max-w-2xl text-[13px] text-ink-secondary">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {filters && <div className="mt-3.5 flex flex-wrap items-center gap-2">{filters}</div>}
    </div>
  );
}

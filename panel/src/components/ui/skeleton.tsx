import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-surface-3', className)} {...props} />;
}

/** Table-shaped placeholder — same row height as the real table, so nothing jumps. */
export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-px" aria-hidden>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex h-10 items-center gap-4 px-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3.5" style={{ width: `${[18, 26, 14, 12, 16, 10][c % 6]}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

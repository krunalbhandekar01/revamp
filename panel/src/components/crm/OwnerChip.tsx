import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

export function OwnerChip({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[9px] font-semibold text-ink-secondary">
        {initials(name)}
      </span>
      <span className="truncate text-[13px] text-ink-secondary">{name}</span>
    </span>
  );
}

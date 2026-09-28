import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { moneyCompact, shortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Deal, PipelineStage } from '@/types/crm';

export function DealCard({
  deal,
  stage,
  draggable,
  onOpen,
}: {
  deal: Deal;
  stage?: PipelineStage;
  draggable: boolean;
  onOpen: (d: Deal) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    disabled: !draggable,
  });

  const daysInStage = Math.floor((Date.now() - new Date(deal.stageEnteredAt).getTime()) / 86_400_000);
  const stale = stage ? daysInStage > stage.staleAfterDays : false;
  const closeDate = new Date(deal.expectedCloseDate);
  const overdueClose = closeDate.getTime() < Date.now();

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && onOpen(deal)}
      className={cn(
        'group rounded-lg border bg-surface-2 p-2.5 text-left transition-shadow',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDragging ? 'z-50 border-primary opacity-90 shadow-xl' : 'border-line hover:shadow-md',
        stale && !isDragging && 'border-l-2 border-l-serious',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">{deal.title}</p>
        {stale && (
          <Tooltip content={`No movement for ${daysInStage} days — this stage expects ${stage?.staleAfterDays}`}>
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-serious" aria-label="Stale" />
          </Tooltip>
        )}
      </div>

      <p className="mt-0.5 truncate text-[11px] text-ink-muted">{deal.companyName}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="tnum text-[13px] font-semibold text-ink">{moneyCompact(deal.value)}</span>
        <Badge tone={deal.probability >= 70 ? 'good' : deal.probability >= 40 ? 'warning' : 'neutral'}>
          {deal.probability}%
        </Badge>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
        <OwnerChip name={deal.ownerName} className="min-w-0 flex-1" />
        <Tooltip content={`Expected close ${shortDate(deal.expectedCloseDate)}`}>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 text-[11px]',
              overdueClose ? 'text-critical' : 'text-ink-muted',
            )}
          >
            <CalendarClock className="size-3" />
            {shortDate(deal.expectedCloseDate).replace(/ \d{4}$/, '')}
          </span>
        </Tooltip>
      </div>
    </div>
  );
}

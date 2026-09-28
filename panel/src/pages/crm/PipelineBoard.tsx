import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/EmptyState';
import { moneyCompact } from '@/lib/format';
import { cn, sumBy } from '@/lib/utils';
import { moveDealStage } from '@/api/crm';
import type { Deal, Pipeline } from '@/types/crm';
import { DealCard } from './DealCard';

/**
 * Kanban pipeline.
 *
 * Drag-and-drop is gated on `deal:changeStage` — without it the board is still
 * fully readable, just not movable, which is the right default for anyone
 * outside sales who needs to see the forecast.
 */
export function PipelineBoard({
  pipeline,
  deals,
  canMove,
  onOpen,
}: {
  pipeline: Pipeline;
  deals: Deal[];
  canMove: boolean;
  onOpen: (d: Deal) => void;
}) {
  const qc = useQueryClient();
  const [dragging, setDragging] = useState<Deal | null>(null);

  const sensors = useSensors(
    // A small activation distance so a click still opens the card.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => moveDealStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm'] }),
  });

  const openStages = useMemo(() => pipeline.stages.filter((s) => s.kind === 'open'), [pipeline]);
  const byStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const s of pipeline.stages) map[s.key] = [];
    for (const d of deals) (map[d.stage] ??= []).push(d);
    return map;
  }, [deals, pipeline]);

  function onDragStart(e: DragStartEvent) {
    setDragging(deals.find((d) => d.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const stage = e.over?.id;
    if (!stage || typeof stage !== 'string') return;
    const deal = deals.find((d) => d.id === e.active.id);
    if (!deal || deal.stage === stage) return;
    move.mutate({ id: deal.id, stage });
  }

  if (deals.length === 0) {
    return (
      <EmptyState
        title="No open deals in this pipeline"
        description="Convert a qualified lead, or create a deal directly."
      />
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {openStages.map((stage) => {
          const rows = byStage[stage.key] ?? [];
          const value = sumBy(rows, (d) => d.value);
          return (
            <StageColumn
              key={stage.key}
              id={stage.key}
              label={stage.label}
              count={rows.length}
              value={value}
              probability={stage.probability}
              canMove={canMove}
            >
              {rows.map((d) => (
                <DealCard key={d.id} deal={d} stage={stage} draggable={canMove} onOpen={onOpen} />
              ))}
            </StageColumn>
          );
        })}
      </div>

      <DragOverlay>
        {dragging && (
          <div className="w-[260px] rotate-2">
            <DealCard deal={dragging} draggable={false} onOpen={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function StageColumn({
  id,
  label,
  count,
  value,
  probability,
  canMove,
  children,
}: {
  id: string;
  label: string;
  count: number;
  value: number;
  probability: number;
  canMove: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !canMove });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[268px] shrink-0 flex-col rounded-lg border bg-surface-1 transition-colors',
        isOver ? 'border-primary bg-primary-soft/40' : 'border-line',
      )}
    >
      <div className="shrink-0 border-b border-line px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{label}</span>
          <Badge tone="neutral">{count}</Badge>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-ink-muted">
          <span className="tnum">{moneyCompact(value)}</span>
          <span>{probability}% typical</span>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 24rem)' }}>
        {children}
      </div>
    </div>
  );
}

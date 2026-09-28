import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { KanbanSquare, Plus, Table2, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { Money } from '@/components/common/Money';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { Can } from '@/rbac/can';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { getDeals, getPipelineInsights, getPipelines, owners } from '@/api/crm';
import { moneyCompact, percent, shortDate } from '@/lib/format';
import type { Deal } from '@/types/crm';
import { PipelineBoard } from './PipelineBoard';
import { DealDetail } from './DealDetail';

export default function DealsPage() {
  const { can, user } = useAuth();
  const [pipelineId, setPipelineId] = useState('pipe-sales');
  const [view, setView] = useState<'board' | 'table'>('board');
  const [open, setOpen] = useState<Deal | null>(null);

  const ownerFilter = can('deal', 'viewAll') ? null : user.id;

  const { data: pipelines = [] } = useQuery({ queryKey: qk.crm.pipelines, queryFn: getPipelines });
  const { data: deals = [], isLoading } = useQuery({
    queryKey: qk.crm.deals({ pipelineId, ownerId: ownerFilter, includeClosed: view === 'table' }),
    queryFn: () => getDeals({ pipelineId, ownerId: ownerFilter, includeClosed: view === 'table' }),
  });
  const { data: insights } = useQuery({
    queryKey: qk.crm.pipelineInsights(pipelineId),
    queryFn: () => getPipelineInsights(pipelineId),
  });

  const pipeline = pipelines.find((p) => p.id === pipelineId);

  const columns = useMemo<ColumnDef<Deal, unknown>[]>(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: 'Deal',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="max-w-72 truncate font-medium text-ink">{row.original.title}</div>
            <div className="truncate text-[11px] text-ink-muted">
              {row.original.refNo} · {row.original.companyName}
            </div>
          </div>
        ),
      },
      {
        id: 'stage',
        accessorKey: 'stage',
        header: 'Stage',
        filterFn: arrIncludes,
        cell: ({ row }) => {
          const s = pipeline?.stages.find((x) => x.key === row.original.stage);
          const tone = s?.kind === 'won' ? 'good' : s?.kind === 'lost' ? 'critical' : 'primary';
          return <Badge tone={tone}>{s?.label ?? row.original.stage}</Badge>;
        },
      },
      {
        id: 'value',
        accessorKey: 'value',
        header: 'Value',
        meta: { align: 'right' },
        cell: ({ getValue }) => <Money value={Number(getValue())} compact />,
      },
      {
        id: 'weighted',
        header: 'Weighted',
        meta: { align: 'right' },
        accessorFn: (d) => Math.round((d.value * d.probability) / 100),
        cell: ({ getValue }) => <Money value={Number(getValue())} compact tone="muted" />,
      },
      {
        id: 'expectedMargin',
        accessorKey: 'expectedMargin',
        header: 'Margin',
        meta: { align: 'right' },
        cell: ({ getValue }) => <Money value={Number(getValue())} compact tone="good" />,
      },
      {
        id: 'probability',
        accessorKey: 'probability',
        header: 'Prob.',
        meta: { align: 'right' },
        cell: ({ getValue }) => <span className="text-ink-secondary">{percent(Number(getValue()), 0)}</span>,
      },
      {
        id: 'expectedCloseDate',
        accessorKey: 'expectedCloseDate',
        header: 'Expected close',
        cell: ({ getValue }) => <span className="text-ink-secondary">{shortDate(getValue() as string)}</span>,
      },
      {
        id: 'ownerName',
        accessorKey: 'ownerName',
        header: 'Owner',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <OwnerChip name={String(getValue())} />,
      },
      {
        id: 'outcome',
        header: 'Outcome',
        accessorFn: (d) => d.wonReason ?? d.lostReason ?? '',
        cell: ({ row }) =>
          row.original.wonReason ? (
            <span className="text-good">{row.original.wonReason}</span>
          ) : row.original.lostReason ? (
            <span className="text-critical">
              {row.original.lostReason}
              {row.original.lostToCompetitor && (
                <span className="text-ink-muted"> · {row.original.lostToCompetitor}</span>
              )}
            </span>
          ) : (
            <span className="text-ink-muted">—</span>
          ),
      },
    ],
    [pipeline],
  );

  return (
    <>
      <PageHeader
        title="Deals"
        description={
          ownerFilter
            ? 'Your opportunities. Drag a card to move it along the pipeline.'
            : 'Every open opportunity. Drag a card to move it along the pipeline.'
        }
        filters={
          <>
            <Select value={pipelineId} onValueChange={setPipelineId}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={view} onValueChange={(v) => setView(v as 'board' | 'table')}>
              <TabsList>
                <TabsTrigger value="board">
                  <KanbanSquare /> Board
                </TabsTrigger>
                <TabsTrigger value="table">
                  <Table2 /> Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {insights && insights.staleCount > 0 && (
              <Badge tone="serious">{insights.staleCount} stale</Badge>
            )}
            {ownerFilter && <Badge tone="outline">Only your deals</Badge>}
          </>
        }
        actions={
          <Can module="deal" action="create">
            <Button variant="primary">
              <Plus /> New deal
            </Button>
          </Can>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Open pipeline"
          value={<Money value={insights?.openValue ?? 0} compact />}
          sublabel={`${insights?.openCount ?? 0} deals`}
          loading={!insights}
          emphasis
        />
        <StatTile
          label="Weighted"
          value={<Money value={insights?.weightedValue ?? 0} compact />}
          hint="Each deal's value multiplied by its stage probability. The honest number to forecast on."
          loading={!insights}
        />
        <StatTile
          label="Win rate"
          value={insights ? percent(insights.winRate) : '—'}
          sublabel={`${insights?.wonThisPeriod ?? 0} won / ${insights?.lostCount ?? 0} lost`}
          loading={!insights}
        />
        <StatTile
          label="Avg sales cycle"
          value={`${insights?.avgCycleDays ?? 0} days`}
          sublabel={insights ? `Avg deal ${moneyCompact(insights.avgDealSize)}` : undefined}
          loading={!insights}
        />
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-96 w-[268px] shrink-0" />
            ))}
          </div>
        ) : view === 'board' && pipeline ? (
          <PipelineBoard
            pipeline={pipeline}
            deals={deals}
            canMove={can('deal', 'changeStage')}
            onOpen={setOpen}
          />
        ) : (
          <DataTable
            tableId="crm-deals"
            columns={columns}
            data={deals}
            loading={isLoading}
            onRowClick={setOpen}
            searchPlaceholder="Deal, company or ref no…"
            emptyTitle="No deals match"
            defaultHiddenColumns={['expectedMargin']}
            facets={[
              {
                columnId: 'stage',
                label: 'Stage',
                options: (pipeline?.stages ?? []).map((s) => ({ value: s.key, label: s.label })),
              },
              {
                columnId: 'ownerName',
                label: 'Owner',
                options: owners().map((o) => ({ value: o.name, label: o.name })),
              },
            ]}
            actions={
              <Badge tone="outline">
                <TrendingUp /> Includes closed
              </Badge>
            }
          />
        )}
      </div>

      {open && <DealDetail deal={open} pipeline={pipelines.find((p) => p.id === open.pipelineId)} onClose={() => setOpen(null)} />}
    </>
  );
}

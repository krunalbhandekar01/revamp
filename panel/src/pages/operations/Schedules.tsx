import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarClock, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { StatTile } from '@/components/common/StatTile';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Meter } from '@/components/ui/progress';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/rbac/can';
import { qk } from '@/api/client';
import { getSchedules } from '@/api/operations';
import { qty, shortDate } from '@/lib/format';
import type { DeliverySchedule } from '@/types/domain';

/**
 * Delivery planner.
 *
 * The legacy model stores committed vs delivered quantities and marks a
 * schedule "Delivered" by cron when `endDate` passes — which is a log, not a
 * plan. The addition here is `riskRatio`: expected pace against actual pace,
 * so a schedule is flagged while there is still time to act on it.
 */
export default function SchedulesPage() {
  const { data = [], isLoading } = useQuery({ queryKey: qk.schedules.list(), queryFn: () => getSchedules() });

  const stats = useMemo(() => {
    const behind = data.filter((s) => s.status === 'Behind').length;
    const atRisk = data.filter((s) => s.status === 'At Risk').length;
    const onTrack = data.filter((s) => s.status === 'On Track').length;
    const delivered = data.filter((s) => s.status === 'Delivered').length;
    return { behind, atRisk, onTrack, delivered };
  }, [data]);

  const columns = useMemo<ColumnDef<DeliverySchedule, unknown>[]>(
    () => [
      {
        id: 'orderRefNo',
        accessorKey: 'orderRefNo',
        header: 'Order',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="font-medium text-ink">{row.original.orderRefNo}</div>
            <div className="text-[11px] text-ink-muted">{row.original.productName}</div>
          </div>
        ),
      },
      {
        id: 'buyerName',
        accessorKey: 'buyerName',
        header: 'Buyer',
        cell: ({ getValue }) => <span className="block max-w-44 truncate">{String(getValue())}</span>,
      },
      {
        id: 'lane',
        accessorKey: 'lane',
        header: 'Lane',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue())}</span>,
      },
      {
        id: 'window',
        header: 'Window',
        accessorFn: (s) => s.endDate,
        cell: ({ row }) => (
          <span className="text-ink-secondary">
            {shortDate(row.original.startDate)} → {shortDate(row.original.endDate)}
          </span>
        ),
      },
      {
        id: 'progress',
        header: 'Progress',
        meta: { align: 'right' },
        accessorFn: (s) => (s.committedQty ? (s.deliveredQty / s.committedQty) * 100 : 0),
        cell: ({ row }) => {
          const pct = row.original.committedQty
            ? (row.original.deliveredQty / row.original.committedQty) * 100
            : 0;
          return (
            <div className="flex items-center justify-end gap-2">
              <Meter
                value={pct}
                className="w-20"
                tone={row.original.status === 'Behind' ? 'critical' : row.original.status === 'At Risk' ? 'warning' : 'good'}
                label="Schedule progress"
              />
              <span className="tnum w-24 text-right text-[11px] text-ink-muted">
                {qty(row.original.deliveredQty)}/{qty(row.original.committedQty, row.original.unit)}
              </span>
            </div>
          );
        },
      },
      {
        id: 'riskRatio',
        accessorKey: 'riskRatio',
        header: 'Pace',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <Tooltip content="Expected pace ÷ actual pace. Above 1.0 means the schedule is falling behind the commitment.">
            <span
              className={
                row.original.riskRatio > 1.45
                  ? 'cursor-help font-medium text-critical'
                  : row.original.riskRatio > 1.12
                    ? 'cursor-help font-medium text-warning'
                    : 'cursor-help text-ink-secondary'
              }
            >
              {row.original.riskRatio.toFixed(2)}×
            </span>
          </Tooltip>
        ),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Delivery Planner"
        description="Commitments against actual pace, so a schedule is flagged while there is still time to fix it."
        actions={
          <Can module="schedule" action="plan">
            <Button variant="primary">
              <Sparkles /> Propose next 7 days
            </Button>
          </Can>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Behind" value={stats.behind} sublabel="Will miss the window" loading={isLoading} emphasis />
        <StatTile label="At risk" value={stats.atRisk} sublabel="Pace slipping" loading={isLoading} />
        <StatTile label="On track" value={stats.onTrack} loading={isLoading} />
        <StatTile label="Delivered" value={stats.delivered} loading={isLoading} />
      </div>

      <div className="mt-5">
        <DataTable
          tableId="schedules"
          columns={columns}
          data={data}
          loading={isLoading}
          searchPlaceholder="Order, buyer, lane…"
          emptyTitle="No schedules"
          emptyDescription="Nothing is committed for delivery in this window."
          facets={[
            {
              columnId: 'status',
              label: 'Status',
              options: [
                { value: 'Behind', label: 'Behind' },
                { value: 'At Risk', label: 'At Risk' },
                { value: 'On Track', label: 'On Track' },
                { value: 'Delivered', label: 'Delivered' },
              ],
            },
          ]}
          actions={
            <Button variant="outline" size="icon" aria-label="Calendar view">
              <CalendarClock />
            </Button>
          }
        />
      </div>
    </>
  );
}

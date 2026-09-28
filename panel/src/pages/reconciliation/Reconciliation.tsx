import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Link2, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Money } from '@/components/common/Money';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes } from '@/components/data-table/columns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/rbac/can';
import { qk } from '@/api/client';
import { getReconHealth, getReconItems } from '@/api/operations';
import { percent, relative, shortDateTime } from '@/lib/format';
import type { ReconItem } from '@/types/domain';

/**
 * Zoho reconciliation console.
 *
 * Nothing like this exists today, which is precisely why Zoho "is not fully
 * synced": documents are pushed with no persisted acknowledgement, payments are
 * pulled by a fire-and-forget job, and anything that fails to match is dropped
 * silently. This screen makes the gap visible and gives it an owner.
 */
export default function ReconciliationPage() {
  const { data: health, isLoading: loadingHealth } = useQuery({
    queryKey: qk.recon.health,
    queryFn: getReconHealth,
  });
  const { data: items = [], isLoading } = useQuery({
    queryKey: qk.recon.list(),
    queryFn: () => getReconItems(),
  });

  const needsAttention = useMemo(
    () => items.filter((i) => i.status !== 'matched'),
    [items],
  );

  const columns = useMemo<ColumnDef<ReconItem, unknown>[]>(
    () => [
      {
        id: 'reference',
        accessorKey: 'reference',
        header: 'Document',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="font-medium text-ink">{row.original.reference}</div>
            <div className="text-[11px] text-ink-muted">
              {row.original.docType} · {row.original.direction === 'push' ? 'panel → Zoho' : 'Zoho → panel'}
            </div>
          </div>
        ),
      },
      {
        id: 'counterpartyName',
        accessorKey: 'counterpartyName',
        header: 'Counterparty',
        cell: ({ getValue }) => <span className="block max-w-56 truncate">{String(getValue())}</span>,
      },
      {
        id: 'docType',
        accessorKey: 'docType',
        header: 'Type',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue())}</span>,
      },
      {
        id: 'panelAmount',
        accessorKey: 'panelAmount',
        header: 'Panel',
        meta: { align: 'right' },
        cell: ({ getValue }) =>
          getValue() === null ? <span className="text-ink-muted">—</span> : <Money value={Number(getValue())} />,
      },
      {
        id: 'zohoAmount',
        accessorKey: 'zohoAmount',
        header: 'Zoho',
        meta: { align: 'right' },
        cell: ({ getValue }) =>
          getValue() === null ? <span className="text-ink-muted">—</span> : <Money value={Number(getValue())} />,
      },
      {
        id: 'variance',
        accessorKey: 'variance',
        header: 'Variance',
        meta: { align: 'right' },
        cell: ({ getValue }) => {
          const v = Number(getValue());
          if (v === 0) return <span className="text-ink-muted">—</span>;
          return <Money value={v} tone="critical" />;
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        filterFn: arrIncludes,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={row.original.status} />
            {row.original.error && (
              <Tooltip content={row.original.error}>
                <AlertTriangle className="size-3.5 cursor-help text-critical" />
              </Tooltip>
            )}
          </div>
        ),
      },
      {
        id: 'syncedAt',
        accessorKey: 'syncedAt',
        header: 'Last attempt',
        cell: ({ getValue }) => (
          <Tooltip content={shortDateTime(getValue() as string)}>
            <span className="cursor-help text-ink-secondary">{relative(getValue() as string)}</span>
          </Tooltip>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        meta: { align: 'right' },
        cell: ({ row }) =>
          row.original.status === 'matched' ? null : (
            <div className="flex items-center justify-end gap-1">
              <Can module="reconciliation" action="match">
                <Button variant="outline" size="sm">
                  <Link2 /> Match
                </Button>
              </Can>
              <Can module="reconciliation" action="resync">
                <Button variant="ghost" size="icon-sm" aria-label="Re-sync">
                  <RefreshCw />
                </Button>
              </Can>
            </div>
          ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Zoho Reconciliation"
        description="What was pushed, what was acknowledged, and everything that did not match."
        actions={
          <Can module="reconciliation" action="resync">
            <Button variant="primary">
              <RefreshCw /> Run sync now
            </Button>
          </Can>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Match rate"
          value={health ? percent(health.matchRate) : '—'}
          sublabel={health ? `${health.matched} of ${health.total} documents` : undefined}
          loading={loadingHealth}
          emphasis
        />
        <StatTile
          label="Unmatched"
          value={health?.unmatched ?? 0}
          sublabel="Money with no invoice attached"
          hint="Payments received that could not be attributed to a dispatch. Today these are dropped silently by the sync job."
          loading={loadingHealth}
        />
        <StatTile
          label="Variance"
          value={<Money value={health?.varianceAmount ?? 0} compact />}
          sublabel={health ? `across ${health.variance} documents` : undefined}
          loading={loadingHealth}
        />
        <StatTile
          label="Failed"
          value={health?.failed ?? 0}
          sublabel="Rejected by Zoho"
          loading={loadingHealth}
        />
      </div>

      {needsAttention.length > 0 && (
        <Card className="mt-5 border-serious/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-serious" />
              {needsAttention.length} documents need a human
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs leading-relaxed text-ink-secondary">
              Until this list is cleared, every finance number in the panel is an estimate. Someone owns
              this queue daily — otherwise it becomes a graveyard and the variance compounds quietly.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="warning">{health?.unmatched ?? 0} unmatched</Badge>
              <Badge tone="serious">{health?.variance ?? 0} variance</Badge>
              <Badge tone="critical">{health?.failed ?? 0} failed</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-5">
        <DataTable
          tableId="reconciliation"
          columns={columns}
          data={items}
          loading={isLoading}
          searchPlaceholder="Reference or counterparty…"
          emptyTitle="Nothing to reconcile"
          facets={[
            {
              columnId: 'status',
              label: 'Status',
              options: [
                { value: 'unmatched', label: 'Unmatched' },
                { value: 'variance', label: 'Variance' },
                { value: 'failed', label: 'Failed' },
                { value: 'matched', label: 'Matched' },
              ],
            },
            {
              columnId: 'docType',
              label: 'Type',
              options: [
                { value: 'Invoice', label: 'Invoice' },
                { value: 'Bill', label: 'Bill' },
                { value: 'Customer Payment', label: 'Customer Payment' },
                { value: 'Vendor Credit', label: 'Vendor Credit' },
                { value: 'Credit Note', label: 'Credit Note' },
              ],
            },
          ]}
        />
      </div>
    </>
  );
}

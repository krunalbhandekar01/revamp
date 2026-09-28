import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, FileText, Plus, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { Money } from '@/components/common/Money';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { Can } from '@/rbac/can';
import { qk } from '@/api/client';
import { computeQuoteTotals, getQuotes } from '@/api/crm';
import { percent, relative, shortDate } from '@/lib/format';
import { sumBy } from '@/lib/utils';
import type { Quote } from '@/types/crm';
import { QuoteBuilder } from './QuoteBuilder';

const TONE: Record<Quote['status'], 'good' | 'warning' | 'critical' | 'primary' | 'neutral'> = {
  Draft: 'neutral',
  'Pending Approval': 'warning',
  Approved: 'primary',
  Sent: 'primary',
  Accepted: 'good',
  Rejected: 'critical',
  Expired: 'critical',
};

export default function QuotesPage() {
  const [open, setOpen] = useState<Quote | null>(null);
  const { data = [], isLoading } = useQuery({ queryKey: qk.crm.quotes(), queryFn: () => getQuotes() });

  const withTotals = useMemo(
    () =>
      data.map((q) => ({
        ...q,
        totals: computeQuoteTotals(q.lines, q.headerDiscountPercent, q.transportCharges),
      })),
    [data],
  );

  const stats = useMemo(() => {
    const openQuotes = withTotals.filter((q) => ['Sent', 'Approved', 'Pending Approval'].includes(q.status));
    const accepted = withTotals.filter((q) => q.status === 'Accepted');
    const decided = withTotals.filter((q) => ['Accepted', 'Rejected', 'Expired'].includes(q.status));
    return {
      openValue: sumBy(openQuotes, (q) => q.totals.grandTotal),
      openCount: openQuotes.length,
      pendingApproval: withTotals.filter((q) => q.status === 'Pending Approval').length,
      acceptRate: decided.length ? (accepted.length / decided.length) * 100 : 0,
      acceptedValue: sumBy(accepted, (q) => q.totals.grandTotal),
    };
  }, [withTotals]);

  type Row = (typeof withTotals)[number];

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        id: 'refNo',
        accessorKey: 'refNo',
        header: 'Quote',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-ink">{row.original.refNo}</span>
              {row.original.approvalRequired && row.original.status === 'Pending Approval' && (
                <Tooltip content="Discount above threshold — blocked until approved">
                  <ShieldAlert className="size-3 text-warning" aria-label="Needs approval" />
                </Tooltip>
              )}
            </div>
            <div className="max-w-56 truncate text-[11px] text-ink-muted">{row.original.companyName}</div>
          </div>
        ),
      },
      {
        id: 'dealTitle',
        accessorKey: 'dealTitle',
        header: 'Deal',
        cell: ({ getValue }) => (
          <span className="block max-w-56 truncate text-ink-secondary">{String(getValue() ?? '—')}</span>
        ),
      },
      {
        id: 'lines',
        header: 'Items',
        meta: { align: 'right' },
        accessorFn: (q) => q.lines.length,
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue())}</span>,
      },
      {
        id: 'value',
        header: 'Value',
        meta: { align: 'right' },
        accessorFn: (q) => q.totals.grandTotal,
        cell: ({ row }) => <Money value={row.original.totals.grandTotal} compact />,
      },
      {
        id: 'discount',
        header: 'Discount',
        meta: { align: 'right' },
        accessorFn: (q) => q.totals.effectiveDiscountPercent,
        cell: ({ row }) => {
          const d = row.original.totals.effectiveDiscountPercent;
          return <span className={d > 8 ? 'font-medium text-warning' : 'text-ink-secondary'}>{percent(d)}</span>;
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        filterFn: arrIncludes,
        cell: ({ row }) => <Badge tone={TONE[row.original.status]}>{row.original.status}</Badge>,
      },
      {
        id: 'validUntil',
        accessorKey: 'validUntil',
        header: 'Valid until',
        cell: ({ row }) => {
          const expired = new Date(row.original.validUntil).getTime() < Date.now();
          return (
            <span className={expired ? 'text-critical' : 'text-ink-secondary'}>
              {shortDate(row.original.validUntil)}
            </span>
          );
        },
      },
      {
        id: 'sentAt',
        accessorKey: 'sentAt',
        header: 'Sent',
        cell: ({ getValue }) => (
          <span className="text-ink-secondary">{getValue() ? relative(getValue() as string) : '—'}</span>
        ),
      },
      {
        id: 'ownerName',
        accessorKey: 'ownerName',
        header: 'Owner',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <OwnerChip name={String(getValue())} />,
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Quotations"
        description="Build, price, get approval and track what the customer did with it."
        actions={
          <>
            <Can module="quote" action="export">
              <Button variant="outline">
                <Download /> Export
              </Button>
            </Can>
            <Can module="quote" action="create">
              <Button variant="primary">
                <Plus /> New quotation
              </Button>
            </Can>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Out with customers"
          value={<Money value={stats.openValue} compact />}
          sublabel={`${stats.openCount} quotations`}
          loading={isLoading}
          emphasis
        />
        <StatTile
          label="Pending approval"
          value={stats.pendingApproval}
          sublabel="Discount above 8% threshold"
          loading={isLoading}
        />
        <StatTile label="Accept rate" value={percent(stats.acceptRate)} loading={isLoading} />
        <StatTile label="Accepted value" value={<Money value={stats.acceptedValue} compact />} loading={isLoading} />
      </div>

      <div className="mt-5">
        <DataTable
          tableId="crm-quotes"
          columns={columns}
          data={withTotals}
          loading={isLoading}
          onRowClick={(q) => setOpen(q)}
          searchPlaceholder="Quote no, company or deal…"
          emptyTitle="No quotations match"
          defaultHiddenColumns={['lines', 'sentAt']}
          facets={[
            {
              columnId: 'status',
              label: 'Status',
              options: (Object.keys(TONE) as Quote['status'][]).map((s) => ({ value: s, label: s })),
            },
          ]}
          actions={
            <Badge tone="outline">
              <FileText /> {data.length} total
            </Badge>
          }
        />
      </div>

      {open && <QuoteBuilder quote={open} onClose={() => setOpen(null)} />}
    </>
  );
}

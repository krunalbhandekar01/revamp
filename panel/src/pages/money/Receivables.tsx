import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Send } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { Money } from '@/components/common/Money';
import { DataTable } from '@/components/data-table/DataTable';
import { selectionColumn } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Meter } from '@/components/ui/progress';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/rbac/can';
import { qk } from '@/api/client';
import { getReceivables } from '@/api/finance';
import { dueLabel, percent, shortDate } from '@/lib/format';
import { sumBy } from '@/lib/utils';
import type { Receivable } from '@/types/domain';

export default function ReceivablesPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: qk.finance.receivables(),
    queryFn: () => getReceivables(),
  });

  const stats = useMemo(() => {
    const open = sumBy(data, (r) => r.amount - r.paidSoFar);
    const overdueRows = data.filter((r) => r.daysOverdue > 0);
    const overdue = sumBy(overdueRows, (r) => r.amount - r.paidSoFar);
    const expected7 = Math.round(
      sumBy(
        data.filter((r) => r.daysOverdue >= -7),
        (r) => (r.amount - r.paidSoFar) * r.collectionProbability,
      ),
    );
    return { open, overdue, overdueCount: overdueRows.length, expected7 };
  }, [data]);

  const columns = useMemo<ColumnDef<Receivable, unknown>[]>(
    () => [
      selectionColumn<Receivable>(),
      {
        id: 'buyerName',
        accessorKey: 'buyerName',
        header: 'Buyer',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="max-w-56 truncate font-medium text-ink">{row.original.buyerName}</div>
            <div className="text-[11px] text-ink-muted">{row.original.dispatchRefNo}</div>
          </div>
        ),
      },
      {
        id: 'amount',
        header: 'Outstanding',
        meta: { align: 'right' },
        accessorFn: (r) => r.amount - r.paidSoFar,
        cell: ({ row }) => (
          <div>
            <Money value={row.original.amount - row.original.paidSoFar} />
            {row.original.paidSoFar > 0 && (
              <div className="text-[11px] text-ink-muted">
                of <Money value={row.original.amount} compact />
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'invoicedOn',
        accessorKey: 'invoicedOn',
        header: 'Invoiced',
        cell: ({ getValue }) => <span className="text-ink-secondary">{shortDate(getValue() as string)}</span>,
      },
      {
        id: 'daysOverdue',
        accessorKey: 'daysOverdue',
        header: 'Due',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const d = row.original.daysOverdue;
          return (
            <div>
              <span className={d > 30 ? 'font-medium text-critical' : d > 0 ? 'font-medium text-warning' : 'text-ink-secondary'}>
                {dueLabel(d)}
              </span>
              <div className="text-[11px] text-ink-muted">{shortDate(row.original.dueDate)}</div>
            </div>
          );
        },
      },
      {
        id: 'collectionProbability',
        accessorKey: 'collectionProbability',
        header: 'Likely to land',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const p = row.original.collectionProbability * 100;
          return (
            <Tooltip content="Model estimate from this buyer's payment history and the invoice's age. Feeds the cash-flow forecast.">
              <div className="flex cursor-help items-center justify-end gap-2">
                <Meter
                  value={p}
                  className="w-14"
                  tone={p > 70 ? 'good' : p > 40 ? 'warning' : 'critical'}
                  label="Collection likelihood"
                />
                <span className="tnum w-9 text-right text-[11px] text-ink-muted">{percent(p, 0)}</span>
              </div>
            </Tooltip>
          );
        },
      },
      {
        id: 'predicted',
        accessorKey: 'predictedPaymentDate',
        header: 'Predicted payment',
        cell: ({ getValue }) => (
          <Badge tone="outline">{shortDate(getValue() as string)}</Badge>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Receivables"
        description="What is owed, how likely each invoice is to land, and when the model expects it."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Outstanding" value={<Money value={stats.open} compact />} loading={isLoading} emphasis />
        <StatTile
          label="Past due"
          value={<Money value={stats.overdue} compact />}
          sublabel={`${stats.overdueCount} invoices`}
          loading={isLoading}
        />
        <StatTile
          label="Expected in 7 days"
          value={<Money value={stats.expected7} compact />}
          hint="Weighted by each buyer's payment history rather than assuming everyone pays on the due date."
          loading={isLoading}
        />
        <StatTile label="Invoices open" value={data.length} loading={isLoading} />
      </div>

      <div className="mt-5">
        <DataTable
          tableId="receivables"
          columns={columns}
          data={data}
          loading={isLoading}
          enableSelection
          searchPlaceholder="Buyer or dispatch no…"
          emptyTitle="Nothing outstanding"
          bulkActions={(rows, clear) => (
            <Can module="payment" action="update">
              <Button variant="primary" size="sm" onClick={clear}>
                <Send /> Send reminder to {rows.length}
              </Button>
            </Can>
          )}
        />
      </div>
    </>
  );
}

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Download } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Money } from '@/components/common/Money';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/rbac/can';
import { qk } from '@/api/client';
import { getPayments } from '@/api/operations';
import { shortDate } from '@/lib/format';
import type { Payment } from '@/types/domain';

export default function PaymentsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: qk.payments.list(), queryFn: () => getPayments() });

  const columns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        id: 'refNo',
        accessorKey: 'refNo',
        header: 'Reference',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="font-medium text-ink">{row.original.refNo}</div>
            <div className="text-[11px] text-ink-muted">{row.original.mode}</div>
          </div>
        ),
      },
      {
        id: 'direction',
        accessorKey: 'direction',
        header: 'Direction',
        filterFn: arrIncludes,
        cell: ({ getValue }) => (
          <Badge tone={getValue() === 'Receivable' ? 'good' : 'primary'}>{String(getValue())}</Badge>
        ),
      },
      {
        id: 'counterpartyName',
        accessorKey: 'counterpartyName',
        header: 'Counterparty',
        cell: ({ getValue }) => <span className="block max-w-56 truncate">{String(getValue())}</span>,
      },
      {
        id: 'dispatchRefNo',
        accessorKey: 'dispatchRefNo',
        header: 'Dispatch',
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue() ?? '—')}</span>,
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: 'Amount',
        meta: { align: 'right' },
        cell: ({ getValue }) => <Money value={Number(getValue())} />,
      },
      {
        id: 'paymentDate',
        accessorKey: 'paymentDate',
        header: 'Date',
        cell: ({ getValue }) => <span className="text-ink-secondary">{shortDate(getValue() as string)}</span>,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        id: 'matched',
        accessorKey: 'matched',
        header: 'Zoho',
        cell: ({ row }) =>
          row.original.matched ? (
            <span className="text-[11px] text-ink-muted">{row.original.zohoPaymentId ?? 'Matched'}</span>
          ) : (
            <Tooltip content="Received but not attributed to an invoice. Money in the bank that is not on any dispatch.">
              <span className="inline-flex cursor-help items-center gap-1 text-[11px] font-medium text-serious">
                <AlertTriangle className="size-3" /> Unmatched
              </span>
            </Tooltip>
          ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Payments"
        description="Money in and money out, and whether each one found its invoice."
        actions={
          <Can module="payment" action="export">
            <Button variant="outline">
              <Download /> Export
            </Button>
          </Can>
        }
      />

      <DataTable
        tableId="payments"
        columns={columns}
        data={data}
        loading={isLoading}
        searchPlaceholder="Reference or counterparty…"
        emptyTitle="No payments match"
        facets={[
          {
            columnId: 'direction',
            label: 'Direction',
            options: [
              { value: 'Receivable', label: 'Receivable' },
              { value: 'Payable', label: 'Payable' },
            ],
          },
          {
            columnId: 'status',
            label: 'Status',
            options: [
              { value: 'Added', label: 'Added' },
              { value: 'Approved', label: 'Approved' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Rejected', label: 'Rejected' },
              { value: 'Cancelled', label: 'Cancelled' },
            ],
          },
        ]}
      />
    </>
  );
}

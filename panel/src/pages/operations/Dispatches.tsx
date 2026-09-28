import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { CircleSlash, Download, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Money } from '@/components/common/Money';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes, selectionColumn } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/rbac/can';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { getDispatches } from '@/api/operations';
import { qty, shortDate } from '@/lib/format';
import type { Dispatch } from '@/types/domain';

export default function DispatchesPage() {
  const { can } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: qk.dispatches.list(),
    queryFn: () => getDispatches(),
  });

  const showMargin = can('financeDashboard', 'viewMargin') || can('salesDashboard', 'viewMargin');

  const columns = useMemo<ColumnDef<Dispatch, unknown>[]>(() => {
    const base: ColumnDef<Dispatch, unknown>[] = [
      selectionColumn<Dispatch>(),
      {
        id: 'refNo',
        accessorKey: 'refNo',
        header: 'Dispatch',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="font-medium text-ink">{row.original.refNo}</div>
            <div className="text-[11px] text-ink-muted">{row.original.vehicleNo}</div>
          </div>
        ),
      },
      {
        id: 'buyerName',
        accessorKey: 'buyerName',
        header: 'Buyer',
        cell: ({ getValue }) => <span className="block max-w-48 truncate">{String(getValue())}</span>,
      },
      {
        id: 'sellerName',
        accessorKey: 'sellerName',
        header: 'Seller',
        cell: ({ getValue }) => (
          <span className="block max-w-48 truncate text-ink-secondary">{String(getValue())}</span>
        ),
      },
      {
        id: 'productName',
        accessorKey: 'productName',
        header: 'Product',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue())}</span>,
      },
      {
        id: 'qty',
        accessorKey: 'qty',
        header: 'Quantity',
        meta: { align: 'right' },
        cell: ({ row }) => qty(row.original.qty, row.original.unit),
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        id: 'transitStatus',
        accessorKey: 'transitStatus',
        header: 'Transit',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        id: 'payableStatus',
        accessorKey: 'payableStatus',
        header: 'Payable',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        id: 'lane',
        accessorKey: 'lane',
        header: 'Lane',
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue())}</span>,
      },
      {
        id: 'dispatchedOn',
        accessorKey: 'dispatchedOn',
        header: 'Dispatched',
        cell: ({ getValue }) => <span className="text-ink-secondary">{shortDate(getValue() as string)}</span>,
      },
      {
        id: 'zohoSynced',
        accessorKey: 'zohoSynced',
        header: 'Zoho',
        cell: ({ row }) =>
          row.original.salesBillNo ? (
            row.original.zohoSynced ? (
              <StatusBadge status="matched" />
            ) : (
              <Tooltip content="Sales bill exists but Zoho Books never acknowledged it.">
                <span>
                  <StatusBadge status="unmatched" />
                </span>
              </Tooltip>
            )
          ) : (
            <Tooltip content="Not invoiced yet">
              <CircleSlash className="size-3.5 text-ink-muted" />
            </Tooltip>
          ),
      },
    ];

    if (showMargin) {
      base.splice(5, 0, {
        id: 'margin',
        header: 'Margin',
        meta: { align: 'right' },
        accessorFn: (d) => (d.tradingPrice - d.purchasingPrice) * d.qty,
        cell: ({ getValue }) => <Money value={Number(getValue())} compact tone="good" />,
      });
    }

    return base;
  }, [showMargin]);

  return (
    <>
      <PageHeader
        title="Dispatches"
        description="Every load, its transit state, its documents and whether the supplier can be paid."
        actions={
          <>
            <Can module="dispatch" action="export">
              <Button variant="outline">
                <Download /> Export
              </Button>
            </Can>
            <Can module="dispatch" action="create">
              <Button variant="primary">New dispatch</Button>
            </Can>
          </>
        }
      />

      <DataTable
        tableId="dispatches"
        columns={columns}
        data={data}
        loading={isLoading}
        enableSelection
        searchPlaceholder="Dispatch no, buyer, seller, vehicle…"
        emptyTitle="No dispatches match"
        emptyDescription="Try clearing a filter or widening the search."
        facets={[
          {
            columnId: 'status',
            label: 'Status',
            options: [
              { value: 'In Preparation', label: 'In Preparation' },
              { value: 'Dispatched', label: 'Dispatched' },
              { value: 'Completed', label: 'Completed' },
              { value: 'On Hold', label: 'On Hold' },
              { value: 'Cancelled', label: 'Cancelled' },
            ],
          },
          {
            columnId: 'payableStatus',
            label: 'Payable',
            options: [
              { value: 'Awaiting Clearance', label: 'Awaiting Clearance' },
              { value: 'Cleared for Payment', label: 'Cleared for Payment' },
              { value: 'Paid', label: 'Paid' },
              { value: 'On Hold', label: 'On Hold' },
              { value: 'Rejected', label: 'Rejected' },
            ],
          },
          {
            columnId: 'transitStatus',
            label: 'Transit',
            options: [
              { value: 'Finding Transport', label: 'Finding Transport' },
              { value: 'Transport Allocated', label: 'Transport Allocated' },
              { value: 'Loaded', label: 'Loaded' },
              { value: 'In Transit', label: 'In Transit' },
              { value: 'Goods Delivered', label: 'Goods Delivered' },
            ],
          },
        ]}
        bulkActions={(rows, clear) => (
          <div className="flex items-center gap-1.5">
            <Can module="dispatch" action="clearPayable">
              <Button variant="primary" size="sm" onClick={clear}>
                Clear {rows.length} for payment
              </Button>
            </Can>
            <Can module="reconciliation" action="resync">
              <Button variant="outline" size="sm" onClick={clear}>
                <RefreshCw /> Re-sync to Zoho
              </Button>
            </Can>
          </div>
        )}
      />
    </>
  );
}

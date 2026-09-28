import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Money } from '@/components/common/Money';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Meter } from '@/components/ui/progress';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/rbac/can';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { getOrders } from '@/api/operations';
import { percent, qty, shortDate } from '@/lib/format';
import type { Order } from '@/types/domain';

export default function OrdersPage() {
  const { can } = useAuth();
  const { data = [], isLoading } = useQuery({ queryKey: qk.orders.list(), queryFn: () => getOrders() });
  const showMargin = can('salesDashboard', 'viewMargin') || can('financeDashboard', 'viewMargin');

  const columns = useMemo<ColumnDef<Order, unknown>[]>(() => {
    const base: ColumnDef<Order, unknown>[] = [
      {
        id: 'refNo',
        accessorKey: 'refNo',
        header: 'Order',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="font-medium text-ink">{row.original.refNo}</div>
            <div className="text-[11px] text-ink-muted">{shortDate(row.original.orderDate)}</div>
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
        id: 'progress',
        header: 'Delivered',
        meta: { align: 'right' },
        accessorFn: (o) => (o.qty ? (o.deliveredQty / o.qty) * 100 : 0),
        cell: ({ row }) => {
          const pct = row.original.qty ? (row.original.deliveredQty / row.original.qty) * 100 : 0;
          return (
            <div className="flex items-center justify-end gap-2">
              <Meter value={pct} className="w-16" tone={pct >= 100 ? 'good' : 'primary'} label="Delivery progress" />
              <span className="tnum w-20 text-right text-[11px] text-ink-muted">
                {qty(row.original.deliveredQty)}/{qty(row.original.qty, row.original.unit)}
              </span>
            </div>
          );
        },
      },
      {
        id: 'creditTerms',
        header: 'Credit gap',
        meta: { align: 'right' },
        accessorFn: (o) => o.salesCreditTerm - o.purchaseCreditTerm,
        cell: ({ row }) => {
          const gap = row.original.salesCreditTerm - row.original.purchaseCreditTerm;
          return (
            <Tooltip
              content={`We pay the seller in ${row.original.purchaseCreditTerm}d and collect from the buyer in ${row.original.salesCreditTerm}d. The gap is how long our cash is locked.`}
            >
              <span className={gap > 30 ? 'cursor-help font-medium text-serious' : 'cursor-help text-ink-secondary'}>
                {gap}d
              </span>
            </Tooltip>
          );
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        id: 'state',
        accessorKey: 'state',
        header: 'State',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue())}</span>,
      },
    ];

    if (showMargin) {
      base.splice(5, 0, {
        id: 'margin',
        header: 'Margin %',
        meta: { align: 'right' },
        accessorFn: (o) => (o.tradingPrice ? ((o.tradingPrice - o.purchasingPrice) / o.tradingPrice) * 100 : 0),
        cell: ({ row }) => {
          const pct = row.original.tradingPrice
            ? ((row.original.tradingPrice - row.original.purchasingPrice) / row.original.tradingPrice) * 100
            : 0;
          return (
            <span className={pct < 4 ? 'font-medium text-serious' : 'text-ink'}>{percent(pct)}</span>
          );
        },
      });
      base.splice(6, 0, {
        id: 'value',
        header: 'Order value',
        meta: { align: 'right' },
        accessorFn: (o) => o.tradingPrice * o.qty,
        cell: ({ getValue }) => <Money value={Number(getValue())} compact />,
      });
    }

    return base;
  }, [showMargin]);

  return (
    <>
      <PageHeader
        title="Orders"
        description="Every commitment, how much of it has shipped, and how long the cash behind it is locked."
        actions={
          <>
            <Can module="order" action="export">
              <Button variant="outline">
                <Download /> Export
              </Button>
            </Can>
            <Can module="order" action="create">
              <Button variant="primary">New order</Button>
            </Can>
          </>
        }
      />

      <DataTable
        tableId="orders"
        columns={columns}
        data={data}
        loading={isLoading}
        searchPlaceholder="Order no, buyer, seller, product…"
        emptyTitle="No orders match"
        facets={[
          {
            columnId: 'status',
            label: 'Status',
            options: [
              { value: 'Draft', label: 'Draft' },
              { value: 'Placed', label: 'Placed' },
              { value: 'In Progress', label: 'In Progress' },
              { value: 'Completed', label: 'Completed' },
              { value: 'On Hold', label: 'On Hold' },
              { value: 'Cancelled', label: 'Cancelled' },
            ],
          },
        ]}
      />
    </>
  );
}

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Money } from '@/components/common/Money';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Meter } from '@/components/ui/progress';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/rbac/can';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { getBusinesses } from '@/api/operations';
import { percent, relative } from '@/lib/format';
import type { Business } from '@/types/domain';

export default function BusinessesPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const showFinance = can('business', 'viewFinance');

  const { data = [], isLoading } = useQuery({ queryKey: qk.business.list(), queryFn: () => getBusinesses() });

  const columns = useMemo<ColumnDef<Business, unknown>[]>(() => {
    const base: ColumnDef<Business, unknown>[] = [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Business',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="flex items-center gap-1.5">
              <span className="max-w-56 truncate font-medium text-ink">{row.original.name}</span>
              {row.original.kycCompleted ? (
                <Tooltip content="KYC complete">
                  <ShieldCheck className="size-3 shrink-0 text-good" aria-label="KYC complete" />
                </Tooltip>
              ) : (
                <Tooltip content="KYC incomplete — cannot transact">
                  <ShieldAlert className="size-3 shrink-0 text-warning" aria-label="KYC incomplete" />
                </Tooltip>
              )}
            </div>
            <div className="text-[11px] text-ink-muted">
              {row.original.city}, {row.original.state} · {row.original.industry}
            </div>
          </div>
        ),
      },
      {
        id: 'kind',
        accessorKey: 'kind',
        header: 'Type',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <Badge tone="outline">{String(getValue())}</Badge>,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        id: 'zohoLinked',
        accessorKey: 'zohoLinked',
        header: 'Zoho',
        cell: ({ getValue }) =>
          getValue() ? (
            <span className="text-[11px] text-ink-muted">Linked</span>
          ) : (
            <Badge tone="warning">Not linked</Badge>
          ),
      },
      {
        id: 'orderCount',
        accessorKey: 'orderCount',
        header: 'Orders',
        meta: { align: 'right' },
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue())}</span>,
      },
      {
        id: 'lastActivityAt',
        accessorKey: 'lastActivityAt',
        header: 'Last active',
        cell: ({ getValue }) => <span className="text-ink-secondary">{relative(getValue() as string)}</span>,
      },
    ];

    if (showFinance) {
      base.splice(4, 0, {
        id: 'lifetimeContribution',
        accessorKey: 'lifetimeContribution',
        header: 'Contribution',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div>
            <Money value={row.original.lifetimeContribution} compact tone="good" />
            <div className="text-[11px] text-ink-muted">
              {percent(
                row.original.lifetimeRevenue
                  ? (row.original.lifetimeContribution / row.original.lifetimeRevenue) * 100
                  : 0,
              )}{' '}
              of revenue
            </div>
          </div>
        ),
      });
      base.splice(5, 0, {
        id: 'exposure',
        header: 'Credit used',
        meta: { align: 'right' },
        accessorFn: (b) => (b.creditLimit ? (b.openExposure / b.creditLimit) * 100 : 0),
        cell: ({ row }) => {
          const util = row.original.creditLimit
            ? (row.original.openExposure / row.original.creditLimit) * 100
            : 0;
          return (
            <div className="flex items-center justify-end gap-2">
              <Meter
                value={util}
                className="w-14"
                tone={util > 90 ? 'critical' : util > 70 ? 'warning' : 'primary'}
                label="Credit utilisation"
              />
              <span className="tnum w-9 text-right text-[11px] text-ink-muted">{util.toFixed(0)}%</span>
            </div>
          );
        },
      });
      base.splice(6, 0, {
        id: 'dso',
        accessorKey: 'dso',
        header: 'DSO',
        meta: { align: 'right' },
        cell: ({ getValue }) => {
          const d = Number(getValue());
          return <span className={d > 60 ? 'font-medium text-serious' : 'text-ink-secondary'}>{d}d</span>;
        },
      });
    }

    return base;
  }, [showFinance]);

  return (
    <>
      <PageHeader
        title="Businesses"
        description={
          showFinance
            ? 'Buyers and sellers, ranked by what they actually contribute — not by how much they buy.'
            : 'Buyers and sellers on the platform.'
        }
        actions={
          <>
            <Can module="business" action="export">
              <Button variant="outline">
                <Download /> Export
              </Button>
            </Can>
            <Can module="business" action="create">
              <Button variant="primary">Add business</Button>
            </Can>
          </>
        }
      />

      <DataTable
        tableId="businesses"
        columns={columns}
        data={data}
        loading={isLoading}
        onRowClick={(b) => navigate(`/business/${b.id}`)}
        searchPlaceholder="Name, GSTIN or city…"
        emptyTitle="No businesses match"
        facets={[
          {
            columnId: 'kind',
            label: 'Type',
            options: [
              { value: 'Buyer', label: 'Buyer' },
              { value: 'Seller', label: 'Seller' },
            ],
          },
          {
            columnId: 'status',
            label: 'Status',
            options: [
              { value: 'Verified', label: 'Verified' },
              { value: 'Not Verified', label: 'Not Verified' },
              { value: 'Deactivated', label: 'Deactivated' },
            ],
          },
        ]}
      />
    </>
  );
}

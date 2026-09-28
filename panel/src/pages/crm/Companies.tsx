import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { Money } from '@/components/common/Money';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes } from '@/components/data-table/columns';
import { Badge } from '@/components/ui/badge';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { qk } from '@/api/client';
import { getCompaniesCrm } from '@/api/crm';
import { relative, shortDate } from '@/lib/format';
import { sumBy } from '@/lib/utils';
import type { CompanyCrm } from '@/types/crm';

type Row = CompanyCrm & { name: string; state: string };

const LIFECYCLE_TONE: Record<string, 'good' | 'primary' | 'warning' | 'critical' | 'neutral'> = {
  'Repeat Customer': 'good',
  'Active Customer': 'primary',
  Prospect: 'neutral',
  Lead: 'neutral',
  Dormant: 'warning',
  Churned: 'critical',
};

export default function CompaniesPage() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({ queryKey: qk.crm.companies, queryFn: getCompaniesCrm });

  const stats = useMemo(
    () => ({
      active: data.filter((c) => c.lifecycleStage === 'Active Customer' || c.lifecycleStage === 'Repeat Customer')
        .length,
      dormant: data.filter((c) => c.lifecycleStage === 'Dormant').length,
      churned: data.filter((c) => c.lifecycleStage === 'Churned').length,
      openValue: sumBy(data, (c) => c.openDealValue),
    }),
    [data],
  );

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Company',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="max-w-64 truncate font-medium text-ink">{row.original.name}</div>
            <div className="text-[11px] text-ink-muted">{row.original.state}</div>
          </div>
        ),
      },
      {
        id: 'lifecycleStage',
        accessorKey: 'lifecycleStage',
        header: 'Lifecycle',
        filterFn: arrIncludes,
        cell: ({ getValue }) => (
          <Badge tone={LIFECYCLE_TONE[String(getValue())] ?? 'neutral'}>{String(getValue())}</Badge>
        ),
      },
      {
        id: 'accountTier',
        accessorKey: 'accountTier',
        header: 'Tier',
        filterFn: arrIncludes,
        cell: ({ getValue }) => {
          const t = String(getValue());
          return (
            <Badge tone={t === 'Platinum' ? 'primary' : t === 'Gold' ? 'good' : 'outline'}>{t}</Badge>
          );
        },
      },
      {
        id: 'contactCount',
        accessorKey: 'contactCount',
        header: 'Contacts',
        meta: { align: 'right' },
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue())}</span>,
      },
      {
        id: 'openDeals',
        accessorKey: 'openDeals',
        header: 'Open deals',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div>
            <span className="tnum text-ink">{row.original.openDeals}</span>
            {row.original.openDealValue > 0 && (
              <div className="text-[11px] text-ink-muted">
                <Money value={row.original.openDealValue} compact />
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'ownerName',
        accessorKey: 'ownerName',
        header: 'Account owner',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <OwnerChip name={String(getValue())} />,
      },
      {
        id: 'lastActivityAt',
        accessorKey: 'lastActivityAt',
        header: 'Last activity',
        cell: ({ getValue }) => (
          <span className="text-ink-secondary">{getValue() ? relative(getValue() as string) : 'Never'}</span>
        ),
      },
      {
        id: 'nextFollowUpAt',
        accessorKey: 'nextFollowUpAt',
        header: 'Next follow-up',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          if (!v) return <span className="text-ink-muted">Not scheduled</span>;
          const overdue = new Date(v).getTime() < Date.now();
          return <span className={overdue ? 'font-medium text-critical' : 'text-ink-secondary'}>{shortDate(v)}</span>;
        },
      },
      {
        id: 'segments',
        header: 'Segments',
        accessorFn: (c) => c.segments.join(', '),
        cell: ({ row }) =>
          row.original.segments.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.segments.map((s) => (
                <Badge key={s} tone="outline">
                  {s}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-ink-muted">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Companies"
        description="Accounts by lifecycle stage, with who owns the relationship and what is open on it."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active accounts" value={stats.active} loading={isLoading} emphasis />
        <StatTile label="Dormant" value={stats.dormant} sublabel="No activity in 90 days" loading={isLoading} />
        <StatTile label="Churned" value={stats.churned} loading={isLoading} />
        <StatTile label="Open deal value" value={<Money value={stats.openValue} compact />} loading={isLoading} />
      </div>

      <div className="mt-5">
        <DataTable
          tableId="crm-companies"
          columns={columns}
          data={data}
          loading={isLoading}
          onRowClick={(c) => navigate(`/business/${c.companyId}`)}
          searchPlaceholder="Company name…"
          emptyTitle="No companies match"
          emptyDescription="Adjust the lifecycle filter to widen the list."
          defaultHiddenColumns={['segments']}
          facets={[
            {
              columnId: 'lifecycleStage',
              label: 'Lifecycle',
              options: ['Lead', 'Prospect', 'Active Customer', 'Repeat Customer', 'Dormant', 'Churned'].map(
                (v) => ({ value: v, label: v }),
              ),
            },
            {
              columnId: 'accountTier',
              label: 'Tier',
              options: ['Platinum', 'Gold', 'Silver', 'Unrated'].map((v) => ({ value: v, label: v })),
            },
          ]}
          actions={
            <Badge tone="outline">
              <Building2 /> {data.length}
            </Badge>
          }
        />
      </div>
    </>
  );
}

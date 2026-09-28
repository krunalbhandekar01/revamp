import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Download, Flame, Upload, UserPlus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Money } from '@/components/common/Money';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes, selectionColumn } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScoreMeter } from '@/components/crm/ScoreMeter';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { Can } from '@/rbac/can';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { assignLeads, getLeadInsights, getLeads, owners } from '@/api/crm';
import { percent, qty, relative, shortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types/crm';
import { LeadDetail } from './LeadDetail';

export default function LeadsPage() {
  const qc = useQueryClient();
  const { can, user } = useAuth();
  const [selected, setSelected] = useState<Lead | null>(null);

  // A rep without `viewAll` sees only their own book.
  const ownerFilter = can('lead', 'viewAll') ? null : user.id;

  const { data = [], isLoading } = useQuery({
    queryKey: qk.crm.leads({ ownerId: ownerFilter }),
    queryFn: () => getLeads({ ownerId: ownerFilter }),
  });
  const { data: insights } = useQuery({ queryKey: qk.crm.leadInsights, queryFn: getLeadInsights });

  const assign = useMutation({
    mutationFn: ({ ids, ownerId }: { ids: string[]; ownerId: string }) => assignLeads(ids, ownerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm'] }),
  });

  const columns = useMemo<ColumnDef<Lead, unknown>[]>(
    () => [
      selectionColumn<Lead>(),
      {
        id: 'companyName',
        accessorKey: 'companyName',
        header: 'Company',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="flex items-center gap-1.5">
              <span className="max-w-56 truncate font-medium text-ink">{row.original.companyName}</span>
              {row.original.duplicateOf.length > 0 && (
                <Tooltip content={`${row.original.duplicateOf.length} possible duplicate(s) — review before working this lead`}>
                  <Copy className="size-3 shrink-0 text-warning" aria-label="Possible duplicate" />
                </Tooltip>
              )}
            </div>
            <div className="truncate text-[11px] text-ink-muted">
              {row.original.contactName} · {row.original.city}, {row.original.state}
            </div>
          </div>
        ),
      },
      {
        id: 'score',
        accessorKey: 'score',
        header: 'Score',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ScoreMeter score={row.original.score} factors={row.original.scoreFactors} />
          </div>
        ),
      },
      {
        id: 'stage',
        accessorKey: 'stage',
        header: 'Stage',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <StatusBadge status={String(getValue())} />,
      },
      {
        id: 'side',
        accessorKey: 'side',
        header: 'Side',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <Badge tone="outline">{String(getValue())}</Badge>,
      },
      {
        id: 'productInterest',
        accessorKey: 'productInterest',
        header: 'Interest',
        filterFn: arrIncludes,
        cell: ({ row }) => (
          <div>
            <div className="text-ink-secondary">{row.original.productInterest}</div>
            <div className="text-[11px] text-ink-muted">
              {qty(row.original.estimatedVolume, row.original.unit)}
            </div>
          </div>
        ),
      },
      {
        id: 'estimatedValue',
        accessorKey: 'estimatedValue',
        header: 'Est. value',
        meta: { align: 'right' },
        cell: ({ getValue }) => <Money value={Number(getValue())} compact />,
      },
      {
        id: 'source',
        accessorKey: 'source',
        header: 'Source',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue())}</span>,
      },
      {
        id: 'ownerName',
        accessorKey: 'ownerName',
        header: 'Owner',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <OwnerChip name={String(getValue())} />,
      },
      {
        id: 'nextFollowUpAt',
        accessorKey: 'nextFollowUpAt',
        header: 'Follow-up',
        cell: ({ row }) => {
          const v = row.original.nextFollowUpAt;
          if (!v) return <span className="text-ink-muted">—</span>;
          const overdue = new Date(v).getTime() < Date.now();
          return (
            <span className={cn(overdue ? 'font-medium text-critical' : 'text-ink-secondary')}>
              {shortDate(v)}
            </span>
          );
        },
      },
      {
        id: 'lastTouchedAt',
        accessorKey: 'lastTouchedAt',
        header: 'Last touch',
        cell: ({ getValue }) => (
          <span className="text-ink-secondary">{getValue() ? relative(getValue() as string) : 'Never'}</span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Leads"
        description={
          ownerFilter
            ? 'Your leads, ranked by score. Work the top of the list first.'
            : 'Every lead on the platform, ranked by score with its reasoning attached.'
        }
        actions={
          <>
            <Can module="lead" action="import">
              <Button variant="outline" asChild>
                <Link to="/manage/import">
                  <Upload /> Import
                </Link>
              </Button>
            </Can>
            <Can module="lead" action="export">
              <Button variant="outline">
                <Download /> Export
              </Button>
            </Can>
            <Can module="lead" action="create">
              <Button variant="primary">
                <UserPlus /> New lead
              </Button>
            </Can>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Hot leads"
          value={insights?.hot ?? 0}
          sublabel="Score 70+, still open"
          hint="Fit plus engagement plus recency. Hover any score in the table for its breakdown."
          loading={!insights}
          emphasis
        />
        <StatTile
          label="Never contacted"
          value={insights?.unworked ?? 0}
          sublabel="Sitting in New with no activity"
          loading={!insights}
        />
        <StatTile
          label="Overdue follow-ups"
          value={insights?.overdueFollowUps ?? 0}
          sublabel="Promised a callback, missed it"
          loading={!insights}
        />
        <StatTile
          label="Conversion rate"
          value={insights ? percent(insights.conversionRate) : '—'}
          sublabel={`${insights?.total ?? 0} leads all time`}
          loading={!insights}
        />
      </div>

      <div className="mt-5">
        <DataTable
          tableId="crm-leads"
          columns={columns}
          data={data}
          loading={isLoading}
          enableSelection
          onRowClick={setSelected}
          searchPlaceholder="Company, contact, phone or ref no…"
          emptyTitle="No leads match"
          emptyDescription="Try clearing a filter, or import a new list."
          defaultHiddenColumns={['side', 'lastTouchedAt']}
          facets={[
            {
              columnId: 'stage',
              label: 'Stage',
              options: ['New', 'Contacted', 'Qualified', 'Proposal', 'Converted', 'Lost'].map((v) => ({
                value: v,
                label: v,
              })),
            },
            {
              columnId: 'source',
              label: 'Source',
              options: [
                'IndiaMART',
                'Website',
                'Referral',
                'Campaign',
                'Outbound',
                'WhatsApp',
                'Trade Show',
                'Import',
              ].map((v) => ({ value: v, label: v })),
            },
            {
              columnId: 'ownerName',
              label: 'Owner',
              options: owners().map((o) => ({ value: o.name, label: o.name })),
            },
          ]}
          bulkActions={(rows, clear) => (
            <Can module="lead" action="assign">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="primary" size="sm">
                    <Users /> Assign {rows.length}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Assign to</DropdownMenuLabel>
                  {owners().map((o) => (
                    <DropdownMenuItem
                      key={o.id}
                      onSelect={() => {
                        assign.mutate({ ids: rows.map((r) => r.id), ownerId: o.id });
                        clear();
                      }}
                    >
                      {o.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </Can>
          )}
          actions={
            insights && insights.hot > 0 ? (
              <Tooltip content="Leads scoring 70 or above that are still open">
                <span className="hidden sm:inline-flex">
                  <Badge tone="serious">
                    <Flame /> {insights.hot} hot
                  </Badge>
                </span>
              </Tooltip>
            ) : null
          }
        />
      </div>

      {selected && <LeadDetail lead={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

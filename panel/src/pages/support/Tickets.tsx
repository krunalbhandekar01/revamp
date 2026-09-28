import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, LifeBuoy, Plus, Smile } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { SlaBadge } from '@/components/crm/SlaBadge';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { Can } from '@/rbac/can';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { getTicketInsights, getTickets, owners } from '@/api/crm';
import { relative } from '@/lib/format';
import type { Ticket, TicketPriority } from '@/types/crm';
import { TicketDetail } from './TicketDetail';

const PRIORITY_TONE: Record<TicketPriority, 'critical' | 'serious' | 'warning' | 'neutral'> = {
  Urgent: 'critical',
  High: 'serious',
  Normal: 'warning',
  Low: 'neutral',
};

const STATUS_TONE: Record<string, 'good' | 'primary' | 'warning' | 'neutral'> = {
  Open: 'warning',
  'In Progress': 'primary',
  'Waiting on Customer': 'neutral',
  Resolved: 'good',
  Closed: 'neutral',
};

export default function TicketsPage() {
  const { can, user } = useAuth();
  const [open, setOpen] = useState<Ticket | null>(null);

  const ownerFilter = can('ticket', 'viewAll') ? null : user.id;
  const { data = [], isLoading } = useQuery({
    queryKey: qk.crm.tickets({ ownerId: ownerFilter }),
    queryFn: () => getTickets({ ownerId: ownerFilter }),
  });
  const { data: insights } = useQuery({ queryKey: qk.crm.ticketInsights, queryFn: getTicketInsights });

  const columns = useMemo<ColumnDef<Ticket, unknown>[]>(
    () => [
      {
        id: 'refNo',
        accessorKey: 'refNo',
        header: 'Ticket',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-ink">{row.original.refNo}</span>
              {row.original.slaBreached && row.original.status !== 'Closed' && (
                <Tooltip content="SLA breached">
                  <AlertTriangle className="size-3 shrink-0 text-critical" aria-label="Breached" />
                </Tooltip>
              )}
            </div>
            <div className="max-w-72 truncate text-[11px] text-ink-muted">{row.original.subject}</div>
          </div>
        ),
      },
      {
        id: 'companyName',
        accessorKey: 'companyName',
        header: 'Company',
        cell: ({ row }) => (
          <div>
            <div className="max-w-48 truncate text-ink-secondary">{row.original.companyName}</div>
            {row.original.dispatchRefNo && (
              <div className="text-[11px] text-ink-muted">{row.original.dispatchRefNo}</div>
            )}
          </div>
        ),
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: 'Category',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue())}</span>,
      },
      {
        id: 'priority',
        accessorKey: 'priority',
        header: 'Priority',
        filterFn: arrIncludes,
        cell: ({ row }) => <Badge tone={PRIORITY_TONE[row.original.priority]}>{row.original.priority}</Badge>,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Status',
        filterFn: arrIncludes,
        cell: ({ getValue }) => (
          <Badge tone={STATUS_TONE[String(getValue())] ?? 'neutral'}>{String(getValue())}</Badge>
        ),
      },
      {
        id: 'sla',
        header: 'SLA',
        accessorFn: (t) => new Date(t.slaDueAt).getTime(),
        cell: ({ row }) => <SlaBadge ticket={row.original} />,
      },
      {
        id: 'ownerName',
        accessorKey: 'ownerName',
        header: 'Owner',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <OwnerChip name={String(getValue())} />,
      },
      {
        id: 'createdAt',
        accessorKey: 'createdAt',
        header: 'Raised',
        cell: ({ getValue }) => <span className="text-ink-secondary">{relative(getValue() as string)}</span>,
      },
      {
        id: 'csat',
        accessorKey: 'csat',
        header: 'CSAT',
        meta: { align: 'right' },
        cell: ({ getValue }) => {
          const v = getValue() as number | null;
          if (v === null) return <span className="text-ink-muted">—</span>;
          return (
            <span className={v >= 4 ? 'text-good' : v >= 3 ? 'text-warning' : 'text-critical'}>{v}/5</span>
          );
        },
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Support Tickets"
        description="Complaints and queries, ordered by what breaches first — not by what arrived first."
        actions={
          <Can module="ticket" action="create">
            <Button variant="primary">
              <Plus /> New ticket
            </Button>
          </Can>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="SLA breached"
          value={insights?.breached ?? 0}
          sublabel={`of ${insights?.open ?? 0} open`}
          loading={!insights}
          emphasis
        />
        <StatTile
          label="At risk"
          value={insights?.atRisk ?? 0}
          sublabel="Past 75% of the SLA window"
          hint="Warned before they breach, so someone can still act."
          loading={!insights}
        />
        <StatTile
          label="Avg resolution"
          value={`${insights?.avgResolutionHours ?? 0}h`}
          sublabel={`${insights?.resolvedThisWeek ?? 0} resolved this week`}
          loading={!insights}
        />
        <StatTile
          label="CSAT"
          value={insights ? `${insights.csat.toFixed(1)} / 5` : '—'}
          sublabel="Average rating given"
          loading={!insights}
        />
      </div>

      <div className="mt-5">
        <DataTable
          tableId="crm-tickets"
          columns={columns}
          data={data}
          loading={isLoading}
          onRowClick={setOpen}
          searchPlaceholder="Ticket no, subject or company…"
          emptyTitle="No tickets match"
          emptyDescription="Nothing is open in this view."
          defaultHiddenColumns={['csat']}
          facets={[
            {
              columnId: 'status',
              label: 'Status',
              options: ['Open', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed'].map((v) => ({
                value: v,
                label: v,
              })),
            },
            {
              columnId: 'priority',
              label: 'Priority',
              options: ['Urgent', 'High', 'Normal', 'Low'].map((v) => ({ value: v, label: v })),
            },
            {
              columnId: 'category',
              label: 'Category',
              options: [
                'Quality Complaint',
                'Short Delivery',
                'Delayed Dispatch',
                'Invoice / Billing',
                'Payment Issue',
                'Documentation',
                'Platform / App',
                'Other',
              ].map((v) => ({ value: v, label: v })),
            },
            {
              columnId: 'ownerName',
              label: 'Owner',
              options: owners().map((o) => ({ value: o.name, label: o.name })),
            },
          ]}
          actions={
            insights ? (
              <Badge tone="outline">
                {insights.csat >= 4 ? <Smile /> : <LifeBuoy />} {insights.open} open
              </Badge>
            ) : null
          }
        />
      </div>

      {open && <TicketDetail ticket={open} onClose={() => setOpen(null)} />}
    </>
  );
}

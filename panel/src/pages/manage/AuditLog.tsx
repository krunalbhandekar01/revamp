import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { Can } from '@/rbac/can';
import { qk } from '@/api/client';
import { getAuditLog } from '@/api/crm';
import { relative, shortDateTime } from '@/lib/format';
import type { AuditEntry } from '@/types/crm';

/**
 * Audit log.
 *
 * Field-level before and after, so a disputed change is reconstructable rather
 * than argued about. This is the record that makes separation of duties on
 * money and access enforceable after the fact.
 */
export default function AuditLogPage() {
  const { data = [], isLoading } = useQuery({ queryKey: qk.crm.audit(), queryFn: () => getAuditLog() });

  const columns = useMemo<ColumnDef<AuditEntry, unknown>[]>(
    () => [
      {
        id: 'at',
        accessorKey: 'at',
        header: 'When',
        cell: ({ getValue }) => (
          <Tooltip content={shortDateTime(getValue() as string)}>
            <span className="cursor-help text-ink-secondary">{relative(getValue() as string)}</span>
          </Tooltip>
        ),
      },
      {
        id: 'actorName',
        accessorKey: 'actorName',
        header: 'Who',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <OwnerChip name={String(getValue())} />,
      },
      {
        id: 'action',
        accessorKey: 'action',
        header: 'Action',
        cell: ({ getValue }) => <span className="text-ink">{String(getValue())}</span>,
      },
      {
        id: 'module',
        accessorKey: 'module',
        header: 'Module',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <Badge tone="outline">{String(getValue())}</Badge>,
      },
      {
        id: 'recordRef',
        accessorKey: 'recordRef',
        header: 'Record',
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] text-ink-secondary">{String(getValue())}</span>
        ),
      },
      {
        id: 'changes',
        header: 'Change',
        enableSorting: false,
        accessorFn: (a) => a.changes.map((c) => c.field).join(', '),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            {row.original.changes.map((c, i) => (
              <div key={i} className="flex flex-wrap items-baseline gap-1.5 text-[11px]">
                <span className="font-mono text-ink-muted">{c.field}</span>
                <span className="rounded bg-critical-soft px-1 text-critical line-through">{c.from}</span>
                <span className="text-ink-muted">→</span>
                <span className="rounded bg-good-soft px-1 text-good">{c.to}</span>
              </div>
            ))}
          </div>
        ),
      },
      {
        id: 'ip',
        accessorKey: 'ip',
        header: 'IP',
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] text-ink-muted">{String(getValue())}</span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Every change to a record, with the value before and after it. Append-only."
        actions={
          <Can module="audit" action="export">
            <Button variant="outline">
              <Download /> Export
            </Button>
          </Can>
        }
      />

      <DataTable
        tableId="audit-log"
        columns={columns}
        data={data}
        loading={isLoading}
        searchPlaceholder="Person, action or record id…"
        emptyTitle="No audit entries match"
        defaultHiddenColumns={['ip']}
        facets={[
          {
            columnId: 'module',
            label: 'Module',
            options: [
              'Deals',
              'Quotes',
              'Leads',
              'Tickets',
              'Businesses',
              'Team',
              'Treasury',
              'Contacts',
              'Data Import',
            ].map((v) => ({ value: v, label: v })),
          },
        ]}
        actions={
          <Badge tone="outline">
            <ShieldCheck /> Append-only
          </Badge>
        }
      />
    </>
  );
}

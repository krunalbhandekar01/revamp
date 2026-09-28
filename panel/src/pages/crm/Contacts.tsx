import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Mail, MessageCircle, Phone, Star, Upload, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes, selectionColumn } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/rbac/can';
import { qk } from '@/api/client';
import { getContacts } from '@/api/crm';
import { relative } from '@/lib/format';
import type { Contact } from '@/types/crm';

export default function ContactsPage() {
  const { data = [], isLoading } = useQuery({ queryKey: qk.crm.contacts(), queryFn: () => getContacts() });

  const stats = useMemo(
    () => ({
      total: data.length,
      companies: new Set(data.map((c) => c.companyId)).size,
      decisionMakers: data.filter((c) => c.role === 'Decision Maker').length,
      stale: data.filter(
        (c) => !c.lastContactedAt || Date.now() - new Date(c.lastContactedAt).getTime() > 90 * 86_400_000,
      ).length,
    }),
    [data],
  );

  const columns = useMemo<ColumnDef<Contact, unknown>[]>(
    () => [
      selectionColumn<Contact>(),
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Contact',
        cell: ({ row }) => (
          <div className="py-1">
            <div className="flex items-center gap-1.5">
              <span className="max-w-48 truncate font-medium text-ink">{row.original.name}</span>
              {row.original.isPrimary && (
                <Tooltip content="Primary contact for this company">
                  <Star className="size-3 shrink-0 fill-warning text-warning" aria-label="Primary" />
                </Tooltip>
              )}
            </div>
            <div className="truncate text-[11px] text-ink-muted">
              {row.original.designation} · {row.original.department}
            </div>
          </div>
        ),
      },
      {
        id: 'companyName',
        accessorKey: 'companyName',
        header: 'Company',
        cell: ({ row }) => (
          <Link
            to={`/business/${row.original.companyId}`}
            onClick={(e) => e.stopPropagation()}
            className="block max-w-56 truncate text-ink-secondary hover:text-primary hover:underline"
          >
            {row.original.companyName}
          </Link>
        ),
      },
      {
        id: 'role',
        accessorKey: 'role',
        header: 'Role',
        filterFn: arrIncludes,
        cell: ({ getValue }) => (
          <Badge tone={getValue() === 'Decision Maker' ? 'primary' : 'outline'}>{String(getValue())}</Badge>
        ),
      },
      {
        id: 'contact',
        header: 'Reach',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Tooltip content={row.original.phone}>
              <Button variant="ghost" size="icon-sm" asChild onClick={(e) => e.stopPropagation()}>
                <a href={`tel:${row.original.phone}`} aria-label="Call">
                  <Phone />
                </a>
              </Button>
            </Tooltip>
            <Tooltip content={row.original.email}>
              <Button variant="ghost" size="icon-sm" asChild onClick={(e) => e.stopPropagation()}>
                <a href={`mailto:${row.original.email}`} aria-label="Email">
                  <Mail />
                </a>
              </Button>
            </Tooltip>
            <Tooltip content={`WhatsApp ${row.original.whatsapp}`}>
              <Button variant="ghost" size="icon-sm" asChild onClick={(e) => e.stopPropagation()}>
                <a
                  href={`https://wa.me/${row.original.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="WhatsApp"
                >
                  <MessageCircle />
                </a>
              </Button>
            </Tooltip>
          </div>
        ),
      },
      {
        id: 'email',
        accessorKey: 'email',
        header: 'Email',
        cell: ({ getValue }) => (
          <span className="block max-w-48 truncate text-ink-secondary">{String(getValue())}</span>
        ),
      },
      {
        id: 'phone',
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ getValue }) => <span className="tnum text-ink-secondary">{String(getValue())}</span>,
      },
      {
        id: 'lastContactedAt',
        accessorKey: 'lastContactedAt',
        header: 'Last contacted',
        cell: ({ getValue }) => {
          const v = getValue() as string | null;
          if (!v) return <span className="text-warning">Never</span>;
          const stale = Date.now() - new Date(v).getTime() > 90 * 86_400_000;
          return <span className={stale ? 'text-warning' : 'text-ink-secondary'}>{relative(v)}</span>;
        },
      },
      {
        id: 'optedOutOfMarketing',
        accessorKey: 'optedOutOfMarketing',
        header: 'Marketing',
        cell: ({ getValue }) =>
          getValue() ? (
            <Tooltip content="Opted out — exclude from all campaign sends">
              <span>
                <Badge tone="critical">Opted out</Badge>
              </span>
            </Tooltip>
          ) : (
            <span className="text-[11px] text-ink-muted">Subscribed</span>
          ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Contacts"
        description="The people behind each account — who decides, who pays, and who to call when a load is late."
        actions={
          <>
            <Can module="contact" action="import">
              <Button variant="outline" asChild>
                <Link to="/manage/import">
                  <Upload /> Import
                </Link>
              </Button>
            </Can>
            <Can module="contact" action="export">
              <Button variant="outline">
                <Download /> Export
              </Button>
            </Can>
            <Can module="contact" action="create">
              <Button variant="primary">
                <UserPlus /> New contact
              </Button>
            </Can>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Contacts" value={stats.total} loading={isLoading} />
        <StatTile label="Companies covered" value={stats.companies} loading={isLoading} />
        <StatTile label="Decision makers" value={stats.decisionMakers} loading={isLoading} />
        <StatTile
          label="Not contacted in 90d"
          value={stats.stale}
          sublabel="Relationship going cold"
          loading={isLoading}
          emphasis
        />
      </div>

      <div className="mt-5">
        <DataTable
          tableId="crm-contacts"
          columns={columns}
          data={data}
          loading={isLoading}
          enableSelection
          searchPlaceholder="Name, company, email or phone…"
          emptyTitle="No contacts match"
          defaultHiddenColumns={['email', 'phone']}
          facets={[
            {
              columnId: 'role',
              label: 'Role',
              options: ['Decision Maker', 'Influencer', 'Procurement', 'Finance', 'Operations', 'Other'].map(
                (v) => ({ value: v, label: v }),
              ),
            },
          ]}
          bulkActions={(rows, clear) => (
            <div className="flex items-center gap-1.5">
              <Can module="campaign" action="create">
                <Button variant="primary" size="sm" onClick={clear}>
                  Add {rows.length} to a segment
                </Button>
              </Can>
              <Can module="contact" action="export">
                <Button variant="outline" size="sm" onClick={clear}>
                  <Download /> Export
                </Button>
              </Can>
            </div>
          )}
        />
      </div>
    </>
  );
}

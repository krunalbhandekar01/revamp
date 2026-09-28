import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Lock, ShieldAlert, SlidersHorizontal, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { arrIncludes } from '@/components/data-table/columns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/rbac/can';
import { ROLES, ROLE_BY_KEY, diffFromTemplate, grantedCount, resolvePermissions } from '@/rbac/roles';
import { countPermissions } from '@/rbac/registry';
import { qk } from '@/api/client';
import { getTeam } from '@/api/operations';
import { initials, relative } from '@/lib/format';
import type { Moderator, RoleKey } from '@/types/domain';
import { PermissionEditor } from './PermissionEditor';

/**
 * Team & Access.
 *
 * The legacy editor is 1,420 lines of hand-ticked checkboxes across 37 modules
 * and 184 (module, action) pairs, with no template and no diff — onboarding a
 * finance analyst means a human getting a subset of those right from memory.
 *
 * Here a role is a template, per-user overrides are explicit and shown as a
 * diff, and the whole grid is generated from the canonical registry so the UI
 * can never drift from what the server will accept.
 */
export default function TeamPage() {
  const { data = [], isLoading } = useQuery({ queryKey: qk.team.list, queryFn: getTeam });
  const [editing, setEditing] = useState<Moderator | null>(null);
  const totals = countPermissions();

  const columns = useMemo<ColumnDef<Moderator, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Member',
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5 py-1">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[10px] font-semibold text-ink-secondary">
              {initials(row.original.name)}
            </span>
            <span className="min-w-0">
              <span className="block max-w-48 truncate font-medium text-ink">{row.original.name}</span>
              <span className="block max-w-48 truncate text-[11px] text-ink-muted">{row.original.email}</span>
            </span>
          </div>
        ),
      },
      {
        id: 'role',
        accessorKey: 'role',
        header: 'Role',
        filterFn: arrIncludes,
        cell: ({ row }) => {
          const role = ROLE_BY_KEY[row.original.role as RoleKey];
          return (
            <Tooltip content={role?.description}>
              <span className="cursor-help">
                <Badge tone={row.original.role === 'super-admin' ? 'primary' : 'outline'}>
                  {role?.label ?? row.original.role}
                </Badge>
              </span>
            </Tooltip>
          );
        },
      },
      {
        id: 'access',
        header: 'Effective access',
        meta: { align: 'right' },
        accessorFn: (m) => grantedCount(resolvePermissions(m.role as RoleKey, m.overrides)),
        cell: ({ row }) => {
          const granted = grantedCount(resolvePermissions(row.original.role as RoleKey, row.original.overrides));
          return (
            <span className="tnum text-ink-secondary">
              {granted}
              <span className="text-ink-muted"> / {totals.pairs}</span>
            </span>
          );
        },
      },
      {
        id: 'overrides',
        header: 'Deviations',
        accessorFn: (m) => diffFromTemplate(m.role as RoleKey, m.overrides).length,
        cell: ({ row }) => {
          const diff = diffFromTemplate(row.original.role as RoleKey, row.original.overrides);
          if (diff.length === 0) return <span className="text-[11px] text-ink-muted">Matches template</span>;
          const sensitive = diff.filter((d) => d.sensitive && d.effectiveValue);
          return (
            <Tooltip
              content={
                <div className="space-y-0.5">
                  {diff.slice(0, 6).map((d) => (
                    <div key={`${d.moduleKey}:${d.action}`}>
                      {d.effectiveValue ? '+' : '−'} {d.moduleLabel} · {d.actionLabel}
                    </div>
                  ))}
                  {diff.length > 6 && <div className="text-ink-muted">+{diff.length - 6} more</div>}
                </div>
              }
            >
              <span className="inline-flex cursor-help items-center gap-1">
                <Badge tone={sensitive.length > 0 ? 'serious' : 'warning'}>
                  {sensitive.length > 0 && <ShieldAlert />}
                  {diff.length} override{diff.length === 1 ? '' : 's'}
                </Badge>
              </span>
            </Tooltip>
          );
        },
      },
      {
        id: 'zones',
        header: 'Scope',
        accessorFn: (m) => m.zones.join(', '),
        cell: ({ row }) => (
          <span className="text-[11px] text-ink-secondary">
            {row.original.zones.join(', ') || '—'}
            {row.original.operation && <span className="text-ink-muted"> · {row.original.operation}</span>}
          </span>
        ),
      },
      {
        id: 'lastLoginAt',
        accessorKey: 'lastLoginAt',
        header: 'Last seen',
        cell: ({ getValue }) => (
          <span className="text-ink-secondary">{getValue() ? relative(getValue() as string) : 'Never'}</span>
        ),
      },
      {
        id: 'deactivated',
        accessorKey: 'deactivated',
        header: 'Status',
        cell: ({ getValue }) =>
          getValue() ? <Badge tone="neutral">Deactivated</Badge> : <Badge tone="good">Active</Badge>,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        meta: { align: 'right' },
        cell: ({ row }) => (
          <Can
            module="team"
            action="managePermissions"
            fallback={
              <Tooltip content="You can view the team but not change access.">
                <span className="inline-flex">
                  <Button variant="ghost" size="icon-sm" disabled aria-label="Permissions locked">
                    <Lock />
                  </Button>
                </span>
              </Tooltip>
            }
          >
            <Button variant="outline" size="sm" onClick={() => setEditing(row.original)}>
              <SlidersHorizontal /> Access
            </Button>
          </Can>
        ),
      },
    ],
    [totals.pairs],
  );

  return (
    <>
      <PageHeader
        title="Team & Access"
        description={`${totals.modules} modules, ${totals.pairs} permissions, ${totals.sensitive} of them sensitive. A role sets the template; overrides are shown explicitly.`}
        actions={
          <Can module="team" action="create">
            <Button variant="primary">
              <UserPlus /> Add member
            </Button>
          </Can>
        }
      />

      <DataTable
        tableId="team"
        columns={columns}
        data={data}
        loading={isLoading}
        searchPlaceholder="Name or email…"
        emptyTitle="No team members match"
        facets={[
          {
            columnId: 'role',
            label: 'Role',
            options: ROLES.map((r) => ({ value: r.key, label: r.label })),
          },
        ]}
      />

      {editing && <PermissionEditor member={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

import { Menu, Monitor, Moon, Search, ShieldCheck, Sun, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/rbac/auth';
import { ROLE_BY_KEY, grantedCount } from '@/rbac/roles';
import { countPermissions } from '@/rbac/registry';
import { useTheme } from '@/hooks/useTheme';
import { initials } from '@/lib/format';
import type { RoleKey } from '@/types/domain';

export function Topbar({
  onOpenCommand,
  onOpenMobileNav,
}: {
  onOpenCommand: () => void;
  onOpenMobileNav: () => void;
}) {
  const { user, availableUsers, switchUser, permissions } = useAuth();
  const { choice, cycle } = useTheme();

  const ThemeIcon = choice === 'light' ? Sun : choice === 'dark' ? Moon : Monitor;
  const role = ROLE_BY_KEY[user.role as RoleKey];
  const totals = countPermissions();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface-2 px-3 sm:px-4">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMobileNav} aria-label="Open menu">
        <Menu />
      </Button>

      <button
        type="button"
        onClick={onOpenCommand}
        className="group flex h-8.5 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border border-line bg-surface-1 px-2.5 text-left text-[13px] text-ink-muted transition-colors hover:bg-surface-3 sm:max-w-sm"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="flex-1 truncate">Search or jump to…</span>
        <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-px font-mono text-[10px] sm:block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Demo affordance: switch identity to see the permission model work. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="md" className="gap-2">
              <UserCog className="text-ink-muted" />
              <span className="hidden max-w-32 truncate sm:inline">{role?.label ?? user.role}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>View the panel as…</DropdownMenuLabel>
            <div className="px-2 pb-1.5 text-[11px] leading-relaxed text-ink-muted">
              Demo only. In production this comes from <code className="font-mono">/user/me</code>. Every
              screen, nav item and action below re-gates instantly.
            </div>
            <DropdownMenuSeparator />
            {availableUsers.map((u) => {
              const r = ROLE_BY_KEY[u.role as RoleKey];
              return (
                <DropdownMenuItem key={u.id} onSelect={() => switchUser(u.id)} className="items-start gap-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[10px] font-semibold text-ink-secondary">
                    {initials(u.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink">{u.name}</span>
                    <span className="block truncate text-[11px] text-ink-muted">{r?.label ?? u.role}</span>
                  </span>
                  {u.id === user.id && <Badge tone="primary">Current</Badge>}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip content={`Theme: ${choice}`}>
          <Button variant="ghost" size="icon" onClick={cycle} aria-label={`Theme: ${choice}. Click to change.`}>
            <ThemeIcon />
          </Button>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
                {initials(user.name)}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-2">
              <div className="text-[13px] font-medium text-ink">{user.name}</div>
              <div className="truncate text-[11px] text-ink-muted">{user.email}</div>
              <div className="mt-1.5 text-[11px] text-ink-secondary">{user.jobTitle}</div>
            </div>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-secondary">
                <ShieldCheck className="size-3.5" /> Effective access
              </div>
              <div className="tnum text-[11px] text-ink-muted">
                {grantedCount(permissions)} of {totals.pairs} permissions across {totals.modules} modules
              </div>
              {user.zones.length > 0 && (
                <div className="mt-1 text-[11px] text-ink-muted">Zones: {user.zones.join(', ')}</div>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

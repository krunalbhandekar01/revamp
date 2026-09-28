import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV } from '@/config/nav';
import { useAuth } from '@/rbac/auth';
import { Tooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn, sumBy } from '@/lib/utils';
import { qk } from '@/api/client';
import { getDispatchExceptions, getReconHealth } from '@/api/operations';
import { getAllocationQueue } from '@/api/treasury';
import { getActivities, getLeadInsights, getTicketInsights } from '@/api/crm';

export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const { can } = useAuth();

  // Badge counts. These are cheap reads that every screen already warms.
  const { data: exceptions } = useQuery({
    queryKey: qk.dispatches.exceptions,
    queryFn: getDispatchExceptions,
    enabled: can('dispatch', 'view'),
  });
  const { data: recon } = useQuery({
    queryKey: qk.recon.health,
    queryFn: getReconHealth,
    enabled: can('reconciliation', 'view'),
  });
  const { data: queue } = useQuery({
    queryKey: qk.treasury.queue(),
    queryFn: () => getAllocationQueue(),
    enabled: can('treasury', 'view'),
  });
  const { data: leadInsights } = useQuery({
    queryKey: qk.crm.leadInsights,
    queryFn: getLeadInsights,
    enabled: can('lead', 'view'),
  });
  const { data: overdueActivities } = useQuery({
    queryKey: qk.crm.activities({ window: 'overdue' }),
    queryFn: () => getActivities({ window: 'overdue' }),
    enabled: can('activity', 'view'),
  });
  const { data: ticketInsights } = useQuery({
    queryKey: qk.crm.ticketInsights,
    queryFn: getTicketInsights,
    enabled: can('ticket', 'view'),
  });

  const badges = {
    exceptions: exceptions ? sumBy(exceptions, (g) => g.count) : 0,
    unmatched: recon ? recon.unmatched + recon.failed : 0,
    queue: queue ? queue.filter((q) => q.state === 'queued').length : 0,
    leads: leadInsights ? leadInsights.overdueFollowUps : 0,
    activities: overdueActivities ? overdueActivities.length : 0,
    tickets: ticketInsights ? ticketInsights.breached : 0,
  };

  const sections = NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(item.module, item.action ?? 'view')),
  })).filter((s) => s.items.length > 0);

  return (
    <nav
      className={cn(
        'flex h-full flex-col border-r border-line bg-surface-2 transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-[232px]',
      )}
      aria-label="Main"
    >
      <div className={cn('flex h-14 shrink-0 items-center gap-2 px-3', collapsed && 'justify-center px-0')}>
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-fg">
          B
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-ink">BuyoFuel</div>
            <div className="truncate text-[10px] text-ink-muted">Operations Panel</div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {sections.map((section) => (
          <div key={section.label} className="mb-4 last:mb-0">
            {!collapsed && (
              <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                {section.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const count = item.badgeKey ? badges[item.badgeKey] : 0;
                const link = (
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-primary-soft font-medium text-primary'
                          : 'text-ink-secondary hover:bg-surface-3 hover:text-ink',
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && count > 0 && (
                      <span className="tnum rounded-full bg-serious-soft px-1.5 py-px text-[10px] font-semibold text-serious">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                    {collapsed && count > 0 && (
                      <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-serious" aria-hidden />
                    )}
                  </NavLink>
                );
                return (
                  <li key={item.to} className="relative">
                    {collapsed ? (
                      <Tooltip content={item.label} side="right">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-line p-2">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'md'}
          onClick={onToggle}
          className={cn('w-full', collapsed && 'w-auto')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          {!collapsed && <span className="flex-1 text-left">Collapse</span>}
        </Button>
      </div>
    </nav>
  );
}

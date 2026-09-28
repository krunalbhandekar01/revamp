import { useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, CornerDownLeft, Moon, Search, Sun, Truck } from 'lucide-react';
import { NAV_FLAT } from '@/config/nav';
import { useAuth } from '@/rbac/auth';
import { useTheme } from '@/hooks/useTheme';
import { qk } from '@/api/client';
import { getBusinesses, getDispatches } from '@/api/operations';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

/**
 * ⌘K — navigate anywhere and jump to any record without learning the menu.
 * With 60+ screens this is the difference between a panel someone tolerates
 * and one they are fast in.
 */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const { setChoice } = useTheme();
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query, 200);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  const pages = useMemo(
    () => NAV_FLAT.filter((item) => can(item.module, item.action ?? 'view')),
    [can],
  );

  const shouldSearchRecords = search.trim().length >= 2;

  const { data: businesses } = useQuery({
    queryKey: qk.business.list({ search, palette: true }),
    queryFn: () => getBusinesses({ search }),
    enabled: open && shouldSearchRecords && can('business', 'view'),
  });

  const { data: dispatches } = useQuery({
    queryKey: qk.dispatches.list({ search, palette: true }),
    queryFn: () => getDispatches({ search }),
    enabled: open && shouldSearchRecords && can('dispatch', 'view'),
  });

  const go = (to: string) => {
    onOpenChange(false);
    setQuery('');
    navigate(to);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center bg-black/45 px-4 pt-[12vh] backdrop-blur-[1px]"
      onClick={() => onOpenChange(false)}
    >
      <Command
        label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface-2 shadow-2xl animate-in-soft"
        onClick={(e) => e.stopPropagation()}
        shouldFilter={!shouldSearchRecords}
      >
        <div className="flex items-center gap-2 border-b border-line px-3">
          <Search className="size-4 shrink-0 text-ink-muted" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search screens, businesses, dispatches…"
            className="h-11 w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted"
          />
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-muted sm:block">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-80 overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-6 text-center text-xs text-ink-muted">
            Nothing matches “{query}”.
          </Command.Empty>

          <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-muted">
            {pages.map((item) => (
              <Item key={item.to} onSelect={() => go(item.to)}>
                <item.icon className="size-4 text-ink-muted" />
                <span className="flex-1">{item.label}</span>
                {item.description && (
                  <span className="hidden truncate text-[11px] text-ink-muted sm:block">
                    {item.description}
                  </span>
                )}
              </Item>
            ))}
          </Command.Group>

          {shouldSearchRecords && businesses && businesses.length > 0 && (
            <Command.Group heading="Businesses" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-muted">
              {businesses.slice(0, 5).map((b) => (
                <Item key={b.id} onSelect={() => go(`/business/${b.id}`)}>
                  <Building2 className="size-4 text-ink-muted" />
                  <span className="flex-1 truncate">{b.name}</span>
                  <span className="text-[11px] text-ink-muted">{b.city}</span>
                </Item>
              ))}
            </Command.Group>
          )}

          {shouldSearchRecords && dispatches && dispatches.length > 0 && (
            <Command.Group heading="Dispatches" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-muted">
              {dispatches.slice(0, 5).map((d) => (
                <Item key={d.id} onSelect={() => go('/dispatches')}>
                  <Truck className="size-4 text-ink-muted" />
                  <span className="flex-1 truncate">
                    {d.refNo} · {d.buyerName}
                  </span>
                  <span className="text-[11px] text-ink-muted">{d.vehicleNo}</span>
                </Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Theme" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-muted">
            <Item onSelect={() => { setChoice('light'); onOpenChange(false); }}>
              <Sun className="size-4 text-ink-muted" /> Light theme
            </Item>
            <Item onSelect={() => { setChoice('dark'); onOpenChange(false); }}>
              <Moon className="size-4 text-ink-muted" /> Dark theme
            </Item>
          </Command.Group>
        </Command.List>

        <div className="flex items-center gap-3 border-t border-line px-3 py-2 text-[11px] text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="size-3" /> to open
          </span>
          <span>↑↓ to navigate</span>
        </div>
      </Command>
    </div>
  );
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-[13px] text-ink transition-colors data-[selected=true]:bg-surface-3"
    >
      {children}
    </Command.Item>
  );
}

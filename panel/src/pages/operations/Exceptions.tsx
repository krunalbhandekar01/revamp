import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { qk } from '@/api/client';
import { getDispatchExceptions } from '@/api/operations';
import { relative, shortDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * The exception workspace.
 *
 * Ops staff currently scan a 3,000-row table looking for problems. This
 * inverts it: each group is one rule, sorted by severity, with the rows that
 * broke it and one action. The table is still there when you need it — this
 * is what you open first.
 */
export default function ExceptionsPage() {
  const { data: groups = [], isLoading } = useQuery({
    queryKey: qk.dispatches.exceptions,
    queryFn: getDispatchExceptions,
  });
  const [openKey, setOpenKey] = useState<string | null>(null);

  const total = groups.reduce((n, g) => n + g.count, 0);

  return (
    <>
      <PageHeader
        title="Exceptions"
        description={
          isLoading
            ? 'Checking what needs a human today…'
            : total === 0
              ? 'Nothing is stuck.'
              : `${total} items need a human today, grouped by what went wrong.`
        }
        actions={
          <Button variant="outline" asChild>
            <Link to="/dispatches">
              Open full dispatch table <ArrowRight />
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CheckCircle2 className="size-5 text-good" />}
            title="Queue is clear"
            description="No dispatches are missing documents, stuck in transit, or unsynced with Zoho."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const open = openKey === group.key;
            const tone =
              group.severity === 'critical' ? 'critical' : group.severity === 'serious' ? 'serious' : 'warning';
            return (
              <Card key={group.key}>
                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : group.key)}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-3"
                  aria-expanded={open}
                >
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full',
                      tone === 'critical' && 'bg-critical-soft text-critical',
                      tone === 'serious' && 'bg-serious-soft text-serious',
                      tone === 'warning' && 'bg-warning-soft text-warning',
                    )}
                  >
                    <AlertTriangle className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">{group.label}</span>
                      <Badge tone={tone}>{group.count}</Badge>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-secondary">
                      {group.description}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn('size-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')}
                  />
                </button>

                {open && (
                  <CardContent className="border-t border-line pt-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px] [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
                        <thead>
                          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                            <th className="px-3 py-1.5 text-left font-semibold">Dispatch</th>
                            <th className="px-3 py-1.5 text-left font-semibold">Buyer</th>
                            <th className="px-3 py-1.5 text-left font-semibold">Seller</th>
                            <th className="px-3 py-1.5 text-left font-semibold">Status</th>
                            <th className="px-3 py-1.5 text-left font-semibold">Dispatched</th>
                            <th className="px-3 py-1.5 text-right font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.slice(0, 12).map((d) => (
                            <tr key={d.id} className="border-b border-line last:border-0">
                              <td className="px-3 py-2">
                                <div className="font-medium text-ink">{d.refNo}</div>
                                <div className="text-[11px] text-ink-muted">{d.vehicleNo}</div>
                              </td>
                              <td className="max-w-44 truncate px-3 py-2 text-ink-secondary">{d.buyerName}</td>
                              <td className="max-w-44 truncate px-3 py-2 text-ink-secondary">{d.sellerName}</td>
                              <td className="px-3 py-2">
                                <StatusBadge status={d.transitStatus} />
                              </td>
                              <td className="px-3 py-2 text-ink-secondary">
                                {d.dispatchedOn ? (
                                  <>
                                    {shortDate(d.dispatchedOn)}
                                    <div className="text-[11px] text-ink-muted">{relative(d.dispatchedOn)}</div>
                                  </>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <Button variant="outline" size="sm">
                                  Resolve
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {group.count > 12 && (
                      <p className="mt-3 text-xs text-ink-muted">
                        Showing 12 of {group.count}. Open the dispatch table to work through the rest.
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

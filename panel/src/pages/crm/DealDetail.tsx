import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, CalendarClock, CheckCircle2, Trophy, UserRound, XCircle } from 'lucide-react';
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Meter } from '@/components/ui/progress';
import { Money } from '@/components/common/Money';
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { Can } from '@/rbac/can';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { completeActivity, getTimeline, moveDealStage } from '@/api/crm';
import { moneyCompact, percent, qty, relative, shortDate } from '@/lib/format';
import type { Deal, Pipeline } from '@/types/crm';
import { CloseDealDialog } from './CloseDealDialog';

export function DealDetail({
  deal,
  pipeline,
  onClose,
}: {
  deal: Deal;
  pipeline: Pipeline | undefined;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { can } = useAuth();
  const [closing, setClosing] = useState<'won' | 'lost' | null>(null);

  const { data: timeline = [] } = useQuery({
    queryKey: qk.crm.timeline(deal.id),
    queryFn: () => getTimeline(deal.id),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['crm'] });
  const move = useMutation({ mutationFn: (stage: string) => moveDealStage(deal.id, stage), onSuccess: invalidate });
  const complete = useMutation({ mutationFn: completeActivity, onSuccess: invalidate });

  const stage = pipeline?.stages.find((s) => s.key === deal.stage);
  const daysInStage = Math.floor((Date.now() - new Date(deal.stageEnteredAt).getTime()) / 86_400_000);
  const stale = stage ? daysInStage > stage.staleAfterDays : false;
  const closed = deal.closedAt !== null;
  const lineTotal = deal.lines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);

  return (
    <>
      <Sheet open onOpenChange={(v) => !v && onClose()}>
        <SheetContent width="lg" className="gap-0">
          <SheetHeader>
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle>{deal.title}</SheetTitle>
              <Badge tone="outline">{deal.refNo}</Badge>
              {deal.wonReason && (
                <Badge tone="good">
                  <Trophy /> Won
                </Badge>
              )}
              {deal.lostReason && (
                <Badge tone="critical">
                  <XCircle /> Lost
                </Badge>
              )}
              {stale && !closed && <Badge tone="serious">Stale {daysInStage}d</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3" /> {deal.companyName}
              </span>
              {deal.primaryContactName && (
                <span className="inline-flex items-center gap-1">
                  <UserRound className="size-3" /> {deal.primaryContactName}
                </span>
              )}
              <span>Source: {deal.source}</span>
              <span>Created {relative(deal.createdAt)}</span>
            </div>
          </SheetHeader>

          <SheetBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Deal value" value={moneyCompact(deal.value)} emphasis />
              <Stat label="Expected margin" value={moneyCompact(deal.expectedMargin)} />
              <Stat
                label="Weighted"
                value={moneyCompact(Math.round((deal.value * deal.probability) / 100))}
                hint={`${deal.probability}% probability`}
              />
            </div>

            {!closed && pipeline && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Stage</span>
                  <span className="text-[11px] text-ink-muted">{daysInStage}d in stage</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {pipeline.stages
                    .filter((s) => s.kind === 'open')
                    .map((s) => {
                      const active = deal.stage === s.key;
                      const idx = pipeline.stages.indexOf(s);
                      const cur = pipeline.stages.findIndex((x) => x.key === deal.stage);
                      return (
                        <button
                          key={s.key}
                          type="button"
                          disabled={!can('deal', 'changeStage')}
                          onClick={() => move.mutate(s.key)}
                          className={
                            active
                              ? 'cursor-pointer rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-fg'
                              : idx < cur
                                ? 'cursor-pointer rounded-md bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary'
                                : 'cursor-pointer rounded-md bg-surface-3 px-2.5 py-1 text-xs font-medium text-ink-secondary hover:bg-surface-inset'
                          }
                        >
                          {s.label}
                        </button>
                      );
                    })}
                </div>
                <Meter value={deal.probability} className="mt-2.5" label="Win probability" />
              </div>
            )}

            {deal.nextStep && !closed && (
              <div className="rounded-lg border border-line bg-surface-3 p-2.5">
                <div className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Next step</div>
                <div className="mt-0.5 text-[13px] text-ink">{deal.nextStep}</div>
              </div>
            )}

            {closed && (deal.lostReason || deal.wonReason) && (
              <div
                className={
                  deal.wonReason
                    ? 'rounded-lg border border-good/30 bg-good-soft p-3 text-xs text-good'
                    : 'rounded-lg border border-critical/30 bg-critical-soft p-3 text-xs text-critical'
                }
              >
                <div className="font-medium">
                  {deal.wonReason ? `Won — ${deal.wonReason}` : `Lost — ${deal.lostReason}`}
                </div>
                {deal.lostToCompetitor && <div className="mt-0.5">Lost to {deal.lostToCompetitor}</div>}
                <div className="mt-0.5 opacity-80">Closed {shortDate(deal.closedAt)}</div>
              </div>
            )}

            <Separator />

            <Tabs defaultValue="products">
              <TabsList>
                <TabsTrigger value="products">Products ({deal.lines.length})</TabsTrigger>
                <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="products">
                {deal.lines.length === 0 ? (
                  <p className="text-xs text-ink-secondary">
                    No products attached yet. Add them here or build a quotation from this deal.
                  </p>
                ) : (
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                        <th className="py-1.5 text-left font-semibold">Product</th>
                        <th className="px-3 py-1.5 text-right font-semibold">Qty</th>
                        <th className="px-3 py-1.5 text-right font-semibold">Rate</th>
                        <th className="py-1.5 text-right font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deal.lines.map((l) => (
                        <tr key={l.id} className="border-b border-line last:border-0">
                          <td className="py-2 text-ink">{l.productName}</td>
                          <td className="tnum px-3 py-2 text-right text-ink-secondary">
                            {qty(l.quantity, l.unit)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Money value={l.unitPrice} />
                          </td>
                          <td className="py-2 text-right">
                            <Money value={l.unitPrice * l.quantity} />
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} className="py-2 text-right text-[11px] uppercase tracking-wide text-ink-muted">
                          Line total
                        </td>
                        <td className="py-2 text-right font-semibold">
                          <Money value={lineTotal} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </TabsContent>

              <TabsContent value="timeline">
                <ActivityTimeline
                  activities={timeline}
                  canComplete={can('activity', 'update')}
                  onComplete={(id) => complete.mutate(id)}
                />
              </TabsContent>

              <TabsContent value="details">
                <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
                  <Detail label="Owner" value={<OwnerChip name={deal.ownerName} />} />
                  <Detail
                    label="Expected close"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="size-3.5 text-ink-muted" />
                        {shortDate(deal.expectedCloseDate)}
                      </span>
                    }
                  />
                  <Detail label="Probability" value={percent(deal.probability, 0)} />
                  <Detail label="Pipeline" value={pipeline?.name ?? '—'} />
                  <Detail label="Margin %" value={percent(deal.value ? (deal.expectedMargin / deal.value) * 100 : 0)} />
                  <Detail label="Stage entered" value={shortDate(deal.stageEnteredAt)} />
                </dl>
                {deal.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {deal.tags.map((t) => (
                      <Badge key={t} tone="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </SheetBody>

          {!closed && (
            <SheetFooter>
              <Can module="deal" action="close">
                <Button variant="ghost" onClick={() => setClosing('lost')}>
                  <XCircle /> Mark lost
                </Button>
                <Button variant="primary" onClick={() => setClosing('won')}>
                  <CheckCircle2 /> Mark won
                </Button>
              </Can>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {closing && (
        <CloseDealDialog
          deal={deal}
          outcome={closing}
          onClose={() => setClosing(null)}
          onDone={() => {
            setClosing(null);
            invalidate();
            onClose();
          }}
        />
      )}
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line p-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</div>
      <div className={emphasis ? 'tnum mt-0.5 text-lg font-semibold text-ink' : 'tnum mt-0.5 text-base text-ink'}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-ink-muted">{hint}</div>}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}

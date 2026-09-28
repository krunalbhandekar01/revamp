import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Lock,
  PauseCircle,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile, HeroFigure } from '@/components/common/StatTile';
import { Money } from '@/components/common/Money';
import { DataTable } from '@/components/data-table/DataTable';
import { selectionColumn, arrIncludes } from '@/components/data-table/columns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { Meter } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Can } from '@/rbac/can';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { decideAllocationBulk, getAllocationQueue, getTreasurySummary } from '@/api/treasury';
import { dueLabel, money, moneyCompact, percent, shortDate } from '@/lib/format';
import { cn, sumBy } from '@/lib/utils';
import type { FundAllocationCandidate } from '@/types/domain';

/**
 * THE FUND ALLOCATION COCKPIT
 *
 * The one screen that answers "should I release funds today, and to whom".
 * Three blocks, in the order a decision is actually made:
 *
 *   1. What can I release?      — reconciled cash + undrawn facility − commitments
 *   2. What is asking for it?   — the demand queue, ranked by return per rupee-day
 *   3. What happens if I do?    — the consequence panel, before anyone commits
 *
 * The ranking metric is deliberately NOT gross margin. A 4% deal that recycles
 * cash in 12 days beats an 8% deal that locks it for 60 — so rows are scored on
 * return on working capital (RoWC), with urgency and supplier criticality as
 * tie-breakers. Every row carries the reason in words, never a bare score.
 */
export default function FundAllocationPage() {
  const qc = useQueryClient();
  const { can, needsSecondApprover } = useAuth();
  const [selected, setSelected] = useState<FundAllocationCandidate[]>([]);

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: qk.treasury.summary,
    queryFn: getTreasurySummary,
  });

  const { data: queue = [], isLoading: loadingQueue } = useQuery({
    queryKey: qk.treasury.queue(),
    queryFn: () => getAllocationQueue(),
  });

  const decide = useMutation({
    mutationFn: ({ ids, state }: { ids: string[]; state: FundAllocationCandidate['state'] }) =>
      decideAllocationBulk(ids, state),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury'] });
      setSelected([]);
    },
  });

  /* ---------------------------------------------------------- consequences */

  const consequence = useMemo(() => {
    const payable = selected.filter((r) => !r.blocked);
    const outflow = sumBy(payable, (r) => r.amountDue);
    const releasable = summary?.releasableToday ?? 0;
    const closing = releasable - outflow;
    const discountCaptured = sumBy(payable, (r) => r.earlyPayDiscount);
    const marginUnlocked = sumBy(payable, (r) => r.linkedMargin);
    const avgLock = payable.length
      ? sumBy(payable, (r) => Math.max(12, r.cashLockDays)) / payable.length
      : 0;
    const blendedRowc = outflow ? ((marginUnlocked + discountCaptured) / outflow) * (365 / Math.max(12, avgLock)) * 100 : 0;

    // Suppliers left past due if we release only what is selected.
    const strandedOverdue = queue.filter(
      (r) => r.daysPastDue > 0 && !payable.some((p) => p.id === r.id),
    );

    return {
      count: payable.length,
      blocked: selected.length - payable.length,
      outflow,
      closing,
      overdrawn: closing < 0,
      discountCaptured,
      marginUnlocked,
      blendedRowc,
      avgLock,
      strandedOverdue,
      strandedAmount: sumBy(strandedOverdue, (r) => r.amountDue),
    };
  }, [selected, summary, queue]);

  /* ---------------------------------------------------------------- columns */

  const columns = useMemo<ColumnDef<FundAllocationCandidate, unknown>[]>(
    () => [
      selectionColumn<FundAllocationCandidate>(),
      {
        id: 'counterparty',
        accessorKey: 'counterpartyName',
        header: 'Counterparty',
        size: 260,
        cell: ({ row }) => (
          <div className="min-w-0 py-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium text-ink">{row.original.counterpartyName}</span>
              {row.original.blocked && (
                <Tooltip content={row.original.blockedReason ?? 'Blocked'}>
                  <Lock className="size-3 shrink-0 text-critical" aria-label="Blocked" />
                </Tooltip>
              )}
            </div>
            <div className="mt-0.5 truncate text-[11px] text-ink-muted">
              {row.original.kind} · {row.original.dispatchRefNos.slice(0, 2).join(', ')}
              {row.original.dispatchRefNos.length > 2 && ` +${row.original.dispatchRefNos.length - 2}`}
            </div>
          </div>
        ),
      },
      {
        id: 'kind',
        accessorKey: 'kind',
        header: 'Type',
        filterFn: arrIncludes,
        cell: ({ getValue }) => <span className="text-ink-secondary">{String(getValue())}</span>,
      },
      {
        id: 'amountDue',
        accessorKey: 'amountDue',
        header: 'Amount due',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <div>
            <Money value={row.original.amountDue} />
            {row.original.earlyPayDiscount > 0 && (
              <div className="text-[11px] text-good">
                −{moneyCompact(row.original.earlyPayDiscount)} if paid today
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'due',
        accessorKey: 'daysPastDue',
        header: 'Due',
        meta: { align: 'right' },
        cell: ({ row }) => {
          const d = row.original.daysPastDue;
          return (
            <div>
              <span className={cn('font-medium', d > 7 ? 'text-critical' : d > 0 ? 'text-warning' : 'text-ink-secondary')}>
                {dueLabel(d)}
              </span>
              <div className="text-[11px] text-ink-muted">{shortDate(row.original.dueDate)}</div>
            </div>
          );
        },
      },
      {
        id: 'rowc',
        accessorKey: 'rowcPercent',
        header: 'RoWC',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <Tooltip
            content={
              <div className="space-y-1">
                <div>Return on working capital, annualised.</div>
                <div className="text-ink-muted">
                  ({moneyCompact(row.original.linkedMargin)} margin
                  {row.original.earlyPayDiscount > 0 && ` + ${moneyCompact(row.original.earlyPayDiscount)} discount`})
                  ÷ {moneyCompact(row.original.amountDue)} × 365 / {Math.max(12, row.original.cashLockDays)}d
                </div>
              </div>
            }
          >
            <span className="cursor-help font-medium tabular-nums">{percent(row.original.rowcPercent, 0)}</span>
          </Tooltip>
        ),
      },
      {
        id: 'cashLockDays',
        accessorKey: 'cashLockDays',
        header: 'Cash locked',
        meta: { align: 'right' },
        cell: ({ getValue }) => <span className="text-ink-secondary">{Number(getValue())}d</span>,
      },
      {
        id: 'criticality',
        accessorKey: 'supplierCriticality',
        header: 'Criticality',
        meta: { align: 'right' },
        cell: ({ getValue }) => {
          const v = Number(getValue());
          return (
            <div className="flex items-center justify-end gap-2">
              <Meter value={v} tone={v > 70 ? 'warning' : 'primary'} className="w-12" label="Supplier criticality" />
              <span className="w-7 text-right text-[11px] text-ink-muted">{v}%</span>
            </div>
          );
        },
      },
      {
        id: 'recommendation',
        accessorKey: 'recommendation',
        header: 'Recommendation',
        size: 300,
        filterFn: arrIncludes,
        cell: ({ row }) => <RecommendationCell row={row.original} />,
      },
    ],
    [],
  );

  // Memoised so the table receives a stable `data` reference. Re-deriving these
  // inline hands the table a new array on every render, which makes it redo all
  // of its row work for nothing.
  const queued = useMemo(() => queue.filter((r) => r.state === 'queued'), [queue]);
  const recommendedToPay = useMemo(
    () => queued.filter((r) => r.recommendation === 'pay' && !r.blocked),
    [queued],
  );

  return (
    <>
      <PageHeader
        title="Fund Allocation"
        description="What can be released today, what is asking for it, and what happens if you say yes."
        actions={
          <Can
            module="treasury"
            action="decide"
            fallback={
              <Badge tone="outline">
                <Info /> Read-only — your role cannot decide allocations
              </Badge>
            }
          >
            <Button
              variant="outline"
              onClick={() => setSelected(recommendedToPay)}
              disabled={recommendedToPay.length === 0}
            >
              <Sparkles /> Select all recommended ({recommendedToPay.length})
            </Button>
          </Can>
        }
      />

      {/* 1 — What can I release? */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Releasable today"
          value={<Money value={summary?.releasableToday ?? 0} compact />}
          sublabel={`${moneyCompact(summary?.bankBalance ?? 0)} bank + ${moneyCompact(summary?.facilityAvailable ?? 0)} undrawn`}
          hint="Reconciled bank balances plus undrawn facility, less what is already committed for release today."
          loading={loadingSummary}
          emphasis
        />
        <StatTile
          label="Expected inflow · 7 days"
          value={<Money value={summary?.expectedInflow7d ?? 0} compact />}
          sublabel="Weighted by payment history"
          hint="Open receivables weighted by each buyer's historical likelihood of paying — not by due date alone."
          loading={loadingSummary}
        />
        <StatTile
          label="Queue demand"
          value={<Money value={summary?.queueDemand ?? 0} compact />}
          sublabel={`${queued.length} payables waiting`}
          hint="Everything asking to be paid: seller payouts, trade partners, transporters, discounters."
          loading={loadingSummary}
        />
        <StatTile
          label="Already past due"
          value={<Money value={summary?.overdueDemand ?? 0} compact />}
          sublabel={`${queue.filter((r) => r.daysPastDue > 0).length} counterparties`}
          hint="Relationship risk, not just a number: these suppliers are waiting past agreed terms."
          loading={loadingSummary}
          delta={undefined}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* 2 — What is asking for it? */}
        <div className="min-w-0">
          <DataTable
            tableId="fund-allocation"
            columns={columns}
            data={queued}
            loading={loadingQueue}
            enableSelection={can('treasury', 'decide')}
            onSelectionChange={setSelected}
            searchPlaceholder="Search counterparty or dispatch…"
            maxBodyHeight="calc(100vh - 30rem)"
            // The recommendation and its reason are the point of this screen, so
            // the supporting detail starts collapsed behind the column picker.
            defaultHiddenColumns={['kind', 'criticality', 'cashLockDays']}
            emptyTitle="Queue is clear"
            emptyDescription="Nothing is waiting on a funding decision right now."
            facets={[
              {
                columnId: 'kind',
                label: 'Type',
                options: [
                  { value: 'Seller Payout', label: 'Seller Payout' },
                  { value: 'Trade Partner', label: 'Trade Partner' },
                  { value: 'Transporter', label: 'Transporter' },
                  { value: 'Invoice Discounter', label: 'Invoice Discounter' },
                ],
              },
              {
                columnId: 'recommendation',
                label: 'Recommendation',
                options: [
                  { value: 'pay', label: 'Pay now' },
                  { value: 'part-pay', label: 'Part-pay' },
                  { value: 'hold', label: 'Hold' },
                ],
              },
            ]}
            bulkActions={(rows, clear) => (
              <div className="flex items-center gap-1.5">
                <Can module="treasury" action="approve">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => {
                      decide.mutate({ ids: rows.filter((r) => !r.blocked).map((r) => r.id), state: 'approved' });
                      clear();
                    }}
                  >
                    <CheckCircle2 /> Approve {rows.filter((r) => !r.blocked).length}
                  </Button>
                </Can>
                <Can module="treasury" action="decide">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={decide.isPending}
                    onClick={() => {
                      decide.mutate({ ids: rows.map((r) => r.id), state: 'held' });
                      clear();
                    }}
                  >
                    <PauseCircle /> Hold
                  </Button>
                </Can>
              </div>
            )}
          />
        </div>

        {/* 3 — What happens if I do? */}
        <aside className="xl:sticky xl:top-0 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>If you release this queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {consequence.count === 0 ? (
                <p className="text-xs leading-relaxed text-ink-secondary">
                  Select rows in the queue to see the effect on cash before anything is committed. Nothing
                  here moves money on its own.
                </p>
              ) : (
                <>
                  <HeroFigure
                    label="Closing position"
                    value={moneyCompact(consequence.closing)}
                    tone={consequence.overdrawn ? 'critical' : 'default'}
                    caption={
                      consequence.overdrawn ? (
                        <span className="inline-flex items-center gap-1 text-critical">
                          <AlertTriangle className="size-3.5" />
                          Exceeds available funds by {moneyCompact(Math.abs(consequence.closing))}
                        </span>
                      ) : (
                        <>
                          {moneyCompact(summary?.releasableToday ?? 0)} available −{' '}
                          {moneyCompact(consequence.outflow)} released
                        </>
                      )
                    }
                  />

                  <Separator />

                  <dl className="space-y-2 text-xs">
                    <Row label="Payables released" value={`${consequence.count}`} />
                    {consequence.blocked > 0 && (
                      <Row
                        label="Blocked, excluded"
                        value={`${consequence.blocked}`}
                        tone="critical"
                      />
                    )}
                    <Row label="Cash out" value={money(consequence.outflow)} />
                    {consequence.discountCaptured > 0 && (
                      <Row
                        label="Early-pay discount captured"
                        value={money(consequence.discountCaptured)}
                        tone="good"
                      />
                    )}
                    <Row label="Margin unlocked" value={money(consequence.marginUnlocked)} />
                    <Row label="Blended RoWC" value={percent(consequence.blendedRowc, 0)} />
                    <Row label="Avg cash lock" value={`${Math.round(consequence.avgLock)} days`} />
                  </dl>

                  {consequence.strandedOverdue.length > 0 && (
                    <div className="rounded-md border border-line bg-surface-3 p-2.5">
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-serious">
                        <AlertTriangle className="size-3.5" />
                        {consequence.strandedOverdue.length} suppliers stay past due
                      </div>
                      <p className="text-[11px] leading-relaxed text-ink-secondary">
                        {moneyCompact(consequence.strandedAmount)} remains unpaid past agreed terms, including{' '}
                        {consequence.strandedOverdue[0].counterpartyName}
                        {consequence.strandedOverdue.length > 1 &&
                          ` and ${consequence.strandedOverdue.length - 1} others`}
                        .
                      </p>
                    </div>
                  )}

                  {needsSecondApprover('treasury', 'release') && (
                    <div className="flex items-start gap-2 rounded-md border border-line bg-warning-soft p-2.5 text-[11px] leading-relaxed text-warning">
                      <Lock className="mt-px size-3.5 shrink-0" />
                      <span>
                        Releasing funds needs a second approver. Your approval queues it; someone with{' '}
                        <code className="font-mono">treasury:release</code> completes it.
                      </span>
                    </div>
                  )}

                  <Can
                    module="treasury"
                    action="release"
                    fallback={
                      <Can module="treasury" action="approve">
                        <Button variant="primary" className="w-full" disabled={consequence.overdrawn}>
                          Approve for release <ArrowRight />
                        </Button>
                      </Can>
                    }
                  >
                    <Button variant="primary" className="w-full" disabled={consequence.overdrawn}>
                      <Wallet /> Release {moneyCompact(consequence.outflow)}
                    </Button>
                  </Can>
                </>
              )}
            </CardContent>
          </Card>

          {summary && (
            <Card className="mt-3">
              <CardHeader>
                <CardTitle>Where the money is</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {summary.accounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="truncate text-ink">{a.name}</div>
                      <div className="truncate text-[11px] text-ink-muted">
                        {a.bank} {a.accountNo}
                      </div>
                    </div>
                    <Money value={a.balance} compact className="shrink-0 font-medium" />
                  </div>
                ))}
                <Separator />
                {summary.facilities.map((f) => (
                  <div key={f.id} className="text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-ink">{f.name}</span>
                      <span className="tnum shrink-0 text-ink-muted">
                        {moneyCompact(f.limit - f.drawn)} free
                      </span>
                    </div>
                    <Meter
                      value={f.drawn}
                      max={f.limit}
                      tone={f.drawn / f.limit > 0.85 ? 'warning' : 'primary'}
                      className="mt-1.5"
                      label={`${f.name} utilisation`}
                    />
                    <div className="mt-1 text-[11px] text-ink-muted">
                      {moneyCompact(f.drawn)} drawn of {moneyCompact(f.limit)} · {f.interestRate}% p.a.
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function RecommendationCell({ row }: { row: FundAllocationCandidate }) {
  const tone = row.recommendation === 'pay' ? 'good' : row.recommendation === 'part-pay' ? 'warning' : 'neutral';
  const label = row.recommendation === 'pay' ? 'Pay now' : row.recommendation === 'part-pay' ? 'Part-pay' : 'Hold';
  return (
    <div className="max-w-[300px] py-1">
      <Badge tone={tone}>{label}</Badge>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-secondary">{row.reason}</p>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'critical';
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-secondary">{label}</dt>
      <dd
        className={cn(
          'tnum font-medium text-ink',
          tone === 'good' && 'text-good',
          tone === 'critical' && 'text-critical',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

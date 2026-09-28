import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { Money } from '@/components/common/Money';
import { ChartFrame, ChartTooltip, ChartDataTable } from '@/components/charts/ChartFrame';
import { AXIS_PROPS, CHART, SERIES, STATUS } from '@/components/charts/palette';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Meter } from '@/components/ui/progress';
import { qk } from '@/api/client';
import { getCashPosition, getTreasurySummary } from '@/api/treasury';
import { dayMonth, money, moneyCompact, numberCompact, shortDate, toRupees } from '@/lib/format';
import type { CashPositionDay } from '@/types/domain';

export default function CashPositionPage() {
  const { data: summary, isLoading } = useQuery({
    queryKey: qk.treasury.summary,
    queryFn: getTreasurySummary,
  });
  const { data: days = [] } = useQuery({
    queryKey: qk.treasury.cash(21),
    queryFn: () => getCashPosition(21),
  });

  const chartData = days.map((d) => ({
    label: dayMonth(d.date),
    closing: toRupees(d.closing),
    inflow: toRupees(d.inflow),
    outflow: -toRupees(d.outflow),
    projected: d.projected,
    raw: d,
  }));

  const firstProjected = chartData.findIndex((d) => d.projected);
  const trough = chartData.reduce((lo, d) => (d.closing < lo.closing ? d : lo), chartData[0]);

  return (
    <>
      <PageHeader
        title="Cash Position"
        description="Reconciled balances, facility headroom, and where the next three weeks land."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Bank balance"
          value={<Money value={summary?.bankBalance ?? 0} compact />}
          sublabel={`${summary?.accounts.length ?? 0} accounts, reconciled today`}
          loading={isLoading}
          emphasis
        />
        <StatTile
          label="Facility headroom"
          value={<Money value={summary?.facilityAvailable ?? 0} compact />}
          sublabel="Undrawn across all lines"
          loading={isLoading}
        />
        <StatTile
          label="Committed today"
          value={<Money value={summary?.committedToday ?? 0} compact />}
          sublabel="Approved, not yet released"
          loading={isLoading}
        />
        <StatTile
          label="Runway at current burn"
          value={`${summary?.runwayDays ?? 0} days`}
          sublabel="Against the standing payable queue"
          hint="Available funds divided by the queue's 30-day average daily demand."
          loading={isLoading}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <ChartFrame
            title="Closing balance — 21 days back, 21 days forward"
            description="Solid to today, dashed beyond it. The forward arm is a projection, not a commitment."
            legend={[
              { label: 'Closing balance', color: SERIES[0] },
              { label: 'Zero line', color: STATUS.critical },
            ]}
            table={
              <ChartDataTable
                rows={chartData}
                columns={[
                  { key: 'label', label: 'Date' },
                  { key: 'inflow', label: 'Inflow', align: 'right', render: (r) => money(r.raw.inflow) },
                  { key: 'outflow', label: 'Outflow', align: 'right', render: (r) => money(r.raw.outflow) },
                  { key: 'closing', label: 'Closing', align: 'right', render: (r) => money(r.raw.closing) },
                ]}
              />
            }
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis {...AXIS_PROPS} width={52} tickFormatter={(v: number) => numberCompact(v)} />
                  <ReferenceLine y={0} stroke={STATUS.critical} strokeDasharray="3 3" strokeWidth={1.5} />
                  {firstProjected > 0 && (
                    <ReferenceLine
                      x={chartData[firstProjected].label}
                      stroke={CHART.axis}
                      strokeDasharray="3 3"
                      label={{ value: 'today', position: 'insideTopLeft', fill: CHART.axis, fontSize: 10 }}
                    />
                  )}
                  <RTooltip
                    cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as { raw: CashPositionDay };
                      return (
                        <ChartTooltip
                          label={`${label}${d.raw.projected ? ' · projected' : ''}`}
                          rows={[
                            { name: 'Opening', value: money(d.raw.opening) },
                            { name: 'Inflow', value: money(d.raw.inflow), color: SERIES[2] },
                            { name: 'Outflow', value: money(d.raw.outflow), color: SERIES[1] },
                            { name: 'Closing', value: money(d.raw.closing), color: SERIES[0] },
                          ]}
                        />
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="closing"
                    stroke={SERIES[0]}
                    strokeWidth={2}
                    fill="url(#cashFill)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {trough && (
              <p className="mt-2 text-[11px] text-ink-secondary">
                Lowest point in the window is{' '}
                <span className="tnum font-medium text-ink">{moneyCompact(trough.raw.closing)}</span> on{' '}
                {shortDate(trough.raw.date)}.
              </p>
            )}
          </ChartFrame>

          <ChartFrame
            title="Daily inflow vs outflow"
            description="Above the line is money in, below is money out."
            legend={[
              { label: 'Inflow', color: SERIES[2] },
              { label: 'Outflow', color: SERIES[1] },
            ]}
            table={
              <ChartDataTable
                rows={chartData}
                columns={[
                  { key: 'label', label: 'Date' },
                  { key: 'inflow', label: 'Inflow', align: 'right', render: (r) => money(r.raw.inflow) },
                  { key: 'outflow', label: 'Outflow', align: 'right', render: (r) => money(r.raw.outflow) },
                ]}
              />
            }
          >
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="label" {...AXIS_PROPS} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis {...AXIS_PROPS} width={52} tickFormatter={(v: number) => numberCompact(Math.abs(v))} />
                  <ReferenceLine y={0} stroke={CHART.axis} strokeWidth={1} />
                  <RTooltip
                    cursor={{ fill: CHART.grid, opacity: 0.5 }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as { raw: CashPositionDay };
                      return (
                        <ChartTooltip
                          label={String(label)}
                          rows={[
                            { name: 'Inflow', value: money(d.raw.inflow), color: SERIES[2] },
                            { name: 'Outflow', value: money(d.raw.outflow), color: SERIES[1] },
                          ]}
                        />
                      );
                    }}
                  />
                  <Bar dataKey="inflow" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={14} />
                  <Bar dataKey="outflow" fill={SERIES[1]} radius={[0, 0, 4, 4]} maxBarSize={14}>
                    {chartData.map((_, i) => (
                      <Cell key={i} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>
        </div>

        <aside className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary?.accounts.map((a) => (
                <div key={a.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] text-ink">{a.name}</span>
                    <Money value={a.balance} compact className="shrink-0 text-[13px] font-medium" />
                  </div>
                  <div className="mt-0.5 text-[11px] text-ink-muted">
                    {a.bank} {a.accountNo} · reconciled {shortDate(a.lastReconciledAt)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Facilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary?.facilities.map((f) => {
                const util = (f.drawn / f.limit) * 100;
                return (
                  <div key={f.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] text-ink">{f.name}</span>
                      <span className="tnum shrink-0 text-[13px] font-medium text-ink">
                        {util.toFixed(0)}%
                      </span>
                    </div>
                    <Meter
                      value={util}
                      tone={util > 85 ? 'critical' : util > 70 ? 'warning' : 'primary'}
                      className="mt-1.5"
                      label={`${f.name} utilisation`}
                    />
                    <div className="mt-1 text-[11px] text-ink-muted">
                      {moneyCompact(f.drawn)} of {moneyCompact(f.limit)} · {f.lender} · {f.interestRate}% p.a.
                    </div>
                    <div className="text-[11px] text-ink-muted">Matures {shortDate(f.maturesOn)}</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

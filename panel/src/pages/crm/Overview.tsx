import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Target } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { Money } from '@/components/common/Money';
import { ChartFrame, ChartTooltip, ChartDataTable } from '@/components/charts/ChartFrame';
import { AXIS_PROPS, CHART, SEQUENTIAL, SERIES } from '@/components/charts/palette';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Meter } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { qk } from '@/api/client';
import { getLeadInsights, getPipelineInsights, getPipelines, getTicketInsights } from '@/api/crm';
import { money, moneyCompact, numberCompact, percent, toRupees } from '@/lib/format';

/**
 * The CRM overview.
 *
 * Reads left to right along the funnel: leads in → pipeline → forecast →
 * win/loss → who is carrying it. Every tile links to the screen where the work
 * actually happens, because a dashboard that cannot be acted on is wallpaper.
 */
export default function CrmOverviewPage() {
  const [pipelineId, setPipelineId] = useState('pipe-sales');

  const { data: pipelines = [] } = useQuery({ queryKey: qk.crm.pipelines, queryFn: getPipelines });
  const { data: leads } = useQuery({ queryKey: qk.crm.leadInsights, queryFn: getLeadInsights });
  const { data: pipe } = useQuery({
    queryKey: qk.crm.pipelineInsights(pipelineId),
    queryFn: () => getPipelineInsights(pipelineId),
  });
  const { data: tickets } = useQuery({ queryKey: qk.crm.ticketInsights, queryFn: getTicketInsights });

  const funnel = [
    { stage: 'Leads', count: leads?.total ?? 0 },
    {
      stage: 'Qualified',
      count: (leads?.byStage.find((s) => s.stage === 'Qualified')?.count ?? 0) +
        (leads?.byStage.find((s) => s.stage === 'Proposal')?.count ?? 0) +
        (leads?.byStage.find((s) => s.stage === 'Converted')?.count ?? 0),
    },
    { stage: 'Open deals', count: pipe?.openCount ?? 0 },
    { stage: 'Won', count: pipe?.wonThisPeriod ?? 0 },
  ];

  const stageRows = (pipe?.byStage ?? []).map((s) => ({
    ...s,
    valueR: toRupees(s.value),
    weightedR: toRupees(s.weighted),
  }));

  const forecastRows = (pipe?.forecast ?? []).map((f) => ({
    label: f.label,
    committed: toRupees(f.committed),
    bestCase: toRupees(f.bestCase),
  }));

  return (
    <>
      <PageHeader
        title="CRM Overview"
        description="Demand in, pipeline through, revenue out — and where it is stalling."
        filters={
          <Select value={pipelineId} onValueChange={setPipelineId}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Open pipeline"
          value={<Money value={pipe?.openValue ?? 0} compact />}
          sublabel={`${pipe?.openCount ?? 0} deals`}
          loading={!pipe}
          emphasis
        />
        <StatTile
          label="Weighted forecast"
          value={<Money value={pipe?.weightedValue ?? 0} compact />}
          hint="Each deal's value multiplied by its stage probability."
          loading={!pipe}
        />
        <StatTile
          label="Win rate"
          value={pipe ? percent(pipe.winRate) : '—'}
          sublabel={`${pipe?.wonThisPeriod ?? 0} won / ${pipe?.lostCount ?? 0} lost`}
          loading={!pipe}
        />
        <StatTile
          label="Hot leads"
          value={leads?.hot ?? 0}
          sublabel={`${leads?.overdueFollowUps ?? 0} follow-ups overdue`}
          loading={!leads}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartFrame
          title="Pipeline by stage"
          description="Value sitting at each stage. Weighted applies the stage's win probability."
          legend={[
            { label: 'Total value', color: SERIES[0] },
            { label: 'Weighted', color: SERIES[2] },
          ]}
          table={
            <ChartDataTable
              rows={stageRows}
              columns={[
                { key: 'label', label: 'Stage' },
                { key: 'count', label: 'Deals', align: 'right' },
                { key: 'value', label: 'Value', align: 'right', render: (r) => money(r.value) },
                { key: 'weighted', label: 'Weighted', align: 'right', render: (r) => money(r.weighted) },
              ]}
            />
          }
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" {...AXIS_PROPS} interval={0} angle={-16} textAnchor="end" height={56} />
                <YAxis {...AXIS_PROPS} width={48} tickFormatter={(v: number) => numberCompact(v)} />
                <RTooltip
                  cursor={{ fill: CHART.grid, opacity: 0.5 }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <ChartTooltip
                        label={String(label)}
                        rows={[
                          { name: 'Deals', value: String(payload[0].payload.count) },
                          { name: 'Value', value: money(payload[0].payload.value), color: SERIES[0] },
                          { name: 'Weighted', value: money(payload[0].payload.weighted), color: SERIES[2] },
                        ]}
                      />
                    ) : null
                  }
                />
                <Bar name="Total value" dataKey="valueR" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Bar name="Weighted" dataKey="weightedR" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title="Forecast"
          description="Committed is everything at 70% probability or above. Best case is the whole month."
          legend={[
            { label: 'Best case', color: SERIES[0] },
            { label: 'Committed', color: SERIES[2] },
          ]}
          table={
            <ChartDataTable
              rows={forecastRows}
              columns={[
                { key: 'label', label: 'Month' },
                { key: 'committed', label: 'Committed', align: 'right', render: (r) => `₹${numberCompact(r.committed)}` },
                { key: 'bestCase', label: 'Best case', align: 'right', render: (r) => `₹${numberCompact(r.bestCase)}` },
              ]}
            />
          }
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} width={48} tickFormatter={(v: number) => numberCompact(v)} />
                <RTooltip
                  cursor={{ fill: CHART.grid, opacity: 0.5 }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <ChartTooltip
                        label={String(label)}
                        rows={payload.map((p) => ({
                          name: String(p.name),
                          value: `₹${numberCompact(Number(p.value))}`,
                          color: String(p.color),
                        }))}
                      />
                    ) : null
                  }
                />
                <Bar name="Best case" dataKey="bestCase" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={34} />
                <Line
                  name="Committed"
                  type="monotone"
                  dataKey="committed"
                  stroke={SERIES[2]}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2, stroke: CHART.surface }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: CHART.surface }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title="Funnel"
          description="Lead to won. One hue, stepped by funnel depth."
          table={
            <ChartDataTable
              rows={funnel}
              columns={[
                { key: 'stage', label: 'Stage' },
                { key: 'count', label: 'Count', align: 'right' },
              ]}
            />
          }
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ top: 4, right: 44, bottom: 0, left: 8 }}>
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" {...AXIS_PROPS} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  {...AXIS_PROPS}
                  width={90}
                  tick={{ fill: CHART.textSecondary, fontSize: 11 }}
                />
                <RTooltip
                  cursor={{ fill: CHART.grid, opacity: 0.5 }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <ChartTooltip
                        label={String(payload[0].payload.stage)}
                        rows={[{ name: 'Count', value: String(payload[0].payload.count) }]}
                      />
                    ) : null
                  }
                />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                  label={{ position: 'right', fill: CHART.textSecondary, fontSize: 11 }}
                >
                  {funnel.map((_, i) => (
                    <Cell key={i} fill={SEQUENTIAL[Math.min(i + 1, SEQUENTIAL.length - 1)]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <Card>
          <CardHeader>
            <CardTitle>Why we lose</CardTitle>
          </CardHeader>
          <CardContent>
            {(pipe?.lostReasons ?? []).length === 0 ? (
              <p className="text-xs text-ink-secondary">No closed-lost deals in this pipeline yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {(pipe?.lostReasons ?? []).map((r) => {
                  const max = Math.max(...(pipe?.lostReasons ?? []).map((x) => x.count));
                  return (
                    <li key={r.reason}>
                      <div className="flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="truncate text-ink">{r.reason}</span>
                        <span className="tnum shrink-0 text-ink-muted">
                          {r.count} · {moneyCompact(r.value)}
                        </span>
                      </div>
                      <Meter value={(r.count / max) * 100} className="mt-1.5" tone="critical" label={r.reason} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Rep performance</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/crm/deals">
                Open pipeline <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-3 py-2 text-left font-semibold">Rep</th>
                    <th className="px-3 py-2 text-right font-semibold">Open</th>
                    <th className="px-3 py-2 text-right font-semibold">Open value</th>
                    <th className="px-3 py-2 text-right font-semibold">Won</th>
                    <th className="px-3 py-2 text-left font-semibold">Win rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(pipe?.byOwner ?? []).map((o) => (
                    <tr key={o.ownerId} className="border-b border-line last:border-0">
                      <td className="px-3 py-2">
                        <OwnerChip name={o.name} />
                      </td>
                      <td className="tnum px-3 py-2 text-right text-ink-secondary">{o.open}</td>
                      <td className="px-3 py-2 text-right">
                        <Money value={o.openValue} compact />
                      </td>
                      <td className="tnum px-3 py-2 text-right text-ink-secondary">{o.won}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Meter
                            value={o.winRate}
                            className="w-20"
                            tone={o.winRate > 55 ? 'good' : o.winRate > 30 ? 'warning' : 'critical'}
                            label={`${o.name} win rate`}
                          />
                          <span className="tnum w-9 text-[11px] text-ink-muted">{percent(o.winRate, 0)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Needs attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Attention
                label="Stale deals"
                value={pipe?.staleCount ?? 0}
                hint="No movement beyond the stage's expected window"
                to="/crm/deals"
              />
              <Attention
                label="Leads never contacted"
                value={leads?.unworked ?? 0}
                hint="Sitting in New with no activity"
                to="/crm/leads"
              />
              <Attention
                label="Overdue follow-ups"
                value={leads?.overdueFollowUps ?? 0}
                hint="A promised callback that was missed"
                to="/crm/activities"
              />
              <Attention
                label="Tickets past SLA"
                value={tickets?.breached ?? 0}
                hint="Customers waiting beyond the committed window"
                to="/support/tickets"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead sources</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(leads?.bySource ?? []).slice(0, 6).map((s) => {
                  const rate = s.count ? (s.converted / s.count) * 100 : 0;
                  return (
                    <li key={s.source} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="truncate text-ink">{s.source}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="tnum text-ink-muted">{s.count}</span>
                        <Badge tone={rate > 15 ? 'good' : rate > 7 ? 'warning' : 'neutral'}>
                          {percent(rate, 0)}
                        </Badge>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Attention({
  label,
  value,
  hint,
  to,
}: {
  label: string;
  value: number;
  hint: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-start gap-2.5 rounded-lg border border-line p-2.5 transition-colors hover:bg-surface-3"
    >
      <span
        className={
          value > 0
            ? 'mt-px flex size-7 shrink-0 items-center justify-center rounded-md bg-serious-soft text-serious'
            : 'mt-px flex size-7 shrink-0 items-center justify-center rounded-md bg-good-soft text-good'
        }
      >
        {value > 0 ? <Flame className="size-3.5" /> : <Target className="size-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-medium text-ink">{label}</span>
          <span className="tnum shrink-0 text-[13px] font-semibold text-ink">{value}</span>
        </span>
        <span className="mt-0.5 block truncate text-[11px] text-ink-muted">{hint}</span>
      </span>
    </Link>
  );
}

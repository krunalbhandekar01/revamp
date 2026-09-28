import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { Money } from '@/components/common/Money';
import { ChartFrame, ChartTooltip, ChartDataTable } from '@/components/charts/ChartFrame';
import { AXIS_PROPS, CHART, SEQUENTIAL, SERIES } from '@/components/charts/palette';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Meter } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { qk } from '@/api/client';
import { getAgeing, getFinanceOverview, getTopExposures } from '@/api/finance';
import { money, moneyCompact, numberCompact, percent, toRupees } from '@/lib/format';

export default function FinanceDashboard() {
  const [range, setRange] = useState('fy');

  const { data, isLoading } = useQuery({
    queryKey: qk.finance.overview(range),
    queryFn: () => getFinanceOverview(range),
  });
  const { data: ageing = [] } = useQuery({ queryKey: qk.finance.ageing(range), queryFn: getAgeing });
  const { data: exposures = [] } = useQuery({ queryKey: ['finance', 'exposures'], queryFn: () => getTopExposures() });

  const monthly = (data?.monthly ?? []).map((m) => ({
    label: m.label,
    revenue: toRupees(Number(m.revenue)),
    margin: toRupees(Number(m.margin)),
    collected: toRupees(Number(m.collected)),
  }));

  const ageingData = ageing.map((b) => ({ ...b, value: toRupees(b.amount) }));

  return (
    <>
      <PageHeader
        title="Finance"
        description="Revenue, what it actually contributed after the cost of the cash behind it, and who owes us."
        filters={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fy">This financial year</SelectItem>
              <SelectItem value="180d">Last 6 months</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Revenue"
          value={<Money value={data?.revenue ?? 0} compact />}
          delta={data?.revenueDelta}
          loading={isLoading}
        />
        <StatTile
          label="Gross margin"
          value={<Money value={data?.grossMargin ?? 0} compact />}
          sublabel={data ? `${percent(data.marginPercent)} of revenue` : undefined}
          delta={data?.marginDelta}
          loading={isLoading}
        />
        <StatTile
          label="Net contribution"
          value={<Money value={data?.netContribution ?? 0} compact />}
          sublabel={data ? `after ${moneyCompact(data.financingCost)} financing cost` : undefined}
          hint="Gross margin less the cost of the working capital locked up to earn it. This is the number that decides whether a deal was worth doing."
          loading={isLoading}
          emphasis
        />
        <StatTile
          label="DSO"
          value={`${data?.dso ?? 0} days`}
          delta={data?.dsoDelta}
          deltaGoodWhen="down"
          sublabel={data ? `${moneyCompact(data.outstanding)} outstanding` : undefined}
          loading={isLoading}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartFrame
          title="Revenue, margin and collections"
          description="Collections lag revenue — the gap is working capital."
          legend={[
            { label: 'Revenue', color: SERIES[0] },
            { label: 'Collected', color: SERIES[2] },
            { label: 'Margin', color: SERIES[1] },
          ]}
          table={
            <ChartDataTable
              rows={monthly}
              columns={[
                { key: 'label', label: 'Month' },
                { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => `₹${numberCompact(r.revenue)}` },
                { key: 'collected', label: 'Collected', align: 'right', render: (r) => `₹${numberCompact(r.collected)}` },
                { key: 'margin', label: 'Margin', align: 'right', render: (r) => `₹${numberCompact(r.margin)}` },
              ]}
            />
          }
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
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
                <Bar name="Revenue" dataKey="revenue" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar name="Collected" dataKey="collected" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line
                  name="Margin"
                  type="monotone"
                  dataKey="margin"
                  stroke={SERIES[1]}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2, stroke: CHART.surface }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: CHART.surface }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title="Receivables ageing"
          description="Stronger colour is older. Anything past 60 days needs a named owner."
          table={
            <ChartDataTable
              rows={ageingData}
              columns={[
                { key: 'label', label: 'Bucket' },
                { key: 'count', label: 'Invoices', align: 'right' },
                { key: 'amount', label: 'Amount', align: 'right', render: (r) => money(r.amount) },
              ]}
            />
          }
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageingData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} width={48} tickFormatter={(v: number) => numberCompact(v)} />
                <RTooltip
                  cursor={{ fill: CHART.grid, opacity: 0.5 }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <ChartTooltip
                        label={`${label} days`}
                        rows={[
                          { name: 'Outstanding', value: money(Number(payload[0].payload.amount)) },
                          { name: 'Invoices', value: String(payload[0].payload.count) },
                        ]}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  {/* "Not due" is not an age band, so it takes the de-emphasis grey and the
                      four aged buckets get the full ordinal ramp — one distinct step each,
                      none of them close enough to the surface to disappear in either mode. */}
                  {ageingData.map((b, i) => (
                    <Cell key={i} fill={b.label === 'Not due' ? CHART.deEmphasis : SEQUENTIAL[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {data && data.overdue > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-serious">
              <AlertTriangle className="size-3.5" />
              {moneyCompact(data.overdue)} is already past due.
            </p>
          )}
        </ChartFrame>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Largest exposures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2 text-left font-semibold">Buyer</th>
                  <th className="px-3 py-2 text-right font-semibold">Exposure</th>
                  <th className="px-3 py-2 text-left font-semibold">Credit limit used</th>
                  <th className="px-3 py-2 text-right font-semibold">DSO</th>
                  <th className="px-3 py-2 text-right font-semibold">Reliability</th>
                </tr>
              </thead>
              <tbody>
                {exposures.map((e) => (
                  <tr key={e.id} className="border-b border-line last:border-0">
                    <td className="max-w-56 truncate px-3 py-2 text-ink">{e.name}</td>
                    <td className="px-3 py-2 text-right">
                      <Money value={e.exposure} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Meter
                          value={e.utilisation}
                          tone={e.utilisation > 90 ? 'critical' : e.utilisation > 70 ? 'warning' : 'primary'}
                          className="w-24"
                          label={`${e.name} credit utilisation`}
                        />
                        <span className="tnum w-10 text-[11px] text-ink-muted">{e.utilisation.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="tnum px-3 py-2 text-right text-ink-secondary">{e.dso}d</td>
                    <td className="px-3 py-2 text-right">
                      <Badge tone={e.reliability > 85 ? 'good' : e.reliability > 65 ? 'warning' : 'critical'}>
                        {e.reliability}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

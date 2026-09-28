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
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { ChartFrame, ChartTooltip, ChartDataTable } from '@/components/charts/ChartFrame';
import { AXIS_PROPS, CHART, SEQUENTIAL, SERIES } from '@/components/charts/palette';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { qk } from '@/api/client';
import { getMarketingOverview } from '@/api/analytics';
import { moneyCompact, percent } from '@/lib/format';

export default function MarketingDashboard() {
  const [range, setRange] = useState('180d');
  const { data, isLoading } = useQuery({
    queryKey: qk.marketing.overview(range),
    queryFn: () => getMarketingOverview(range),
  });

  const funnel = data
    ? [
        { stage: 'Leads', count: data.leads },
        { stage: 'Qualified', count: data.qualified },
        { stage: 'Converted', count: data.converted },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Marketing"
        description="Where leads come from, what they convert to, and what that is worth."
        filters={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="180d">Last 6 months</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Leads" value={data?.leads ?? 0} delta={data?.leadsDelta} loading={isLoading} />
        <StatTile label="Qualified" value={data?.qualified ?? 0} delta={data?.qualifiedDelta} loading={isLoading} />
        <StatTile label="Converted" value={data?.converted ?? 0} delta={data?.convertedDelta} loading={isLoading} />
        <StatTile
          label="Conversion rate"
          value={data ? percent(data.conversionRate) : '—'}
          delta={data?.conversionDelta}
          loading={isLoading}
          emphasis
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartFrame
          title="Leads and conversions over time"
          legend={[
            { label: 'Leads', color: SERIES[0] },
            { label: 'Converted', color: SERIES[2] },
          ]}
          table={
            <ChartDataTable
              rows={data?.byMonth ?? []}
              columns={[
                { key: 'label', label: 'Month' },
                { key: 'leads', label: 'Leads', align: 'right' },
                { key: 'converted', label: 'Converted', align: 'right' },
              ]}
            />
          }
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data?.byMonth ?? []} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" {...AXIS_PROPS} />
                <YAxis {...AXIS_PROPS} width={36} />
                <RTooltip
                  cursor={{ fill: CHART.grid, opacity: 0.5 }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <ChartTooltip
                        label={String(label)}
                        rows={payload.map((p) => ({
                          name: String(p.name),
                          value: String(p.value),
                          color: String(p.color),
                        }))}
                      />
                    ) : null
                  }
                />
                <Bar name="Leads" dataKey="leads" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={30} />
                <Line
                  name="Converted"
                  type="monotone"
                  dataKey="converted"
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
          description="Stage-to-stage drop-off. Darker is later in the funnel."
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
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ top: 4, right: 40, bottom: 0, left: 8 }}>
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" {...AXIS_PROPS} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  {...AXIS_PROPS}
                  width={84}
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
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={30} label={{ position: 'right', fill: CHART.textSecondary, fontSize: 11 }}>
                  {funnel.map((_, i) => (
                    <Cell key={i} fill={SEQUENTIAL[Math.min(1 + i * 1.5, SEQUENTIAL.length - 1) | 0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Attribution by source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2 text-left font-semibold">Source</th>
                  <th className="px-3 py-2 text-right font-semibold">Leads</th>
                  <th className="px-3 py-2 text-right font-semibold">Converted</th>
                  <th className="px-3 py-2 text-right font-semibold">Rate</th>
                  <th className="px-3 py-2 text-right font-semibold">Revenue influenced</th>
                </tr>
              </thead>
              <tbody>
                {(data?.bySource ?? []).map((s) => (
                  <tr key={s.source} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 text-ink">{s.source}</td>
                    <td className="tnum px-3 py-2 text-right text-ink-secondary">{s.leads}</td>
                    <td className="tnum px-3 py-2 text-right text-ink-secondary">{s.converted}</td>
                    <td className="tnum px-3 py-2 text-right text-ink-secondary">
                      {percent((s.converted / Math.max(1, s.leads)) * 100)}
                    </td>
                    <td className="tnum px-3 py-2 text-right text-ink">{moneyCompact(s.revenue)}</td>
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

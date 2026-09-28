import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { Money } from '@/components/common/Money';
import { ChartFrame, ChartTooltip, ChartDataTable } from '@/components/charts/ChartFrame';
import { AXIS_PROPS, CHART, SERIES } from '@/components/charts/palette';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Meter } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { qk } from '@/api/client';
import { getSourcingOverview } from '@/api/analytics';
import { money, numberCompact, percent, qty } from '@/lib/format';

export default function SourcingDashboard() {
  const [range, setRange] = useState('fy');
  const { data, isLoading } = useQuery({
    queryKey: qk.sourcing.overview(range),
    queryFn: () => getSourcingOverview(range),
  });

  const gap = (data?.supplyGap ?? []).map((g) => ({
    ...g,
    shortfall: Math.max(0, g.demand - g.supply),
  }));

  return (
    <>
      <PageHeader
        title="Sourcing"
        description="Supply coverage against demand, supplier reliability, and where the gaps are."
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
        <StatTile label="Active suppliers" value={data?.suppliers ?? 0} delta={data?.suppliersDelta} loading={isLoading} />
        <StatTile
          label="Volume sourced"
          value={data ? qty(Math.round(data.volume)) : '—'}
          delta={data?.volumeDelta}
          loading={isLoading}
        />
        <StatTile label="Spend" value={<Money value={data?.spend ?? 0} compact />} delta={data?.spendDelta} loading={isLoading} />
        <StatTile
          label="On-time delivery"
          value={data ? percent(data.onTimePercent) : '—'}
          delta={data?.onTimeDelta}
          loading={isLoading}
          emphasis
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartFrame
          title="Demand vs supply by product"
          description="Where the orange bar is shorter, we have sold more than we have secured."
          legend={[
            { label: 'Demand', color: SERIES[0] },
            { label: 'Secured supply', color: SERIES[1] },
          ]}
          table={
            <ChartDataTable
              rows={gap}
              columns={[
                { key: 'product', label: 'Product' },
                { key: 'demand', label: 'Demand', align: 'right', render: (r) => qty(Math.round(r.demand)) },
                { key: 'supply', label: 'Supply', align: 'right', render: (r) => qty(Math.round(r.supply)) },
                { key: 'shortfall', label: 'Shortfall', align: 'right', render: (r) => qty(Math.round(r.shortfall)) },
              ]}
            />
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gap} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="product" {...AXIS_PROPS} interval={0} angle={-18} textAnchor="end" height={54} />
                <YAxis {...AXIS_PROPS} width={44} tickFormatter={(v: number) => numberCompact(v)} />
                <RTooltip
                  cursor={{ fill: CHART.grid, opacity: 0.5 }}
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <ChartTooltip
                        label={String(label)}
                        rows={payload.map((p) => ({
                          name: String(p.name),
                          value: qty(Math.round(Number(p.value))),
                          color: String(p.color),
                        }))}
                      />
                    ) : null
                  }
                />
                <Bar name="Demand" dataKey="demand" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar name="Secured supply" dataKey="supply" fill={SERIES[1]} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title="Volume by product"
          description="What we actually move."
          table={
            <ChartDataTable
              rows={data?.byProduct ?? []}
              columns={[
                { key: 'name', label: 'Product' },
                { key: 'volume', label: 'Volume', align: 'right', render: (r) => qty(Math.round(r.volume)) },
                { key: 'spend', label: 'Spend', align: 'right', render: (r) => money(r.spend) },
              ]}
            />
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(data?.byProduct ?? []).slice(0, 7)}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
              >
                <CartesianGrid stroke={CHART.grid} horizontal={false} />
                <XAxis type="number" {...AXIS_PROPS} tickFormatter={(v: number) => numberCompact(v)} />
                <YAxis
                  type="category"
                  dataKey="name"
                  {...AXIS_PROPS}
                  width={124}
                  tick={{ fill: CHART.textSecondary, fontSize: 11 }}
                />
                <RTooltip
                  cursor={{ fill: CHART.grid, opacity: 0.5 }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <ChartTooltip
                        label={String(payload[0].payload.name)}
                        rows={[
                          { name: 'Volume', value: qty(Math.round(Number(payload[0].payload.volume))) },
                          { name: 'Spend', value: money(Number(payload[0].payload.spend)) },
                        ]}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="volume" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {(data?.byProduct ?? []).slice(0, 7).map((_, i) => (
                    <Cell key={i} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Supplier scorecard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2 text-left font-semibold">Supplier</th>
                  <th className="px-3 py-2 text-right font-semibold">Volume</th>
                  <th className="px-3 py-2 text-right font-semibold">Spend</th>
                  <th className="px-3 py-2 text-left font-semibold">On-time</th>
                  <th className="px-3 py-2 text-right font-semibold">Quality</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topSuppliers ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="max-w-56 truncate px-3 py-2 text-ink">{s.name}</td>
                    <td className="tnum px-3 py-2 text-right text-ink-secondary">{qty(Math.round(s.volume))}</td>
                    <td className="px-3 py-2 text-right">
                      <Money value={s.spend} compact />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Meter
                          value={s.onTime}
                          tone={s.onTime > 90 ? 'good' : s.onTime > 75 ? 'warning' : 'critical'}
                          className="w-24"
                          label={`${s.name} on-time rate`}
                        />
                        <span className="tnum w-9 text-[11px] text-ink-muted">{s.onTime}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Badge tone={s.quality > 90 ? 'good' : s.quality > 75 ? 'warning' : 'critical'}>
                        {s.quality}%
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

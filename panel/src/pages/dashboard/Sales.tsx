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
import { Money } from '@/components/common/Money';
import { ChartFrame, ChartTooltip, ChartDataTable } from '@/components/charts/ChartFrame';
import { AXIS_PROPS, CHART, SEQUENTIAL, SERIES } from '@/components/charts/palette';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { getCustomerScores, getSalesOverview } from '@/api/analytics';
import { money, numberCompact, percent, qty, toRupees } from '@/lib/format';

export default function SalesDashboard() {
  const { user, can } = useAuth();
  const [range, setRange] = useState('fy');

  // A sales executive sees their own book unless they hold `viewAll`.
  const handlerId = can('salesDashboard', 'viewAll') ? null : user.id;
  const showMargin = can('salesDashboard', 'viewMargin');

  const { data, isLoading } = useQuery({
    queryKey: qk.sales.overview(range, handlerId),
    queryFn: () => getSalesOverview(range, handlerId),
  });
  const { data: customers = [] } = useQuery({
    queryKey: qk.sales.customers(range),
    queryFn: () => getCustomerScores(),
    enabled: showMargin,
  });

  const monthly = (data?.byMonth ?? []).map((m) => ({
    label: m.label,
    revenue: toRupees(Number(m.revenue)),
    target: toRupees(Number(m.target)),
  }));

  const products = (data?.byProduct ?? []).slice(0, 6).map((p) => ({
    ...p,
    value: toRupees(p.revenue),
  }));

  return (
    <>
      <PageHeader
        title="Sales"
        description={
          handlerId
            ? 'Your book. Volume, revenue and the margin behind each deal.'
            : 'Company-wide volume, revenue and margin by product and region.'
        }
        filters={
          <>
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
            {handlerId && <Badge tone="outline">Showing only your accounts</Badge>}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Revenue"
          value={<Money value={data?.revenue ?? 0} compact />}
          delta={data?.revenueDelta}
          loading={isLoading}
          emphasis
        />
        <StatTile
          label="Volume"
          value={data ? qty(Math.round(data.volume)) : '—'}
          sublabel="MT / KL combined"
          delta={data?.volumeDelta}
          loading={isLoading}
        />
        <StatTile
          label="Orders"
          value={data?.orders ?? 0}
          sublabel={data ? `${data.activeCustomers} active customers` : undefined}
          delta={data?.ordersDelta}
          loading={isLoading}
        />
        {showMargin ? (
          <StatTile
            label="Average margin"
            value={data ? percent(data.avgMarginPercent) : '—'}
            delta={data?.marginDelta}
            loading={isLoading}
          />
        ) : (
          <StatTile
            label="Average margin"
            value="Restricted"
            sublabel="Requires the 'See deal margin' permission"
            loading={isLoading}
          />
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ChartFrame
          title="Revenue against target"
          legend={[
            { label: 'Revenue', color: SERIES[0] },
            { label: 'Target', color: SERIES[1] },
          ]}
          table={
            <ChartDataTable
              rows={monthly}
              columns={[
                { key: 'label', label: 'Month' },
                { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => `₹${numberCompact(r.revenue)}` },
                { key: 'target', label: 'Target', align: 'right', render: (r) => `₹${numberCompact(r.target)}` },
              ]}
            />
          }
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
                <Bar name="Revenue" dataKey="revenue" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={34} />
                <Line
                  name="Target"
                  type="monotone"
                  dataKey="target"
                  stroke={SERIES[1]}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>

        <ChartFrame
          title="Revenue by product"
          description="Ranked. One hue, stepped by size — this is magnitude, not identity."
          table={
            <ChartDataTable
              rows={products}
              columns={[
                { key: 'name', label: 'Product' },
                { key: 'volume', label: 'Volume', align: 'right', render: (r) => qty(Math.round(r.volume)) },
                { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => money(r.revenue) },
              ]}
            />
          }
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={products}
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
                          { name: 'Revenue', value: money(Number(payload[0].payload.revenue)) },
                          { name: 'Volume', value: qty(Math.round(Number(payload[0].payload.volume))) },
                        ]}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {products.map((_, i) => (
                    <Cell key={i} fill={SEQUENTIAL[Math.max(0, SEQUENTIAL.length - 1 - i)]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartFrame>
      </div>

      {showMargin && customers.length > 0 && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>Customer 360 — who actually makes us money</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                    <th className="px-3 py-2 text-left font-semibold">Customer</th>
                    <th className="px-3 py-2 text-left font-semibold">Tier</th>
                    <th className="px-3 py-2 text-right font-semibold">Revenue</th>
                    <th className="px-3 py-2 text-right font-semibold">Contribution</th>
                    <th className="px-3 py-2 text-right font-semibold">Margin</th>
                    <th className="px-3 py-2 text-right font-semibold">DSO</th>
                    <th className="px-3 py-2 text-right font-semibold">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-line last:border-0">
                      <td className="max-w-56 truncate px-3 py-2 text-ink">
                        {c.name}
                        <span className="ml-1.5 text-[11px] text-ink-muted">{c.state}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge tone={c.tier === 'Platinum' ? 'primary' : c.tier === 'Gold' ? 'good' : 'neutral'}>
                          {c.tier}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Money value={c.revenue} compact />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Money value={c.contribution} compact tone="good" />
                      </td>
                      <td className="tnum px-3 py-2 text-right text-ink-secondary">
                        {percent(c.marginPercent)}
                      </td>
                      <td className="tnum px-3 py-2 text-right text-ink-secondary">{c.dso}d</td>
                      <td className="tnum px-3 py-2 text-right text-ink-secondary">{c.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

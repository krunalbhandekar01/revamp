import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { Megaphone, Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { Money } from '@/components/common/Money';
import { ChartFrame, ChartTooltip, ChartDataTable } from '@/components/charts/ChartFrame';
import { AXIS_PROPS, CHART, SEQUENTIAL } from '@/components/charts/palette';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Meter } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { Can } from '@/rbac/can';
import { qk } from '@/api/client';
import { getCampaigns, getSegments } from '@/api/crm';
import { moneyCompact, numberCompact, percent, relative, shortDate } from '@/lib/format';
import { sumBy } from '@/lib/utils';

const STATUS_TONE: Record<string, 'good' | 'primary' | 'warning' | 'neutral'> = {
  Running: 'primary',
  Completed: 'good',
  Scheduled: 'neutral',
  Paused: 'warning',
  Draft: 'neutral',
};

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading } = useQuery({ queryKey: qk.crm.campaigns, queryFn: getCampaigns });
  const { data: segments = [] } = useQuery({ queryKey: qk.crm.segments, queryFn: getSegments });

  const spend = sumBy(campaigns, (c) => c.spend);
  const revenue = sumBy(campaigns, (c) => c.revenueInfluenced);
  const leads = sumBy(campaigns, (c) => c.leadsGenerated);

  const roiRows = campaigns
    .filter((c) => c.spend > 0)
    .map((c) => ({
      name: c.name,
      roi: c.spend ? c.revenueInfluenced / c.spend : 0,
      spend: c.spend,
      revenue: c.revenueInfluenced,
      leads: c.leadsGenerated,
    }))
    .sort((a, b) => b.roi - a.roi);

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="What we spent, what it generated, and which audience it went to."
        actions={
          <Can module="campaign" action="create">
            <Button variant="primary">
              <Plus /> New campaign
            </Button>
          </Can>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Spend" value={<Money value={spend} compact />} loading={isLoading} />
        <StatTile
          label="Revenue influenced"
          value={<Money value={revenue} compact />}
          sublabel={spend ? `${(revenue / spend).toFixed(1)}× return` : undefined}
          loading={isLoading}
          emphasis
        />
        <StatTile label="Leads generated" value={leads} loading={isLoading} />
        <StatTile
          label="Deals created"
          value={sumBy(campaigns, (c) => c.dealsCreated)}
          loading={isLoading}
        />
      </div>

      <Tabs defaultValue="campaigns" className="mt-5">
        <TabsList>
          <TabsTrigger value="campaigns">
            <Megaphone /> Campaigns
          </TabsTrigger>
          <TabsTrigger value="segments">
            <Users /> Segments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-5">
          <ChartFrame
            title="Return on spend"
            description="Revenue influenced divided by spend. Longer is better."
            table={
              <ChartDataTable
                rows={roiRows}
                columns={[
                  { key: 'name', label: 'Campaign' },
                  { key: 'spend', label: 'Spend', align: 'right', render: (r) => moneyCompact(r.spend) },
                  { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => moneyCompact(r.revenue) },
                  { key: 'roi', label: 'Return', align: 'right', render: (r) => `${r.roi.toFixed(1)}×` },
                ]}
              />
            }
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roiRows} layout="vertical" margin={{ top: 4, right: 32, bottom: 0, left: 8 }}>
                  <CartesianGrid stroke={CHART.grid} horizontal={false} />
                  <XAxis type="number" {...AXIS_PROPS} tickFormatter={(v: number) => `${v.toFixed(0)}×`} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    {...AXIS_PROPS}
                    width={170}
                    tick={{ fill: CHART.textSecondary, fontSize: 11 }}
                  />
                  <RTooltip
                    cursor={{ fill: CHART.grid, opacity: 0.5 }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <ChartTooltip
                          label={String(payload[0].payload.name)}
                          rows={[
                            { name: 'Return', value: `${Number(payload[0].payload.roi).toFixed(1)}×` },
                            { name: 'Spend', value: moneyCompact(Number(payload[0].payload.spend)) },
                            { name: 'Revenue', value: moneyCompact(Number(payload[0].payload.revenue)) },
                            { name: 'Leads', value: String(payload[0].payload.leads) },
                          ]}
                        />
                      ) : null
                    }
                  />
                  <Bar dataKey="roi" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {roiRows.map((_, i) => (
                      <Cell key={i} fill={SEQUENTIAL[Math.max(1, SEQUENTIAL.length - 1 - i)]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartFrame>

          <Card>
            <CardHeader>
              <CardTitle>All campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
                  <thead>
                    <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                      <th className="px-3 py-2 text-left font-semibold">Campaign</th>
                      <th className="px-3 py-2 text-left font-semibold">Channel</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                      <th className="px-3 py-2 text-left font-semibold">Audience</th>
                      <th className="px-3 py-2 text-right font-semibold">Sent</th>
                      <th className="px-3 py-2 text-left font-semibold">Engagement</th>
                      <th className="px-3 py-2 text-right font-semibold">Leads</th>
                      <th className="px-3 py-2 text-right font-semibold">Revenue</th>
                      <th className="px-3 py-2 text-left font-semibold">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => {
                      const openRate = c.delivered ? (c.opened / c.delivered) * 100 : 0;
                      return (
                        <tr key={c.id} className="border-b border-line last:border-0">
                          <td className="px-3 py-2">
                            <div className="text-ink">{c.name}</div>
                            <div className="text-[11px] text-ink-muted">
                              {shortDate(c.startDate)}
                              {c.endDate ? ` → ${shortDate(c.endDate)}` : ' → ongoing'}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-ink-secondary">{c.channel}</td>
                          <td className="px-3 py-2">
                            <Badge tone={STATUS_TONE[c.status] ?? 'neutral'}>{c.status}</Badge>
                          </td>
                          <td className="max-w-40 truncate px-3 py-2 text-ink-secondary">
                            {c.segmentName ?? 'Ad-hoc list'}
                          </td>
                          <td className="tnum px-3 py-2 text-right text-ink-secondary">
                            {c.sent ? numberCompact(c.sent) : '—'}
                          </td>
                          <td className="px-3 py-2">
                            {c.delivered ? (
                              <div className="flex items-center gap-2">
                                <Meter
                                  value={openRate}
                                  className="w-16"
                                  tone={openRate > 40 ? 'good' : openRate > 20 ? 'warning' : 'critical'}
                                  label="Open rate"
                                />
                                <span className="tnum text-[11px] text-ink-muted">{percent(openRate, 0)}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-ink-muted">—</span>
                            )}
                          </td>
                          <td className="tnum px-3 py-2 text-right text-ink">{c.leadsGenerated}</td>
                          <td className="px-3 py-2 text-right">
                            <Money value={c.revenueInfluenced} compact />
                          </td>
                          <td className="px-3 py-2">
                            <OwnerChip name={c.ownerName} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments">
          <div className="grid gap-3 md:grid-cols-2">
            {segments.map((s) => (
              <Card key={s.id}>
                <CardHeader>
                  <div className="min-w-0">
                    <CardTitle>{s.name}</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-secondary">{s.description}</p>
                  </div>
                  <Badge tone="primary">{s.memberCount}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                    Rules
                  </div>
                  <ul className="space-y-1">
                    {s.rules.map((r) => (
                      <li key={r} className="flex items-start gap-1.5 text-xs text-ink-secondary">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-muted" aria-hidden />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] text-ink-muted">Recalculated {relative(s.updatedAt)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

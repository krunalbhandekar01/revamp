import { mock } from './client';
import { BUSINESSES, DISPATCHES, LEADS, ORDERS, PRODUCTS } from '@/mocks/db';
import { groupBy, sumBy } from '@/lib/utils';
import type { Paisa, SeriesPoint } from '@/types/domain';

/* ------------------------------------------------------------------- sales */

export interface SalesOverview {
  revenue: Paisa;
  volume: number;
  orders: number;
  activeCustomers: number;
  avgMarginPercent: number;
  revenueDelta: number;
  volumeDelta: number;
  ordersDelta: number;
  marginDelta: number;
  byMonth: SeriesPoint[];
  byProduct: { name: string; revenue: Paisa; margin: Paisa; volume: number }[];
  byState: { name: string; revenue: Paisa; orders: number }[];
  funnel: { stage: string; count: number }[];
}

export function getSalesOverview(_range: string, handlerId: string | null): Promise<SalesOverview> {
  return mock(() => {
    const orders = handlerId ? ORDERS.filter((o) => o.salesHandlerId === handlerId) : ORDERS;
    const ids = new Set(orders.map((o) => o.id));
    const dispatches = DISPATCHES.filter((d) => ids.has(d.orderId));

    const revenue = sumBy(dispatches, (d) => d.tradingPrice * d.qty);
    const cogs = sumBy(dispatches, (d) => d.purchasingPrice * d.qty);
    const volume = sumBy(dispatches, (d) => d.qty);

    const byProductGroups = groupBy(dispatches, (d) => d.productName);
    const byProduct = Object.entries(byProductGroups)
      .map(([name, rows]) => ({
        name,
        revenue: sumBy(rows, (d) => d.tradingPrice * d.qty),
        margin: sumBy(rows, (d) => (d.tradingPrice - d.purchasingPrice) * d.qty),
        volume: sumBy(rows, (d) => d.qty),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const byStateGroups = groupBy(orders, (o) => o.state);
    const byState = Object.entries(byStateGroups)
      .map(([name, rows]) => ({
        name,
        revenue: sumBy(rows, (o) => o.tradingPrice * o.qty),
        orders: rows.length,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const byMonth: SeriesPoint[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const jitter = 0.74 + ((i * 29) % 13) / 20;
      return {
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        revenue: Math.round((revenue / 6) * jitter),
        target: Math.round((revenue / 6) * 1.08),
      };
    });

    const stages = [
      { stage: 'Leads', count: LEADS.length },
      { stage: 'Contacted', count: LEADS.filter((l) => l.status !== 'Yet to be contacted').length },
      { stage: 'Qualified', count: LEADS.filter((l) => ['Qualified', 'Proposal Sent', 'Converted'].includes(l.status)).length },
      { stage: 'Quoted', count: LEADS.filter((l) => ['Proposal Sent', 'Converted'].includes(l.status)).length },
      { stage: 'Won', count: LEADS.filter((l) => l.status === 'Converted').length },
    ];

    return {
      revenue,
      volume,
      orders: orders.length,
      activeCustomers: new Set(orders.map((o) => o.buyerId)).size,
      avgMarginPercent: revenue ? ((revenue - cogs) / revenue) * 100 : 0,
      revenueDelta: 11.2,
      volumeDelta: 6.8,
      ordersDelta: -2.1,
      marginDelta: 0.7,
      byMonth,
      byProduct,
      byState,
      funnel: stages,
    };
  });
}

/** Customer 360 roll-up: who actually makes us money. */
export function getCustomerScores(limit = 12) {
  return mock(() =>
    BUSINESSES.filter((b) => b.kind === 'Buyer' && b.orderCount > 0)
      .map((b) => ({
        id: b.id,
        name: b.name,
        state: b.state,
        revenue: b.lifetimeRevenue,
        contribution: b.lifetimeContribution,
        marginPercent: b.lifetimeRevenue ? (b.lifetimeContribution / b.lifetimeRevenue) * 100 : 0,
        dso: b.dso,
        reliability: b.paymentReliability,
        orders: b.orderCount,
        tier:
          b.lifetimeContribution > 60000000
            ? 'Platinum'
            : b.lifetimeContribution > 25000000
              ? 'Gold'
              : 'Silver',
      }))
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, limit),
  );
}

/* ---------------------------------------------------------------- sourcing */

export interface SourcingOverview {
  suppliers: number;
  volume: number;
  spend: Paisa;
  onTimePercent: number;
  volumeDelta: number;
  spendDelta: number;
  onTimeDelta: number;
  suppliersDelta: number;
  byProduct: { name: string; volume: number; spend: Paisa }[];
  topSuppliers: {
    id: string;
    name: string;
    volume: number;
    spend: Paisa;
    onTime: number;
    quality: number;
  }[];
  supplyGap: { product: string; demand: number; supply: number }[];
}

export function getSourcingOverview(_range: string): Promise<SourcingOverview> {
  return mock(() => {
    const spend = sumBy(DISPATCHES, (d) => d.purchasingPrice * d.qty);
    const volume = sumBy(DISPATCHES, (d) => d.qty);

    const byProduct = Object.entries(groupBy(DISPATCHES, (d) => d.productName))
      .map(([name, rows]) => ({
        name,
        volume: sumBy(rows, (d) => d.qty),
        spend: sumBy(rows, (d) => d.purchasingPrice * d.qty),
      }))
      .sort((a, b) => b.volume - a.volume);

    const topSuppliers = Object.entries(groupBy(DISPATCHES, (d) => d.sellerId))
      .map(([id, rows]) => {
        const b = BUSINESSES.find((x) => x.id === id);
        return {
          id,
          name: rows[0].sellerName,
          volume: sumBy(rows, (d) => d.qty),
          spend: sumBy(rows, (d) => d.purchasingPrice * d.qty),
          onTime: b ? Math.min(99, b.paymentReliability + 4) : 80,
          quality: b ? Math.min(99, b.paymentReliability + 1) : 78,
        };
      })
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 8);

    const supplyGap = PRODUCTS.slice(0, 6).map((p) => {
      const demand = sumBy(
        ORDERS.filter((o) => o.productName === p.name),
        (o) => o.qty,
      );
      const supply = sumBy(
        DISPATCHES.filter((d) => d.productName === p.name),
        (d) => d.qty,
      );
      return { product: p.name, demand, supply };
    });

    return {
      suppliers: new Set(DISPATCHES.map((d) => d.sellerId)).size,
      volume,
      spend,
      onTimePercent: 87.3,
      volumeDelta: 5.1,
      spendDelta: 9.7,
      onTimeDelta: -2.4,
      suppliersDelta: 3.0,
      byProduct,
      topSuppliers,
      supplyGap,
    };
  });
}

/* --------------------------------------------------------------- marketing */

export interface MarketingOverview {
  leads: number;
  qualified: number;
  converted: number;
  conversionRate: number;
  leadsDelta: number;
  qualifiedDelta: number;
  convertedDelta: number;
  conversionDelta: number;
  bySource: { source: string; leads: number; converted: number; revenue: Paisa }[];
  byMonth: SeriesPoint[];
  byStatus: { status: string; count: number }[];
}

export function getMarketingOverview(_range: string): Promise<MarketingOverview> {
  return mock(() => {
    const bySource = Object.entries(groupBy(LEADS, (l) => l.source))
      .map(([source, rows]) => {
        const converted = rows.filter((r) => r.status === 'Converted').length;
        return {
          source,
          leads: rows.length,
          converted,
          revenue: converted * 42_00_000 * 100,
        };
      })
      .sort((a, b) => b.leads - a.leads);

    const byMonth: SeriesPoint[] = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        leads: 28 + ((i * 17) % 22),
        converted: 4 + ((i * 7) % 9),
      };
    });

    const byStatus = Object.entries(groupBy(LEADS, (l) => l.status)).map(([status, rows]) => ({
      status,
      count: rows.length,
    }));

    const converted = LEADS.filter((l) => l.status === 'Converted').length;
    return {
      leads: LEADS.length,
      qualified: LEADS.filter((l) => ['Qualified', 'Proposal Sent', 'Converted'].includes(l.status)).length,
      converted,
      conversionRate: (converted / LEADS.length) * 100,
      leadsDelta: 14.6,
      qualifiedDelta: 9.1,
      convertedDelta: 3.3,
      conversionDelta: -1.2,
      bySource,
      byMonth,
      byStatus,
    };
  });
}

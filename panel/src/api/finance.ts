import { mock } from './client';
import { BUSINESSES, DISPATCHES, RECEIVABLES } from '@/mocks/db';
import { sumBy } from '@/lib/utils';
import type { Paisa, Receivable, SeriesPoint } from '@/types/domain';

export interface FinanceOverview {
  revenue: Paisa;
  grossMargin: Paisa;
  marginPercent: Paisa;
  /** Margin net of the cost of the cash locked up to earn it. */
  netContribution: Paisa;
  financingCost: Paisa;
  outstanding: Paisa;
  overdue: Paisa;
  dso: number;
  revenueDelta: number;
  marginDelta: number;
  dsoDelta: number;
  monthly: SeriesPoint[];
}

const COST_OF_CAPITAL = 0.124; // blended annual rate across facilities

export function getFinanceOverview(range: string): Promise<FinanceOverview> {
  return mock(() => {
    const months = range === 'fy' ? 12 : range === '90d' ? 3 : 6;
    const completed = DISPATCHES.filter((d) => d.status === 'Completed' || d.status === 'Dispatched');

    const revenue = sumBy(completed, (d) => d.tradingPrice * d.qty);
    const cogs = sumBy(completed, (d) => d.purchasingPrice * d.qty);
    // Transport is billed on to the buyer and nets out. Only the charges we
    // genuinely absorb — unloading, halting, misc — reduce margin.
    const absorbedCharges = sumBy(completed, (d) => d.otherCharges);
    const grossMargin = revenue - cogs - absorbedCharges;

    const outstanding = sumBy(RECEIVABLES, (r) => r.amount - r.paidSoFar);
    const overdue = sumBy(
      RECEIVABLES.filter((r) => r.daysOverdue > 0),
      (r) => r.amount - r.paidSoFar,
    );
    const avgDays = RECEIVABLES.length
      ? sumBy(RECEIVABLES, (r) => Math.max(0, r.daysOverdue) + 30) / RECEIVABLES.length
      : 0;
    const financingCost = Math.round(outstanding * COST_OF_CAPITAL * (avgDays / 365));

    // Monthly series, newest last.
    const monthly: SeriesPoint[] = Array.from({ length: months }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (months - 1 - i));
      const share = 1 / months;
      const jitter = 0.72 + ((i * 37) % 11) / 18;
      return {
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        revenue: Math.round(revenue * share * jitter),
        margin: Math.round(grossMargin * share * jitter * (0.85 + ((i * 13) % 7) / 20)),
        collected: Math.round(revenue * share * jitter * 0.82),
      };
    });

    return {
      revenue,
      grossMargin,
      marginPercent: revenue ? (grossMargin / revenue) * 100 : 0,
      netContribution: grossMargin - financingCost,
      financingCost,
      outstanding,
      overdue,
      dso: Math.round(avgDays),
      revenueDelta: 8.4,
      marginDelta: -1.9,
      dsoDelta: 4.2,
      monthly,
    };
  });
}

export interface AgeingBucket {
  label: string;
  amount: Paisa;
  count: number;
}

export function getAgeing(): Promise<AgeingBucket[]> {
  return mock(() => {
    const buckets: { label: string; lo: number; hi: number }[] = [
      { label: 'Not due', lo: -9999, hi: -1 },
      { label: '0–30', lo: 0, hi: 30 },
      { label: '31–60', lo: 31, hi: 60 },
      { label: '61–90', lo: 61, hi: 90 },
      { label: '90+', lo: 91, hi: 9999 },
    ];
    return buckets.map((b) => {
      const rows = RECEIVABLES.filter((r) => r.daysOverdue >= b.lo && r.daysOverdue <= b.hi);
      return {
        label: b.label,
        amount: sumBy(rows, (r) => r.amount - r.paidSoFar),
        count: rows.length,
      };
    });
  });
}

export interface ReceivableFilters {
  search?: string;
  bucket?: string | null;
}

export function getReceivables(filters: ReceivableFilters = {}): Promise<Receivable[]> {
  return mock(() => {
    let rows = [...RECEIVABLES];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r) => r.buyerName.toLowerCase().includes(q) || r.dispatchRefNo.toLowerCase().includes(q),
      );
    }
    if (filters.bucket === 'overdue') rows = rows.filter((r) => r.daysOverdue > 0);
    if (filters.bucket === 'due-week') rows = rows.filter((r) => r.daysOverdue >= -7 && r.daysOverdue <= 0);
    return rows.sort((a, b) => b.daysOverdue - a.daysOverdue);
  });
}

/** Top exposures — who owes us the most, and how reliable are they. */
export function getTopExposures(limit = 8) {
  return mock(() =>
    BUSINESSES.filter((b) => b.kind === 'Buyer' && b.openExposure > 0)
      .sort((a, b) => b.openExposure - a.openExposure)
      .slice(0, limit)
      .map((b) => ({
        id: b.id,
        name: b.name,
        exposure: b.openExposure,
        creditLimit: b.creditLimit,
        utilisation: b.creditLimit ? (b.openExposure / b.creditLimit) * 100 : 0,
        dso: b.dso,
        reliability: b.paymentReliability,
      })),
  );
}

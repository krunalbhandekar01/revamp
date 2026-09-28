import { mock } from './client';
import { BUSINESSES, DISPATCHES, LEADS, ORDERS, PAYMENTS, RECON_ITEMS, SCHEDULES, TEAM } from '@/mocks/db';
import { sumBy } from '@/lib/utils';
import type {
  Business,
  DeliverySchedule,
  Dispatch,
  Lead,
  Moderator,
  Order,
  Payment,
  ReconItem,
} from '@/types/domain';

const contains = (haystack: string, needle: string) =>
  haystack.toLowerCase().includes(needle.toLowerCase());

/* ------------------------------------------------------------------ orders */

export interface OrderFilters {
  search?: string;
  status?: string[] | null;
  product?: string[] | null;
}

export function getOrders(filters: OrderFilters = {}): Promise<Order[]> {
  return mock(() => {
    let rows = [...ORDERS];
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter(
        (o) =>
          contains(o.refNo, q) ||
          contains(o.buyerName, q) ||
          contains(o.sellerName, q) ||
          contains(o.productName, q),
      );
    }
    if (filters.status?.length) rows = rows.filter((o) => filters.status!.includes(o.status));
    if (filters.product?.length) rows = rows.filter((o) => filters.product!.includes(o.productName));
    return rows.sort((a, b) => +new Date(b.orderDate) - +new Date(a.orderDate));
  });
}

/* -------------------------------------------------------------- dispatches */

export interface DispatchFilters {
  search?: string;
  status?: string[] | null;
  transitStatus?: string[] | null;
  payableStatus?: string[] | null;
}

export function getDispatches(filters: DispatchFilters = {}): Promise<Dispatch[]> {
  return mock(() => {
    let rows = [...DISPATCHES];
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter(
        (d) =>
          contains(d.refNo, q) ||
          contains(d.buyerName, q) ||
          contains(d.sellerName, q) ||
          contains(d.vehicleNo, q) ||
          contains(d.productName, q),
      );
    }
    if (filters.status?.length) rows = rows.filter((d) => filters.status!.includes(d.status));
    if (filters.transitStatus?.length)
      rows = rows.filter((d) => filters.transitStatus!.includes(d.transitStatus));
    if (filters.payableStatus?.length)
      rows = rows.filter((d) => filters.payableStatus!.includes(d.payableStatus));
    return rows.sort((a, b) => (b.dispatchedOn ?? '').localeCompare(a.dispatchedOn ?? ''));
  });
}

export interface ExceptionGroup {
  key: string;
  label: string;
  description: string;
  severity: 'critical' | 'serious' | 'warning';
  count: number;
  rows: Dispatch[];
}

/**
 * The exception workspace: what ops should act on today, instead of scanning a
 * 3,000-row table. Each group is one rule with one action behind it.
 */
export function getDispatchExceptions(): Promise<ExceptionGroup[]> {
  return mock(() => {
    const stuckInTransit = DISPATCHES.filter(
      (d) =>
        d.status === 'Dispatched' &&
        d.dispatchedOn &&
        (Date.now() - +new Date(d.dispatchedOn)) / 86400000 > 6,
    );
    const missingDocs = DISPATCHES.filter((d) => !d.docsComplete && d.status !== 'Cancelled');
    const notSynced = DISPATCHES.filter((d) => d.salesBillNo && !d.zohoSynced);
    const grnPending = DISPATCHES.filter(
      (d) => d.status === 'Completed' && !d.grnAccepted,
    );
    const payableStuck = DISPATCHES.filter(
      (d) => d.payableStatus === 'Awaiting Clearance' && d.status === 'Completed',
    );

    return [
      {
        key: 'not-synced',
        label: 'Invoice not acknowledged by Zoho',
        description: 'A sales bill exists but Zoho Books never confirmed it. Revenue is unrecorded.',
        severity: 'critical' as const,
        count: notSynced.length,
        rows: notSynced.slice(0, 50),
      },
      {
        key: 'stuck-transit',
        label: 'In transit beyond 6 days',
        description: 'Dispatched but not delivered. Either the ETA is wrong or the load is stuck.',
        severity: 'serious' as const,
        count: stuckInTransit.length,
        rows: stuckInTransit.slice(0, 50),
      },
      {
        key: 'grn-pending',
        label: 'GRN not accepted',
        description: 'Goods delivered but no buyer acceptance. Blocks payout and invites disputes.',
        severity: 'serious' as const,
        count: grnPending.length,
        rows: grnPending.slice(0, 50),
      },
      {
        key: 'payable-stuck',
        label: 'Payable awaiting clearance',
        description: 'Completed dispatches the supplier cannot be paid against yet.',
        severity: 'warning' as const,
        count: payableStuck.length,
        rows: payableStuck.slice(0, 50),
      },
      {
        key: 'missing-docs',
        label: 'Documents incomplete',
        description: 'Missing invoice, e-way bill or weighment slip on an active dispatch.',
        severity: 'warning' as const,
        count: missingDocs.length,
        rows: missingDocs.slice(0, 50),
      },
    ].filter((g) => g.count > 0);
  });
}

/* ---------------------------------------------------------------- payments */

export interface PaymentFilters {
  search?: string;
  direction?: string | null;
  status?: string[] | null;
}

export function getPayments(filters: PaymentFilters = {}): Promise<Payment[]> {
  return mock(() => {
    let rows = [...PAYMENTS];
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter((p) => contains(p.refNo, q) || contains(p.counterpartyName, q));
    }
    if (filters.direction) rows = rows.filter((p) => p.direction === filters.direction);
    if (filters.status?.length) rows = rows.filter((p) => filters.status!.includes(p.status));
    return rows.sort((a, b) => +new Date(b.paymentDate) - +new Date(a.paymentDate));
  });
}

/* -------------------------------------------------------------- businesses */

export interface BusinessFilters {
  search?: string;
  kind?: string | null;
  status?: string[] | null;
}

export function getBusinesses(filters: BusinessFilters = {}): Promise<Business[]> {
  return mock(() => {
    let rows = [...BUSINESSES];
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter((b) => contains(b.name, q) || contains(b.gstin, q) || contains(b.city, q));
    }
    if (filters.kind) rows = rows.filter((b) => b.kind === filters.kind);
    if (filters.status?.length) rows = rows.filter((b) => filters.status!.includes(b.status));
    return rows.sort((a, b) => b.lifetimeContribution - a.lifetimeContribution);
  });
}

export function getBusiness(id: string): Promise<Business | null> {
  return mock(() => BUSINESSES.find((b) => b.id === id) ?? null);
}

/* ------------------------------------------------------------------- leads */

export interface LeadFilters {
  search?: string;
  status?: string[] | null;
  source?: string[] | null;
}

export function getLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  return mock(() => {
    let rows = [...LEADS];
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter((l) => contains(l.companyName, q) || contains(l.name, q) || contains(l.phone, q));
    }
    if (filters.status?.length) rows = rows.filter((l) => filters.status!.includes(l.status));
    if (filters.source?.length) rows = rows.filter((l) => filters.source!.includes(l.source));
    return rows.sort((a, b) => b.score - a.score);
  });
}

/* --------------------------------------------------------------- schedules */

export function getSchedules(filters: { status?: string[] | null } = {}): Promise<DeliverySchedule[]> {
  return mock(() => {
    let rows = [...SCHEDULES];
    if (filters.status?.length) rows = rows.filter((s) => filters.status!.includes(s.status));
    return rows.sort((a, b) => b.riskRatio - a.riskRatio);
  });
}

/* ---------------------------------------------------------- reconciliation */

export interface ReconHealth {
  total: number;
  matched: number;
  unmatched: number;
  variance: number;
  failed: number;
  varianceAmount: number;
  matchRate: number;
  lastSyncAt: string;
}

export function getReconHealth(): Promise<ReconHealth> {
  return mock(() => {
    const by = (s: ReconItem['status']) => RECON_ITEMS.filter((r) => r.status === s);
    const matched = by('matched').length;
    return {
      total: RECON_ITEMS.length,
      matched,
      unmatched: by('unmatched').length,
      variance: by('variance').length,
      failed: by('failed').length,
      varianceAmount: sumBy(by('variance'), (r) => r.variance),
      matchRate: (matched / RECON_ITEMS.length) * 100,
      lastSyncAt: RECON_ITEMS.map((r) => r.syncedAt).sort().at(-1) ?? new Date().toISOString(),
    };
  });
}

export function getReconItems(filters: { status?: string[] | null; search?: string } = {}) {
  return mock(() => {
    let rows = [...RECON_ITEMS];
    if (filters.status?.length) rows = rows.filter((r) => filters.status!.includes(r.status));
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter((r) => contains(r.reference, q) || contains(r.counterpartyName, q));
    }
    return rows.sort((a, b) => +new Date(b.syncedAt) - +new Date(a.syncedAt));
  });
}

/* -------------------------------------------------------------------- team */

export function getTeam(): Promise<Moderator[]> {
  return mock(() => [...TEAM]);
}

export function updateTeamMember(id: string, patch: Partial<Moderator>): Promise<void> {
  return mock(() => {
    const i = TEAM.findIndex((m) => m.id === id);
    if (i >= 0) TEAM[i] = { ...TEAM[i], ...patch };
  });
}

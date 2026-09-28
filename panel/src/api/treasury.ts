import { mock } from './client';
import { ALLOCATION_QUEUE, BANK_ACCOUNTS, CASH_POSITION, FACILITIES, RECEIVABLES } from '@/mocks/db';
import { sumBy } from '@/lib/utils';
import type {
  AllocationDecision,
  BankAccount,
  CashPositionDay,
  FundAllocationCandidate,
  FundFacility,
  Paisa,
} from '@/types/domain';

export interface TreasurySummary {
  bankBalance: Paisa;
  facilityAvailable: Paisa;
  committedToday: Paisa;
  releasableToday: Paisa;
  /** Weighted by each buyer's collection probability, not by due date alone. */
  expectedInflow7d: Paisa;
  expectedInflowToday: Paisa;
  queueDemand: Paisa;
  overdueDemand: Paisa;
  runwayDays: number;
  accounts: BankAccount[];
  facilities: FundFacility[];
}

export function getTreasurySummary(): Promise<TreasurySummary> {
  return mock(() => {
    const bankBalance = sumBy(BANK_ACCOUNTS, (a) => a.balance);
    const facilityAvailable = sumBy(FACILITIES, (f) => f.limit - f.drawn);
    const committedToday = sumBy(
      ALLOCATION_QUEUE.filter((c) => c.state === 'approved' || c.state === 'released'),
      (c) => c.amountDue,
    );
    const queueDemand = sumBy(ALLOCATION_QUEUE, (c) => c.amountDue);
    const overdueDemand = sumBy(
      ALLOCATION_QUEUE.filter((c) => c.daysPastDue > 0),
      (c) => c.amountDue,
    );

    const open = RECEIVABLES.filter((r) => r.paidSoFar < r.amount);
    const expectedInflow7d = Math.round(
      sumBy(
        open.filter((r) => r.daysOverdue >= -7),
        (r) => (r.amount - r.paidSoFar) * r.collectionProbability,
      ),
    );
    const expectedInflowToday = Math.round(
      sumBy(
        open.filter((r) => r.daysOverdue >= 0 && r.daysOverdue <= 1),
        (r) => (r.amount - r.paidSoFar) * r.collectionProbability,
      ),
    );

    const dailyBurn = Math.max(1, Math.round(queueDemand / 30));
    return {
      bankBalance,
      facilityAvailable,
      committedToday,
      releasableToday: bankBalance + facilityAvailable - committedToday,
      expectedInflow7d,
      expectedInflowToday,
      queueDemand,
      overdueDemand,
      runwayDays: Math.round((bankBalance + facilityAvailable) / dailyBurn),
      accounts: BANK_ACCOUNTS,
      facilities: FACILITIES,
    };
  });
}

export interface AllocationFilters {
  kind?: string | null;
  recommendation?: AllocationDecision | null;
  search?: string;
}

export function getAllocationQueue(filters: AllocationFilters = {}): Promise<FundAllocationCandidate[]> {
  return mock(() => {
    let rows = [...ALLOCATION_QUEUE];
    if (filters.kind) rows = rows.filter((r) => r.kind === filters.kind);
    if (filters.recommendation) rows = rows.filter((r) => r.recommendation === filters.recommendation);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.counterpartyName.toLowerCase().includes(q) ||
          r.dispatchRefNos.some((d) => d.toLowerCase().includes(q)),
      );
    }
    return rows;
  });
}

/**
 * Records a decision. Mutates the fixture so the UI reflects it immediately.
 * In production this is `PUT /treasury/allocation/:id` and the mutation
 * invalidates `qk.treasury.*`.
 */
export function decideAllocation(id: string, state: FundAllocationCandidate['state']): Promise<void> {
  return mock(() => {
    const row = ALLOCATION_QUEUE.find((r) => r.id === id);
    if (row) row.state = state;
  });
}

export function decideAllocationBulk(
  ids: string[],
  state: FundAllocationCandidate['state'],
): Promise<void> {
  return mock(() => {
    for (const id of ids) {
      const row = ALLOCATION_QUEUE.find((r) => r.id === id);
      if (row && !row.blocked) row.state = state;
    }
  });
}

export function getCashPosition(days = 21): Promise<CashPositionDay[]> {
  return mock(() => CASH_POSITION.filter((d) => {
    const diff = Math.round((new Date(d.date).getTime() - Date.now()) / 86400000);
    return diff >= -days && diff <= days;
  }));
}

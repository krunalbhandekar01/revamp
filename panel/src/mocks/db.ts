/**
 * The in-memory dataset.
 *
 * This is the ONLY place fixtures live. Every `src/api/*` module reads from
 * here; no component imports this file directly. When the real backend is
 * wired up, `src/api/*` swaps its body for an axios call and this file is
 * deleted — nothing else changes.
 */

import {
  CITY_BY_STATE,
  PRODUCTS,
  STATES,
  bool,
  companyName,
  dayOffset,
  float,
  gstin,
  int,
  iso,
  isoDayOffset,
  makeRng,
  personName,
  pick,
  pickWeighted,
  sample,
  vehicleNo,
  TODAY,
} from './seed';
import type {
  BankAccount,
  Business,
  CashPositionDay,
  DeliverySchedule,
  Dispatch,
  FundAllocationCandidate,
  FundFacility,
  Lead,
  Moderator,
  Order,
  Payment,
  ReconItem,
  Receivable,
} from '@/types/domain';

const rng = makeRng(20260928);

/* ------------------------------------------------------------------- people */

export const CURRENT_USERS: Moderator[] = [
  {
    id: 'u-admin',
    name: 'Krunal Shah',
    email: 'krunal@buyofuel.com',
    phone: '+91 98200 11223',
    role: 'super-admin',
    jobTitle: 'Founder',
    zones: ['West', 'South', 'North'],
    operation: null,
    deactivated: false,
    lastLoginAt: isoDayOffset(0),
    overrides: {},
  },
  {
    id: 'u-fin-mgr',
    name: 'Aditi Iyer',
    email: 'aditi@buyofuel.com',
    phone: '+91 98200 44556',
    role: 'finance-manager',
    jobTitle: 'Head of Finance',
    zones: ['West', 'South', 'North'],
    operation: null,
    deactivated: false,
    lastLoginAt: isoDayOffset(0),
    overrides: {},
  },
  {
    id: 'u-fin-analyst',
    name: 'Nikhil Joshi',
    email: 'nikhil@buyofuel.com',
    phone: '+91 98200 77889',
    role: 'finance-analyst',
    jobTitle: 'Finance Analyst',
    zones: ['West'],
    operation: null,
    deactivated: false,
    lastLoginAt: isoDayOffset(-1),
    // Demonstrates the override diff in the team editor.
    overrides: { treasury: { approve: true } },
  },
  {
    id: 'u-sales-mgr',
    name: 'Rohan Desai',
    email: 'rohan@buyofuel.com',
    phone: '+91 98200 33445',
    role: 'sales-manager',
    jobTitle: 'Regional Sales Manager — West',
    zones: ['West'],
    operation: 'solids',
    deactivated: false,
    lastLoginAt: isoDayOffset(0),
    overrides: {},
  },
  {
    id: 'u-sales-exec',
    name: 'Priya Nair',
    email: 'priya@buyofuel.com',
    phone: '+91 98200 55667',
    role: 'sales-executive',
    jobTitle: 'Sales Executive',
    zones: ['South'],
    operation: 'liquids',
    deactivated: false,
    lastLoginAt: isoDayOffset(-2),
    overrides: {},
  },
  {
    id: 'u-ops-mgr',
    name: 'Vikram Rao',
    email: 'vikram@buyofuel.com',
    phone: '+91 98200 66778',
    role: 'ops-manager',
    jobTitle: 'Head of Operations',
    zones: ['West', 'North'],
    operation: 'solids',
    deactivated: false,
    lastLoginAt: isoDayOffset(0),
    overrides: {},
  },
  {
    id: 'u-sourcing',
    name: 'Meera Kulkarni',
    email: 'meera@buyofuel.com',
    phone: '+91 98200 88990',
    role: 'sourcing-manager',
    jobTitle: 'Sourcing Manager',
    zones: ['West', 'South'],
    operation: 'solids',
    deactivated: false,
    lastLoginAt: isoDayOffset(-1),
    overrides: {},
  },
  {
    id: 'u-marketing',
    name: 'Sneha Mehta',
    email: 'sneha@buyofuel.com',
    phone: '+91 98200 99001',
    role: 'marketing',
    jobTitle: 'Growth Lead',
    zones: ['West'],
    operation: null,
    deactivated: false,
    lastLoginAt: isoDayOffset(-3),
    overrides: {},
  },
];

/** Extra team members so the Team screen has volume. */
export const TEAM: Moderator[] = [
  ...CURRENT_USERS,
  ...Array.from({ length: 9 }, (_, i): Moderator => {
    const role = pick(rng, [
      'sales-executive',
      'ops-executive',
      'finance-analyst',
      'sales-manager',
      'marketing',
    ] as const);
    const name = personName(rng);
    return {
      id: `u-extra-${i}`,
      name,
      email: `${name.split(' ')[0].toLowerCase()}.${i}@buyofuel.com`,
      phone: `+91 9${int(rng, 1000000000, 9999999999)}`.slice(0, 14),
      role,
      jobTitle: pick(rng, ['Executive', 'Senior Executive', 'Associate', 'Analyst']),
      zones: sample(rng, ['West', 'South', 'North', 'East'], int(rng, 1, 2)),
      operation: pick(rng, ['solids', 'liquids', 'wastes', null] as const),
      deactivated: bool(rng, 0.12),
      lastLoginAt: isoDayOffset(-int(rng, 0, 40)),
      overrides: bool(rng, 0.25) ? { dispatch: { export: true } } : {},
    };
  }),
];

/* --------------------------------------------------------------- businesses */

function makeBusiness(i: number, kind: 'Buyer' | 'Seller'): Business {
  const state = pick(rng, STATES);
  const city = pick(rng, CITY_BY_STATE[state]);
  const orderCount = int(rng, 0, 70);
  const lifetimeRevenue = orderCount * int(rng, 180000000, 900000000);
  const marginPct = float(rng, 0.028, 0.115);
  const reliability = int(rng, 42, 99);
  return {
    id: `b-${kind === 'Buyer' ? 'by' : 'sl'}-${i}`,
    name: companyName(rng, kind),
    kind,
    status: pickWeighted(rng, [
      ['Verified', 78],
      ['Not Verified', 16],
      ['Deactivated', 6],
    ] as const),
    gstin: gstin(rng, state),
    state,
    city,
    industry: pick(rng, [
      'Paper & Pulp',
      'Textiles',
      'Cement',
      'Sugar',
      'Chemicals',
      'Food Processing',
      'Distillery',
      'Ceramics',
      'Steel',
    ]),
    kycCompleted: bool(rng, 0.82),
    zohoLinked: bool(rng, 0.74),
    createdAt: isoDayOffset(-int(rng, 30, 900)),
    lastActivityAt: isoDayOffset(-int(rng, 0, 120)),
    salesHandlerId: pick(rng, ['u-sales-mgr', 'u-sales-exec', 'u-sourcing']),
    lifetimeRevenue,
    lifetimeContribution: Math.round(lifetimeRevenue * marginPct),
    openExposure: orderCount > 0 ? int(rng, 0, 120000000) : 0,
    creditLimit: int(rng, 20, 200) * 1000000,
    dso: int(rng, 18, 96),
    paymentReliability: reliability,
    orderCount,
    tags: sample(rng, ['Key Account', 'Repeat', 'Slow Payer', 'High Margin', 'New', 'At Risk'], int(rng, 0, 2)),
  };
}

export const BUYERS: Business[] = Array.from({ length: 64 }, (_, i) => makeBusiness(i, 'Buyer'));
export const SELLERS: Business[] = Array.from({ length: 48 }, (_, i) => makeBusiness(i, 'Seller'));
export const BUSINESSES: Business[] = [...BUYERS, ...SELLERS];

/* ------------------------------------------------------------------- orders */

export const ORDERS: Order[] = Array.from({ length: 180 }, (_, i) => {
  const product = pick(rng, PRODUCTS);
  const buyer = pick(rng, BUYERS);
  const seller = pick(rng, SELLERS);
  const purchasingPrice = Math.round(product.basePrice * float(rng, 0.88, 1.14));
  const tradingPrice = Math.round(purchasingPrice * float(rng, 1.035, 1.145));
  const qtyTotal = product.unit === 'KL' ? int(rng, 8, 90) : int(rng, 40, 900);
  const status = pickWeighted(rng, [
    ['In Progress', 34],
    ['Completed', 38],
    ['Placed', 16],
    ['On Hold', 5],
    ['Draft', 4],
    ['Cancelled', 3],
  ] as const);
  const deliveredFrac = status === 'Completed' ? 1 : status === 'In Progress' ? float(rng, 0.15, 0.9) : 0;
  return {
    id: `o-${i}`,
    refNo: `ORD-${String(4200 + i)}`,
    orderDate: isoDayOffset(-int(rng, 0, 270)),
    productId: product.id,
    productName: product.name,
    buyerId: buyer.id,
    buyerName: buyer.name,
    sellerId: seller.id,
    sellerName: seller.name,
    qty: qtyTotal,
    unit: product.unit,
    purchasingPrice,
    tradingPrice,
    purchaseCreditTerm: pick(rng, [0, 0, 7, 15, 21, 30]),
    salesCreditTerm: pick(rng, [15, 30, 30, 45, 60, 75]),
    status,
    state: buyer.state,
    salesHandlerId: buyer.salesHandlerId ?? 'u-sales-mgr',
    deliveredQty: Math.round(qtyTotal * deliveredFrac),
  };
});

/* --------------------------------------------------------------- dispatches */

const LANES = [
  'Pune → Ahmedabad',
  'Coimbatore → Bengaluru',
  'Ludhiana → Panipat',
  'Indore → Nagpur',
  'Kolkata → Durgapur',
  'Hyderabad → Vijayawada',
  'Surat → Nashik',
  'Kanpur → Meerut',
];

export const DISPATCHES: Dispatch[] = Array.from({ length: 420 }, (_, i) => {
  const order = pick(rng, ORDERS.filter((o) => o.status !== 'Draft' && o.status !== 'Cancelled'));
  const qty = order.unit === 'KL' ? int(rng, 4, 26) : int(rng, 18, 120);
  const status = pickWeighted(rng, [
    ['Completed', 52],
    ['Dispatched', 28],
    ['In Preparation', 13],
    ['On Hold', 4],
    ['Cancelled', 3],
  ] as const);
  const dispatchedDaysAgo = int(rng, 0, 150);
  const inFlight = status === 'Dispatched';
  const transitStatus = inFlight
    ? pick(rng, [
        'Finding Transport',
        'Transport Allocated',
        'Awaiting Loading',
        'Loaded',
        'In Transit',
        'Awaiting Unloading',
      ] as const)
    : status === 'Completed'
      ? 'Goods Delivered'
      : 'Finding Transport';
  const payableStatus = pickWeighted(rng, [
    ['Paid', 44],
    ['Cleared for Payment', 22],
    ['Awaiting Clearance', 26],
    ['On Hold', 5],
    ['Rejected', 3],
  ] as const);
  const invoiced = status === 'Completed' || status === 'Dispatched';
  return {
    id: `d-${i}`,
    refNo: `DSP-${String(9100 + i)}`,
    trackingNo: `${String(9100 + i).padStart(4, '0')}${String(i * 7919).slice(-4)}`.toUpperCase(),
    orderId: order.id,
    orderRefNo: order.refNo,
    productName: order.productName,
    buyerId: order.buyerId,
    buyerName: order.buyerName,
    sellerId: order.sellerId,
    sellerName: order.sellerName,
    qty,
    unit: order.unit,
    purchasingPrice: order.purchasingPrice,
    tradingPrice: order.tradingPrice,
    // Transport is billed on to the buyer, so it is tracked but nets out of margin.
    transportCharges: int(rng, 30000, 260000) * qty,
    // Unloading, halting and misc — genuinely absorbed, so these DO reduce margin.
    otherCharges: int(rng, 0, 9000) * qty,
    vehicleNo: vehicleNo(rng),
    dispatchedOn: status === 'In Preparation' ? null : isoDayOffset(-dispatchedDaysAgo),
    receivedOn: status === 'Completed' ? isoDayOffset(-dispatchedDaysAgo + int(rng, 1, 5)) : null,
    invoiceDate: invoiced ? isoDayOffset(-dispatchedDaysAgo + 1) : null,
    invoiceDueDate: invoiced ? isoDayOffset(-dispatchedDaysAgo + 1 + order.salesCreditTerm) : null,
    salesBillNo: invoiced ? `BF/26-27/${String(1200 + i)}` : null,
    status,
    transitStatus,
    payableStatus,
    state: order.state,
    lane: pick(rng, LANES),
    zohoSynced: invoiced ? bool(rng, 0.86) : false,
    grnAccepted: status === 'Completed' ? bool(rng, 0.91) : false,
    docsComplete: bool(rng, 0.78),
  };
});

/* ----------------------------------------------------------------- payments */

export const PAYMENTS: Payment[] = Array.from({ length: 300 }, (_, i) => {
  const d = pick(rng, DISPATCHES);
  const direction = bool(rng, 0.55) ? 'Receivable' : 'Payable';
  const base = direction === 'Receivable' ? d.tradingPrice : d.purchasingPrice;
  return {
    id: `pay-${i}`,
    refNo: `PAY-${String(7700 + i)}`,
    direction,
    counterpartyId: direction === 'Receivable' ? d.buyerId : d.sellerId,
    counterpartyName: direction === 'Receivable' ? d.buyerName : d.sellerName,
    dispatchId: d.id,
    dispatchRefNo: d.refNo,
    amount: Math.round(base * d.qty * float(rng, 0.35, 1)),
    paymentDate: isoDayOffset(-int(rng, 0, 90)),
    mode: pick(rng, ['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque']),
    status: pickWeighted(rng, [
      ['Added', 62],
      ['Approved', 20],
      ['Pending', 13],
      ['Rejected', 3],
      ['Cancelled', 2],
    ] as const),
    zohoPaymentId: bool(rng, 0.8) ? `ZB-${int(rng, 100000, 999999)}` : null,
    matched: bool(rng, 0.88),
  };
});

/* -------------------------------------------------------------- receivables */

export const RECEIVABLES: Receivable[] = DISPATCHES.filter(
  (d) => d.invoiceDueDate && d.status !== 'Cancelled',
)
  .slice(0, 190)
  .map((d, i) => {
    const gross = d.tradingPrice * d.qty;
    const paidFrac = pickWeighted(rng, [
      [1, 44],
      [0, 28],
      [0.5, 18],
      [0.75, 10],
    ] as const);
    const due = new Date(d.invoiceDueDate!);
    const daysOverdue = Math.round((TODAY.getTime() - due.getTime()) / 86400000);
    const reliability = BUSINESSES.find((b) => b.id === d.buyerId)?.paymentReliability ?? 70;
    // Model stand-in: reliability falls off as the invoice ages.
    const prob = Math.max(0.04, Math.min(0.97, reliability / 100 - Math.max(0, daysOverdue) / 220));
    return {
      id: `rcv-${i}`,
      dispatchId: d.id,
      dispatchRefNo: d.refNo,
      buyerId: d.buyerId,
      buyerName: d.buyerName,
      invoicedOn: d.invoiceDate!,
      dueDate: d.invoiceDueDate!,
      amount: gross,
      paidSoFar: Math.round(gross * paidFrac),
      daysOverdue,
      collectionProbability: prob,
      predictedPaymentDate: iso(
        dayOffset(Math.max(-daysOverdue, 0) + Math.round((1 - prob) * 26) - daysOverdue * 0),
      ),
    };
  })
  .filter((r) => r.paidSoFar < r.amount);

/* ------------------------------------------------------------------ treasury */

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc-1',
    name: 'Current — Operations',
    bank: 'HDFC Bank',
    accountNo: '••••4471',
    balance: 3_84_62_000 * 100,
    lastReconciledAt: isoDayOffset(0),
  },
  {
    id: 'acc-2',
    name: 'Current — Collections',
    bank: 'ICICI Bank',
    accountNo: '••••9102',
    balance: 1_12_40_500 * 100,
    lastReconciledAt: isoDayOffset(0),
  },
  {
    id: 'acc-3',
    name: 'Escrow — EscrowPay',
    bank: 'Yes Bank',
    accountNo: '••••2280',
    balance: 68_15_000 * 100,
    lastReconciledAt: isoDayOffset(-1),
  },
];

export const FACILITIES: FundFacility[] = [
  {
    id: 'fac-1',
    name: 'Working Capital Line',
    lender: 'HDFC Bank',
    limit: 12_00_00_000 * 100,
    drawn: 7_35_00_000 * 100,
    interestRate: 11.4,
    maturesOn: isoDayOffset(190),
  },
  {
    id: 'fac-2',
    name: 'Invoice Discounting Facility',
    lender: 'KredX',
    limit: 6_00_00_000 * 100,
    drawn: 2_18_00_000 * 100,
    interestRate: 14.2,
    maturesOn: isoDayOffset(95),
  },
];

/* ------------------------------------------- the daily fund allocation queue */

const ALLOCATION_KINDS = ['Seller Payout', 'Trade Partner', 'Transporter', 'Invoice Discounter'] as const;

function buildAllocationQueue(): FundAllocationCandidate[] {
  const out: FundAllocationCandidate[] = [];
  for (let i = 0; i < 26; i++) {
    const kind = pickWeighted(rng, [
      ['Seller Payout', 58],
      ['Transporter', 20],
      ['Trade Partner', 14],
      ['Invoice Discounter', 8],
    ] as const satisfies readonly (readonly [(typeof ALLOCATION_KINDS)[number], number])[]);
    const party = kind === 'Seller Payout' ? pick(rng, SELLERS) : null;
    const name = party?.name ?? companyName(rng, 'Seller');
    const amountDue = int(rng, 4, 90) * 100000 * 100;
    const daysPastDue = int(rng, -6, 22);
    // How long our cash stays out: salesCreditTerm − purchaseCreditTerm, in days.
    const cashLockDays = int(rng, 12, 68);
    const linkedMargin = Math.round(amountDue * float(rng, 0.025, 0.085));
    const earlyPayDiscount = bool(rng, 0.3) ? Math.round(amountDue * float(rng, 0.004, 0.018)) : 0;
    const supplierCriticality = int(rng, 8, 96);

    // Return on working capital, annualised: what this rupee earns per year if
    // we release it today and it comes back in `cashLockDays`.
    const lockDays = Math.max(12, cashLockDays);
    const rowcPercent = ((linkedMargin + earlyPayDiscount) / amountDue) * (365 / lockDays) * 100;

    // Ranking: return dominates, urgency and criticality break ties.
    const score = Math.round(
      Math.min(100, rowcPercent * 1.6) * 0.5 +
        Math.min(100, Math.max(0, daysPastDue) * 6) * 0.22 +
        supplierCriticality * 0.18 +
        (earlyPayDiscount > 0 ? 100 : 0) * 0.1,
    );

    const blocked = bool(rng, 0.11);
    const recommendation = blocked
      ? 'hold'
      : score >= 62
        ? 'pay'
        : score >= 42
          ? 'part-pay'
          : 'hold';

    const reason = blocked
      ? 'Blocked — GRN not accepted on one linked dispatch.'
      : recommendation === 'pay'
        ? earlyPayDiscount > 0
          ? `${rowcPercent.toFixed(0)}% RoWC and an early-payment discount on the table. Cash returns in ${lockDays}d.`
          : daysPastDue > 5
            ? `${daysPastDue}d past due on a supplier carrying ${supplierCriticality}% of this lane. Relationship cost of holding exceeds the carry.`
            : `${rowcPercent.toFixed(0)}% RoWC — the best use of a rupee in today's queue.`
        : recommendation === 'part-pay'
          ? `Moderate return (${rowcPercent.toFixed(0)}% RoWC). Part-pay to keep the supplier warm without locking the full amount for ${lockDays}d.`
          : `Only ${rowcPercent.toFixed(0)}% RoWC over ${lockDays}d and not yet due. Cash earns more elsewhere in this queue today.`;

    out.push({
      id: `alloc-${i}`,
      kind,
      counterpartyId: party?.id ?? `p-${i}`,
      counterpartyName: name,
      dispatchRefNos: sample(rng, DISPATCHES, int(rng, 1, 4)).map((d) => d.refNo),
      amountDue,
      dueDate: isoDayOffset(-daysPastDue),
      daysPastDue,
      linkedMargin,
      cashLockDays,
      earlyPayDiscount,
      supplierCriticality,
      rowcPercent,
      score,
      recommendation,
      reason,
      state: 'queued',
      blocked,
      blockedReason: blocked ? 'GRN not accepted on DSP-9142' : null,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

export const ALLOCATION_QUEUE: FundAllocationCandidate[] = buildAllocationQueue();

/* ------------------------------------------------------------ cash position */

export const CASH_POSITION: CashPositionDay[] = (() => {
  const days: CashPositionDay[] = [];
  let balance = BANK_ACCOUNTS.reduce((a, b) => a + b.balance, 0) - 90_00_000 * 100;
  for (let i = -20; i <= 21; i++) {
    const projected = i > 0;
    const inflow = int(rng, 18, 130) * 100000 * 100;
    const outflow = int(rng, 22, 120) * 100000 * 100;
    const opening = balance;
    balance = opening + inflow - outflow;
    days.push({
      date: isoDayOffset(i),
      opening,
      inflow,
      outflow,
      closing: balance,
      projected,
    });
  }
  return days;
})();

/* ---------------------------------------------------------- reconciliation */

export const RECON_ITEMS: ReconItem[] = Array.from({ length: 140 }, (_, i) => {
  const status = pickWeighted(rng, [
    ['matched', 68],
    ['unmatched', 17],
    ['variance', 10],
    ['failed', 5],
  ] as const);
  const panelAmount = int(rng, 2, 60) * 100000 * 100;
  const variance =
    status === 'variance' ? Math.round(panelAmount * float(rng, 0.005, 0.04)) : status === 'matched' ? 0 : 0;
  const d = pick(rng, DISPATCHES);
  return {
    id: `rec-${i}`,
    syncedAt: isoDayOffset(-int(rng, 0, 14)),
    docType: pick(rng, ['Invoice', 'Bill', 'Customer Payment', 'Vendor Credit', 'Credit Note'] as const),
    direction: bool(rng, 0.6) ? 'push' : 'pull',
    reference: d.salesBillNo ?? `BF/26-27/${1200 + i}`,
    counterpartyName: bool(rng, 0.5) ? d.buyerName : d.sellerName,
    panelAmount: status === 'unmatched' && bool(rng, 0.5) ? null : panelAmount,
    zohoAmount: status === 'failed' ? null : panelAmount + variance,
    variance,
    status,
    error:
      status === 'failed'
        ? pick(rng, [
            'Contact is not linked with Zoho Books',
            'Invalid GSTIN on billing address',
            'Zoho API returned 429 — rate limited',
            'Item not found in Zoho Books',
          ])
        : null,
  };
});

/* -------------------------------------------------------------------- leads */

export const LEADS: Lead[] = Array.from({ length: 220 }, (_, i) => {
  const state = pick(rng, STATES);
  return {
    id: `l-${i}`,
    name: personName(rng),
    companyName: companyName(rng, 'Buyer'),
    email: `enq${i}@example.com`,
    phone: `+91 9${int(rng, 100000000, 999999999)}`,
    state,
    product: pick(rng, PRODUCTS).name,
    source: pickWeighted(rng, [
      ['IndiaMART', 42],
      ['Website', 24],
      ['Campaign', 16],
      ['Referral', 11],
      ['Outbound', 7],
    ] as const),
    campaign: bool(rng, 0.35) ? pick(rng, ['Q3 Briquette Push', 'UCO Collectors', 'Pellet Retarget']) : null,
    status: pickWeighted(rng, [
      ['Yet to be contacted', 26],
      ['Contacted', 24],
      ['Qualified', 18],
      ['Proposal Sent', 12],
      ['Converted', 11],
      ['Lost', 9],
    ] as const),
    score: int(rng, 12, 98),
    handledById: pick(rng, ['u-sales-mgr', 'u-sales-exec', 'u-marketing']),
    createdAt: isoDayOffset(-int(rng, 0, 120)),
  };
});

/* ---------------------------------------------------------------- schedules */

export const SCHEDULES: DeliverySchedule[] = Array.from({ length: 70 }, (_, i) => {
  const o = pick(rng, ORDERS.filter((x) => x.status === 'In Progress' || x.status === 'Placed'));
  const committedQty = o.unit === 'KL' ? int(rng, 20, 120) : int(rng, 120, 900);
  const startDays = -int(rng, 2, 30);
  const endDays = startDays + int(rng, 14, 60);
  const elapsed = Math.max(0, Math.min(1, (0 - startDays) / (endDays - startDays)));
  const deliveredQty = Math.round(committedQty * elapsed * float(rng, 0.45, 1.12));
  const expected = Math.max(1, committedQty * elapsed);
  const riskRatio = expected / Math.max(1, deliveredQty);
  return {
    id: `sch-${i}`,
    orderRefNo: o.refNo,
    buyerName: o.buyerName,
    sellerName: o.sellerName,
    productName: o.productName,
    lane: pick(rng, LANES),
    startDate: isoDayOffset(startDays),
    endDate: isoDayOffset(endDays),
    committedQty,
    deliveredQty: Math.min(deliveredQty, committedQty),
    unit: o.unit,
    riskRatio,
    status:
      deliveredQty >= committedQty
        ? 'Delivered'
        : riskRatio > 1.45
          ? 'Behind'
          : riskRatio > 1.12
            ? 'At Risk'
            : 'On Track',
  };
});

export { PRODUCTS, STATES };

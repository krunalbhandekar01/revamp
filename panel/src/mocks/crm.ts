/**
 * CRM fixtures. Deterministic, like the rest of `src/mocks`.
 * Nothing outside `src/api/*` should import this file.
 */

import {
  CITY_BY_STATE,
  PRODUCTS,
  STATES,
  bool,
  companyName,
  float,
  int,
  isoDayOffset,
  makeRng,
  personName,
  pick,
  pickWeighted,
  sample,
} from './seed';
import { BUSINESSES, BUYERS, SELLERS, TEAM } from './db';
import type {
  Activity,
  AssignmentRule,
  AuditEntry,
  Campaign,
  CompanyCrm,
  Contact,
  CrmProduct,
  Deal,
  EmailTemplate,
  Lead,
  Pipeline,
  PriceList,
  Quote,
  Segment,
  Ticket,
  WorkflowRule,
} from '@/types/crm';
import { LOST_REASONS, SLA_HOURS, WON_REASONS } from '@/types/crm';

const rng = makeRng(31415926);

const SALES_USERS = TEAM.filter((u) =>
  ['sales-manager', 'sales-executive', 'sourcing-manager', 'marketing'].includes(u.role),
);
const SUPPORT_USERS = TEAM.filter((u) => ['ops-manager', 'ops-executive'].includes(u.role));
const pickOwner = (pool = SALES_USERS) => pick(rng, pool.length ? pool : TEAM);

const INDUSTRIES = [
  'Paper & Pulp',
  'Textiles',
  'Cement',
  'Sugar',
  'Chemicals',
  'Food Processing',
  'Distillery',
  'Ceramics',
  'Steel',
  'Pharma',
];

/* ------------------------------------------------------------------ catalog */

export const CRM_PRODUCTS: CrmProduct[] = PRODUCTS.map((p, i): CrmProduct => ({
  id: p.id,
  sku: `BF-${p.category.slice(0, 3).toUpperCase()}-${String(101 + i)}`,
  name: p.name,
  category: p.category === 'Solid' ? 'Solid Fuel' : p.category === 'Liquid' ? 'Liquid Fuel' : 'Waste',
  unit: p.unit,
  listPrice: Math.round(p.basePrice * 1.09),
  taxPercent: p.category === 'Waste' ? 5 : 18,
  hsn: p.category === 'Liquid' ? '38260000' : '44013100',
  active: true,
  availability: pickWeighted(rng, [
    ['In Supply', 62],
    ['Limited', 26],
    ['On Request', 12],
  ] as const),
  description: `${p.name} supplied against agreed GCV and moisture specification.`,
})).concat([
  {
    id: 'svc-1',
    sku: 'BF-SVC-201',
    name: 'Logistics — Road Freight',
    category: 'Service',
    unit: 'Trip',
    listPrice: 2_200_000,
    taxPercent: 5,
    hsn: '996511',
    active: true,
    availability: 'In Supply',
    description: 'Door-to-door road movement arranged by BuyoFuel.',
  },
  {
    id: 'svc-2',
    sku: 'BF-SVC-202',
    name: 'Quality Testing — Lab Certificate',
    category: 'Service',
    unit: 'Sample',
    listPrice: 350_000,
    taxPercent: 18,
    hsn: '998346',
    active: true,
    availability: 'In Supply',
    description: 'NABL lab test for GCV, moisture and ash content.',
  },
]);

export const PRICE_LISTS: PriceList[] = [
  {
    id: 'pl-default',
    name: 'Standard — All India',
    description: 'Default list price. Applies wherever no regional list matches.',
    regions: [],
    validFrom: isoDayOffset(-180),
    validTo: null,
    isDefault: true,
    entries: CRM_PRODUCTS.map((p) => ({ productId: p.id, price: p.listPrice })),
  },
  {
    id: 'pl-west',
    name: 'West Zone',
    description: 'Maharashtra and Gujarat — shorter lanes, keener pricing.',
    regions: ['Maharashtra', 'Gujarat'],
    validFrom: isoDayOffset(-90),
    validTo: isoDayOffset(120),
    isDefault: false,
    entries: CRM_PRODUCTS.map((p) => ({ productId: p.id, price: Math.round(p.listPrice * 0.965) })),
  },
  {
    id: 'pl-south',
    name: 'South Zone',
    description: 'Tamil Nadu, Karnataka, Telangana, Andhra Pradesh.',
    regions: ['Tamil Nadu', 'Karnataka', 'Telangana', 'Andhra Pradesh'],
    validFrom: isoDayOffset(-90),
    validTo: isoDayOffset(120),
    isDefault: false,
    entries: CRM_PRODUCTS.map((p) => ({ productId: p.id, price: Math.round(p.listPrice * 1.018) })),
  },
  {
    id: 'pl-key',
    name: 'Key Accounts',
    description: 'Negotiated rates for Platinum-tier accounts.',
    regions: [],
    validFrom: isoDayOffset(-300),
    validTo: null,
    isDefault: false,
    entries: CRM_PRODUCTS.map((p) => ({ productId: p.id, price: Math.round(p.listPrice * 0.94) })),
  },
];

/* -------------------------------------------------------------------- leads */

function scoreFor(fit: number, behaviour: number, recency: number) {
  return [
    { label: 'Industry & volume fit', points: fit },
    { label: 'Engagement (opens, replies, calls)', points: behaviour },
    { label: 'Recency of last touch', points: recency },
  ];
}

export const LEADS_CRM: Lead[] = Array.from({ length: 240 }, (_, i) => {
  const state = pick(rng, STATES);
  const city = pick(rng, CITY_BY_STATE[state]);
  const product = pick(rng, PRODUCTS);
  const side = bool(rng, 0.68) ? 'Buyer' : 'Seller';
  const owner = pickOwner();
  const volume = product.unit === 'KL' ? int(rng, 5, 70) : int(rng, 30, 800);

  const fit = int(rng, 5, 40);
  const behaviour = int(rng, 0, 35);
  const recency = int(rng, 0, 25);
  const score = fit + behaviour + recency;

  const stage = pickWeighted(rng, [
    ['New', 24],
    ['Contacted', 22],
    ['Qualified', 18],
    ['Proposal', 12],
    ['Converted', 13],
    ['Lost', 11],
  ] as const);

  const createdDaysAgo = int(rng, 0, 150);
  const touched = stage !== 'New';

  return {
    id: `lead-${i}`,
    refNo: `LD-${String(10_400 + i)}`,
    companyName: companyName(rng, side),
    contactName: personName(rng),
    designation: pick(rng, ['Proprietor', 'Purchase Manager', 'Plant Head', 'Director', 'GM Operations', 'Procurement Lead']),
    email: `contact${i}@example.com`,
    phone: `+91 9${int(rng, 100_000_000, 999_999_999)}`,
    state,
    city,
    industry: pick(rng, INDUSTRIES),
    productInterest: product.name,
    estimatedVolume: volume,
    unit: product.unit,
    estimatedValue: Math.round(product.basePrice * 1.08 * volume),
    side,
    source: pickWeighted(rng, [
      ['IndiaMART', 32],
      ['Website', 21],
      ['Campaign', 15],
      ['Referral', 11],
      ['Outbound', 9],
      ['WhatsApp', 7],
      ['Trade Show', 3],
      ['Import', 2],
    ] as const),
    campaignId: null,
    campaignName: null,
    stage,
    score,
    scoreFactors: scoreFor(fit, behaviour, recency),
    qualification: {
      budget: bool(rng, stage === 'Qualified' || stage === 'Proposal' ? 0.85 : 0.35),
      authority: bool(rng, stage === 'Qualified' || stage === 'Proposal' ? 0.8 : 0.3),
      need: bool(rng, stage === 'New' ? 0.4 : 0.78),
      timeline: bool(rng, stage === 'Proposal' ? 0.7 : 0.3),
      notes: touched ? pick(rng, [
        'Running a trial batch next month; wants 2 test loads first.',
        'Currently sourcing locally, open to switching on landed price.',
        'Budget sits with the parent company — needs their sign-off.',
        'Volume firm, but delivery window is tight.',
        '',
      ]) : '',
    },
    ownerId: owner.id,
    ownerName: owner.name,
    createdAt: isoDayOffset(-createdDaysAgo),
    lastTouchedAt: touched ? isoDayOffset(-int(rng, 0, Math.max(1, createdDaysAgo))) : null,
    nextFollowUpAt:
      stage === 'Converted' || stage === 'Lost' ? null : isoDayOffset(int(rng, -9, 16)),
    convertedCompanyId: null,
    convertedContactId: null,
    convertedDealId: null,
    lostReason: stage === 'Lost' ? pick(rng, LOST_REASONS) : null,
    duplicateOf: [],
    tags: sample(rng, ['Hot', 'Large volume', 'Price sensitive', 'Repeat enquiry', 'Needs credit'], int(rng, 0, 2)),
    customFields: [],
  } satisfies Lead;
});

// Plant a handful of realistic duplicates: same phone or very similar company name.
for (let i = 0; i < 9; i++) {
  const a = LEADS_CRM[int(rng, 0, LEADS_CRM.length - 1)];
  const b = LEADS_CRM[int(rng, 0, LEADS_CRM.length - 1)];
  if (a.id === b.id) continue;
  b.phone = a.phone;
  b.companyName = a.companyName.replace(/ (Pvt Ltd|Ltd|LLP|& Co|Industries)$/, '');
  a.duplicateOf = [...new Set([...a.duplicateOf, b.id])];
  b.duplicateOf = [...new Set([...b.duplicateOf, a.id])];
}

/* ----------------------------------------------------------------- contacts */

export const CONTACTS: Contact[] = BUSINESSES.flatMap((b, bi) => {
  const n = int(rng, 1, 4);
  return Array.from({ length: n }, (_, ci): Contact => {
    const name = personName(rng);
    const owner = pickOwner();
    return {
      id: `ct-${bi}-${ci}`,
      name,
      designation: ci === 0
        ? pick(rng, ['Director', 'Proprietor', 'CEO', 'Plant Head'])
        : pick(rng, ['Purchase Manager', 'Accounts Manager', 'Logistics Head', 'Quality Manager', 'Store In-charge']),
      department: ci === 0 ? 'Management' : pick(rng, ['Procurement', 'Finance', 'Operations', 'Quality']),
      email: `${name.split(' ')[0].toLowerCase()}${bi}${ci}@example.com`,
      phone: `+91 9${int(rng, 100_000_000, 999_999_999)}`,
      whatsapp: `+91 9${int(rng, 100_000_000, 999_999_999)}`,
      companyId: b.id,
      companyName: b.name,
      isPrimary: ci === 0,
      role: ci === 0
        ? 'Decision Maker'
        : pick(rng, ['Influencer', 'Procurement', 'Finance', 'Operations'] as const),
      optedOutOfMarketing: bool(rng, 0.08),
      lastContactedAt: bool(rng, 0.78) ? isoDayOffset(-int(rng, 0, 90)) : null,
      ownerId: owner.id,
      tags: sample(rng, ['Primary', 'Escalation', 'Payments', 'Technical'], int(rng, 0, 2)),
      customFields: [],
      createdAt: isoDayOffset(-int(rng, 20, 700)),
    };
  });
});

/* ------------------------------------------------------------- company CRM */

export const COMPANY_CRM: CompanyCrm[] = BUSINESSES.map((b) => {
  const owner = pickOwner();
  const contacts = CONTACTS.filter((c) => c.companyId === b.id).length;
  return {
    companyId: b.id,
    lifecycleStage:
      b.orderCount === 0
        ? pick(rng, ['Lead', 'Prospect'] as const)
        : b.orderCount > 30
          ? 'Repeat Customer'
          : b.orderCount > 5
            ? 'Active Customer'
            : pickWeighted(rng, [
                ['Active Customer', 60],
                ['Dormant', 28],
                ['Churned', 12],
              ] as const),
    ownerId: owner.id,
    ownerName: owner.name,
    accountTier:
      b.lifetimeContribution > 60_000_000
        ? 'Platinum'
        : b.lifetimeContribution > 25_000_000
          ? 'Gold'
          : b.lifetimeContribution > 0
            ? 'Silver'
            : 'Unrated',
    contactCount: contacts,
    openDeals: 0,
    openDealValue: 0,
    lastActivityAt: b.lastActivityAt,
    nextFollowUpAt: bool(rng, 0.45) ? isoDayOffset(int(rng, -5, 21)) : null,
    segments: sample(rng, ['West Zone Buyers', 'High Margin', 'Slow Payers', 'Briquette Users', 'UCO Collectors'], int(rng, 0, 2)),
  };
});

/* ---------------------------------------------------------------- pipelines */

export const PIPELINES: Pipeline[] = [
  {
    id: 'pipe-sales',
    name: 'Buyer Sales',
    description: 'Demand-side deals: a buyer committing to volume.',
    stages: [
      { key: 'qualify', label: 'Qualification', probability: 10, staleAfterDays: 7, kind: 'open' },
      { key: 'needs', label: 'Requirement Mapped', probability: 25, staleAfterDays: 10, kind: 'open' },
      { key: 'sample', label: 'Trial / Sample', probability: 45, staleAfterDays: 14, kind: 'open' },
      { key: 'quote', label: 'Quotation Sent', probability: 60, staleAfterDays: 10, kind: 'open' },
      { key: 'negotiate', label: 'Negotiation', probability: 80, staleAfterDays: 7, kind: 'open' },
      { key: 'won', label: 'Won', probability: 100, staleAfterDays: 999, kind: 'won' },
      { key: 'lost', label: 'Lost', probability: 0, staleAfterDays: 999, kind: 'lost' },
    ],
  },
  {
    id: 'pipe-sourcing',
    name: 'Supplier Sourcing',
    description: 'Supply-side deals: securing a seller onto the platform.',
    stages: [
      { key: 'identified', label: 'Identified', probability: 10, staleAfterDays: 10, kind: 'open' },
      { key: 'audit', label: 'Site / Quality Audit', probability: 30, staleAfterDays: 21, kind: 'open' },
      { key: 'pricing', label: 'Price Agreed', probability: 55, staleAfterDays: 14, kind: 'open' },
      { key: 'onboarding', label: 'KYC & Onboarding', probability: 80, staleAfterDays: 10, kind: 'open' },
      { key: 'won', label: 'Onboarded', probability: 100, staleAfterDays: 999, kind: 'won' },
      { key: 'lost', label: 'Dropped', probability: 0, staleAfterDays: 999, kind: 'lost' },
    ],
  },
];

/* -------------------------------------------------------------------- deals */

export const DEALS: Deal[] = Array.from({ length: 96 }, (_, i) => {
  const pipeline = pickWeighted(rng, [
    [PIPELINES[0], 70],
    [PIPELINES[1], 30],
  ] as const);
  const openStages = pipeline.stages.filter((s) => s.kind === 'open');
  const closedKind = pickWeighted(rng, [
    ['open', 66],
    ['won', 20],
    ['lost', 14],
  ] as const);
  const stage =
    closedKind === 'open'
      ? pick(rng, openStages)
      : pipeline.stages.find((s) => s.kind === closedKind)!;

  const company = pipeline.id === 'pipe-sales' ? pick(rng, BUYERS) : pick(rng, SELLERS);
  const contacts = CONTACTS.filter((c) => c.companyId === company.id);
  const contact = contacts.length ? contacts[0] : null;
  const owner = pickOwner();
  const product = pick(rng, PRODUCTS);
  const volume = product.unit === 'KL' ? int(rng, 10, 90) : int(rng, 60, 900);
  const unitPrice = Math.round(product.basePrice * float(rng, 1.03, 1.16));
  const value = unitPrice * volume;
  const createdDaysAgo = int(rng, 3, 160);
  // Roughly one deal in five goes stale; the rest sit comfortably inside the
  // stage's expected window, so the stale flag stays a signal rather than noise.
  const stageWindow = stage.staleAfterDays;
  const stageDaysAgo = bool(rng, 0.2)
    ? int(rng, stageWindow + 1, stageWindow + 22)
    : int(rng, 0, Math.max(1, stageWindow - 1));

  return {
    id: `deal-${i}`,
    refNo: `DL-${String(3100 + i)}`,
    title: `${product.name} — ${volume} ${product.unit} · ${company.name.split(' ').slice(0, 2).join(' ')}`,
    pipelineId: pipeline.id,
    stage: stage.key,
    companyId: company.id,
    companyName: company.name,
    primaryContactId: contact?.id ?? null,
    primaryContactName: contact?.name ?? null,
    value,
    expectedMargin: Math.round(value * float(rng, 0.03, 0.095)),
    currency: 'INR',
    probability: stage.probability,
    expectedCloseDate: isoDayOffset(closedKind === 'open' ? int(rng, -12, 75) : -int(rng, 1, 40)),
    ownerId: owner.id,
    ownerName: owner.name,
    source: pickWeighted(rng, [
      ['IndiaMART', 30],
      ['Website', 20],
      ['Referral', 18],
      ['Campaign', 14],
      ['Outbound', 12],
      ['Trade Show', 6],
    ] as const),
    lines: [
      {
        id: `dl-${i}-1`,
        productId: product.id,
        productName: product.name,
        quantity: volume,
        unit: product.unit,
        unitPrice,
        discountPercent: bool(rng, 0.35) ? int(rng, 1, 7) : 0,
        taxPercent: 18,
      },
    ],
    createdAt: isoDayOffset(-createdDaysAgo),
    stageEnteredAt: isoDayOffset(-stageDaysAgo),
    closedAt: closedKind === 'open' ? null : isoDayOffset(-int(rng, 1, 40)),
    wonReason: closedKind === 'won' ? pick(rng, WON_REASONS) : null,
    lostReason: closedKind === 'lost' ? pick(rng, LOST_REASONS) : null,
    lostToCompetitor:
      closedKind === 'lost' && bool(rng, 0.45)
        ? pick(rng, ['Local trader', 'Green Fuels Co', 'Direct mill purchase', 'Agro Energy Pvt Ltd'])
        : null,
    nextStep:
      closedKind === 'open'
        ? pick(rng, [
            'Share revised landed price',
            'Arrange sample despatch',
            'Follow up on credit terms',
            'Schedule plant visit',
            'Chase signed PO',
          ])
        : null,
    tags: sample(rng, ['Key account', 'Renewal', 'New logo', 'Competitive'], int(rng, 0, 2)),
  } satisfies Deal;
});

// Roll open deal counts back onto the company CRM overlay.
for (const c of COMPANY_CRM) {
  const open = DEALS.filter((d) => d.companyId === c.companyId && d.closedAt === null);
  c.openDeals = open.length;
  c.openDealValue = open.reduce((a, d) => a + d.value, 0);
}

/* --------------------------------------------------------------- activities */

const ACTIVITY_SUBJECTS: Record<string, string[]> = {
  Task: ['Send product spec sheet', 'Prepare landed-price working', 'Collect GST certificate', 'Update CRM notes', 'Chase signed PO'],
  Call: ['Intro call', 'Follow-up on quotation', 'Discuss credit terms', 'Confirm dispatch window', 'Complaint follow-up'],
  Meeting: ['Plant visit', 'Commercial discussion', 'Quarterly review', 'Sample evaluation meeting'],
  Email: ['Quotation sent', 'Spec sheet shared', 'Payment reminder', 'Introduction email'],
  WhatsApp: ['Shared rate card', 'Dispatch update', 'Follow-up ping'],
  Note: ['Call summary', 'Site observation', 'Competitor intel'],
  'Site Visit': ['Supplier yard inspection', 'Buyer plant audit', 'Quality sampling visit'],
};

export const ACTIVITIES: Activity[] = Array.from({ length: 320 }, (_, i) => {
  const type = pickWeighted(rng, [
    ['Task', 30],
    ['Call', 26],
    ['Email', 14],
    ['Meeting', 11],
    ['WhatsApp', 9],
    ['Note', 6],
    ['Site Visit', 4],
  ] as const);
  const owner = pickOwner();
  const dueOffset = int(rng, -18, 21);
  const isPast = dueOffset < 0;
  const status = isPast
    ? pickWeighted(rng, [
        ['Completed', 66],
        ['Overdue', 28],
        ['Cancelled', 6],
      ] as const)
    : pickWeighted(rng, [
        ['Open', 92],
        ['Cancelled', 8],
      ] as const);

  // Relate the activity to a real record so the timelines line up.
  const relatedKind = pickWeighted(rng, [
    ['deal', 42],
    ['lead', 34],
    ['company', 14],
    ['ticket', 10],
  ] as const);
  let related: Activity['related'] = null;
  if (relatedKind === 'deal') {
    const d = pick(rng, DEALS);
    related = { type: 'deal', id: d.id, label: d.title };
  } else if (relatedKind === 'lead') {
    const l = pick(rng, LEADS_CRM);
    related = { type: 'lead', id: l.id, label: l.companyName };
  } else if (relatedKind === 'company') {
    const b = pick(rng, BUSINESSES);
    related = { type: 'company', id: b.id, label: b.name };
  }

  return {
    id: `act-${i}`,
    type,
    subject: pick(rng, ACTIVITY_SUBJECTS[type]),
    body: '',
    status,
    priority: pickWeighted(rng, [
      ['Normal', 54],
      ['High', 24],
      ['Low', 14],
      ['Urgent', 8],
    ] as const),
    dueAt: isoDayOffset(dueOffset),
    completedAt: status === 'Completed' ? isoDayOffset(dueOffset) : null,
    durationMinutes: type === 'Call' ? int(rng, 2, 28) : type === 'Meeting' ? int(rng, 30, 120) : null,
    ownerId: owner.id,
    ownerName: owner.name,
    related,
    outcome:
      status === 'Completed' && (type === 'Call' || type === 'Meeting')
        ? pick(rng, ['Interested', 'Asked for revised price', 'No answer', 'Call back next week', 'Not interested'])
        : null,
    repeat: bool(rng, 0.12)
      ? pick(rng, ['Weekly', 'Fortnightly', 'Monthly'] as const)
      : 'None',
    createdAt: isoDayOffset(dueOffset - int(rng, 0, 6)),
  } satisfies Activity;
});

/* ------------------------------------------------------------------- quotes */

export const QUOTES: Quote[] = Array.from({ length: 74 }, (_, i) => {
  const deal = pick(rng, DEALS);
  const company = BUSINESSES.find((b) => b.id === deal.companyId)!;
  const contacts = CONTACTS.filter((c) => c.companyId === company.id);
  const owner = pickOwner();
  const lineCount = int(rng, 1, 3);
  const lines = Array.from({ length: lineCount }, (_, li) => {
    const p = pick(rng, CRM_PRODUCTS.filter((x) => x.category !== 'Service'));
    const qty = p.unit === 'KL' ? int(rng, 8, 60) : int(rng, 40, 600);
    return {
      id: `ql-${i}-${li}`,
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      quantity: qty,
      unit: p.unit,
      unitPrice: Math.round(p.listPrice * float(rng, 0.94, 1.05)),
      discountPercent: bool(rng, 0.45) ? int(rng, 1, 12) : 0,
      taxPercent: p.taxPercent,
    };
  });
  const maxDiscount = Math.max(...lines.map((l) => l.discountPercent), 0);
  const headerDiscount = bool(rng, 0.25) ? int(rng, 1, 5) : 0;
  const approvalRequired = maxDiscount + headerDiscount > 8;
  const status: Quote['status'] = approvalRequired && bool(rng, 0.45)
    ? 'Pending Approval'
    : pickWeighted(rng, [
        ['Sent', 30],
        ['Draft', 20],
        ['Accepted', 18],
        ['Approved', 14],
        ['Rejected', 10],
        ['Expired', 8],
      ] as const);
  const createdDaysAgo = int(rng, 0, 90);

  return {
    id: `quote-${i}`,
    refNo: `QT-${String(2400 + i)}`,
    dealId: deal.id,
    dealTitle: deal.title,
    companyId: company.id,
    companyName: company.name,
    contactId: contacts[0]?.id ?? null,
    contactName: contacts[0]?.name ?? null,
    priceListId: pick(rng, PRICE_LISTS).id,
    status,
    lines,
    headerDiscountPercent: headerDiscount,
    transportCharges: int(rng, 0, 45) * 10_000 * 100,
    validUntil: isoDayOffset(-createdDaysAgo + 21),
    paymentTerms: pick(rng, ['100% advance', '30 days credit', '45 days credit', '50% advance, balance on delivery']),
    deliveryTerms: pick(rng, ['Ex-works', 'FOR destination', 'Delivered at plant']),
    notes: '',
    ownerId: owner.id,
    ownerName: owner.name,
    approvalRequired,
    approvedById: status === 'Approved' || status === 'Sent' || status === 'Accepted' ? 'u-sales-mgr' : null,
    approvedAt: status === 'Approved' || status === 'Sent' ? isoDayOffset(-createdDaysAgo + 1) : null,
    sentAt: ['Sent', 'Accepted', 'Rejected', 'Expired'].includes(status) ? isoDayOffset(-createdDaysAgo + 2) : null,
    viewedAt: ['Accepted', 'Rejected'].includes(status) ? isoDayOffset(-createdDaysAgo + 3) : null,
    createdAt: isoDayOffset(-createdDaysAgo),
  } satisfies Quote;
});

/* ------------------------------------------------------------------ tickets */

export const TICKETS: Ticket[] = Array.from({ length: 86 }, (_, i) => {
  const company = pick(rng, BUSINESSES);
  const contacts = CONTACTS.filter((c) => c.companyId === company.id);
  const owner = pick(rng, SUPPORT_USERS.length ? SUPPORT_USERS : TEAM);
  const priority = pickWeighted(rng, [
    ['Normal', 46],
    ['High', 28],
    ['Low', 16],
    ['Urgent', 10],
  ] as const);
  const category = pickWeighted(rng, [
    ['Quality Complaint', 24],
    ['Delayed Dispatch', 21],
    ['Short Delivery', 16],
    ['Invoice / Billing', 14],
    ['Payment Issue', 11],
    ['Documentation', 8],
    ['Platform / App', 4],
    ['Other', 2],
  ] as const);
  const status = pickWeighted(rng, [
    ['Resolved', 34],
    ['In Progress', 24],
    ['Open', 20],
    ['Waiting on Customer', 12],
    ['Closed', 10],
  ] as const);
  const slaHours = SLA_HOURS[priority];
  const stillOpen = status !== 'Resolved' && status !== 'Closed';
  // An open ticket's age is drawn relative to its OWN SLA window, so the mix
  // lands where a healthy desk actually sits: most comfortable, some at risk,
  // a few breached. Closed tickets can be any age.
  const createdHoursAgo = stillOpen
    ? pickWeighted(rng, [
        [int(rng, 1, Math.max(2, Math.round(slaHours * 0.6))), 58], // comfortable
        [int(rng, Math.round(slaHours * 0.76), slaHours), 27], // at risk
        [int(rng, slaHours + 1, Math.round(slaHours * 2.4)), 15], // breached
      ] as const)
    : int(rng, 2, 30 * 24);
  const createdAt = new Date(Date.now() - createdHoursAgo * 3_600_000);
  const slaDue = new Date(createdAt.getTime() + slaHours * 3_600_000);
  const resolved = !stillOpen;
  // Most closed tickets were resolved inside their window.
  const resolutionHours = bool(rng, 0.78)
    ? int(rng, 1, Math.max(2, slaHours))
    : int(rng, slaHours + 1, Math.round(slaHours * 2.2));
  const resolvedAt = resolved ? new Date(createdAt.getTime() + resolutionHours * 3_600_000) : null;
  const slaBreached = resolved
    ? (resolvedAt as Date).getTime() > slaDue.getTime()
    : Date.now() > slaDue.getTime();

  return {
    id: `tkt-${i}`,
    refNo: `TK-${String(5200 + i)}`,
    subject: {
      'Quality Complaint': 'Moisture above agreed spec on delivered load',
      'Delayed Dispatch': 'Load not picked up on committed date',
      'Short Delivery': 'Received quantity short against invoice',
      'Invoice / Billing': 'GST rate incorrect on invoice',
      'Payment Issue': 'Payment released but not reflected',
      Documentation: 'E-way bill not shared with driver',
      'Platform / App': 'Cannot upload weighment slip',
      Other: 'General query',
    }[category],
    description: 'Reported by the customer over WhatsApp; awaiting internal verification.',
    category,
    priority,
    status,
    companyId: company.id,
    companyName: company.name,
    contactId: contacts[0]?.id ?? null,
    contactName: contacts[0]?.name ?? null,
    dispatchRefNo: bool(rng, 0.72) ? `DSP-${int(rng, 9100, 9519)}` : null,
    ownerId: owner.id,
    ownerName: owner.name,
    createdAt: createdAt.toISOString(),
    firstResponseAt: bool(rng, 0.86)
      ? new Date(createdAt.getTime() + int(rng, 1, slaHours) * 1_800_000).toISOString()
      : null,
    resolvedAt: resolvedAt ? resolvedAt.toISOString() : null,
    slaHours,
    slaDueAt: slaDue.toISOString(),
    slaBreached,
    resolution: resolved
      ? pick(rng, [
          'Credit note raised for the quantity difference.',
          'Replacement load dispatched at no extra freight.',
          'Invoice revised and re-shared.',
          'Payment traced — UTR shared with the customer.',
          'Explained spec tolerance; customer accepted.',
        ])
      : null,
    csat: resolved && bool(rng, 0.6) ? int(rng, 2, 5) : null,
    updates: [],
  } satisfies Ticket;
});

/* -------------------------------------------------------- campaigns & lists */

export const SEGMENTS: Segment[] = [
  {
    id: 'seg-1',
    name: 'West Zone Buyers — Briquettes',
    description: 'Active buyers in MH/GJ who have ordered briquettes in the last 6 months.',
    rules: ['State is Maharashtra or Gujarat', 'Lifecycle is Active Customer', 'Product bought contains Briquettes'],
    memberCount: 38,
    updatedAt: isoDayOffset(-4),
  },
  {
    id: 'seg-2',
    name: 'Dormant > 90 days',
    description: 'Customers with no order or activity in the last 90 days.',
    rules: ['Last activity before 90 days ago', 'Lifecycle is Dormant'],
    memberCount: 61,
    updatedAt: isoDayOffset(-1),
  },
  {
    id: 'seg-3',
    name: 'UCO Collectors — South',
    description: 'Used cooking oil suppliers across the southern states.',
    rules: ['Side is Seller', 'Product interest is Used Cooking Oil', 'State in South zone'],
    memberCount: 24,
    updatedAt: isoDayOffset(-11),
  },
  {
    id: 'seg-4',
    name: 'High-margin accounts',
    description: 'Accounts contributing above 8% margin over the financial year.',
    rules: ['Margin % greater than 8', 'Orders greater than 5'],
    memberCount: 19,
    updatedAt: isoDayOffset(-7),
  },
];

export const CAMPAIGNS: Campaign[] = [
  ['Q3 Briquette Push', 'Email', 'Completed', 'seg-1', 42, 180],
  ['Dormant Account Revival', 'WhatsApp', 'Running', 'seg-2', 18, 95],
  ['UCO Collector Onboarding', 'Outbound Calling', 'Running', 'seg-3', 26, 60],
  ['Key Account QBR Invite', 'Email', 'Scheduled', 'seg-4', 0, 14],
  ['Monsoon Supply Advisory', 'SMS', 'Completed', null, 9, 220],
  ['BioFuel Expo — Pune', 'Trade Show', 'Completed', null, 54, 1],
  ['Pellet Retargeting', 'Paid Ads', 'Paused', null, 31, 0],
].map(([name, channel, status, segId, leads, sent], i) => {
  const segment = SEGMENTS.find((s) => s.id === segId) ?? null;
  const sentN = Number(sent);
  const delivered = Math.round(sentN * float(rng, 0.9, 0.99));
  const opened = Math.round(delivered * float(rng, 0.22, 0.58));
  const clicked = Math.round(opened * float(rng, 0.1, 0.34));
  const replied = Math.round(clicked * float(rng, 0.15, 0.5));
  const leadsN = Number(leads);
  const deals = Math.round(leadsN * float(rng, 0.08, 0.3));
  const owner = pickOwner();
  return {
    id: `camp-${i}`,
    name: String(name),
    channel: channel as Campaign['channel'],
    status: status as Campaign['status'],
    segmentId: segment?.id ?? null,
    segmentName: segment?.name ?? null,
    startDate: isoDayOffset(-int(rng, 20, 150)),
    endDate: status === 'Completed' ? isoDayOffset(-int(rng, 1, 18)) : null,
    budget: int(rng, 40, 400) * 1000 * 100,
    spend: int(rng, 20, 380) * 1000 * 100,
    ownerId: owner.id,
    ownerName: owner.name,
    sent: sentN,
    delivered,
    opened,
    clicked,
    replied,
    leadsGenerated: leadsN,
    dealsCreated: deals,
    revenueInfluenced: deals * int(rng, 18, 65) * 100_000 * 100,
  } satisfies Campaign;
});

/* --------------------------------------------------------------- automation */

export const WORKFLOW_RULES: WorkflowRule[] = [
  {
    id: 'wf-1',
    name: 'Chase untouched leads after 2 days',
    description: 'A new lead nobody has called in 48 hours creates a task and pings the owner.',
    module: 'Leads',
    trigger: 'Lead untouched for N days',
    conditions: [
      { field: 'Stage', operator: 'is', value: 'New' },
      { field: 'Days since created', operator: 'greater than', value: '2' },
    ],
    actions: [
      { id: 'a1', kind: 'Create task', detail: 'Call the lead — first contact overdue', delayMinutes: 0 },
      { id: 'a2', kind: 'Notify user', detail: 'WhatsApp the lead owner', delayMinutes: 0 },
    ],
    enabled: true,
    runsLast30Days: 148,
    lastRunAt: isoDayOffset(0),
    createdByName: 'Rohan Desai',
  },
  {
    id: 'wf-2',
    name: 'Escalate stale deals in Negotiation',
    description: 'Deals sitting in Negotiation for over a week go to the sales manager.',
    module: 'Deals',
    trigger: 'Deal idle for N days',
    conditions: [
      { field: 'Stage', operator: 'is', value: 'Negotiation' },
      { field: 'Days in stage', operator: 'greater than', value: '7' },
    ],
    actions: [
      { id: 'a1', kind: 'Escalate to manager', detail: 'Assign a review task to the reporting manager', delayMinutes: 0 },
      { id: 'a2', kind: 'Add tag', detail: 'Stale', delayMinutes: 0 },
    ],
    enabled: true,
    runsLast30Days: 34,
    lastRunAt: isoDayOffset(-1),
    createdByName: 'Rohan Desai',
  },
  {
    id: 'wf-3',
    name: 'Discount above 8% needs approval',
    description: 'Any quote where line plus header discount exceeds 8% is held for sign-off.',
    module: 'Quotes',
    trigger: 'Quote discount above threshold',
    conditions: [{ field: 'Total discount %', operator: 'greater than', value: '8' }],
    actions: [
      { id: 'a1', kind: 'Require approval', detail: 'Route to Sales Manager, then Finance Manager above 12%', delayMinutes: 0 },
      { id: 'a2', kind: 'Notify user', detail: 'Email the approver', delayMinutes: 0 },
    ],
    enabled: true,
    runsLast30Days: 21,
    lastRunAt: isoDayOffset(-2),
    createdByName: 'Aditi Iyer',
  },
  {
    id: 'wf-4',
    name: 'Urgent ticket SLA warning at 75%',
    description: 'Warns the owner and the ops manager before an urgent ticket breaches SLA.',
    module: 'Tickets',
    trigger: 'Ticket SLA at risk',
    conditions: [
      { field: 'Priority', operator: 'is', value: 'Urgent' },
      { field: 'SLA elapsed %', operator: 'greater than', value: '75' },
    ],
    actions: [
      { id: 'a1', kind: 'Notify user', detail: 'Slack the owner and #ops-escalations', delayMinutes: 0 },
      { id: 'a2', kind: 'Escalate to manager', detail: 'Reassign to Operations Manager if unacknowledged', delayMinutes: 60 },
    ],
    enabled: true,
    runsLast30Days: 12,
    lastRunAt: isoDayOffset(-3),
    createdByName: 'Vikram Rao',
  },
  {
    id: 'wf-5',
    name: 'Quote follow-up sequence',
    description: 'Three-step nudge after a quote is sent and not yet answered.',
    module: 'Quotes',
    trigger: 'Quote sent',
    conditions: [],
    actions: [
      { id: 'a1', kind: 'Send WhatsApp template', detail: 'Quote shared — acknowledge receipt', delayMinutes: 60 },
      { id: 'a2', kind: 'Create task', detail: 'Call to confirm the quote was received', delayMinutes: 2880 },
      { id: 'a3', kind: 'Send email template', detail: 'Gentle follow-up on pending quotation', delayMinutes: 7200 },
    ],
    enabled: false,
    runsLast30Days: 0,
    lastRunAt: null,
    createdByName: 'Priya Nair',
  },
  {
    id: 'wf-6',
    name: 'Tag high-value leads',
    description: 'Leads above ₹25 L estimated value are tagged and routed to a senior rep.',
    module: 'Leads',
    trigger: 'Lead created',
    conditions: [{ field: 'Estimated value', operator: 'greater than', value: '2500000' }],
    actions: [
      { id: 'a1', kind: 'Add tag', detail: 'Large volume', delayMinutes: 0 },
      { id: 'a2', kind: 'Assign owner', detail: 'Round robin across senior reps', delayMinutes: 0 },
    ],
    enabled: true,
    runsLast30Days: 57,
    lastRunAt: isoDayOffset(0),
    createdByName: 'Rohan Desai',
  },
];

export const ASSIGNMENT_RULES: AssignmentRule[] = [
  {
    id: 'ar-1',
    name: 'West zone leads',
    module: 'Leads',
    strategy: 'Territory',
    criteria: 'State is Maharashtra, Gujarat, Rajasthan or Madhya Pradesh',
    assignees: [
      { id: 'u-sales-mgr', name: 'Rohan Desai' },
      { id: 'u-sourcing', name: 'Meera Kulkarni' },
    ],
    enabled: true,
    priority: 1,
  },
  {
    id: 'ar-2',
    name: 'Liquid fuel specialists',
    module: 'Leads',
    strategy: 'Product specialist',
    criteria: 'Product interest is Used Cooking Oil or Biodiesel B100',
    assignees: [{ id: 'u-sales-exec', name: 'Priya Nair' }],
    enabled: true,
    priority: 2,
  },
  {
    id: 'ar-3',
    name: 'Everything else — round robin',
    module: 'Leads',
    strategy: 'Round robin',
    criteria: 'No other rule matched',
    assignees: [
      { id: 'u-sales-mgr', name: 'Rohan Desai' },
      { id: 'u-sales-exec', name: 'Priya Nair' },
      { id: 'u-sourcing', name: 'Meera Kulkarni' },
    ],
    enabled: true,
    priority: 99,
  },
  {
    id: 'ar-4',
    name: 'Quality complaints to ops',
    module: 'Tickets',
    strategy: 'Load balanced',
    criteria: 'Category is Quality Complaint or Short Delivery',
    assignees: [
      { id: 'u-ops-mgr', name: 'Vikram Rao' },
    ],
    enabled: true,
    priority: 1,
  },
];

/* ---------------------------------------------------------- email templates */

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'et-1',
    name: 'Quotation — cover email',
    subject: 'Quotation {{quote.refNo}} from BuyoFuel',
    module: 'Quotes',
    body: 'Dear {{contact.name}},\n\nPlease find attached our quotation for {{quote.productSummary}}.\n\nThe pricing is valid until {{quote.validUntil}} and is inclusive of {{quote.deliveryTerms}}.\n\nHappy to walk you through the working.\n\nRegards,\n{{owner.name}}',
    variables: ['contact.name', 'quote.refNo', 'quote.productSummary', 'quote.validUntil', 'quote.deliveryTerms', 'owner.name'],
    usageCount: 214,
    updatedAt: isoDayOffset(-12),
  },
  {
    id: 'et-2',
    name: 'New lead — first touch',
    subject: 'Biofuel supply for {{lead.companyName}}',
    module: 'Leads',
    body: 'Hello {{lead.contactName}},\n\nThank you for your enquiry about {{lead.productInterest}}.\n\nWe supply verified, spec-tested biofuel across {{lead.state}} with transparent landed pricing. Could I call you briefly this week?\n\nRegards,\n{{owner.name}}',
    variables: ['lead.contactName', 'lead.companyName', 'lead.productInterest', 'lead.state', 'owner.name'],
    usageCount: 486,
    updatedAt: isoDayOffset(-30),
  },
  {
    id: 'et-3',
    name: 'Payment reminder — polite',
    subject: 'Invoice {{invoice.no}} — gentle reminder',
    module: 'Deals',
    body: 'Dear {{contact.name}},\n\nInvoice {{invoice.no}} for {{invoice.amount}} fell due on {{invoice.dueDate}}.\n\nIf it has already been released, please share the UTR so we can reconcile it.\n\nRegards,\n{{owner.name}}',
    variables: ['contact.name', 'invoice.no', 'invoice.amount', 'invoice.dueDate', 'owner.name'],
    usageCount: 132,
    updatedAt: isoDayOffset(-5),
  },
  {
    id: 'et-4',
    name: 'Ticket resolved — closing note',
    subject: 'Your issue {{ticket.refNo}} has been resolved',
    module: 'Tickets',
    body: 'Dear {{contact.name}},\n\n{{ticket.resolution}}\n\nDo let us know if anything is still outstanding.\n\nRegards,\n{{owner.name}}',
    variables: ['contact.name', 'ticket.refNo', 'ticket.resolution', 'owner.name'],
    usageCount: 78,
    updatedAt: isoDayOffset(-20),
  },
  {
    id: 'et-5',
    name: 'Dormant account revival',
    subject: 'It has been a while, {{contact.name}}',
    module: 'Campaigns',
    body: 'Hello {{contact.name}},\n\nWe have new supply in {{company.state}} at sharper landed rates than when you last bought.\n\nWorth a quick call?\n\nRegards,\n{{owner.name}}',
    variables: ['contact.name', 'company.state', 'owner.name'],
    usageCount: 61,
    updatedAt: isoDayOffset(-2),
  },
];

/* --------------------------------------------------------------- audit log */

export const AUDIT_LOG: AuditEntry[] = Array.from({ length: 160 }, (_, i) => {
  const actor = pick(rng, TEAM);
  const spec = pickWeighted(rng, [
    [{ action: 'Updated deal stage', module: 'Deals', field: 'stage' }, 22],
    [{ action: 'Changed quote discount', module: 'Quotes', field: 'headerDiscountPercent' }, 15],
    [{ action: 'Reassigned lead', module: 'Leads', field: 'ownerId' }, 14],
    [{ action: 'Approved quote', module: 'Quotes', field: 'status' }, 10],
    [{ action: 'Updated credit limit', module: 'Businesses', field: 'creditLimit' }, 9],
    [{ action: 'Changed permissions', module: 'Team', field: 'moderatorPermissions' }, 8],
    [{ action: 'Resolved ticket', module: 'Tickets', field: 'status' }, 8],
    [{ action: 'Released funds', module: 'Treasury', field: 'allocationState' }, 7],
    [{ action: 'Deleted contact', module: 'Contacts', field: 'deleted' }, 4],
    [{ action: 'Ran bulk import', module: 'Data Import', field: 'rows' }, 3],
  ] as const);
  return {
    id: `aud-${i}`,
    at: isoDayOffset(-int(rng, 0, 30)),
    actorId: actor.id,
    actorName: actor.name,
    action: spec.action,
    module: spec.module,
    recordRef: pick(rng, ['DL-3142', 'QT-2418', 'LD-10477', 'TK-5231', 'b-by-14', 'alloc-3', 'u-sales-exec']),
    changes: [
      {
        field: spec.field,
        from: pick(rng, ['Quotation Sent', '4', 'Priya Nair', 'Draft', '₹20,00,000', 'Open', 'false', '0']),
        to: pick(rng, ['Negotiation', '9', 'Rohan Desai', 'Approved', '₹35,00,000', 'Resolved', 'true', '412']),
      },
    ],
    ip: `10.${int(rng, 0, 40)}.${int(rng, 0, 255)}.${int(rng, 2, 250)}`,
  } satisfies AuditEntry;
});

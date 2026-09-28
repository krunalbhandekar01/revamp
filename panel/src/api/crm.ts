import { mock } from './client';
import {
  ACTIVITIES,
  ASSIGNMENT_RULES,
  AUDIT_LOG,
  CAMPAIGNS,
  COMPANY_CRM,
  CONTACTS,
  CRM_PRODUCTS,
  DEALS,
  EMAIL_TEMPLATES,
  LEADS_CRM,
  PIPELINES,
  PRICE_LISTS,
  QUOTES,
  SEGMENTS,
  TICKETS,
  WORKFLOW_RULES,
} from '@/mocks/crm';
import { BUSINESSES, TEAM } from '@/mocks/db';
import { groupBy, sumBy } from '@/lib/utils';
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
  ImportPreview,
  Lead,
  Pipeline,
  PriceList,
  Quote,
  QuoteLine,
  Segment,
  Ticket,
  WorkflowRule,
} from '@/types/crm';
import type { ID, Paisa } from '@/types/domain';

const has = (haystack: string, needle: string) => haystack.toLowerCase().includes(needle.toLowerCase());

export const owners = () => TEAM.map((t) => ({ id: t.id, name: t.name }));

/* -------------------------------------------------------------------- leads */

export interface LeadFilters {
  search?: string;
  stage?: string[] | null;
  source?: string[] | null;
  ownerId?: string | null;
  /** Only leads the model rates above this score. */
  minScore?: number;
}

export function getLeads(filters: LeadFilters = {}): Promise<Lead[]> {
  return mock(() => {
    let rows = [...LEADS_CRM];
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter(
        (l) => has(l.companyName, q) || has(l.contactName, q) || has(l.phone, q) || has(l.refNo, q),
      );
    }
    if (filters.stage?.length) rows = rows.filter((l) => filters.stage!.includes(l.stage));
    if (filters.source?.length) rows = rows.filter((l) => filters.source!.includes(l.source));
    if (filters.ownerId) rows = rows.filter((l) => l.ownerId === filters.ownerId);
    if (filters.minScore) rows = rows.filter((l) => l.score >= filters.minScore!);
    // Converted and Lost leads are history — keep them in the list (the facets
    // still reach them) but never above the leads a rep can still act on.
    const open = (l: Lead) => (l.stage === 'Converted' || l.stage === 'Lost' ? 0 : 1);
    return rows.sort((a, b) => open(b) - open(a) || b.score - a.score);
  });
}

export function getLead(id: ID): Promise<Lead | null> {
  return mock(() => LEADS_CRM.find((l) => l.id === id) ?? null);
}

/** Leads that look like this one — surfaced for a human, never auto-merged. */
export function getLeadDuplicates(id: ID): Promise<Lead[]> {
  return mock(() => {
    const lead = LEADS_CRM.find((l) => l.id === id);
    if (!lead) return [];
    return LEADS_CRM.filter((l) => lead.duplicateOf.includes(l.id));
  });
}

export function updateLead(id: ID, patch: Partial<Lead>): Promise<void> {
  return mock(() => {
    const i = LEADS_CRM.findIndex((l) => l.id === id);
    if (i >= 0) LEADS_CRM[i] = { ...LEADS_CRM[i], ...patch };
  });
}

export function assignLeads(ids: ID[], ownerId: ID): Promise<void> {
  return mock(() => {
    const owner = TEAM.find((t) => t.id === ownerId);
    for (const id of ids) {
      const i = LEADS_CRM.findIndex((l) => l.id === id);
      if (i >= 0) LEADS_CRM[i] = { ...LEADS_CRM[i], ownerId, ownerName: owner?.name ?? '' };
    }
  });
}

export interface ConversionResult {
  companyId: ID;
  contactId: ID;
  dealId: ID | null;
}

/** Lead → Company + Contact (+ optional Deal). */
export function convertLead(
  id: ID,
  opts: { createDeal: boolean; dealValue: Paisa; pipelineId: ID; expectedCloseDate: string },
): Promise<ConversionResult> {
  return mock(() => {
    const lead = LEADS_CRM.find((l) => l.id === id)!;
    const companyId = `b-conv-${id}`;
    const contactId = `ct-conv-${id}`;
    let dealId: ID | null = null;

    if (opts.createDeal) {
      dealId = `deal-conv-${id}`;
      const pipeline = PIPELINES.find((p) => p.id === opts.pipelineId) ?? PIPELINES[0];
      DEALS.unshift({
        id: dealId,
        refNo: `DL-${3100 + DEALS.length}`,
        title: `${lead.productInterest} — ${lead.estimatedVolume} ${lead.unit} · ${lead.companyName}`,
        pipelineId: pipeline.id,
        stage: pipeline.stages[0].key,
        companyId,
        companyName: lead.companyName,
        primaryContactId: contactId,
        primaryContactName: lead.contactName,
        value: opts.dealValue,
        expectedMargin: Math.round(opts.dealValue * 0.06),
        currency: 'INR',
        probability: pipeline.stages[0].probability,
        expectedCloseDate: opts.expectedCloseDate,
        ownerId: lead.ownerId,
        ownerName: lead.ownerName,
        source: lead.source,
        lines: [],
        createdAt: new Date().toISOString(),
        stageEnteredAt: new Date().toISOString(),
        closedAt: null,
        wonReason: null,
        lostReason: null,
        lostToCompetitor: null,
        nextStep: 'First call after conversion',
        tags: ['New logo'],
      });
    }

    const i = LEADS_CRM.findIndex((l) => l.id === id);
    LEADS_CRM[i] = {
      ...LEADS_CRM[i],
      stage: 'Converted',
      convertedCompanyId: companyId,
      convertedContactId: contactId,
      convertedDealId: dealId,
      nextFollowUpAt: null,
    };

    return { companyId, contactId, dealId };
  });
}

export interface LeadInsights {
  total: number;
  unworked: number;
  overdueFollowUps: number;
  hot: number;
  conversionRate: number;
  bySource: { source: string; count: number; converted: number }[];
  byStage: { stage: string; count: number }[];
}

export function getLeadInsights(): Promise<LeadInsights> {
  return mock(() => {
    const now = Date.now();
    const converted = LEADS_CRM.filter((l) => l.stage === 'Converted').length;
    return {
      total: LEADS_CRM.length,
      unworked: LEADS_CRM.filter((l) => l.stage === 'New' && !l.lastTouchedAt).length,
      overdueFollowUps: LEADS_CRM.filter(
        (l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt).getTime() < now,
      ).length,
      hot: LEADS_CRM.filter((l) => l.score >= 70 && l.stage !== 'Converted' && l.stage !== 'Lost').length,
      conversionRate: (converted / LEADS_CRM.length) * 100,
      bySource: Object.entries(groupBy(LEADS_CRM, (l) => l.source))
        .map(([source, rows]) => ({
          source,
          count: rows.length,
          converted: rows.filter((r) => r.stage === 'Converted').length,
        }))
        .sort((a, b) => b.count - a.count),
      byStage: ['New', 'Contacted', 'Qualified', 'Proposal', 'Converted', 'Lost'].map((stage) => ({
        stage,
        count: LEADS_CRM.filter((l) => l.stage === stage).length,
      })),
    };
  });
}

/* ----------------------------------------------------------------- contacts */

export function getContacts(filters: { search?: string; companyId?: ID } = {}): Promise<Contact[]> {
  return mock(() => {
    let rows = [...CONTACTS];
    if (filters.companyId) rows = rows.filter((c) => c.companyId === filters.companyId);
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter(
        (c) => has(c.name, q) || has(c.companyName, q) || has(c.email, q) || has(c.phone, q),
      );
    }
    return rows.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name));
  });
}

export function getCompanyCrm(companyId: ID): Promise<CompanyCrm | null> {
  return mock(() => COMPANY_CRM.find((c) => c.companyId === companyId) ?? null);
}

export function getCompaniesCrm(): Promise<(CompanyCrm & { name: string; state: string })[]> {
  return mock(() =>
    COMPANY_CRM.map((c) => {
      const b = BUSINESSES.find((x) => x.id === c.companyId)!;
      return { ...c, name: b.name, state: b.state };
    }),
  );
}

/* -------------------------------------------------------------------- deals */

export function getPipelines(): Promise<Pipeline[]> {
  return mock(() => PIPELINES);
}

export interface DealFilters {
  pipelineId?: ID;
  search?: string;
  ownerId?: string | null;
  includeClosed?: boolean;
}

export function getDeals(filters: DealFilters = {}): Promise<Deal[]> {
  return mock(() => {
    let rows = [...DEALS];
    if (filters.pipelineId) rows = rows.filter((d) => d.pipelineId === filters.pipelineId);
    if (filters.ownerId) rows = rows.filter((d) => d.ownerId === filters.ownerId);
    if (!filters.includeClosed) rows = rows.filter((d) => d.closedAt === null);
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter((d) => has(d.title, q) || has(d.companyName, q) || has(d.refNo, q));
    }
    return rows.sort((a, b) => b.value - a.value);
  });
}

export function getDeal(id: ID): Promise<Deal | null> {
  return mock(() => DEALS.find((d) => d.id === id) ?? null);
}

export function moveDealStage(id: ID, stage: string): Promise<void> {
  return mock(() => {
    const i = DEALS.findIndex((d) => d.id === id);
    if (i < 0) return;
    const deal = DEALS[i];
    const pipeline = PIPELINES.find((p) => p.id === deal.pipelineId)!;
    const stageDef = pipeline.stages.find((s) => s.key === stage);
    DEALS[i] = {
      ...deal,
      stage,
      probability: stageDef?.probability ?? deal.probability,
      stageEnteredAt: new Date().toISOString(),
      closedAt: stageDef && stageDef.kind !== 'open' ? new Date().toISOString() : null,
    };
  });
}

export function closeDeal(
  id: ID,
  outcome: 'won' | 'lost',
  reason: string,
  competitor?: string,
): Promise<void> {
  return mock(() => {
    const i = DEALS.findIndex((d) => d.id === id);
    if (i < 0) return;
    const deal = DEALS[i];
    const pipeline = PIPELINES.find((p) => p.id === deal.pipelineId)!;
    const stage = pipeline.stages.find((s) => s.kind === outcome)!;
    DEALS[i] = {
      ...deal,
      stage: stage.key,
      probability: outcome === 'won' ? 100 : 0,
      closedAt: new Date().toISOString(),
      wonReason: outcome === 'won' ? reason : null,
      lostReason: outcome === 'lost' ? reason : null,
      lostToCompetitor: outcome === 'lost' ? (competitor ?? null) : null,
    };
  });
}

export interface PipelineInsights {
  openCount: number;
  openValue: Paisa;
  weightedValue: Paisa;
  wonThisPeriod: number;
  wonValue: Paisa;
  lostCount: number;
  winRate: number;
  avgDealSize: Paisa;
  avgCycleDays: number;
  staleCount: number;
  byStage: { stage: string; label: string; count: number; value: Paisa; weighted: Paisa }[];
  lostReasons: { reason: string; count: number; value: Paisa }[];
  byOwner: { ownerId: ID; name: string; open: number; openValue: Paisa; won: number; winRate: number }[];
  forecast: { label: string; committed: Paisa; bestCase: Paisa; closed: Paisa }[];
}

export function getPipelineInsights(pipelineId: ID): Promise<PipelineInsights> {
  return mock(() => {
    const pipeline = PIPELINES.find((p) => p.id === pipelineId) ?? PIPELINES[0];
    const all = DEALS.filter((d) => d.pipelineId === pipeline.id);
    const open = all.filter((d) => d.closedAt === null);
    const won = all.filter((d) => d.wonReason !== null);
    const lost = all.filter((d) => d.lostReason !== null);

    const openValue = sumBy(open, (d) => d.value);
    const weightedValue = Math.round(sumBy(open, (d) => (d.value * d.probability) / 100));

    const now = Date.now();
    const staleCount = open.filter((d) => {
      const stageDef = pipeline.stages.find((s) => s.key === d.stage);
      const days = (now - new Date(d.stageEnteredAt).getTime()) / 86_400_000;
      return stageDef ? days > stageDef.staleAfterDays : false;
    }).length;

    const cycleDays = won.length
      ? sumBy(won, (d) => (new Date(d.closedAt!).getTime() - new Date(d.createdAt).getTime()) / 86_400_000) /
        won.length
      : 0;

    const byOwnerGroups = groupBy(all, (d) => d.ownerId);
    const byOwner = Object.entries(byOwnerGroups)
      .map(([ownerId, rows]) => {
        const o = rows.filter((r) => r.closedAt === null);
        const w = rows.filter((r) => r.wonReason !== null).length;
        const l = rows.filter((r) => r.lostReason !== null).length;
        return {
          ownerId,
          name: rows[0].ownerName,
          open: o.length,
          openValue: sumBy(o, (r) => r.value),
          won: w,
          winRate: w + l > 0 ? (w / (w + l)) * 100 : 0,
        };
      })
      .sort((a, b) => b.openValue - a.openValue);

    const forecast = Array.from({ length: 4 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      const inMonth = open.filter((x) => new Date(x.expectedCloseDate).getMonth() === d.getMonth());
      return {
        label,
        committed: Math.round(sumBy(inMonth.filter((x) => x.probability >= 70), (x) => x.value)),
        bestCase: Math.round(sumBy(inMonth, (x) => x.value)),
        closed: i === 0 ? sumBy(won, (x) => x.value) : 0,
      };
    });

    return {
      openCount: open.length,
      openValue,
      weightedValue,
      wonThisPeriod: won.length,
      wonValue: sumBy(won, (d) => d.value),
      lostCount: lost.length,
      winRate: won.length + lost.length > 0 ? (won.length / (won.length + lost.length)) * 100 : 0,
      avgDealSize: all.length ? Math.round(sumBy(all, (d) => d.value) / all.length) : 0,
      avgCycleDays: Math.round(cycleDays),
      staleCount,
      byStage: pipeline.stages
        .filter((s) => s.kind === 'open')
        .map((s) => {
          const rows = open.filter((d) => d.stage === s.key);
          return {
            stage: s.key,
            label: s.label,
            count: rows.length,
            value: sumBy(rows, (d) => d.value),
            weighted: Math.round(sumBy(rows, (d) => (d.value * d.probability) / 100)),
          };
        }),
      lostReasons: Object.entries(groupBy(lost, (d) => d.lostReason!))
        .map(([reason, rows]) => ({ reason, count: rows.length, value: sumBy(rows, (r) => r.value) }))
        .sort((a, b) => b.count - a.count),
      byOwner,
      forecast,
    };
  });
}

/* --------------------------------------------------------------- activities */

export interface ActivityFilters {
  search?: string;
  type?: string[] | null;
  status?: string[] | null;
  ownerId?: string | null;
  /** 'today' | 'week' | 'overdue' */
  window?: string | null;
}

export function getActivities(filters: ActivityFilters = {}): Promise<Activity[]> {
  return mock(() => {
    let rows = [...ACTIVITIES];
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter((a) => has(a.subject, q) || has(a.related?.label ?? '', q));
    }
    if (filters.type?.length) rows = rows.filter((a) => filters.type!.includes(a.type));
    if (filters.status?.length) rows = rows.filter((a) => filters.status!.includes(a.status));
    if (filters.ownerId) rows = rows.filter((a) => a.ownerId === filters.ownerId);

    if (filters.window) {
      const now = Date.now();
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      rows = rows.filter((a) => {
        if (!a.dueAt) return false;
        const t = new Date(a.dueAt).getTime();
        if (filters.window === 'overdue') return t < now && a.status !== 'Completed' && a.status !== 'Cancelled';
        if (filters.window === 'today') return t <= endOfToday.getTime() && t >= endOfToday.getTime() - 86_400_000;
        if (filters.window === 'week') return t <= now + 7 * 86_400_000 && t >= now;
        return true;
      });
    }
    return rows.sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));
  });
}

/** Everything that happened against one record, newest first. */
export function getTimeline(recordId: ID): Promise<Activity[]> {
  return mock(() =>
    ACTIVITIES.filter((a) => a.related?.id === recordId).sort((a, b) =>
      (b.dueAt ?? b.createdAt).localeCompare(a.dueAt ?? a.createdAt),
    ),
  );
}

export function completeActivity(id: ID): Promise<void> {
  return mock(() => {
    const i = ACTIVITIES.findIndex((a) => a.id === id);
    if (i >= 0) ACTIVITIES[i] = { ...ACTIVITIES[i], status: 'Completed', completedAt: new Date().toISOString() };
  });
}

export function createActivity(input: Partial<Activity>): Promise<void> {
  return mock(() => {
    ACTIVITIES.unshift({
      id: `act-new-${ACTIVITIES.length}`,
      type: 'Task',
      subject: '',
      body: '',
      status: 'Open',
      priority: 'Normal',
      dueAt: new Date().toISOString(),
      completedAt: null,
      durationMinutes: null,
      ownerId: 'u-sales-mgr',
      ownerName: 'Rohan Desai',
      related: null,
      outcome: null,
      repeat: 'None',
      createdAt: new Date().toISOString(),
      ...input,
    } as Activity);
  });
}

/* ------------------------------------------------------- catalog and quotes */

export function getProducts(): Promise<CrmProduct[]> {
  return mock(() => [...CRM_PRODUCTS]);
}

export function getPriceLists(): Promise<PriceList[]> {
  return mock(() => [...PRICE_LISTS]);
}

export function getQuotes(filters: { search?: string; status?: string[] | null } = {}): Promise<Quote[]> {
  return mock(() => {
    let rows = [...QUOTES];
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter((x) => has(x.refNo, q) || has(x.companyName, q) || has(x.dealTitle ?? '', q));
    }
    if (filters.status?.length) rows = rows.filter((x) => filters.status!.includes(x.status));
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

export function getQuote(id: ID): Promise<Quote | null> {
  return mock(() => QUOTES.find((q) => q.id === id) ?? null);
}

export function updateQuote(id: ID, patch: Partial<Quote>): Promise<void> {
  return mock(() => {
    const i = QUOTES.findIndex((q) => q.id === id);
    if (i >= 0) QUOTES[i] = { ...QUOTES[i], ...patch };
  });
}

/** Single source of truth for quote arithmetic — the UI never re-derives it. */
export interface QuoteTotals {
  subtotal: Paisa;
  lineDiscount: Paisa;
  headerDiscount: Paisa;
  taxableValue: Paisa;
  tax: Paisa;
  transport: Paisa;
  grandTotal: Paisa;
  effectiveDiscountPercent: number;
}

export function computeQuoteTotals(
  lines: QuoteLine[],
  headerDiscountPercent: number,
  transportCharges: Paisa,
): QuoteTotals {
  const subtotal = sumBy(lines, (l) => l.unitPrice * l.quantity);
  const lineDiscount = Math.round(
    sumBy(lines, (l) => (l.unitPrice * l.quantity * l.discountPercent) / 100),
  );
  const afterLine = subtotal - lineDiscount;
  const headerDiscount = Math.round((afterLine * headerDiscountPercent) / 100);
  const taxableValue = afterLine - headerDiscount + transportCharges;
  const tax = Math.round(
    sumBy(lines, (l) => {
      const gross = l.unitPrice * l.quantity;
      const net = gross - (gross * l.discountPercent) / 100;
      const afterHeader = net - (net * headerDiscountPercent) / 100;
      return (afterHeader * l.taxPercent) / 100;
    }),
  );
  return {
    subtotal,
    lineDiscount,
    headerDiscount,
    taxableValue,
    tax,
    transport: transportCharges,
    grandTotal: taxableValue + tax,
    effectiveDiscountPercent: subtotal ? ((lineDiscount + headerDiscount) / subtotal) * 100 : 0,
  };
}

/* ------------------------------------------------------------------ tickets */

export function getTickets(
  filters: { search?: string; status?: string[] | null; priority?: string[] | null; ownerId?: string | null } = {},
): Promise<Ticket[]> {
  return mock(() => {
    let rows = [...TICKETS];
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter((t) => has(t.refNo, q) || has(t.subject, q) || has(t.companyName, q));
    }
    if (filters.status?.length) rows = rows.filter((t) => filters.status!.includes(t.status));
    if (filters.priority?.length) rows = rows.filter((t) => filters.priority!.includes(t.priority));
    if (filters.ownerId) rows = rows.filter((t) => t.ownerId === filters.ownerId);
    // Open work first — a resolved ticket that once breached is history, not a
    // queue item. Within the open set: breached, then most urgent, then oldest.
    const rank = { Urgent: 0, High: 1, Normal: 2, Low: 3 } as const;
    const isOpen = (t: Ticket) => t.status !== 'Resolved' && t.status !== 'Closed';
    return rows.sort(
      (a, b) =>
        Number(isOpen(b)) - Number(isOpen(a)) ||
        Number(b.slaBreached) - Number(a.slaBreached) ||
        rank[a.priority] - rank[b.priority] ||
        a.createdAt.localeCompare(b.createdAt),
    );
  });
}

export interface TicketInsights {
  open: number;
  breached: number;
  atRisk: number;
  resolvedThisWeek: number;
  avgResolutionHours: number;
  csat: number;
  byCategory: { category: string; count: number }[];
}

export function getTicketInsights(): Promise<TicketInsights> {
  return mock(() => {
    const now = Date.now();
    const open = TICKETS.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed');
    const resolved = TICKETS.filter((t) => t.resolvedAt);
    const withCsat = TICKETS.filter((t) => t.csat !== null);
    return {
      open: open.length,
      breached: open.filter((t) => t.slaBreached).length,
      atRisk: open.filter((t) => {
        const due = new Date(t.slaDueAt).getTime();
        const created = new Date(t.createdAt).getTime();
        const elapsed = (now - created) / (due - created);
        return !t.slaBreached && elapsed > 0.75;
      }).length,
      resolvedThisWeek: resolved.filter((t) => now - new Date(t.resolvedAt!).getTime() < 7 * 86_400_000).length,
      avgResolutionHours: resolved.length
        ? Math.round(
            sumBy(resolved, (t) => (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / 3_600_000) /
              resolved.length,
          )
        : 0,
      csat: withCsat.length ? sumBy(withCsat, (t) => t.csat!) / withCsat.length : 0,
      byCategory: Object.entries(groupBy(TICKETS, (t) => t.category))
        .map(([category, rows]) => ({ category, count: rows.length }))
        .sort((a, b) => b.count - a.count),
    };
  });
}

/* --------------------------------------------------- campaigns and segments */

export function getCampaigns(): Promise<Campaign[]> {
  return mock(() => [...CAMPAIGNS].sort((a, b) => b.startDate.localeCompare(a.startDate)));
}

export function getSegments(): Promise<Segment[]> {
  return mock(() => [...SEGMENTS]);
}

/* --------------------------------------------------------------- automation */

export function getWorkflowRules(): Promise<WorkflowRule[]> {
  return mock(() => [...WORKFLOW_RULES]);
}

export function toggleWorkflowRule(id: ID, enabled: boolean): Promise<void> {
  return mock(() => {
    const i = WORKFLOW_RULES.findIndex((r) => r.id === id);
    if (i >= 0) WORKFLOW_RULES[i] = { ...WORKFLOW_RULES[i], enabled };
  });
}

export function getAssignmentRules(): Promise<AssignmentRule[]> {
  return mock(() => [...ASSIGNMENT_RULES].sort((a, b) => a.priority - b.priority));
}

export function getEmailTemplates(): Promise<EmailTemplate[]> {
  return mock(() => [...EMAIL_TEMPLATES]);
}

/* ------------------------------------------------------------------- audit */

export function getAuditLog(filters: { search?: string; module?: string[] | null } = {}): Promise<AuditEntry[]> {
  return mock(() => {
    let rows = [...AUDIT_LOG];
    if (filters.module?.length) rows = rows.filter((a) => filters.module!.includes(a.module));
    if (filters.search) {
      const q = filters.search;
      rows = rows.filter((a) => has(a.actorName, q) || has(a.action, q) || has(a.recordRef, q));
    }
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  });
}

/* ------------------------------------------------------------------ import */

/** Canned preview so the wizard's validation and dedupe steps are exercisable. */
export function previewImport(fileName: string): Promise<ImportPreview> {
  return mock(() => ({
    fileName,
    totalRows: 412,
    validRows: 387,
    issues: [
      { row: 14, column: 'Phone', severity: 'error', message: 'Not a valid 10-digit Indian mobile number' },
      { row: 27, column: 'Email', severity: 'error', message: 'Missing @ — cannot be contacted by email' },
      { row: 33, column: 'State', severity: 'warning', message: '"Maharastra" — did you mean Maharashtra?' },
      { row: 58, column: 'Estimated Volume', severity: 'warning', message: 'Blank; lead will be unscored' },
      { row: 91, column: 'GSTIN', severity: 'error', message: 'Checksum failed' },
      { row: 140, column: 'Product Interest', severity: 'warning', message: 'No catalogue match for "Husk pellet"' },
      { row: 204, column: 'Phone', severity: 'error', message: 'Not a valid 10-digit Indian mobile number' },
    ],
    duplicates: [
      { row: 8, matches: 'LD-10412 · Shree Paper Mills Pvt Ltd', field: 'Phone' },
      { row: 45, matches: 'LD-10388 · Anand Textiles LLP', field: 'Email' },
      { row: 102, matches: 'b-by-14 · Deccan Cement Works Ltd', field: 'GSTIN' },
      { row: 211, matches: 'LD-10501 · Sahyadri Chemicals & Co', field: 'Company name (fuzzy)' },
    ],
    columns: [
      { source: 'Company', target: 'companyName', sample: 'Shree Paper Mills Pvt Ltd' },
      { source: 'Contact Person', target: 'contactName', sample: 'Aditi Iyer' },
      { source: 'Mobile', target: 'phone', sample: '+91 98200 11223' },
      { source: 'Email ID', target: 'email', sample: 'purchase@shreepaper.in' },
      { source: 'State', target: 'state', sample: 'Maharashtra' },
      { source: 'Material', target: 'productInterest', sample: 'Biomass Briquettes' },
      { source: 'Qty (MT)', target: 'estimatedVolume', sample: '250' },
      { source: 'Remarks', target: null, sample: 'Called on 12th, asked for rates' },
      { source: 'Ref', target: null, sample: 'IM-99421' },
    ],
  }));
}

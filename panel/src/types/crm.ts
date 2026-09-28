/**
 * CRM domain types.
 *
 * Scoped to what the BuyoFuel *internal* team needs — this panel is never seen
 * by a customer, so there is no portal, no self-service and no public form
 * builder here. Customer-facing surfaces belong in `web/`.
 *
 * Money is paisa integers, as everywhere else.
 */

import type { ID, ISODate, Paisa } from './domain';

/* ------------------------------------------------------------------- shared */

export type OwnerRef = { id: ID; name: string };

export interface CustomField {
  key: string;
  label: string;
  value: string;
}

/** Anything an activity, note or document can hang off. */
export type RecordType = 'lead' | 'contact' | 'company' | 'deal' | 'quote' | 'ticket';

export interface RecordRef {
  type: RecordType;
  id: ID;
  label: string;
}

/* -------------------------------------------------------------------- leads */

export type LeadStage = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Converted' | 'Lost';

export type LeadSource =
  | 'IndiaMART'
  | 'Website'
  | 'Referral'
  | 'Campaign'
  | 'Outbound'
  | 'WhatsApp'
  | 'Trade Show'
  | 'Import';

/** BANT-style qualification, kept light enough that reps actually fill it in. */
export interface Qualification {
  budget: boolean;
  authority: boolean;
  need: boolean;
  timeline: boolean;
  notes: string;
}

export interface Lead {
  id: ID;
  refNo: string;
  companyName: string;
  contactName: string;
  designation: string;
  email: string;
  phone: string;
  state: string;
  city: string;
  industry: string;
  /** What they want to buy or sell. */
  productInterest: string;
  estimatedVolume: number;
  unit: string;
  estimatedValue: Paisa;
  side: 'Buyer' | 'Seller';
  source: LeadSource;
  campaignId: ID | null;
  campaignName: string | null;
  stage: LeadStage;
  /** 0–100. Fit + behaviour, explained by `scoreFactors`. */
  score: number;
  scoreFactors: { label: string; points: number }[];
  qualification: Qualification;
  ownerId: ID;
  ownerName: string;
  createdAt: ISODate;
  lastTouchedAt: ISODate | null;
  nextFollowUpAt: ISODate | null;
  /** Populated when the lead converts. */
  convertedCompanyId: ID | null;
  convertedContactId: ID | null;
  convertedDealId: ID | null;
  lostReason: string | null;
  /** Ids of leads that look like this one. Surfaced, never auto-merged. */
  duplicateOf: ID[];
  tags: string[];
  customFields: CustomField[];
}

/* ------------------------------------------------------- contacts & company */

export type LifecycleStage =
  | 'Lead'
  | 'Prospect'
  | 'Active Customer'
  | 'Repeat Customer'
  | 'Dormant'
  | 'Churned';

export interface Contact {
  id: ID;
  name: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  whatsapp: string;
  companyId: ID;
  companyName: string;
  isPrimary: boolean;
  /** What this person decides on — drives who to call for what. */
  role: 'Decision Maker' | 'Influencer' | 'Procurement' | 'Finance' | 'Operations' | 'Other';
  optedOutOfMarketing: boolean;
  lastContactedAt: ISODate | null;
  ownerId: ID;
  tags: string[];
  customFields: CustomField[];
  createdAt: ISODate;
}

/** CRM overlay on an existing `Business`. Keeps the two models separable. */
export interface CompanyCrm {
  companyId: ID;
  lifecycleStage: LifecycleStage;
  ownerId: ID;
  ownerName: string;
  accountTier: 'Platinum' | 'Gold' | 'Silver' | 'Unrated';
  contactCount: number;
  openDeals: number;
  openDealValue: Paisa;
  lastActivityAt: ISODate | null;
  nextFollowUpAt: ISODate | null;
  segments: string[];
}

/* -------------------------------------------------------------------- deals */

export interface PipelineStage {
  key: string;
  label: string;
  /** Default win probability at this stage, 0–100. */
  probability: number;
  /** Deals sitting longer than this many days are flagged stale. */
  staleAfterDays: number;
  kind: 'open' | 'won' | 'lost';
}

export interface Pipeline {
  id: ID;
  name: string;
  description: string;
  stages: PipelineStage[];
}

export interface DealLine {
  id: ID;
  productId: ID;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: Paisa;
  discountPercent: number;
  taxPercent: number;
}

export interface Deal {
  id: ID;
  refNo: string;
  title: string;
  pipelineId: ID;
  stage: string;
  companyId: ID;
  companyName: string;
  primaryContactId: ID | null;
  primaryContactName: string | null;
  value: Paisa;
  /** Expected gross margin on this deal, in paisa. */
  expectedMargin: Paisa;
  currency: 'INR';
  probability: number;
  expectedCloseDate: ISODate;
  ownerId: ID;
  ownerName: string;
  source: LeadSource;
  lines: DealLine[];
  createdAt: ISODate;
  stageEnteredAt: ISODate;
  closedAt: ISODate | null;
  wonReason: string | null;
  lostReason: string | null;
  lostToCompetitor: string | null;
  nextStep: string | null;
  tags: string[];
}

export const LOST_REASONS = [
  'Price too high',
  'Lost to competitor',
  'No budget',
  'Timing — deferred',
  'Quality spec mismatch',
  'Logistics not viable',
  'Credit terms rejected',
  'No response',
] as const;

export const WON_REASONS = [
  'Best price',
  'Reliable supply',
  'Credit terms',
  'Existing relationship',
  'Logistics advantage',
  'Quality / spec fit',
] as const;

/* --------------------------------------------------------------- activities */

export type ActivityType = 'Task' | 'Call' | 'Meeting' | 'Email' | 'WhatsApp' | 'Note' | 'Site Visit';
export type ActivityStatus = 'Open' | 'Completed' | 'Overdue' | 'Cancelled';
export type ActivityPriority = 'Low' | 'Normal' | 'High' | 'Urgent';

export interface Activity {
  id: ID;
  type: ActivityType;
  subject: string;
  body: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  dueAt: ISODate | null;
  completedAt: ISODate | null;
  durationMinutes: number | null;
  ownerId: ID;
  ownerName: string;
  /** What this activity is about. */
  related: RecordRef | null;
  /** For calls and meetings. */
  outcome: string | null;
  /** Recurrence rule in plain words; the scheduler owns the real cron. */
  repeat: 'None' | 'Daily' | 'Weekly' | 'Fortnightly' | 'Monthly';
  createdAt: ISODate;
}

/* ------------------------------------------------------------------ catalog */

export interface CrmProduct {
  id: ID;
  sku: string;
  name: string;
  category: 'Solid Fuel' | 'Liquid Fuel' | 'Waste' | 'Service';
  unit: string;
  /** List price before any price-list override. */
  listPrice: Paisa;
  taxPercent: number;
  hsn: string;
  active: boolean;
  /** Indicative availability, used when building a quote. */
  availability: 'In Supply' | 'Limited' | 'On Request';
  description: string;
}

export interface PriceListEntry {
  productId: ID;
  price: Paisa;
}

export interface PriceList {
  id: ID;
  name: string;
  description: string;
  /** Applies to these states; empty means everywhere. */
  regions: string[];
  validFrom: ISODate;
  validTo: ISODate | null;
  isDefault: boolean;
  entries: PriceListEntry[];
}

/* ------------------------------------------------------------------- quotes */

export type QuoteStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Sent'
  | 'Accepted'
  | 'Rejected'
  | 'Expired';

export interface QuoteLine {
  id: ID;
  productId: ID;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: Paisa;
  discountPercent: number;
  taxPercent: number;
}

export interface Quote {
  id: ID;
  refNo: string;
  dealId: ID | null;
  dealTitle: string | null;
  companyId: ID;
  companyName: string;
  contactId: ID | null;
  contactName: string | null;
  priceListId: ID;
  status: QuoteStatus;
  lines: QuoteLine[];
  /** Applied on top of line-level discounts. */
  headerDiscountPercent: number;
  transportCharges: Paisa;
  validUntil: ISODate;
  paymentTerms: string;
  deliveryTerms: string;
  notes: string;
  ownerId: ID;
  ownerName: string;
  /** Set when a discount exceeds the approval threshold. */
  approvalRequired: boolean;
  approvedById: ID | null;
  approvedAt: ISODate | null;
  sentAt: ISODate | null;
  viewedAt: ISODate | null;
  createdAt: ISODate;
}

/* ------------------------------------------------------------------ tickets */

export type TicketStatus = 'Open' | 'In Progress' | 'Waiting on Customer' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type TicketCategory =
  | 'Quality Complaint'
  | 'Short Delivery'
  | 'Delayed Dispatch'
  | 'Invoice / Billing'
  | 'Payment Issue'
  | 'Documentation'
  | 'Platform / App'
  | 'Other';

export interface TicketUpdate {
  id: ID;
  at: ISODate;
  byId: ID;
  byName: string;
  body: string;
  internal: boolean;
}

export interface Ticket {
  id: ID;
  refNo: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  companyId: ID;
  companyName: string;
  contactId: ID | null;
  contactName: string | null;
  /** Links the complaint to the load it is about. */
  dispatchRefNo: string | null;
  ownerId: ID;
  ownerName: string;
  createdAt: ISODate;
  firstResponseAt: ISODate | null;
  resolvedAt: ISODate | null;
  /** Hours allowed by the SLA for this priority. */
  slaHours: number;
  slaDueAt: ISODate;
  slaBreached: boolean;
  resolution: string | null;
  csat: number | null;
  updates: TicketUpdate[];
}

export const SLA_HOURS: Record<TicketPriority, number> = {
  Urgent: 4,
  High: 12,
  Normal: 48,
  Low: 96,
};

/* ---------------------------------------------------------------- campaigns */

export type CampaignChannel = 'Email' | 'WhatsApp' | 'SMS' | 'Outbound Calling' | 'Trade Show' | 'Paid Ads';
export type CampaignStatus = 'Draft' | 'Scheduled' | 'Running' | 'Paused' | 'Completed';

export interface Campaign {
  id: ID;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  segmentId: ID | null;
  segmentName: string | null;
  startDate: ISODate;
  endDate: ISODate | null;
  budget: Paisa;
  spend: Paisa;
  ownerId: ID;
  ownerName: string;
  /** Funnel counters. */
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  leadsGenerated: number;
  dealsCreated: number;
  revenueInfluenced: Paisa;
}

export interface Segment {
  id: ID;
  name: string;
  description: string;
  /** Human-readable rule summary; the builder owns the real predicate tree. */
  rules: string[];
  memberCount: number;
  updatedAt: ISODate;
}

/* --------------------------------------------------------------- automation */

export type TriggerEvent =
  | 'Lead created'
  | 'Lead stage changed'
  | 'Lead untouched for N days'
  | 'Deal stage changed'
  | 'Deal idle for N days'
  | 'Quote sent'
  | 'Quote discount above threshold'
  | 'Ticket created'
  | 'Ticket SLA at risk'
  | 'Activity overdue';

export type ActionKind =
  | 'Assign owner'
  | 'Create task'
  | 'Send email template'
  | 'Send WhatsApp template'
  | 'Notify user'
  | 'Change stage'
  | 'Add tag'
  | 'Require approval'
  | 'Escalate to manager';

export interface WorkflowCondition {
  field: string;
  operator: 'is' | 'is not' | 'greater than' | 'less than' | 'contains';
  value: string;
}

export interface WorkflowAction {
  id: ID;
  kind: ActionKind;
  detail: string;
  /** Minutes to wait after the trigger before running. */
  delayMinutes: number;
}

export interface WorkflowRule {
  id: ID;
  name: string;
  description: string;
  module: 'Leads' | 'Deals' | 'Quotes' | 'Tickets' | 'Activities';
  trigger: TriggerEvent;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
  runsLast30Days: number;
  lastRunAt: ISODate | null;
  createdByName: string;
}

/** Round-robin / territory / load-based assignment. */
export interface AssignmentRule {
  id: ID;
  name: string;
  module: 'Leads' | 'Tickets';
  strategy: 'Round robin' | 'Territory' | 'Load balanced' | 'Product specialist';
  criteria: string;
  assignees: OwnerRef[];
  enabled: boolean;
  priority: number;
}

/* ------------------------------------------------------------- audit & data */

export interface AuditEntry {
  id: ID;
  at: ISODate;
  actorId: ID;
  actorName: string;
  action: string;
  module: string;
  recordRef: string;
  /** Field-level before/after, so a finance change is reconstructable. */
  changes: { field: string; from: string; to: string }[];
  ip: string;
}

export interface ImportIssue {
  row: number;
  column: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface ImportPreview {
  fileName: string;
  totalRows: number;
  validRows: number;
  issues: ImportIssue[];
  duplicates: { row: number; matches: string; field: string }[];
  columns: { source: string; target: string | null; sample: string }[];
}

/* -------------------------------------------------------------- email templ */

export interface EmailTemplate {
  id: ID;
  name: string;
  subject: string;
  module: 'Leads' | 'Deals' | 'Quotes' | 'Tickets' | 'Campaigns';
  body: string;
  /** Merge fields used, for the preview chip row. */
  variables: string[];
  usageCount: number;
  updatedAt: ISODate;
}

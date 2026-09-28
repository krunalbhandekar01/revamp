/**
 * Domain types for the panel.
 *
 * Money is held in **paisa as integers**, matching the existing server
 * (`purchasingPrice`, `tradingPrice`, `amount` are all paisa). Never store
 * rupees as a float — format at the edge with `lib/format.ts`.
 */

export type ID = string;
export type Paisa = number;
export type ISODate = string;

/* ------------------------------------------------------------------ people */

export interface Moderator {
  id: ID;
  name: string;
  email: string;
  phone: string;
  role: RoleKey;
  jobTitle: string;
  zones: string[];
  operation: 'solids' | 'liquids' | 'wastes' | null;
  deactivated: boolean;
  lastLoginAt: ISODate | null;
  /** Explicit overrides layered on top of the role template. */
  overrides: PermissionOverrides;
}

export type RoleKey =
  | 'super-admin'
  | 'admin'
  | 'finance-manager'
  | 'finance-analyst'
  | 'sales-manager'
  | 'sales-executive'
  | 'sourcing-manager'
  | 'ops-manager'
  | 'ops-executive'
  | 'marketing';

/** `{ [module]: { [action]: boolean } }` — only the keys that differ from the template. */
export type PermissionOverrides = Record<string, Record<string, boolean>>;
export type PermissionMatrix = Record<string, Record<string, boolean>>;

/* ---------------------------------------------------------------- business */

export type BusinessKind = 'Buyer' | 'Seller' | 'Both';
export type BusinessStatus = 'Verified' | 'Not Verified' | 'Deactivated';

export interface Business {
  id: ID;
  name: string;
  kind: BusinessKind;
  status: BusinessStatus;
  gstin: string;
  state: string;
  city: string;
  industry: string;
  kycCompleted: boolean;
  zohoLinked: boolean;
  createdAt: ISODate;
  lastActivityAt: ISODate;
  salesHandlerId: ID | null;
  /** Rolled-up economics — pre-aggregated server-side in production. */
  lifetimeRevenue: Paisa;
  lifetimeContribution: Paisa;
  openExposure: Paisa;
  creditLimit: Paisa;
  dso: number;
  paymentReliability: number; // 0..100
  orderCount: number;
  tags: string[];
}

/* ------------------------------------------------------------------ orders */

export type OrderStatus = 'Draft' | 'Placed' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';

export interface Order {
  id: ID;
  refNo: string;
  orderDate: ISODate;
  productId: ID;
  productName: string;
  buyerId: ID;
  buyerName: string;
  sellerId: ID;
  sellerName: string;
  qty: number;
  unit: string;
  purchasingPrice: Paisa; // per unit
  tradingPrice: Paisa; // per unit
  purchaseCreditTerm: number; // days
  salesCreditTerm: number; // days
  status: OrderStatus;
  state: string;
  salesHandlerId: ID;
  deliveredQty: number;
}

/* --------------------------------------------------------------- dispatches */

export type DispatchStatus = 'In Preparation' | 'Dispatched' | 'Completed' | 'On Hold' | 'Cancelled';
export type TransitStatus =
  | 'Finding Transport'
  | 'Transport Allocated'
  | 'Awaiting Loading'
  | 'Loaded'
  | 'In Transit'
  | 'Awaiting Unloading'
  | 'Goods Delivered'
  | 'Goods Rejected';
export type PayableStatus = 'Awaiting Clearance' | 'Cleared for Payment' | 'Paid' | 'On Hold' | 'Rejected';

export interface Dispatch {
  id: ID;
  refNo: string;
  trackingNo: string;
  orderId: ID;
  orderRefNo: string;
  productName: string;
  buyerId: ID;
  buyerName: string;
  sellerId: ID;
  sellerName: string;
  qty: number;
  unit: string;
  purchasingPrice: Paisa;
  tradingPrice: Paisa;
  transportCharges: Paisa;
  otherCharges: Paisa;
  vehicleNo: string;
  dispatchedOn: ISODate | null;
  receivedOn: ISODate | null;
  invoiceDate: ISODate | null;
  invoiceDueDate: ISODate | null;
  salesBillNo: string | null;
  status: DispatchStatus;
  transitStatus: TransitStatus;
  payableStatus: PayableStatus;
  state: string;
  lane: string;
  /** Has the sales invoice been acknowledged by Zoho Books? */
  zohoSynced: boolean;
  grnAccepted: boolean;
  docsComplete: boolean;
}

/* ----------------------------------------------------------------- payments */

export type PaymentDirection = 'Receivable' | 'Payable';
export type PaymentStatus = 'Pending' | 'Approved' | 'Added' | 'Rejected' | 'Cancelled';

export interface Payment {
  id: ID;
  refNo: string;
  direction: PaymentDirection;
  counterpartyId: ID;
  counterpartyName: string;
  dispatchId: ID | null;
  dispatchRefNo: string | null;
  amount: Paisa;
  paymentDate: ISODate;
  mode: string;
  status: PaymentStatus;
  zohoPaymentId: string | null;
  matched: boolean;
}

/* --------------------------------------------------------------- receivables */

export interface Receivable {
  id: ID;
  dispatchId: ID;
  dispatchRefNo: string;
  buyerId: ID;
  buyerName: string;
  invoicedOn: ISODate;
  dueDate: ISODate;
  amount: Paisa;
  paidSoFar: Paisa;
  /** Negative = not due yet. */
  daysOverdue: number;
  /** Model output: probability the balance lands within 7 days, 0..1. */
  collectionProbability: number;
  predictedPaymentDate: ISODate;
}

/* ------------------------------------------------------------------ treasury */

export interface BankAccount {
  id: ID;
  name: string;
  bank: string;
  accountNo: string;
  balance: Paisa;
  lastReconciledAt: ISODate;
}

export interface FundFacility {
  id: ID;
  name: string;
  lender: string;
  limit: Paisa;
  drawn: Paisa;
  interestRate: number; // annual %
  maturesOn: ISODate;
}

export type AllocationKind = 'Seller Payout' | 'Trade Partner' | 'Transporter' | 'Invoice Discounter';
export type AllocationDecision = 'pay' | 'part-pay' | 'hold';
export type AllocationState = 'queued' | 'approved' | 'released' | 'held';

/**
 * One row of the daily "who gets paid today" queue.
 * `score` and `recommendation` come from the ranking model; a human decides.
 */
export interface FundAllocationCandidate {
  id: ID;
  kind: AllocationKind;
  counterpartyId: ID;
  counterpartyName: string;
  dispatchRefNos: string[];
  amountDue: Paisa;
  dueDate: ISODate;
  daysPastDue: number;
  /** Gross margin on the linked dispatches. */
  linkedMargin: Paisa;
  /** salesCreditTerm − purchaseCreditTerm: how long our cash stays locked. */
  cashLockDays: number;
  /** Discount offered for settling today, in paisa. */
  earlyPayDiscount: Paisa;
  /** 0..100 — share of our volume for this SKU/region that this supplier carries. */
  supplierCriticality: number;
  /** Return on working capital, % per annum, if we release today. */
  rowcPercent: number;
  score: number; // 0..100
  recommendation: AllocationDecision;
  reason: string;
  state: AllocationState;
  blocked: boolean;
  blockedReason: string | null;
}

export interface CashPositionDay {
  date: ISODate;
  opening: Paisa;
  inflow: Paisa;
  outflow: Paisa;
  closing: Paisa;
  projected: boolean;
}

/* ------------------------------------------------------------ reconciliation */

export type ReconStatus = 'matched' | 'unmatched' | 'variance' | 'failed';

export interface ReconItem {
  id: ID;
  syncedAt: ISODate;
  docType: 'Invoice' | 'Bill' | 'Customer Payment' | 'Vendor Credit' | 'Credit Note';
  direction: 'push' | 'pull';
  reference: string;
  counterpartyName: string;
  panelAmount: Paisa | null;
  zohoAmount: Paisa | null;
  variance: Paisa;
  status: ReconStatus;
  error: string | null;
}

/* ------------------------------------------------------------------- leads */

export type LeadStatus =
  | 'Yet to be contacted'
  | 'Contacted'
  | 'Qualified'
  | 'Proposal Sent'
  | 'Converted'
  | 'Lost';

export interface Lead {
  id: ID;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  state: string;
  product: string;
  source: 'IndiaMART' | 'Website' | 'Referral' | 'Campaign' | 'Outbound';
  campaign: string | null;
  status: LeadStatus;
  score: number;
  handledById: ID;
  createdAt: ISODate;
}

/* -------------------------------------------------------------- schedules */

export interface DeliverySchedule {
  id: ID;
  orderRefNo: string;
  buyerName: string;
  sellerName: string;
  productName: string;
  lane: string;
  startDate: ISODate;
  endDate: ISODate;
  committedQty: number;
  deliveredQty: number;
  unit: string;
  /** Committed pace vs actual pace — > 1 means running behind. */
  riskRatio: number;
  status: 'On Track' | 'At Risk' | 'Behind' | 'Delivered';
}

/* ------------------------------------------------------------------ shared */

export interface SeriesPoint {
  label: string;
  [key: string]: string | number;
}

export interface Paged<T> {
  rows: T[];
  total: number;
}

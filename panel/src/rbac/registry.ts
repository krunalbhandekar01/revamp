/**
 * THE CANONICAL PERMISSION REGISTRY.
 *
 * In the legacy panel the only enumeration of valid (module, action) pairs lived
 * in a front-end file (`manage/team/options.js`), which is why the server could
 * never validate a permission payload. This module is the single source of
 * truth and is meant to be **moved to the server and imported from there** —
 * the shape is deliberately serialisable so it can ship as JSON over `/rbac/registry`.
 *
 * Adding a module or action here is the ONLY way to create one. The team editor
 * UI, the nav gating, the route guards and (in production) the server's
 * `permit.check()` all read from this list.
 */

export interface ActionDef {
  key: string;
  label: string;
  /** Actions that move money or change access are flagged for approval flows. */
  sensitive?: boolean;
  /** Implied by this action — granting `update` implies `view`, etc. */
  implies?: string[];
}

export interface ModuleDef {
  key: string;
  label: string;
  group: ModuleGroup;
  description: string;
  actions: ActionDef[];
}

export type ModuleGroup =
  | 'Finance'
  | 'Operations'
  | 'CRM'
  | 'Sales'
  | 'Marketing'
  | 'Support'
  | 'Administration';

export const MODULE_GROUPS: ModuleGroup[] = [
  'Finance',
  'CRM',
  'Sales',
  'Operations',
  'Marketing',
  'Support',
  'Administration',
];

const VIEW: ActionDef = { key: 'view', label: 'View' };
const CREATE: ActionDef = { key: 'create', label: 'Create', implies: ['view'] };
const UPDATE: ActionDef = { key: 'update', label: 'Edit', implies: ['view'] };
const DELETE: ActionDef = { key: 'delete', label: 'Delete', implies: ['view'], sensitive: true };
const EXPORT: ActionDef = { key: 'export', label: 'Export', implies: ['view'] };

export const MODULES: ModuleDef[] = [
  /* ----------------------------------------------------------------- Finance */
  {
    key: 'financeDashboard',
    label: 'Finance Dashboard',
    group: 'Finance',
    description: 'Cash position, receivables, ageing and margin roll-ups.',
    actions: [VIEW, EXPORT, { key: 'viewMargin', label: 'See deal margin', implies: ['view'] }],
  },
  {
    key: 'treasury',
    label: 'Treasury & Fund Allocation',
    group: 'Finance',
    description: 'The daily fund allocation queue, bank balances and facilities.',
    actions: [
      VIEW,
      { key: 'decide', label: 'Decide allocation', implies: ['view'], sensitive: true },
      { key: 'approve', label: 'Approve release', implies: ['view'], sensitive: true },
      { key: 'release', label: 'Release funds', implies: ['view'], sensitive: true },
      EXPORT,
    ],
  },
  {
    key: 'payout',
    label: 'Payouts',
    group: 'Finance',
    description: 'Seller, trade partner and affiliate payouts.',
    actions: [
      VIEW,
      CREATE,
      { key: 'approve', label: 'Approve', implies: ['view'], sensitive: true },
      { key: 'reject', label: 'Reject', implies: ['view'], sensitive: true },
      EXPORT,
    ],
  },
  {
    key: 'payment',
    label: 'Payments & Collections',
    group: 'Finance',
    description: 'Receivables, collections, advances and allocation against invoices.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      { key: 'allocate', label: 'Allocate to invoice', implies: ['view'], sensitive: true },
      EXPORT,
    ],
  },
  {
    key: 'reconciliation',
    label: 'Zoho Reconciliation',
    group: 'Finance',
    description: 'Sync health, unmatched items and manual matching.',
    actions: [
      VIEW,
      { key: 'match', label: 'Match manually', implies: ['view'], sensitive: true },
      { key: 'resync', label: 'Trigger re-sync', implies: ['view'] },
      EXPORT,
    ],
  },
  {
    key: 'creditControl',
    label: 'Credit Control',
    group: 'Finance',
    description: 'Credit limits, exposure and dunning.',
    actions: [
      VIEW,
      { key: 'setLimit', label: 'Set credit limit', implies: ['view'], sensitive: true },
      { key: 'block', label: 'Block / unblock buyer', implies: ['view'], sensitive: true },
    ],
  },


  /* --------------------------------------------------------------------- CRM */
  {
    key: 'lead',
    label: 'Leads',
    group: 'CRM',
    description: 'Inbound and outbound demand, scoring, qualification and conversion.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      DELETE,
      { key: 'assign', label: 'Assign owner', implies: ['view'] },
      { key: 'convert', label: 'Convert to deal', implies: ['view'] },
      { key: 'merge', label: 'Merge duplicates', implies: ['view'], sensitive: true },
      { key: 'viewAll', label: 'See all owners (not just own)', implies: ['view'] },
      { key: 'import', label: 'Import', implies: ['view'] },
      EXPORT,
    ],
  },
  {
    key: 'contact',
    label: 'Contacts',
    group: 'CRM',
    description: 'People at customer and supplier companies.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      DELETE,
      { key: 'merge', label: 'Merge duplicates', implies: ['view'], sensitive: true },
      { key: 'import', label: 'Import', implies: ['view'] },
      EXPORT,
    ],
  },
  {
    key: 'deal',
    label: 'Deals & Pipeline',
    group: 'CRM',
    description: 'Opportunities, stages, forecast and win/loss.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      DELETE,
      { key: 'changeStage', label: 'Move stage', implies: ['view'] },
      { key: 'close', label: 'Mark won / lost', implies: ['view'] },
      { key: 'reassign', label: 'Reassign owner', implies: ['view'] },
      { key: 'viewAll', label: 'See all owners (not just own)', implies: ['view'] },
      { key: 'managePipelines', label: 'Configure pipelines', implies: ['view'], sensitive: true },
      EXPORT,
    ],
  },
  {
    key: 'activity',
    label: 'Activities',
    group: 'CRM',
    description: 'Tasks, calls, meetings, follow-ups and the shared calendar.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      DELETE,
      { key: 'assign', label: 'Assign to others', implies: ['view'] },
      { key: 'viewAll', label: 'See the whole team', implies: ['view'] },
    ],
  },
  {
    key: 'quote',
    label: 'Quotations',
    group: 'Sales',
    description: 'Quote builder, discounts, approval and status tracking.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      DELETE,
      { key: 'send', label: 'Send to customer', implies: ['view'] },
      { key: 'approveDiscount', label: 'Approve discount', implies: ['view'], sensitive: true },
      { key: 'convert', label: 'Convert to order', implies: ['view'], sensitive: true },
      EXPORT,
    ],
  },
  {
    key: 'catalog',
    label: 'Catalogue & Pricing',
    group: 'Sales',
    description: 'Products, SKUs, tax rates and price lists.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      DELETE,
      { key: 'managePrices', label: 'Edit price lists', implies: ['view'], sensitive: true },
    ],
  },
  {
    key: 'ticket',
    label: 'Support Tickets',
    group: 'Support',
    description: 'Complaints, SLA tracking and resolution.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      { key: 'assign', label: 'Assign owner', implies: ['view'] },
      { key: 'resolve', label: 'Resolve / close', implies: ['view'] },
      { key: 'escalate', label: 'Escalate', implies: ['view'] },
      { key: 'viewAll', label: 'See all tickets', implies: ['view'] },
      EXPORT,
    ],
  },
  {
    key: 'automation',
    label: 'Automation',
    group: 'Administration',
    description: 'Workflow rules, assignment rules and escalations.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      DELETE,
      { key: 'toggle', label: 'Enable / disable rules', implies: ['view'], sensitive: true },
    ],
  },
  {
    key: 'dataImport',
    label: 'Data Import',
    group: 'Administration',
    description: 'CSV and Excel import with validation and duplicate detection.',
    actions: [
      VIEW,
      { key: 'run', label: 'Run an import', implies: ['view'], sensitive: true },
      { key: 'bulkUpdate', label: 'Bulk update records', implies: ['view'], sensitive: true },
    ],
  },
  {
    key: 'audit',
    label: 'Audit Log',
    group: 'Administration',
    description: 'Who changed what, when, with before and after values.',
    actions: [VIEW, EXPORT],
  },

  /* -------------------------------------------------------------- Operations */
  {
    key: 'order',
    label: 'Orders',
    group: 'Operations',
    description: 'Order lifecycle from placement to completion.',
    actions: [VIEW, CREATE, UPDATE, { key: 'cancel', label: 'Cancel', implies: ['view'] }, EXPORT],
  },
  {
    key: 'dispatch',
    label: 'Dispatches',
    group: 'Operations',
    description: 'Dispatch entry, transit tracking, documents and payable clearance.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      { key: 'updateTransit', label: 'Update transit', implies: ['view'] },
      { key: 'clearPayable', label: 'Clear for payment', implies: ['view'], sensitive: true },
      { key: 'approveInvoice', label: 'Approve invoice', implies: ['view'], sensitive: true },
      EXPORT,
    ],
  },
  {
    key: 'schedule',
    label: 'Delivery Schedules',
    group: 'Operations',
    description: 'Commitment vs delivery planning, lanes and capacity.',
    actions: [VIEW, CREATE, UPDATE, { key: 'plan', label: 'Run planner', implies: ['view'] }, EXPORT],
  },
  {
    key: 'transporter',
    label: 'Transporters',
    group: 'Operations',
    description: 'Transport partners, rates and vehicle allocation.',
    actions: [VIEW, CREATE, UPDATE, DELETE],
  },

  /* ------------------------------------------------------------------- Sales */
  {
    key: 'salesDashboard',
    label: 'Sales Dashboard',
    group: 'Sales',
    description: 'Volume, revenue, pipeline and conversion.',
    actions: [
      VIEW,
      EXPORT,
      { key: 'viewMargin', label: 'See deal margin', implies: ['view'] },
      { key: 'viewAll', label: 'See all handlers (not just own)', implies: ['view'] },
    ],
  },
  {
    key: 'business',
    label: 'Businesses',
    group: 'Sales',
    description: 'Buyer and seller accounts, KYC and Customer 360.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      { key: 'verify', label: 'Verify KYC', implies: ['view'], sensitive: true },
      { key: 'viewFinance', label: 'See financial profile', implies: ['view'] },
      { key: 'deactivate', label: 'Deactivate', implies: ['view'], sensitive: true },
      EXPORT,
    ],
  },
  {
    key: 'enquiry',
    label: 'Enquiries & RFQs',
    group: 'Sales',
    description: 'Open RFQs, listings, quotes and purchase orders.',
    actions: [VIEW, CREATE, UPDATE, { key: 'quote', label: 'Send quote', implies: ['view'] }, EXPORT],
  },

  /* --------------------------------------------------------------- Marketing */
  {
    key: 'campaign',
    label: 'Campaigns & Segments',
    group: 'Marketing',
    description: 'Campaigns, audience segments and attribution to revenue.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      DELETE,
      { key: 'launch', label: 'Launch / pause', implies: ['view'], sensitive: true },
      EXPORT,
    ],
  },
  {
    key: 'marketingDashboard',
    label: 'Marketing Dashboard',
    group: 'Marketing',
    description: 'Funnel, cohorts, attribution and channel performance.',
    actions: [VIEW, EXPORT],
  },

  /* ---------------------------------------------------------- Administration */
  {
    key: 'team',
    label: 'Team & Access',
    group: 'Administration',
    description: 'Panel users, roles and permissions.',
    actions: [
      VIEW,
      CREATE,
      UPDATE,
      { key: 'managePermissions', label: 'Change permissions', implies: ['view'], sensitive: true },
      { key: 'deactivate', label: 'Deactivate user', implies: ['view'], sensitive: true },
    ],
  },
  {
    key: 'masterData',
    label: 'Master Data',
    group: 'Administration',
    description: 'Products, units, tags, payment terms and localisation.',
    actions: [VIEW, CREATE, UPDATE, DELETE],
  },
  {
    key: 'jobs',
    label: 'Background Jobs',
    group: 'Administration',
    description: 'Scheduled job health, last run and failures.',
    actions: [VIEW, { key: 'run', label: 'Run now', implies: ['view'], sensitive: true }],
  },
];

/* ------------------------------------------------------------------ indexes */

export const MODULE_BY_KEY: Record<string, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.key, m]),
);

/** Every valid "module:action" pair. The server validates writes against this. */
export const ALL_PERMISSION_KEYS: string[] = MODULES.flatMap((m) =>
  m.actions.map((a) => `${m.key}:${a.key}`),
);

export const SENSITIVE_PERMISSION_KEYS: string[] = MODULES.flatMap((m) =>
  m.actions.filter((a) => a.sensitive).map((a) => `${m.key}:${a.key}`),
);

export function isValidPermission(moduleKey: string, action: string): boolean {
  return Boolean(MODULE_BY_KEY[moduleKey]?.actions.some((a) => a.key === action));
}

export function isSensitive(moduleKey: string, action: string): boolean {
  return Boolean(MODULE_BY_KEY[moduleKey]?.actions.find((a) => a.key === action)?.sensitive);
}

export function modulesInGroup(group: ModuleGroup): ModuleDef[] {
  return MODULES.filter((m) => m.group === group);
}

export function countPermissions(): { modules: number; pairs: number; sensitive: number } {
  return {
    modules: MODULES.length,
    pairs: ALL_PERMISSION_KEYS.length,
    sensitive: SENSITIVE_PERMISSION_KEYS.length,
  };
}

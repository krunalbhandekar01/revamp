/**
 * ROLE TEMPLATES.
 *
 * The legacy panel had a `moderatorRole` field that granted nothing — it only
 * picked a landing route, while real access came from ticking a subset of 184
 * checkboxes per user. Here a role is a *template* that generates the matrix,
 * and per-user overrides are layered on top and shown as an explicit diff.
 *
 * This mirrors what the inventory product already does server-side in
 * `app/rbac/permissionTemplates.ts` — the panel simply never got it.
 */

import { MODULES, isValidPermission } from './registry';
import type { PermissionMatrix, PermissionOverrides, RoleKey } from '@/types/domain';

export interface RoleDef {
  key: RoleKey;
  label: string;
  description: string;
  /** Landing route after sign-in. */
  defaultRoute: string;
  /** '*' grants everything. Otherwise a list of "module:action" or "module:*". */
  grants: string[];
}

export const ROLES: RoleDef[] = [
  {
    key: 'super-admin',
    label: 'Super Admin',
    description: 'Unrestricted. Reserved for platform owners.',
    defaultRoute: '/treasury/allocation',
    grants: ['*'],
  },
  {
    key: 'admin',
    label: 'Admin',
    description: 'Everything except changing permissions and releasing funds.',
    defaultRoute: '/dashboard/finance',
    grants: [
      'financeDashboard:*',
      'treasury:view',
      'treasury:decide',
      'payout:*',
      'payment:*',
      'reconciliation:*',
      'creditControl:*',
      'order:*',
      'dispatch:*',
      'schedule:*',
      'transporter:*',
      'salesDashboard:*',
      'business:*',
      'enquiry:*',
      'lead:*',
      'contact:*',
      'deal:*',
      'activity:*',
      'quote:*',
      'catalog:*',
      'ticket:*',
      'campaign:*',
      'marketingDashboard:*',
      'automation:*',
      'dataImport:view',
      'audit:*',
      'team:view',
      'team:create',
      'team:update',
      'masterData:*',
      'jobs:view',
    ],
  },
  {
    key: 'finance-manager',
    label: 'Finance Manager',
    description: 'Owns the cash decision. Can decide and approve, release needs a second pair of eyes.',
    defaultRoute: '/treasury/allocation',
    grants: [
      'financeDashboard:*',
      'treasury:view',
      'treasury:decide',
      'treasury:approve',
      'treasury:export',
      'payout:view',
      'payout:create',
      'payout:approve',
      'payout:reject',
      'payout:export',
      'payment:*',
      'reconciliation:*',
      'creditControl:*',
      'order:view',
      'order:export',
      'dispatch:view',
      'dispatch:clearPayable',
      'dispatch:approveInvoice',
      'dispatch:export',
      'business:view',
      'business:viewFinance',
      'business:export',
      'salesDashboard:view',
      'salesDashboard:viewMargin',
      'salesDashboard:viewAll',
      'deal:view',
      'deal:viewAll',
      'deal:export',
      'quote:view',
      'quote:approveDiscount',
      'quote:export',
      'catalog:view',
      'catalog:managePrices',
      'contact:view',
      'audit:view',
      'audit:export',
      'jobs:view',
    ],
  },
  {
    key: 'finance-analyst',
    label: 'Finance Analyst',
    description: 'Prepares the queue and works the unmatched list. Cannot approve or release.',
    defaultRoute: '/treasury/allocation',
    grants: [
      'financeDashboard:view',
      'financeDashboard:export',
      'financeDashboard:viewMargin',
      'treasury:view',
      'treasury:export',
      'payout:view',
      'payout:create',
      'payout:export',
      'payment:view',
      'payment:create',
      'payment:update',
      'payment:export',
      'reconciliation:view',
      'reconciliation:match',
      'reconciliation:resync',
      'reconciliation:export',
      'creditControl:view',
      'order:view',
      'dispatch:view',
      'business:view',
      'business:viewFinance',
      'deal:view',
      'deal:viewAll',
      'quote:view',
      'catalog:view',
      'audit:view',
    ],
  },
  {
    key: 'sales-manager',
    label: 'Sales Manager',
    description: 'Full sales surface including margin, across all handlers.',
    defaultRoute: '/crm',
    grants: [
      'salesDashboard:*',
      'business:view',
      'business:create',
      'business:update',
      'business:verify',
      'business:viewFinance',
      'business:export',
      'enquiry:*',
      'order:view',
      'order:create',
      'order:update',
      'order:export',
      'dispatch:view',
      'schedule:view',
      'lead:*',
      'contact:*',
      'deal:*',
      'activity:*',
      'quote:view',
      'quote:create',
      'quote:update',
      'quote:send',
      'quote:approveDiscount',
      'quote:export',
      'catalog:view',
      'ticket:view',
      'ticket:assign',
      'ticket:viewAll',
      'campaign:view',
      'marketingDashboard:view',
      'automation:view',
      'dataImport:view',
      'dataImport:run',
      'creditControl:view',
    ],
  },
  {
    key: 'sales-executive',
    label: 'Sales Executive',
    description: 'Own accounts only. Sees margin on their own deals, not company-wide finance.',
    defaultRoute: '/crm/leads',
    grants: [
      'salesDashboard:view',
      'salesDashboard:viewMargin',
      'business:view',
      'business:create',
      'business:update',
      'enquiry:view',
      'enquiry:create',
      'enquiry:update',
      'enquiry:quote',
      'order:view',
      'order:create',
      'dispatch:view',
      'lead:view',
      'lead:create',
      'lead:update',
      'lead:convert',
      'lead:export',
      'contact:view',
      'contact:create',
      'contact:update',
      'deal:view',
      'deal:create',
      'deal:update',
      'deal:changeStage',
      'deal:close',
      'activity:view',
      'activity:create',
      'activity:update',
      'quote:view',
      'quote:create',
      'quote:update',
      'quote:send',
      'catalog:view',
      'ticket:view',
      'ticket:create',
    ],
  },
  {
    key: 'sourcing-manager',
    label: 'Sourcing Manager',
    description: 'Supply side: sellers, listings, supplier performance and schedules.',
    defaultRoute: '/crm/deals',
    grants: [
      'salesDashboard:view',
      'business:view',
      'business:create',
      'business:update',
      'business:verify',
      'enquiry:*',
      'order:view',
      'order:create',
      'order:update',
      'dispatch:view',
      'dispatch:create',
      'schedule:*',
      'transporter:view',
      'payout:view',
      'lead:view',
      'lead:create',
      'lead:update',
      'lead:assign',
      'lead:convert',
      'lead:viewAll',
      'contact:*',
      'deal:view',
      'deal:create',
      'deal:update',
      'deal:changeStage',
      'deal:close',
      'deal:viewAll',
      'activity:*',
      'quote:view',
      'catalog:view',
    ],
  },
  {
    key: 'ops-manager',
    label: 'Operations Manager',
    description: 'Runs dispatch and delivery. Can clear payables but cannot release cash.',
    defaultRoute: '/dispatches',
    grants: [
      'order:*',
      'dispatch:*',
      'schedule:*',
      'transporter:*',
      'business:view',
      'enquiry:view',
      'payment:view',
      'masterData:view',
      'activity:view',
      'activity:create',
      'activity:update',
      'ticket:*',
      'contact:view',
      'catalog:view',
      'jobs:view',
    ],
  },
  {
    key: 'ops-executive',
    label: 'Operations Executive',
    description: 'Day-to-day dispatch entry and transit updates.',
    defaultRoute: '/dispatches',
    grants: [
      'order:view',
      'dispatch:view',
      'dispatch:create',
      'dispatch:update',
      'dispatch:updateTransit',
      'schedule:view',
      'schedule:update',
      'transporter:view',
      'business:view',
      'activity:view',
      'activity:create',
      'activity:update',
      'ticket:view',
      'ticket:create',
      'ticket:update',
      'contact:view',
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'Leads, campaigns and attribution. No access to money.',
    defaultRoute: '/crm/leads',
    grants: [
      'marketingDashboard:*',
      'lead:view',
      'lead:create',
      'lead:update',
      'lead:assign',
      'lead:viewAll',
      'lead:import',
      'lead:export',
      'contact:view',
      'contact:export',
      'campaign:*',
      'activity:view',
      'activity:create',
      'deal:view',
      'deal:viewAll',
      'business:view',
      'salesDashboard:view',
      'dataImport:view',
      'dataImport:run',
    ],
  },
];

export const ROLE_BY_KEY: Record<RoleKey, RoleDef> = Object.fromEntries(
  ROLES.map((r) => [r.key, r]),
) as Record<RoleKey, RoleDef>;

/** An all-false matrix covering every module × action in the registry. */
export function emptyMatrix(): PermissionMatrix {
  const m: PermissionMatrix = {};
  for (const mod of MODULES) {
    m[mod.key] = {};
    for (const a of mod.actions) m[mod.key][a.key] = false;
  }
  return m;
}

/** Expand a role's grant list into a full matrix. */
export function matrixForRole(role: RoleKey): PermissionMatrix {
  const matrix = emptyMatrix();
  const def = ROLE_BY_KEY[role];
  if (!def) return matrix;

  const grantAll = def.grants.includes('*');
  for (const mod of MODULES) {
    for (const a of mod.actions) {
      const grant =
        grantAll || def.grants.includes(`${mod.key}:*`) || def.grants.includes(`${mod.key}:${a.key}`);
      if (grant) matrix[mod.key][a.key] = true;
    }
  }
  return applyImplications(matrix);
}

/** `update` implies `view`, etc. Keeps a matrix internally consistent. */
export function applyImplications(matrix: PermissionMatrix): PermissionMatrix {
  for (const mod of MODULES) {
    for (const a of mod.actions) {
      if (matrix[mod.key]?.[a.key] && a.implies) {
        for (const dep of a.implies) {
          if (isValidPermission(mod.key, dep)) matrix[mod.key][dep] = true;
        }
      }
    }
  }
  return matrix;
}

/** Role template + per-user overrides = the effective matrix. */
export function resolvePermissions(role: RoleKey, overrides: PermissionOverrides = {}): PermissionMatrix {
  const matrix = matrixForRole(role);
  for (const [modKey, actions] of Object.entries(overrides)) {
    for (const [action, value] of Object.entries(actions)) {
      // Silently drop anything not in the registry — this is the guard the
      // legacy `Schema.Types.Mixed` field never had.
      if (isValidPermission(modKey, action)) matrix[modKey][action] = value;
    }
  }
  return applyImplications(matrix);
}

export interface OverrideDiff {
  moduleKey: string;
  moduleLabel: string;
  action: string;
  actionLabel: string;
  templateValue: boolean;
  effectiveValue: boolean;
  sensitive: boolean;
}

/** What this user has that their role template does not give them (and vice versa). */
export function diffFromTemplate(role: RoleKey, overrides: PermissionOverrides): OverrideDiff[] {
  const template = matrixForRole(role);
  const effective = resolvePermissions(role, overrides);
  const out: OverrideDiff[] = [];
  for (const mod of MODULES) {
    for (const a of mod.actions) {
      const t = template[mod.key]?.[a.key] ?? false;
      const e = effective[mod.key]?.[a.key] ?? false;
      if (t !== e) {
        out.push({
          moduleKey: mod.key,
          moduleLabel: mod.label,
          action: a.key,
          actionLabel: a.label,
          templateValue: t,
          effectiveValue: e,
          sensitive: Boolean(a.sensitive),
        });
      }
    }
  }
  return out;
}

export function grantedCount(matrix: PermissionMatrix): number {
  return Object.values(matrix).reduce(
    (n, actions) => n + Object.values(actions).filter(Boolean).length,
    0,
  );
}

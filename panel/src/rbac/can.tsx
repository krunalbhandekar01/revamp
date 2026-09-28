import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from './auth';
import { MODULE_BY_KEY } from './registry';

/**
 * Conditional render on a permission.
 *
 *   <Can module="treasury" action="release"><Button…/></Can>
 *
 * Prefer hiding an action over disabling it, unless the user could reasonably
 * expect it to be there — then pass `fallback` with an explanation.
 */
export function Can({
  module,
  action,
  children,
  fallback = null,
}: {
  module: string;
  action: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = useAuth();
  return <>{can(module, action) ? children : fallback}</>;
}

/** Route-level guard. Redirects to the user's own landing route. */
export function RequirePermission({
  module,
  action = 'view',
  children,
}: {
  module: string;
  action?: string;
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (can(module, action)) return <>{children}</>;
  return <NoAccess module={module} action={action} />;
}

export function NoAccess({ module, action }: { module: string; action: string }) {
  const label = MODULE_BY_KEY[module]?.label ?? module;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-warning-soft">
        <ShieldAlert className="size-6 text-warning" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">You don’t have access to {label}</h2>
      <p className="mt-1.5 max-w-md text-sm text-ink-secondary">
        Your role does not include <code className="font-mono text-xs">{action}</code> on this module.
        Ask an administrator to grant it, or switch to a role that has it using the role picker in the
        top bar.
      </p>
    </div>
  );
}

/** Sends the user wherever their role is meant to land. */
export function DefaultRedirect() {
  const { user } = useAuth();
  // Kept in sync with ROLE_BY_KEY[...].defaultRoute via the roles module.
  const target = ROLE_ROUTES[user.role] ?? '/crm';
  return <Navigate to={target} replace />;
}

const ROLE_ROUTES: Record<string, string> = {
  'super-admin': '/treasury/allocation',
  admin: '/dashboard/finance',
  'finance-manager': '/treasury/allocation',
  'finance-analyst': '/treasury/allocation',
  'sales-manager': '/crm',
  'sales-executive': '/crm/leads',
  'sourcing-manager': '/crm/deals',
  'ops-manager': '/dispatches',
  'ops-executive': '/dispatches',
  marketing: '/crm/leads',
};

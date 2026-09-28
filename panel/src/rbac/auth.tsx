import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { resolvePermissions } from './roles';
import { SENSITIVE_PERMISSION_KEYS } from './registry';
import type { Moderator, PermissionMatrix, RoleKey } from '@/types/domain';
import { CURRENT_USERS } from '@/mocks/db';

/**
 * Auth + permission context.
 *
 * The demo ships a role switcher in the topbar so the permission model can be
 * exercised without a server. When this is wired to the API, `signIn` calls
 * `/user/me` and the only thing that changes is where `user` comes from —
 * `can()` and the gating components stay identical.
 *
 * IMPORTANT: this gate is a *usability* layer. It hides what a user may not do.
 * It is not a security boundary — the server must run the same check with
 * `permit.check(module, action)` on every route. The legacy panel shipped this
 * layer without the server half on 45 of 73 route files.
 */

interface AuthValue {
  user: Moderator;
  permissions: PermissionMatrix;
  /** `can('treasury', 'release')` */
  can: (moduleKey: string, action: string) => boolean;
  /** True if the user holds any action on the module — used to show/hide nav. */
  canAny: (moduleKey: string) => boolean;
  /** Sensitive actions require a second approver; this reports that, it does not enforce it. */
  needsSecondApprover: (moduleKey: string, action: string) => boolean;
  switchUser: (id: string) => void;
  availableUsers: Moderator[];
}

const AuthContext = createContext<AuthValue | null>(null);

const STORAGE_KEY = 'bf-demo-user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && CURRENT_USERS.some((u) => u.id === stored)) return stored;
    } catch {
      /* private mode — fall through to the default */
    }
    return CURRENT_USERS[0].id;
  });

  const user = useMemo(
    () => CURRENT_USERS.find((u) => u.id === userId) ?? CURRENT_USERS[0],
    [userId],
  );

  const permissions = useMemo(
    () => resolvePermissions(user.role as RoleKey, user.overrides),
    [user],
  );

  const can = useCallback(
    (moduleKey: string, action: string) => Boolean(permissions[moduleKey]?.[action]),
    [permissions],
  );

  const canAny = useCallback(
    (moduleKey: string) => Object.values(permissions[moduleKey] ?? {}).some(Boolean),
    [permissions],
  );

  const needsSecondApprover = useCallback(
    (moduleKey: string, action: string) =>
      SENSITIVE_PERMISSION_KEYS.includes(`${moduleKey}:${action}`) && user.role !== 'super-admin',
    [user.role],
  );

  const switchUser = useCallback((id: string) => {
    setUserId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* non-fatal */
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      permissions,
      can,
      canAny,
      needsSecondApprover,
      switchUser,
      availableUsers: CURRENT_USERS,
    }),
    [user, permissions, can, canAny, needsSecondApprover, switchUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function useCan(moduleKey: string, action: string): boolean {
  return useAuth().can(moduleKey, action);
}

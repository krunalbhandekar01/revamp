import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Eye, RotateCcw, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tooltip } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MODULE_GROUPS, modulesInGroup } from '@/rbac/registry';
import { ROLES, ROLE_BY_KEY, diffFromTemplate, matrixForRole, resolvePermissions } from '@/rbac/roles';
import { useAuth } from '@/rbac/auth';
import { updateTeamMember } from '@/api/operations';
import { qk } from '@/api/client';
import { NAV_FLAT } from '@/config/nav';
import { cn } from '@/lib/utils';
import type { Moderator, PermissionOverrides, RoleKey } from '@/types/domain';

/**
 * The permission editor.
 *
 * Three things the legacy version does not do:
 *   1. Start from a role template, so the common case is one dropdown.
 *   2. Show every deviation from that template as an explicit diff.
 *   3. Preview exactly which screens the person will end up seeing.
 *
 * The grid itself is generated from the canonical registry — adding a module
 * to the registry adds it here, and nowhere else needs touching.
 */
export function PermissionEditor({ member, onClose }: { member: Moderator; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [role, setRole] = useState<RoleKey>(member.role as RoleKey);
  const [overrides, setOverrides] = useState<PermissionOverrides>(() =>
    JSON.parse(JSON.stringify(member.overrides ?? {})),
  );

  const template = useMemo(() => matrixForRole(role), [role]);
  const effective = useMemo(() => resolvePermissions(role, overrides), [role, overrides]);
  const diff = useMemo(() => diffFromTemplate(role, overrides), [role, overrides]);

  const isSelf = member.id === user.id;
  const escalating = diff.filter((d) => d.sensitive && d.effectiveValue);

  const visibleScreens = useMemo(
    () => NAV_FLAT.filter((item) => effective[item.module]?.[item.action ?? 'view']),
    [effective],
  );

  const save = useMutation({
    mutationFn: () => updateTeamMember(member.id, { role, overrides }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.team.list });
      onClose();
    },
  });

  const toggle = (moduleKey: string, action: string, next: boolean) => {
    setOverrides((prev) => {
      const copy: PermissionOverrides = JSON.parse(JSON.stringify(prev));
      const templateValue = template[moduleKey]?.[action] ?? false;
      if (next === templateValue) {
        // Back in line with the template — drop the override rather than store a no-op.
        delete copy[moduleKey]?.[action];
        if (copy[moduleKey] && Object.keys(copy[moduleKey]).length === 0) delete copy[moduleKey];
      } else {
        copy[moduleKey] = { ...(copy[moduleKey] ?? {}), [action]: next };
      }
      return copy;
    });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Access — {member.name}</DialogTitle>
          <DialogDescription>
            {member.email} · {member.jobTitle}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Separation of duties. The panel reports it; the server must enforce it. */}
          {isSelf && (
            <Callout tone="critical" icon={ShieldAlert}>
              You are editing your own access. No user may raise their own permissions — this change will
              be rejected by the server. Ask another administrator.
            </Callout>
          )}
          {!isSelf && escalating.length > 0 && (
            <Callout tone="warning" icon={AlertTriangle}>
              This grants {escalating.length} sensitive permission{escalating.length === 1 ? '' : 's'} beyond
              the role template ({escalating.map((e) => `${e.moduleLabel} · ${e.actionLabel}`).join(', ')}).
              Changes to money and access permissions require a second approver and are written to the audit
              log.
            </Callout>
          )}

          {/* 1 — the common case: one dropdown */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                Role template
              </label>
              <Select value={role} onValueChange={(v) => setRole(v as RoleKey)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
                {ROLE_BY_KEY[role]?.description}
              </p>
            </div>
            {diff.length > 0 && (
              <Button variant="outline" onClick={() => setOverrides({})}>
                <RotateCcw /> Reset to template ({diff.length})
              </Button>
            )}
          </div>

          {/* 2 — the diff */}
          {diff.length > 0 && (
            <div className="rounded-lg border border-line bg-surface-3 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Deviations from {ROLE_BY_KEY[role]?.label}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {diff.map((d) => (
                  <Badge
                    key={`${d.moduleKey}:${d.action}`}
                    tone={d.effectiveValue ? (d.sensitive ? 'serious' : 'good') : 'neutral'}
                  >
                    {d.effectiveValue ? '+' : '−'} {d.moduleLabel} · {d.actionLabel}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* 3 — the generated grid */}
          <div className="space-y-5">
            {MODULE_GROUPS.map((group) => {
              const modules = modulesInGroup(group);
              if (modules.length === 0) return null;
              return (
                <div key={group}>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    {group}
                  </h4>
                  <div className="space-y-2.5">
                    {modules.map((mod) => (
                      <div key={mod.key} className="rounded-lg border border-line p-3">
                        <div className="mb-2">
                          <div className="text-[13px] font-medium text-ink">{mod.label}</div>
                          <div className="text-[11px] text-ink-muted">{mod.description}</div>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                          {mod.actions.map((action) => {
                            const checked = effective[mod.key]?.[action.key] ?? false;
                            const fromTemplate = template[mod.key]?.[action.key] ?? false;
                            const overridden = checked !== fromTemplate;
                            return (
                              <label
                                key={action.key}
                                className={cn(
                                  'inline-flex cursor-pointer items-center gap-1.5 text-[13px]',
                                  overridden && 'font-medium',
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => toggle(mod.key, action.key, Boolean(v))}
                                />
                                <span className={overridden ? 'text-primary' : 'text-ink-secondary'}>
                                  {action.label}
                                </span>
                                {action.sensitive && (
                                  <Tooltip content="Sensitive: moves money or changes access. Requires a second approver.">
                                    <ShieldAlert className="size-3 cursor-help text-serious" />
                                  </Tooltip>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <Separator />

          {/* 4 — the preview */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              <Eye className="size-3.5" /> What {member.name.split(' ')[0]} will see
            </div>
            {visibleScreens.length === 0 ? (
              <p className="text-xs text-ink-secondary">
                No screens. This person would sign in to an empty panel.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {visibleScreens.map((s) => (
                  <Badge key={s.to} tone="outline">
                    <s.icon />
                    {s.label}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => save.mutate()} disabled={isSelf || save.isPending}>
            {save.isPending ? 'Saving…' : escalating.length > 0 ? 'Submit for approval' : 'Save access'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Callout({
  tone,
  icon: Icon,
  children,
}: {
  tone: 'warning' | 'critical';
  icon: typeof AlertTriangle;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed',
        tone === 'critical'
          ? 'border-critical/30 bg-critical-soft text-critical'
          : 'border-warning/30 bg-warning-soft text-warning',
      )}
    >
      <Icon className="mt-px size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}

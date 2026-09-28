import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Clock,
  Filter,
  Mail,
  Plus,
  Shuffle,
  Workflow,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/rbac/can';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { getAssignmentRules, getEmailTemplates, getWorkflowRules, toggleWorkflowRule } from '@/api/crm';
import { relative } from '@/lib/format';
import { cn, sumBy } from '@/lib/utils';
import type { WorkflowRule } from '@/types/crm';

/**
 * Automation.
 *
 * Every rule reads as trigger → conditions → actions, in that order and in
 * plain words. A rule an ops lead cannot read is a rule nobody will trust
 * enough to leave switched on.
 */
export default function AutomationPage() {
  const qc = useQueryClient();
  const { can } = useAuth();

  const { data: rules = [], isLoading } = useQuery({ queryKey: qk.crm.workflows, queryFn: getWorkflowRules });
  const { data: assignment = [] } = useQuery({
    queryKey: qk.crm.assignmentRules,
    queryFn: getAssignmentRules,
  });
  const { data: templates = [] } = useQuery({
    queryKey: qk.crm.emailTemplates,
    queryFn: getEmailTemplates,
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => toggleWorkflowRule(id, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.crm.workflows }),
  });

  return (
    <>
      <PageHeader
        title="Automation"
        description="Rules that run without a human: follow-ups, escalations, assignment and approvals."
        actions={
          <Can module="automation" action="create">
            <Button variant="primary">
              <Plus /> New rule
            </Button>
          </Can>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active rules" value={rules.filter((r) => r.enabled).length} loading={isLoading} />
        <StatTile
          label="Runs (30 days)"
          value={sumBy(rules, (r) => r.runsLast30Days)}
          sublabel="Actions taken automatically"
          loading={isLoading}
          emphasis
        />
        <StatTile label="Assignment rules" value={assignment.length} loading={isLoading} />
        <StatTile label="Email templates" value={templates.length} loading={isLoading} />
      </div>

      <Tabs defaultValue="workflows" className="mt-5">
        <TabsList>
          <TabsTrigger value="workflows">
            <Workflow /> Workflow rules
          </TabsTrigger>
          <TabsTrigger value="assignment">
            <Shuffle /> Assignment
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Mail /> Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              canToggle={can('automation', 'toggle')}
              onToggle={(enabled) => toggle.mutate({ id: rule.id, enabled })}
            />
          ))}
        </TabsContent>

        <TabsContent value="assignment" className="space-y-3">
          <p className="text-xs leading-relaxed text-ink-secondary">
            Rules are evaluated in priority order; the first match wins. An unmatched record falls through to
            the lowest-priority catch-all.
          </p>
          {assignment.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="min-w-0">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    <span className="tnum rounded bg-surface-3 px-1.5 py-0.5 text-[11px] text-ink-muted">
                      #{r.priority}
                    </span>
                    {r.name}
                    <Badge tone="outline">{r.module}</Badge>
                    <Badge tone="primary">{r.strategy}</Badge>
                  </CardTitle>
                  <p className="mt-1 text-xs text-ink-secondary">{r.criteria}</p>
                </div>
                <Badge tone={r.enabled ? 'good' : 'neutral'}>{r.enabled ? 'On' : 'Off'}</Badge>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wide text-ink-muted">Assigns to</span>
                  {r.assignees.map((a) => (
                    <Badge key={a.id} tone="outline">
                      {a.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="templates" className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="min-w-0">
                  <CardTitle>{t.name}</CardTitle>
                  <p className="mt-0.5 truncate text-xs text-ink-secondary">{t.subject}</p>
                </div>
                <Badge tone="outline">{t.module}</Badge>
              </CardHeader>
              <CardContent>
                <pre className="max-h-28 overflow-hidden whitespace-pre-wrap rounded-md border border-line bg-surface-3 p-2.5 font-sans text-[11px] leading-relaxed text-ink-secondary">
                  {t.body}
                </pre>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  {t.variables.slice(0, 4).map((v) => (
                    <code key={v} className="rounded bg-primary-soft px-1 py-0.5 font-mono text-[10px] text-primary">
                      {`{{${v}}}`}
                    </code>
                  ))}
                  {t.variables.length > 4 && (
                    <span className="text-[10px] text-ink-muted">+{t.variables.length - 4}</span>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-ink-muted">
                  Used {t.usageCount} times · updated {relative(t.updatedAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </>
  );
}

function RuleCard({
  rule,
  canToggle,
  onToggle,
}: {
  rule: WorkflowRule;
  canToggle: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <Card className={cn(!rule.enabled && 'opacity-70')}>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="flex flex-wrap items-center gap-2">
            {rule.name}
            <Badge tone="outline">{rule.module}</Badge>
          </CardTitle>
          <p className="mt-0.5 text-xs text-ink-secondary">{rule.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {rule.enabled && rule.runsLast30Days > 0 && (
            <Tooltip content={`Last run ${relative(rule.lastRunAt)}`}>
              <span>
                <Badge tone="primary">
                  <Zap /> {rule.runsLast30Days}
                </Badge>
              </span>
            </Tooltip>
          )}
          <Tooltip content={canToggle ? undefined : 'Needs the “Enable / disable rules” permission'}>
            <span>
              <Switch checked={rule.enabled} disabled={!canToggle} onCheckedChange={onToggle} />
            </span>
          </Tooltip>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
          <Block icon={Zap} label="When" tone="primary">
            <span className="text-[13px] text-ink">{rule.trigger}</span>
          </Block>

          <ArrowRight className="hidden size-4 shrink-0 self-center text-ink-muted lg:block" aria-hidden />

          <Block icon={Filter} label="If">
            {rule.conditions.length === 0 ? (
              <span className="text-[13px] text-ink-muted">Always</span>
            ) : (
              <ul className="space-y-0.5">
                {rule.conditions.map((c, i) => (
                  <li key={i} className="text-[13px] text-ink">
                    {c.field} <span className="text-ink-muted">{c.operator}</span> {c.value}
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <ArrowRight className="hidden size-4 shrink-0 self-center text-ink-muted lg:block" aria-hidden />

          <Block icon={Clock} label="Then">
            <ul className="space-y-1">
              {rule.actions.map((a) => (
                <li key={a.id} className="text-[13px] text-ink">
                  {a.kind}
                  <span className="text-ink-muted"> — {a.detail}</span>
                  {a.delayMinutes > 0 && (
                    <span className="ml-1 text-[11px] text-ink-muted">
                      (after {a.delayMinutes >= 1440 ? `${Math.round(a.delayMinutes / 1440)}d` : `${a.delayMinutes}m`})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Block>
        </div>
        <p className="mt-2.5 text-[11px] text-ink-muted">Created by {rule.createdByName}</p>
      </CardContent>
    </Card>
  );
}

function Block({
  icon: Icon,
  label,
  tone,
  children,
}: {
  icon: typeof Zap;
  label: string;
  tone?: 'primary';
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1 rounded-lg border border-line bg-surface-3 p-2.5">
      <div
        className={cn(
          'mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide',
          tone === 'primary' ? 'text-primary' : 'text-ink-muted',
        )}
      >
        <Icon className="size-3" aria-hidden />
        {label}
      </div>
      {children}
    </div>
  );
}

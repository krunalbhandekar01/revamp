import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,

  Copy,
  Mail,
  MapPin,
  Phone,
  X,
} from 'lucide-react';
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Money } from '@/components/common/Money';
import { ActivityTimeline } from '@/components/crm/ActivityTimeline';
import { ScoreMeter } from '@/components/crm/ScoreMeter';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { Can } from '@/rbac/can';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import {
  completeActivity,
  getLeadDuplicates,
  getTimeline,
  owners,
  updateLead,
} from '@/api/crm';
import { qty, relative, shortDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Lead, LeadStage } from '@/types/crm';
import { ConvertLeadDialog } from './ConvertLeadDialog';

const STAGES: LeadStage[] = ['New', 'Contacted', 'Qualified', 'Proposal', 'Converted', 'Lost'];

/**
 * Lead detail as a drawer, not a page — a rep working a list of 40 leads should
 * never lose their place to look at one.
 */
export function LeadDetail({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const qc = useQueryClient();
  const { can } = useAuth();
  const [converting, setConverting] = useState(false);

  const { data: timeline = [] } = useQuery({
    queryKey: qk.crm.timeline(lead.id),
    queryFn: () => getTimeline(lead.id),
  });
  const { data: duplicates = [] } = useQuery({
    queryKey: qk.crm.leadDuplicates(lead.id),
    queryFn: () => getLeadDuplicates(lead.id),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['crm'] });

  const patch = useMutation({
    mutationFn: (p: Partial<Lead>) => updateLead(lead.id, p),
    onSuccess: invalidate,
  });
  const complete = useMutation({ mutationFn: completeActivity, onSuccess: invalidate });

  const q = lead.qualification;
  const qualScore = [q.budget, q.authority, q.need, q.timeline].filter(Boolean).length;

  return (
    <>
      <Sheet open onOpenChange={(v) => !v && onClose()}>
        <SheetContent width="lg" className="gap-0">
          <SheetHeader>
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle>{lead.companyName}</SheetTitle>
              <Badge tone="outline">{lead.refNo}</Badge>
              <Badge tone={lead.side === 'Buyer' ? 'primary' : 'neutral'}>{lead.side}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" /> {lead.city}, {lead.state}
              </span>
              <span>{lead.industry}</span>
              <span>Source: {lead.source}</span>
              <span>Created {relative(lead.createdAt)}</span>
            </div>
          </SheetHeader>

          <SheetBody className="space-y-4">
            {duplicates.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-xs leading-relaxed text-warning">
                <Copy className="mt-px size-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <div className="font-medium">
                    {duplicates.length} possible duplicate{duplicates.length === 1 ? '' : 's'}
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {duplicates.map((d) => (
                      <li key={d.id} className="truncate">
                        {d.refNo} · {d.companyName} — same phone number
                      </li>
                    ))}
                  </ul>
                  <Can module="lead" action="merge">
                    <Button variant="outline" size="sm" className="mt-2">
                      Review and merge
                    </Button>
                  </Can>
                </div>
              </div>
            )}

            {/* Stage as a clickable progress bar — one click to advance. */}
            <div>
              <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted">Stage</div>
              <div className="flex flex-wrap gap-1">
                {STAGES.map((s) => {
                  const active = lead.stage === s;
                  const idx = STAGES.indexOf(s);
                  const current = STAGES.indexOf(lead.stage);
                  const past = idx < current && current < 4;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!can('lead', 'update')}
                      onClick={() => patch.mutate({ stage: s })}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        can('lead', 'update') ? 'cursor-pointer' : 'cursor-default',
                        active
                          ? s === 'Lost'
                            ? 'bg-critical text-white'
                            : s === 'Converted'
                              ? 'bg-good text-white'
                              : 'bg-primary text-primary-fg'
                          : past
                            ? 'bg-primary-soft text-primary'
                            : 'bg-surface-3 text-ink-secondary hover:bg-surface-inset',
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact">
                <div className="text-[13px] text-ink">{lead.contactName}</div>
                <div className="text-[11px] text-ink-muted">{lead.designation}</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`tel:${lead.phone}`}>
                      <Phone /> Call
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${lead.email}`}>
                      <Mail /> Email
                    </a>
                  </Button>
                </div>
              </Field>

              <Field label="Owner">
                {can('lead', 'assign') ? (
                  <Select value={lead.ownerId} onValueChange={(v) => {
                    const o = owners().find((x) => x.id === v);
                    patch.mutate({ ownerId: v, ownerName: o?.name ?? '' });
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {owners().map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <OwnerChip name={lead.ownerName} />
                )}
              </Field>

              <Field label="Requirement">
                <div className="text-[13px] text-ink">{lead.productInterest}</div>
                <div className="text-[11px] text-ink-muted">
                  {qty(lead.estimatedVolume, lead.unit)} · <Money value={lead.estimatedValue} compact />
                </div>
              </Field>

              <Field label="Score">
                <ScoreMeter score={lead.score} factors={lead.scoreFactors} />
              </Field>
            </div>

            <Separator />

            <Tabs defaultValue="qualification">
              <TabsList>
                <TabsTrigger value="qualification">Qualification</TabsTrigger>
                <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="qualification" className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-ink-secondary">BANT</span>
                  <Badge tone={qualScore >= 3 ? 'good' : qualScore >= 2 ? 'warning' : 'neutral'}>
                    {qualScore} of 4
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ['budget', 'Budget confirmed'],
                      ['authority', 'Speaking to the decision maker'],
                      ['need', 'Genuine, current need'],
                      ['timeline', 'Timeline within a quarter'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                      <Checkbox
                        checked={q[key]}
                        disabled={!can('lead', 'update')}
                        onCheckedChange={(v) =>
                          patch.mutate({ qualification: { ...q, [key]: Boolean(v) } })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {q.notes && (
                  <p className="rounded-md border border-line bg-surface-3 p-2.5 text-xs leading-relaxed text-ink-secondary">
                    {q.notes}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="timeline">
                <ActivityTimeline
                  activities={timeline}
                  canComplete={can('activity', 'update')}
                  onComplete={(id) => complete.mutate(id)}
                  emptyHint="Log the first call or email against this lead to start its history."
                />
              </TabsContent>

              <TabsContent value="details">
                <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
                  <Detail label="Email" value={lead.email} />
                  <Detail label="Phone" value={lead.phone} />
                  <Detail label="Industry" value={lead.industry} />
                  <Detail label="Source" value={lead.source} />
                  <Detail label="Campaign" value={lead.campaignName ?? '—'} />
                  <Detail label="Created" value={shortDate(lead.createdAt)} />
                  <Detail label="Last touched" value={lead.lastTouchedAt ? relative(lead.lastTouchedAt) : 'Never'} />
                  <Detail
                    label="Next follow-up"
                    value={lead.nextFollowUpAt ? shortDate(lead.nextFollowUpAt) : 'Not scheduled'}
                  />
                  {lead.lostReason && <Detail label="Lost reason" value={lead.lostReason} />}
                </dl>
                {lead.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {lead.tags.map((t) => (
                      <Badge key={t} tone="outline">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </SheetBody>

          <SheetFooter>
            {lead.stage === 'Converted' ? (
              <Badge tone="good">
                <Building2 /> Converted to a company, contact and deal
              </Badge>
            ) : lead.stage === 'Lost' ? (
              <Can module="lead" action="update">
                <Button variant="outline" onClick={() => patch.mutate({ stage: 'Contacted', lostReason: null })}>
                  Reopen
                </Button>
              </Can>
            ) : (
              <>
                <Can module="lead" action="update">
                  <Button
                    variant="ghost"
                    onClick={() => patch.mutate({ stage: 'Lost', lostReason: 'No response' })}
                  >
                    <X /> Mark lost
                  </Button>
                </Can>
                <Can
                  module="lead"
                  action="convert"
                  fallback={
                    <Badge tone="outline">
                      <AlertTriangle /> Conversion needs the “Convert to deal” permission
                    </Badge>
                  }
                >
                  <Button
                    variant="primary"
                    onClick={() => setConverting(true)}
                    disabled={qualScore < 2}
                    title={qualScore < 2 ? 'Qualify at least 2 of 4 BANT criteria first' : undefined}
                  >
                    <ArrowRightLeft /> Convert
                  </Button>
                </Can>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {converting && (
        <ConvertLeadDialog
          lead={lead}
          onClose={() => setConverting(false)}
          onDone={() => {
            setConverting(false);
            invalidate();
            onClose();
          }}
        />
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-muted">{label}</div>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-ink">{value}</dd>
    </div>
  );
}


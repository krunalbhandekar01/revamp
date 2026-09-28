import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Building2, CheckCircle2, Send, Truck } from 'lucide-react';
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Meter } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { SlaBadge } from '@/components/crm/SlaBadge';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { Can } from '@/rbac/can';
import { relative, shortDateTime } from '@/lib/format';
import { clamp } from '@/lib/utils';
import type { Ticket } from '@/types/crm';

export function TicketDetail({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState(ticket.resolution ?? '');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['crm'] });
  // Wired to a no-op mutation so the optimistic path exists when the API lands.
  const save = useMutation({ mutationFn: async () => {}, onSuccess: invalidate });

  const created = new Date(ticket.createdAt).getTime();
  const due = new Date(ticket.slaDueAt).getTime();
  const elapsedPct = clamp(((Date.now() - created) / (due - created)) * 100, 0, 100);
  const closed = ticket.status === 'Resolved' || ticket.status === 'Closed';

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent width="lg" className="gap-0">
        <SheetHeader>
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle>{ticket.refNo}</SheetTitle>
            <Badge tone="outline">{ticket.category}</Badge>
            <SlaBadge ticket={ticket} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3" /> {ticket.companyName}
            </span>
            {ticket.contactName && <span>{ticket.contactName}</span>}
            {ticket.dispatchRefNo && (
              <span className="inline-flex items-center gap-1">
                <Truck className="size-3" /> {ticket.dispatchRefNo}
              </span>
            )}
            <span>Raised {relative(ticket.createdAt)}</span>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-4">
          <div>
            <h3 className="text-[13px] font-medium text-ink">{ticket.subject}</h3>
            <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{ticket.description}</p>
          </div>

          {!closed && (
            <div className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium uppercase tracking-wide text-ink-muted">
                  SLA — {ticket.slaHours}h for {ticket.priority.toLowerCase()} priority
                </span>
                <span className="tnum text-ink-secondary">{elapsedPct.toFixed(0)}% elapsed</span>
              </div>
              <Meter
                value={elapsedPct}
                className="mt-2"
                tone={elapsedPct >= 100 ? 'critical' : elapsedPct > 75 ? 'warning' : 'good'}
                label="SLA elapsed"
              />
              <div className="mt-1.5 text-[11px] text-ink-muted">
                Due {shortDateTime(ticket.slaDueAt)}
                {ticket.firstResponseAt
                  ? ` · first response ${relative(ticket.firstResponseAt)}`
                  : ' · no first response yet'}
              </div>
            </div>
          )}

          <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
            <Detail label="Status" value={ticket.status} />
            <Detail label="Priority" value={ticket.priority} />
            <Detail label="Owner" value={<OwnerChip name={ticket.ownerName} />} />
            <Detail
              label="Resolved"
              value={ticket.resolvedAt ? shortDateTime(ticket.resolvedAt) : 'Not yet'}
            />
          </dl>

          <Separator />

          {closed ? (
            <div className="rounded-lg border border-good/30 bg-good-soft p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-good">Resolution</div>
              <p className="mt-1 text-xs leading-relaxed text-good">{ticket.resolution}</p>
              {ticket.csat !== null && (
                <p className="mt-2 text-[11px] text-good/80">Customer rated this {ticket.csat}/5</p>
              )}
            </div>
          ) : (
            <Can module="ticket" action="resolve">
              <div>
                <Label>Resolution</Label>
                <Textarea
                  rows={3}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="What was done, and what the customer was told."
                />
              </div>
            </Can>
          )}

          <div>
            <Label>Internal note</Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Visible to the team only — never sent to the customer."
            />
            <Button variant="outline" size="sm" className="mt-2" disabled={!note.trim()}>
              <Send /> Add note
            </Button>
          </div>
        </SheetBody>

        {!closed && (
          <SheetFooter>
            <Can module="ticket" action="escalate">
              <Button variant="ghost">
                <ArrowUpRight /> Escalate
              </Button>
            </Can>
            <Can module="ticket" action="resolve">
              <Button variant="primary" disabled={!resolution.trim()} onClick={() => save.mutate()}>
                <CheckCircle2 /> Resolve
              </Button>
            </Can>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  );
}

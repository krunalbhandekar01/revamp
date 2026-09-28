import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2, Handshake, UserRound } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { qk } from '@/api/client';
import { convertLead, getPipelines } from '@/api/crm';
import { money, toRupees } from '@/lib/format';
import type { Lead } from '@/types/crm';

/**
 * Lead → Company + Contact (+ Deal).
 *
 * The three records it creates are shown explicitly, because conversion is the
 * one irreversible step in the lead lifecycle and a rep should see exactly what
 * lands before they commit to it.
 */
export function ConvertLeadDialog({
  lead,
  onClose,
  onDone,
}: {
  lead: Lead;
  onClose: () => void;
  onDone: () => void;
}) {
  const { data: pipelines = [] } = useQuery({ queryKey: qk.crm.pipelines, queryFn: getPipelines });

  const [createDeal, setCreateDeal] = useState(true);
  const [pipelineId, setPipelineId] = useState(lead.side === 'Buyer' ? 'pipe-sales' : 'pipe-sourcing');
  const [valueRupees, setValueRupees] = useState(String(toRupees(lead.estimatedValue)));
  const [closeDate, setCloseDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const convert = useMutation({
    mutationFn: () =>
      convertLead(lead.id, {
        createDeal,
        dealValue: Math.round(Number(valueRupees || 0) * 100),
        pipelineId,
        expectedCloseDate: new Date(closeDate).toISOString(),
      }),
    onSuccess: onDone,
  });

  const pipeline = pipelines.find((p) => p.id === pipelineId);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert {lead.companyName}</DialogTitle>
          <DialogDescription>
            This creates permanent records and closes the lead. It cannot be undone from here.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <Created icon={Building2} title="Company" detail={`${lead.companyName} · ${lead.city}, ${lead.state}`} />
            <Created icon={UserRound} title="Contact" detail={`${lead.contactName} · ${lead.designation}`} />
            <Created
              icon={Handshake}
              title="Deal"
              detail={
                createDeal
                  ? `${lead.productInterest} · ${money(Math.round(Number(valueRupees || 0) * 100))}`
                  : 'Skipped — no opportunity will be created'
              }
              muted={!createDeal}
            />
          </div>

          <Separator />

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
            <Checkbox checked={createDeal} onCheckedChange={(v) => setCreateDeal(Boolean(v))} />
            Create an opportunity in the pipeline
          </label>

          {createDeal && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Pipeline</Label>
                <Select value={pipelineId} onValueChange={setPipelineId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pipeline && (
                  <p className="mt-1.5 text-[11px] text-ink-muted">
                    {pipeline.description} Opens at “{pipeline.stages[0].label}”.
                  </p>
                )}
              </div>
              <div>
                <Label>Deal value (₹)</Label>
                <Input
                  inputMode="numeric"
                  value={valueRupees}
                  onChange={(e) => setValueRupees(e.target.value.replace(/[^\d]/g, ''))}
                />
              </div>
              <div>
                <Label>Expected close</Label>
                <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => convert.mutate()} disabled={convert.isPending}>
            {convert.isPending ? 'Converting…' : 'Convert'} <ArrowRight />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Created({
  icon: Icon,
  title,
  detail,
  muted,
}: {
  icon: typeof Building2;
  title: string;
  detail: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-line p-2.5">
      <span
        className={
          muted
            ? 'mt-px flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-3 text-ink-muted'
            : 'mt-px flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary'
        }
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-ink">{title}</div>
        <div className={muted ? 'truncate text-[11px] text-ink-muted' : 'truncate text-[11px] text-ink-secondary'}>
          {detail}
        </div>
      </div>
    </div>
  );
}

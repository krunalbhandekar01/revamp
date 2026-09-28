import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Trophy, XCircle } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { closeDeal } from '@/api/crm';
import { moneyCompact } from '@/lib/format';
import { LOST_REASONS, WON_REASONS, type Deal } from '@/types/crm';

/**
 * Closing a deal always captures *why*.
 *
 * A lost deal with no reason is a lost deal nobody learns from — this is the
 * single input that makes win/loss analysis possible later, so it is required
 * rather than optional.
 */
export function CloseDealDialog({
  deal,
  outcome,
  onClose,
  onDone,
}: {
  deal: Deal;
  outcome: 'won' | 'lost';
  onClose: () => void;
  onDone: () => void;
}) {
  const reasons = outcome === 'won' ? WON_REASONS : LOST_REASONS;
  const [reason, setReason] = useState<string>('');
  const [competitor, setCompetitor] = useState('');

  const close = useMutation({
    mutationFn: () => closeDeal(deal.id, outcome, reason, competitor || undefined),
    onSuccess: onDone,
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {outcome === 'won' ? (
              <>
                <Trophy className="size-4 text-good" /> Mark won
              </>
            ) : (
              <>
                <XCircle className="size-4 text-critical" /> Mark lost
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {deal.title} · {moneyCompact(deal.value)}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div>
            <Label>{outcome === 'won' ? 'What won it?' : 'Why did we lose it?'}</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-1.5">
              {reasons.map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                  <RadioGroupItem value={r} />
                  {r}
                </label>
              ))}
            </RadioGroup>
          </div>

          {outcome === 'lost' && reason === 'Lost to competitor' && (
            <div>
              <Label>Which competitor?</Label>
              <Input
                value={competitor}
                onChange={(e) => setCompetitor(e.target.value)}
                placeholder="e.g. Green Fuels Co"
              />
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-ink-muted">
            This feeds win/loss analysis on the pipeline dashboard. A deal closed without a reason is one
            nobody learns from.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={outcome === 'won' ? 'primary' : 'danger'}
            disabled={!reason || close.isPending}
            onClick={() => close.mutate()}
          >
            {close.isPending ? 'Saving…' : outcome === 'won' ? 'Mark won' : 'Mark lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

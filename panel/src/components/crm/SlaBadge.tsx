import { AlertTriangle, CheckCircle2, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { shortDateTime } from '@/lib/format';
import type { Ticket } from '@/types/crm';

/**
 * SLA state in one chip. Three states worth distinguishing: breached (act now),
 * at risk past 75% of the window (act today), and comfortable.
 */
export function SlaBadge({ ticket }: { ticket: Ticket }) {
  const closed = ticket.status === 'Resolved' || ticket.status === 'Closed';
  const now = Date.now();
  const created = new Date(ticket.createdAt).getTime();
  const due = new Date(ticket.slaDueAt).getTime();
  const elapsed = (now - created) / Math.max(1, due - created);

  if (closed) {
    return (
      <Tooltip content={`Resolved ${shortDateTime(ticket.resolvedAt)} · ${ticket.slaHours}h SLA`}>
        <span>
          <Badge tone={ticket.slaBreached ? 'serious' : 'good'}>
            {ticket.slaBreached ? <AlertTriangle /> : <CheckCircle2 />}
            {ticket.slaBreached ? 'Breached' : 'Met'}
          </Badge>
        </span>
      </Tooltip>
    );
  }

  if (ticket.slaBreached) {
    return (
      <Tooltip content={`Was due ${shortDateTime(ticket.slaDueAt)}`}>
        <span>
          <Badge tone="critical">
            <AlertTriangle /> Breached
          </Badge>
        </span>
      </Tooltip>
    );
  }

  const hoursLeft = Math.max(0, Math.round((due - now) / 3_600_000));
  return (
    <Tooltip content={`Due ${shortDateTime(ticket.slaDueAt)} · ${ticket.slaHours}h SLA`}>
      <span>
        <Badge tone={elapsed > 0.75 ? 'warning' : 'neutral'}>
          <Timer /> {hoursLeft}h left
        </Badge>
      </span>
    </Tooltip>
  );
}

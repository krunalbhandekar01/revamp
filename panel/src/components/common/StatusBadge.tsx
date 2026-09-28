import { AlertTriangle, CheckCircle2, Circle, CircleDot, PauseCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Tone = 'neutral' | 'good' | 'warning' | 'serious' | 'critical' | 'primary';

/**
 * Status colour is reserved and always ships with a label — and, for the
 * strong states, an icon. Never colour alone.
 */
const MAP: Record<string, { tone: Tone; icon?: typeof Circle }> = {
  // Orders / dispatches
  Completed: { tone: 'good', icon: CheckCircle2 },
  'In Progress': { tone: 'primary', icon: CircleDot },
  Dispatched: { tone: 'primary', icon: CircleDot },
  Placed: { tone: 'neutral' },
  Draft: { tone: 'neutral' },
  'In Preparation': { tone: 'warning' },
  'On Hold': { tone: 'serious', icon: PauseCircle },
  Cancelled: { tone: 'critical', icon: XCircle },

  // Payable
  Paid: { tone: 'good', icon: CheckCircle2 },
  'Cleared for Payment': { tone: 'primary' },
  'Awaiting Clearance': { tone: 'warning' },
  Rejected: { tone: 'critical', icon: XCircle },

  // Transit
  'Goods Delivered': { tone: 'good', icon: CheckCircle2 },
  'In Transit': { tone: 'primary' },
  Loaded: { tone: 'primary' },
  'Awaiting Loading': { tone: 'warning' },
  'Awaiting Unloading': { tone: 'warning' },
  'Transport Allocated': { tone: 'neutral' },
  'Finding Transport': { tone: 'serious', icon: AlertTriangle },
  'Goods Rejected': { tone: 'critical', icon: XCircle },

  // Payments
  Added: { tone: 'good' },
  Approved: { tone: 'good' },
  Pending: { tone: 'warning' },

  // Business
  Verified: { tone: 'good', icon: CheckCircle2 },
  'Not Verified': { tone: 'warning' },
  Deactivated: { tone: 'neutral' },

  // Schedules
  'On Track': { tone: 'good', icon: CheckCircle2 },
  'At Risk': { tone: 'warning', icon: AlertTriangle },
  Behind: { tone: 'critical', icon: AlertTriangle },
  Delivered: { tone: 'good', icon: CheckCircle2 },

  // Reconciliation
  matched: { tone: 'good', icon: CheckCircle2 },
  unmatched: { tone: 'warning', icon: AlertTriangle },
  variance: { tone: 'serious', icon: AlertTriangle },
  failed: { tone: 'critical', icon: XCircle },

  // Leads
  Converted: { tone: 'good' },
  Qualified: { tone: 'primary' },
  Contacted: { tone: 'neutral' },
  'Proposal Sent': { tone: 'primary' },
  Lost: { tone: 'critical' },
  'Yet to be contacted': { tone: 'warning' },
};

export function StatusBadge({ status }: { status: string }) {
  const def = MAP[status] ?? { tone: 'neutral' as Tone };
  const Icon = def.icon;
  return (
    <Badge tone={def.tone}>
      {Icon && <Icon aria-hidden />}
      {status}
    </Badge>
  );
}

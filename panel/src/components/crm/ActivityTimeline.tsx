import {
  CalendarDays,
  Check,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  StickyNote,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';
import { relative, shortDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Activity, ActivityType } from '@/types/crm';

const ICON: Record<ActivityType, typeof Phone> = {
  Call: Phone,
  Meeting: CalendarDays,
  Email: Mail,
  WhatsApp: MessageCircle,
  Task: Check,
  Note: StickyNote,
  'Site Visit': MapPin,
};

/**
 * One record's history, newest first. Every module reuses this — a lead, a
 * deal, a company and a ticket all read the same way, which is the whole
 * reason activities are a single model rather than four.
 */
export function ActivityTimeline({
  activities,
  onComplete,
  canComplete,
  emptyHint,
}: {
  activities: Activity[];
  onComplete?: (id: string) => void;
  canComplete?: boolean;
  emptyHint?: string;
}) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="size-5" />}
        title="Nothing logged yet"
        description={emptyHint ?? 'Calls, emails, meetings and notes against this record will appear here.'}
      />
    );
  }

  return (
    <ol className="relative space-y-0">
      {activities.map((a, i) => {
        const Icon = ICON[a.type];
        const last = i === activities.length - 1;
        const overdue = a.status === 'Overdue';
        return (
          <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute left-[13px] top-7 h-full w-px bg-line" aria-hidden />}
            <span
              className={cn(
                'relative z-10 mt-0.5 flex size-[26px] shrink-0 items-center justify-center rounded-full border',
                a.status === 'Completed'
                  ? 'border-good/30 bg-good-soft text-good'
                  : overdue
                    ? 'border-critical/30 bg-critical-soft text-critical'
                    : 'border-line bg-surface-3 text-ink-muted',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[13px] font-medium text-ink">{a.subject}</span>
                <Badge tone="outline">{a.type}</Badge>
                {a.priority === 'Urgent' && <Badge tone="critical">Urgent</Badge>}
                {overdue && <Badge tone="critical">Overdue</Badge>}
                {a.repeat !== 'None' && <Badge tone="neutral">Repeats {a.repeat.toLowerCase()}</Badge>}
              </div>

              <div className="mt-0.5 text-[11px] text-ink-muted">
                {a.ownerName}
                {a.dueAt && (
                  <>
                    {' · '}
                    <span title={shortDateTime(a.dueAt)}>
                      {a.status === 'Completed' ? 'done' : 'due'} {relative(a.dueAt)}
                    </span>
                  </>
                )}
                {a.durationMinutes ? ` · ${a.durationMinutes} min` : ''}
              </div>

              {a.outcome && (
                <p className="mt-1 text-xs text-ink-secondary">
                  <span className="text-ink-muted">Outcome:</span> {a.outcome}
                </p>
              )}
              {a.body && <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{a.body}</p>}

              {onComplete && canComplete && a.status !== 'Completed' && a.status !== 'Cancelled' && (
                <Button variant="ghost" size="sm" className="mt-1 -ml-2" onClick={() => onComplete(a.id)}>
                  <Check /> Mark done
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

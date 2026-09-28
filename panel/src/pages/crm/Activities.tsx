import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Check,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  StickyNote,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OwnerChip } from '@/components/crm/OwnerChip';
import { Can } from '@/rbac/can';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { completeActivity, getActivities, owners } from '@/api/crm';
import { dayMonth, relative, shortDateTime } from '@/lib/format';
import { cn, groupBy } from '@/lib/utils';
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
 * The rep's day.
 *
 * Deliberately not a table: an activity list is worked top to bottom and the
 * only question that matters is "what is due and what have I missed", so the
 * default view is grouped by day with overdue pinned first.
 */
export default function ActivitiesPage() {
  const qc = useQueryClient();
  const { can, user } = useAuth();
  const [windowKey, setWindowKey] = useState<string>('week');
  const [search, setSearch] = useState('');
  const [ownerId, setOwnerId] = useState<string>(can('activity', 'viewAll') ? 'all' : user.id);

  const { data = [], isLoading } = useQuery({
    queryKey: qk.crm.activities({ windowKey, ownerId, search }),
    queryFn: () =>
      getActivities({
        window: windowKey === 'all' ? null : windowKey,
        ownerId: ownerId === 'all' ? null : ownerId,
        search,
      }),
  });

  const { data: all = [] } = useQuery({
    queryKey: qk.crm.activities({ all: true, ownerId }),
    queryFn: () => getActivities({ ownerId: ownerId === 'all' ? null : ownerId }),
  });

  const complete = useMutation({
    mutationFn: completeActivity,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm'] }),
  });

  const stats = useMemo(() => {
    const now = Date.now();
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);
    const openRows = all.filter((a) => a.status === 'Open' || a.status === 'Overdue');
    return {
      overdue: all.filter((a) => a.status === 'Overdue').length,
      today: openRows.filter(
        (a) => a.dueAt && new Date(a.dueAt).getTime() <= endToday.getTime() && new Date(a.dueAt).getTime() >= now - 86_400_000,
      ).length,
      week: openRows.filter((a) => a.dueAt && new Date(a.dueAt).getTime() <= now + 7 * 86_400_000).length,
      completed: all.filter(
        (a) => a.completedAt && now - new Date(a.completedAt).getTime() < 7 * 86_400_000,
      ).length,
    };
  }, [all]);

  // Group by day, overdue first.
  const groups = useMemo(() => {
    const overdue = data.filter((a) => a.status === 'Overdue');
    const rest = data.filter((a) => a.status !== 'Overdue');
    const byDay = groupBy(rest, (a) => (a.dueAt ? a.dueAt.slice(0, 10) : 'none'));
    const days = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
    return { overdue, days };
  }, [data]);

  return (
    <>
      <PageHeader
        title="Activities"
        description="Tasks, calls, meetings and follow-ups — grouped by day, overdue first."
        filters={
          <>
            <Tabs value={windowKey} onValueChange={setWindowKey}>
              <TabsList>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">This week</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subject or record…"
              className="w-56"
            />
            {can('activity', 'viewAll') && (
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Whole team</SelectItem>
                  {owners().map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        }
        actions={
          <Can module="activity" action="create">
            <Button variant="primary">
              <Plus /> Log activity
            </Button>
          </Can>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Overdue" value={stats.overdue} sublabel="Past due, not done" loading={isLoading} emphasis />
        <StatTile label="Due today" value={stats.today} loading={isLoading} />
        <StatTile label="Due this week" value={stats.week} loading={isLoading} />
        <StatTile label="Completed (7d)" value={stats.completed} loading={isLoading} />
      </div>

      <div className="mt-5 space-y-4">
        {isLoading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)
        ) : data.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Check className="size-5 text-good" />}
              title="Nothing scheduled in this window"
              description="Pick a wider window, or log the next follow-up while it is fresh."
            />
          </Card>
        ) : (
          <>
            {groups.overdue.length > 0 && (
              <DayGroup
                title="Overdue"
                tone="critical"
                count={groups.overdue.length}
                rows={groups.overdue}
                onComplete={(id) => complete.mutate(id)}
                canComplete={can('activity', 'update')}
              />
            )}
            {groups.days.map(([day, rows]) => (
              <DayGroup
                key={day}
                title={day === 'none' ? 'No due date' : dayMonth(day)}
                count={rows.length}
                rows={rows}
                onComplete={(id) => complete.mutate(id)}
                canComplete={can('activity', 'update')}
              />
            ))}
          </>
        )}
      </div>
    </>
  );
}

function DayGroup({
  title,
  count,
  rows,
  tone,
  onComplete,
  canComplete,
}: {
  title: string;
  count: number;
  rows: Activity[];
  tone?: 'critical';
  onComplete: (id: string) => void;
  canComplete: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn('flex items-center gap-2', tone === 'critical' && 'text-critical')}>
          {title}
          <Badge tone={tone === 'critical' ? 'critical' : 'neutral'}>{count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y divide-line">
          {rows.map((a) => {
            const Icon = ICON[a.type];
            const done = a.status === 'Completed';
            return (
              <li key={a.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span
                  className={cn(
                    'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
                    done
                      ? 'bg-good-soft text-good'
                      : a.status === 'Overdue'
                        ? 'bg-critical-soft text-critical'
                        : 'bg-surface-3 text-ink-muted',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className={cn('text-[13px] font-medium', done ? 'text-ink-muted line-through' : 'text-ink')}>
                      {a.subject}
                    </span>
                    <Badge tone="outline">{a.type}</Badge>
                    {a.priority === 'Urgent' && <Badge tone="critical">Urgent</Badge>}
                    {a.priority === 'High' && <Badge tone="warning">High</Badge>}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-ink-muted">
                    {a.related ? `${a.related.type} · ${a.related.label}` : 'No linked record'}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <OwnerChip name={a.ownerName} className="hidden sm:inline-flex" />
                  {a.dueAt && (
                    <Tooltip content={shortDateTime(a.dueAt)}>
                      <span className="hidden items-center gap-1 text-[11px] text-ink-muted sm:inline-flex">
                        <Clock className="size-3" />
                        {relative(a.dueAt)}
                      </span>
                    </Tooltip>
                  )}
                  {!done && a.status !== 'Cancelled' && canComplete && (
                    <Button variant="outline" size="sm" onClick={() => onComplete(a.id)}>
                      <Check /> Done
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

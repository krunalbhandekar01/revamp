import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Can } from '@/rbac/can';
import { Play } from 'lucide-react';
import { relative, shortDateTime } from '@/lib/format';
import { isoDayOffset } from '@/mocks/seed';

/**
 * Job health.
 *
 * There are 31 Agenda jobs in production today with no failure alerting, no
 * run history and no dashboard — a job that silently stops is invisible until
 * someone notices the downstream data is stale. This is that dashboard.
 */
const JOBS = [
  { name: 'syncAdvancedPayments', cron: '0 */6 * * *', lastRun: isoDayOffset(0), durationMs: 48200, status: 'matched', lastError: null },
  { name: 'refreshPayouts', cron: '*/30 * * * *', lastRun: isoDayOffset(0), durationMs: 3100, status: 'matched', lastError: null },
  { name: 'fetchAndSaveLeadsFromIndiaMART', cron: '0 * * * *', lastRun: isoDayOffset(0), durationMs: 1800, status: 'matched', lastError: null },
  { name: 'syncAdvancedPaymentsForPrevDate', cron: '0 1 * * *', lastRun: isoDayOffset(0), durationMs: 121400, status: 'variance', lastError: 'Completed but 4 payments could not be matched to a dispatch' },
  { name: 'updateDispatch', cron: '0 1 * * *', lastRun: isoDayOffset(0), durationMs: 6700, status: 'matched', lastError: null },
  { name: 'overduePaymentSummary_Daily', cron: '0 9 * * *', lastRun: isoDayOffset(0), durationMs: 2400, status: 'matched', lastError: null },
  { name: 'noDispatchForPo', cron: '0 10 * * *', lastRun: isoDayOffset(0), durationMs: 900, status: 'matched', lastError: null },
  { name: 'generateMonthlyProrateBill', cron: '0 2 1 * *', lastRun: isoDayOffset(-27), durationMs: 33100, status: 'matched', lastError: null },
  { name: 'monthlyReport_TP', cron: '0 6 1 * *', lastRun: isoDayOffset(-27), durationMs: 18900, status: 'failed', lastError: 'Zoho API returned 429 — rate limited' },
  { name: 'updatePurchaseOrder', cron: '0 1 * * *', lastRun: isoDayOffset(-211), durationMs: 0, status: 'unmatched', lastError: 'Definition commented out, but a stale agenda.every registration remains in the database' },
];

export default function JobsPage() {
  const failing = JOBS.filter((j) => j.status === 'failed').length;
  const degraded = JOBS.filter((j) => j.status === 'variance' || j.status === 'unmatched').length;

  return (
    <>
      <PageHeader
        title="Job Health"
        description="Every scheduled job, when it last ran, how long it took and what it complained about."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Jobs defined" value={JOBS.length} />
        <StatTile label="Healthy" value={JOBS.length - failing - degraded} />
        <StatTile label="Degraded" value={degraded} sublabel="Ran, but not cleanly" />
        <StatTile label="Failing" value={failing} emphasis />
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Scheduled jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2 text-left font-semibold">Job</th>
                  <th className="px-3 py-2 text-left font-semibold">Schedule</th>
                  <th className="px-3 py-2 text-left font-semibold">Last run</th>
                  <th className="px-3 py-2 text-right font-semibold">Duration</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-right font-semibold" />
                </tr>
              </thead>
              <tbody>
                {JOBS.map((j) => (
                  <tr key={j.name} className="border-b border-line last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-mono text-[12px] text-ink">{j.name}</div>
                      {j.lastError && (
                        <div className="mt-0.5 max-w-md text-[11px] text-critical">{j.lastError}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-ink-muted">{j.cron}</td>
                    <td className="px-3 py-2 text-ink-secondary">
                      <Tooltip content={shortDateTime(j.lastRun)}>
                        <span className="cursor-help">{relative(j.lastRun)}</span>
                      </Tooltip>
                    </td>
                    <td className="tnum px-3 py-2 text-right text-ink-secondary">
                      {j.durationMs ? `${(j.durationMs / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Can module="jobs" action="run">
                        <Button variant="ghost" size="icon-sm" aria-label={`Run ${j.name} now`}>
                          <Play />
                        </Button>
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

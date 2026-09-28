import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Lead score with its reasoning attached. A score nobody can interrogate is a
 * score nobody acts on, so the breakdown is always one hover away.
 */
export function ScoreMeter({
  score,
  factors,
  className,
}: {
  score: number;
  factors?: { label: string; points: number }[];
  className?: string;
}) {
  const tone = score >= 70 ? 'bg-good' : score >= 40 ? 'bg-warning' : 'bg-critical';
  const band = score >= 70 ? 'Hot' : score >= 40 ? 'Warm' : 'Cold';

  return (
    <Tooltip
      content={
        factors?.length ? (
          <div className="space-y-1">
            <div className="font-medium">
              {band} — {score}/100
            </div>
            {factors.map((f) => (
              <div key={f.label} className="flex justify-between gap-4 text-ink-muted">
                <span>{f.label}</span>
                <span className="tnum">+{f.points}</span>
              </div>
            ))}
          </div>
        ) : (
          `${band} — ${score}/100`
        )
      }
    >
      <div className={cn('flex cursor-help items-center gap-2', className)}>
        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-inset">
          <div className={cn('h-full rounded-full', tone)} style={{ width: `${score}%` }} />
        </div>
        <span className="tnum w-6 text-right text-[11px] text-ink-muted">{score}</span>
      </div>
    </Tooltip>
  );
}

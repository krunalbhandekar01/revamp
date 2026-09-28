import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatTile } from '@/components/common/StatTile';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Money } from '@/components/common/Money';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Meter } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/rbac/auth';
import { qk } from '@/api/client';
import { getBusiness } from '@/api/operations';
import { percent, relative, shortDate } from '@/lib/format';

export default function BusinessDetailPage() {
  const { id = '' } = useParams();
  const { can } = useAuth();
  const showFinance = can('business', 'viewFinance');

  const { data: b, isLoading } = useQuery({
    queryKey: qk.business.detail(id),
    queryFn: () => getBusiness(id),
  });

  if (!isLoading && !b) {
    return (
      <Card>
        <EmptyState
          icon={<Building2 className="size-5" />}
          title="Business not found"
          action={
            <Button variant="outline" asChild>
              <Link to="/business">
                <ArrowLeft /> Back to businesses
              </Link>
            </Button>
          }
        />
      </Card>
    );
  }

  const util = b?.creditLimit ? (b.openExposure / b.creditLimit) * 100 : 0;

  return (
    <>
      <PageHeader
        title={b?.name ?? 'Loading…'}
        description={
          b ? (
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={b.status} />
              <Badge tone="outline">{b.kind}</Badge>
              {b.kycCompleted ? (
                <Badge tone="good">
                  <ShieldCheck /> KYC complete
                </Badge>
              ) : (
                <Badge tone="warning">
                  <ShieldAlert /> KYC incomplete
                </Badge>
              )}
              {!b.zohoLinked && <Badge tone="warning">Not linked to Zoho</Badge>}
              <span className="text-ink-muted">
                {b.city}, {b.state} · {b.gstin}
              </span>
            </span>
          ) : undefined
        }
        actions={
          <Button variant="outline" asChild>
            <Link to="/business">
              <ArrowLeft /> Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {showFinance ? (
          <>
            <StatTile
              label="Lifetime revenue"
              value={<Money value={b?.lifetimeRevenue ?? 0} compact />}
              loading={isLoading}
            />
            <StatTile
              label="Lifetime contribution"
              value={<Money value={b?.lifetimeContribution ?? 0} compact />}
              sublabel={
                b ? `${percent(b.lifetimeRevenue ? (b.lifetimeContribution / b.lifetimeRevenue) * 100 : 0)} margin` : undefined
              }
              loading={isLoading}
              emphasis
            />
            <StatTile label="DSO" value={`${b?.dso ?? 0} days`} loading={isLoading} />
            <StatTile
              label="Payment reliability"
              value={`${b?.paymentReliability ?? 0}%`}
              sublabel="Paid on time, historically"
              loading={isLoading}
            />
          </>
        ) : (
          <>
            <StatTile label="Orders" value={b?.orderCount ?? 0} loading={isLoading} />
            <StatTile label="Industry" value={b?.industry ?? '—'} loading={isLoading} />
            <StatTile label="On platform since" value={b ? shortDate(b.createdAt) : '—'} loading={isLoading} />
            <StatTile label="Last active" value={b ? relative(b.lastActivityAt) : '—'} loading={isLoading} />
          </>
        )}
      </div>

      <Tabs defaultValue="overview" className="mt-5">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {showFinance && <TabsTrigger value="credit">Credit</TabsTrigger>}
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
                <Field label="GSTIN" value={b?.gstin} />
                <Field label="Industry" value={b?.industry} />
                <Field label="Location" value={b ? `${b.city}, ${b.state}` : undefined} />
                <Field label="Orders" value={b ? String(b.orderCount) : undefined} />
                <Field label="On platform since" value={b ? shortDate(b.createdAt) : undefined} />
                <Field label="Last active" value={b ? relative(b.lastActivityAt) : undefined} />
                <Field label="Zoho Books" value={b?.zohoLinked ? 'Linked' : 'Not linked'} />
                <Field label="Tags" value={b?.tags.length ? b.tags.join(', ') : '—'} />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {showFinance && (
          <TabsContent value="credit">
            <Card>
              <CardHeader>
                <CardTitle>Credit and exposure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-ink-secondary">Credit utilisation</span>
                    <span className="tnum font-medium text-ink">{util.toFixed(0)}%</span>
                  </div>
                  <Meter
                    value={util}
                    className="mt-2"
                    tone={util > 90 ? 'critical' : util > 70 ? 'warning' : 'primary'}
                    label="Credit utilisation"
                  />
                  <div className="mt-1.5 text-[11px] text-ink-muted">
                    <Money value={b?.openExposure ?? 0} compact /> exposed against a{' '}
                    <Money value={b?.creditLimit ?? 0} compact /> limit
                  </div>
                </div>
                {util > 90 && (
                  <div className="rounded-md border border-line bg-critical-soft p-2.5 text-[11px] leading-relaxed text-critical">
                    Exposure is above 90% of the agreed limit. New orders should be blocked at creation
                    until this is collected or the limit is formally raised.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="activity">
          <Card>
            <EmptyState
              title="Activity timeline"
              description="Orders, dispatches, payments and notes will stream here once this screen is wired to the API."
            />
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{value ?? '—'}</dd>
    </div>
  );
}

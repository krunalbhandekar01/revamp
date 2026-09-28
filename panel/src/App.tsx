import { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import { lazyWithReload } from '@/lib/lazyWithReload';
import { AuthProvider } from '@/rbac/auth';
import { DefaultRedirect, RequirePermission } from '@/rbac/can';

/**
 * Every screen is code-split. The initial payload is the shell, the router and
 * the query client — nothing else. (The legacy panel also lazy-loads routes,
 * but ships a 769 KB gzipped entry chunk behind them; the vendor split in
 * `vite.config.ts` is what keeps this one small.)
 */
const FundAllocation = lazyWithReload(() => import('@/pages/treasury/FundAllocation'));
const CashPosition = lazyWithReload(() => import('@/pages/treasury/CashPosition'));
const Reconciliation = lazyWithReload(() => import('@/pages/reconciliation/Reconciliation'));
const FinanceDashboard = lazyWithReload(() => import('@/pages/dashboard/Finance'));
const SalesDashboard = lazyWithReload(() => import('@/pages/dashboard/Sales'));
const SourcingDashboard = lazyWithReload(() => import('@/pages/dashboard/Sourcing'));
const MarketingDashboard = lazyWithReload(() => import('@/pages/dashboard/Marketing'));
const Exceptions = lazyWithReload(() => import('@/pages/operations/Exceptions'));
const Dispatches = lazyWithReload(() => import('@/pages/operations/Dispatches'));
const Orders = lazyWithReload(() => import('@/pages/operations/Orders'));
const Schedules = lazyWithReload(() => import('@/pages/operations/Schedules'));
const Receivables = lazyWithReload(() => import('@/pages/money/Receivables'));
const Payments = lazyWithReload(() => import('@/pages/money/Payments'));
const Businesses = lazyWithReload(() => import('@/pages/accounts/Businesses'));
const BusinessDetail = lazyWithReload(() => import('@/pages/accounts/BusinessDetail'));
const Team = lazyWithReload(() => import('@/pages/manage/Team'));
const Jobs = lazyWithReload(() => import('@/pages/manage/Jobs'));

/* ------------------------------------------------------------------- CRM */
const CrmOverview = lazyWithReload(() => import('@/pages/crm/Overview'));
const Leads = lazyWithReload(() => import('@/pages/crm/Leads'));
const Deals = lazyWithReload(() => import('@/pages/crm/Deals'));
const Quotes = lazyWithReload(() => import('@/pages/crm/Quotes'));
const Activities = lazyWithReload(() => import('@/pages/crm/Activities'));
const Contacts = lazyWithReload(() => import('@/pages/crm/Contacts'));
const Companies = lazyWithReload(() => import('@/pages/crm/Companies'));
const Campaigns = lazyWithReload(() => import('@/pages/crm/Campaigns'));
const Tickets = lazyWithReload(() => import('@/pages/support/Tickets'));
const Automation = lazyWithReload(() => import('@/pages/manage/Automation'));
const Catalogue = lazyWithReload(() => import('@/pages/manage/Catalogue'));
const ImportWizard = lazyWithReload(() => import('@/pages/manage/ImportWizard'));
const AuditLog = lazyWithReload(() => import('@/pages/manage/AuditLog'));
const NotFound = lazyWithReload(() => import('@/pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Ops data is read far more than it changes; a short stale window kills
      // the refetch storm the legacy panel causes on every filter change.
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-52" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

/** Wraps a lazy page in its permission gate. */
function Guarded({ module, action, children }: { module: string; action?: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <RequirePermission module={module} action={action}>
      {/* Keyed on the path so the boundary remounts on navigation. React reuses
          this component instance across routes, so without the key a single
          caught error would pin every subsequent page to the error screen. */}
      <ErrorBoundary key={pathname}>
        <Suspense fallback={<PageFallback />}>{children}</Suspense>
      </ErrorBoundary>
    </RequirePermission>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<DefaultRedirect />} />

              <Route
                path="treasury/allocation"
                element={
                  <Guarded module="treasury">
                    <FundAllocation />
                  </Guarded>
                }
              />
              <Route
                path="treasury/cash"
                element={
                  <Guarded module="treasury">
                    <CashPosition />
                  </Guarded>
                }
              />
              <Route
                path="reconciliation"
                element={
                  <Guarded module="reconciliation">
                    <Reconciliation />
                  </Guarded>
                }
              />

              <Route path="dashboard">
                <Route index element={<Navigate to="/dashboard/sales" replace />} />
                <Route
                  path="finance"
                  element={
                    <Guarded module="financeDashboard">
                      <FinanceDashboard />
                    </Guarded>
                  }
                />
                <Route
                  path="sales"
                  element={
                    <Guarded module="salesDashboard">
                      <SalesDashboard />
                    </Guarded>
                  }
                />
                <Route
                  path="sourcing"
                  element={
                    <Guarded module="salesDashboard">
                      <SourcingDashboard />
                    </Guarded>
                  }
                />
                <Route
                  path="marketing"
                  element={
                    <Guarded module="marketingDashboard">
                      <MarketingDashboard />
                    </Guarded>
                  }
                />
              </Route>

              <Route
                path="exceptions"
                element={
                  <Guarded module="dispatch">
                    <Exceptions />
                  </Guarded>
                }
              />
              <Route
                path="dispatches"
                element={
                  <Guarded module="dispatch">
                    <Dispatches />
                  </Guarded>
                }
              />
              <Route
                path="orders"
                element={
                  <Guarded module="order">
                    <Orders />
                  </Guarded>
                }
              />
              <Route
                path="schedules"
                element={
                  <Guarded module="schedule">
                    <Schedules />
                  </Guarded>
                }
              />

              <Route
                path="receivables"
                element={
                  <Guarded module="payment">
                    <Receivables />
                  </Guarded>
                }
              />
              <Route
                path="payments"
                element={
                  <Guarded module="payment">
                    <Payments />
                  </Guarded>
                }
              />

              <Route
                path="business"
                element={
                  <Guarded module="business">
                    <Businesses />
                  </Guarded>
                }
              />
              <Route
                path="business/:id"
                element={
                  <Guarded module="business">
                    <BusinessDetail />
                  </Guarded>
                }
              />

              {/* ------------------------------------------------------------ CRM */}
              <Route path="crm">
                <Route
                  index
                  element={
                    <Guarded module="deal">
                      <CrmOverview />
                    </Guarded>
                  }
                />
                <Route
                  path="leads"
                  element={
                    <Guarded module="lead">
                      <Leads />
                    </Guarded>
                  }
                />
                <Route
                  path="deals"
                  element={
                    <Guarded module="deal">
                      <Deals />
                    </Guarded>
                  }
                />
                <Route
                  path="quotes"
                  element={
                    <Guarded module="quote">
                      <Quotes />
                    </Guarded>
                  }
                />
                <Route
                  path="activities"
                  element={
                    <Guarded module="activity">
                      <Activities />
                    </Guarded>
                  }
                />
                <Route
                  path="contacts"
                  element={
                    <Guarded module="contact">
                      <Contacts />
                    </Guarded>
                  }
                />
                <Route
                  path="companies"
                  element={
                    <Guarded module="contact">
                      <Companies />
                    </Guarded>
                  }
                />
                <Route
                  path="campaigns"
                  element={
                    <Guarded module="campaign">
                      <Campaigns />
                    </Guarded>
                  }
                />
              </Route>

              <Route
                path="support/tickets"
                element={
                  <Guarded module="ticket">
                    <Tickets />
                  </Guarded>
                }
              />

              <Route
                path="manage/automation"
                element={
                  <Guarded module="automation">
                    <Automation />
                  </Guarded>
                }
              />
              <Route
                path="manage/catalogue"
                element={
                  <Guarded module="catalog">
                    <Catalogue />
                  </Guarded>
                }
              />
              <Route
                path="manage/import"
                element={
                  <Guarded module="dataImport">
                    <ImportWizard />
                  </Guarded>
                }
              />
              <Route
                path="manage/audit"
                element={
                  <Guarded module="audit">
                    <AuditLog />
                  </Guarded>
                }
              />

              <Route
                path="manage/team"
                element={
                  <Guarded module="team">
                    <Team />
                  </Guarded>
                }
              />
              <Route
                path="manage/jobs"
                element={
                  <Guarded module="jobs">
                    <Jobs />
                  </Guarded>
                }
              />

              <Route
                path="*"
                element={
                  <ErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                      <NotFound />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
            </Route>
          </Routes>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

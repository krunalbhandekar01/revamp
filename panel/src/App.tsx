import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthProvider } from '@/rbac/auth';
import { DefaultRedirect, RequirePermission } from '@/rbac/can';

/**
 * Every screen is code-split. The initial payload is the shell, the router and
 * the query client — nothing else. (The legacy panel also lazy-loads routes,
 * but ships a 769 KB gzipped entry chunk behind them; the vendor split in
 * `vite.config.ts` is what keeps this one small.)
 */
const FundAllocation = lazy(() => import('@/pages/treasury/FundAllocation'));
const CashPosition = lazy(() => import('@/pages/treasury/CashPosition'));
const Reconciliation = lazy(() => import('@/pages/reconciliation/Reconciliation'));
const FinanceDashboard = lazy(() => import('@/pages/dashboard/Finance'));
const SalesDashboard = lazy(() => import('@/pages/dashboard/Sales'));
const SourcingDashboard = lazy(() => import('@/pages/dashboard/Sourcing'));
const MarketingDashboard = lazy(() => import('@/pages/dashboard/Marketing'));
const Exceptions = lazy(() => import('@/pages/operations/Exceptions'));
const Dispatches = lazy(() => import('@/pages/operations/Dispatches'));
const Orders = lazy(() => import('@/pages/operations/Orders'));
const Schedules = lazy(() => import('@/pages/operations/Schedules'));
const Receivables = lazy(() => import('@/pages/money/Receivables'));
const Payments = lazy(() => import('@/pages/money/Payments'));
const Businesses = lazy(() => import('@/pages/accounts/Businesses'));
const BusinessDetail = lazy(() => import('@/pages/accounts/BusinessDetail'));
const Team = lazy(() => import('@/pages/manage/Team'));
const Jobs = lazy(() => import('@/pages/manage/Jobs'));

/* ------------------------------------------------------------------- CRM */
const CrmOverview = lazy(() => import('@/pages/crm/Overview'));
const Leads = lazy(() => import('@/pages/crm/Leads'));
const Deals = lazy(() => import('@/pages/crm/Deals'));
const Quotes = lazy(() => import('@/pages/crm/Quotes'));
const Activities = lazy(() => import('@/pages/crm/Activities'));
const Contacts = lazy(() => import('@/pages/crm/Contacts'));
const Companies = lazy(() => import('@/pages/crm/Companies'));
const Campaigns = lazy(() => import('@/pages/crm/Campaigns'));
const Tickets = lazy(() => import('@/pages/support/Tickets'));
const Automation = lazy(() => import('@/pages/manage/Automation'));
const Catalogue = lazy(() => import('@/pages/manage/Catalogue'));
const ImportWizard = lazy(() => import('@/pages/manage/ImportWizard'));
const AuditLog = lazy(() => import('@/pages/manage/AuditLog'));
const NotFound = lazy(() => import('@/pages/NotFound'));

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
  return (
    <RequirePermission module={module} action={action}>
      <ErrorBoundary>
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

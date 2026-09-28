/**
 * ────────────────────────────────────────────────────────────────────────────
 *  THE SWAP POINT
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Everything in `src/api/*` returns a Promise. Today those promises resolve
 * from `src/mocks/db.ts` after a short simulated latency. To connect the real
 * backend:
 *
 *   1. Set `VITE_API_URL` in `.env`.
 *   2. Flip `USE_MOCKS` to `false` (or drive it from the env var below).
 *   3. Replace each `mock(() => …)` body with the matching `http.get(...)`.
 *
 * No component, hook, page or query key changes. That is the whole point of
 * routing every read through this layer instead of calling axios from 282
 * view files, which is what the legacy panel does.
 */

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

/** Simulated network latency, so loading states are real during development. */
const LATENCY_MS = { min: 120, max: 380 };

function latency(): number {
  return LATENCY_MS.min + Math.random() * (LATENCY_MS.max - LATENCY_MS.min);
}

/** Wrap a synchronous fixture read so it behaves like a network call. */
export function mock<T>(produce: () => T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(produce()), latency());
  });
}

/**
 * Real transport, kept here so the shape of the eventual call is visible.
 * Unused while USE_MOCKS is true.
 *
 * The server answers 200 with `{ status: 'error' }` in its error envelope
 * rather than a 4xx, so success is asserted on the body, not the HTTP code.
 */
export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const token = readToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new ApiError('Session expired', 401);
  }

  const body = (await res.json()) as { status?: string; error?: string } & Record<string, unknown>;
  if (body.status && body.status !== 'success') {
    throw new ApiError(body.error ?? 'Request failed', res.status);
  }
  return body as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const TOKEN_KEY = 'bf-token';

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* non-fatal */
  }
}

/* --------------------------------------------------------------- query keys */

/**
 * One place for every cache key, so invalidation is never guesswork.
 */
export const qk = {
  treasury: {
    summary: ['treasury', 'summary'] as const,
    queue: (filters?: unknown) => ['treasury', 'queue', filters ?? null] as const,
    cash: (days: number) => ['treasury', 'cash', days] as const,
  },
  finance: {
    overview: (range: string) => ['finance', 'overview', range] as const,
    ageing: (range: string) => ['finance', 'ageing', range] as const,
    receivables: (filters?: unknown) => ['finance', 'receivables', filters ?? null] as const,
  },
  sales: {
    overview: (range: string, handler: string | null) => ['sales', 'overview', range, handler] as const,
    customers: (range: string) => ['sales', 'customers', range] as const,
  },
  sourcing: { overview: (range: string) => ['sourcing', 'overview', range] as const },
  marketing: { overview: (range: string) => ['marketing', 'overview', range] as const },
  orders: { list: (filters?: unknown) => ['orders', 'list', filters ?? null] as const },
  dispatches: {
    list: (filters?: unknown) => ['dispatches', 'list', filters ?? null] as const,
    exceptions: ['dispatches', 'exceptions'] as const,
  },
  payments: { list: (filters?: unknown) => ['payments', 'list', filters ?? null] as const },
  business: {
    list: (filters?: unknown) => ['business', 'list', filters ?? null] as const,
    detail: (id: string) => ['business', 'detail', id] as const,
  },
  leads: { list: (filters?: unknown) => ['leads', 'list', filters ?? null] as const },
  schedules: { list: (filters?: unknown) => ['schedules', 'list', filters ?? null] as const },
  recon: { list: (filters?: unknown) => ['recon', 'list', filters ?? null] as const, health: ['recon', 'health'] as const },
  team: { list: ['team', 'list'] as const },

  /* ------------------------------------------------------------------- CRM */
  crm: {
    leads: (f?: unknown) => ['crm', 'leads', f ?? null] as const,
    lead: (id: string) => ['crm', 'lead', id] as const,
    leadDuplicates: (id: string) => ['crm', 'lead', id, 'duplicates'] as const,
    leadInsights: ['crm', 'leads', 'insights'] as const,
    contacts: (f?: unknown) => ['crm', 'contacts', f ?? null] as const,
    companies: ['crm', 'companies'] as const,
    companyCrm: (id: string) => ['crm', 'company', id] as const,
    pipelines: ['crm', 'pipelines'] as const,
    deals: (f?: unknown) => ['crm', 'deals', f ?? null] as const,
    deal: (id: string) => ['crm', 'deal', id] as const,
    pipelineInsights: (id: string) => ['crm', 'pipeline', id, 'insights'] as const,
    activities: (f?: unknown) => ['crm', 'activities', f ?? null] as const,
    timeline: (id: string) => ['crm', 'timeline', id] as const,
    products: ['crm', 'products'] as const,
    priceLists: ['crm', 'priceLists'] as const,
    quotes: (f?: unknown) => ['crm', 'quotes', f ?? null] as const,
    quote: (id: string) => ['crm', 'quote', id] as const,
    tickets: (f?: unknown) => ['crm', 'tickets', f ?? null] as const,
    ticketInsights: ['crm', 'tickets', 'insights'] as const,
    campaigns: ['crm', 'campaigns'] as const,
    segments: ['crm', 'segments'] as const,
    workflows: ['crm', 'workflows'] as const,
    assignmentRules: ['crm', 'assignmentRules'] as const,
    emailTemplates: ['crm', 'emailTemplates'] as const,
    audit: (f?: unknown) => ['crm', 'audit', f ?? null] as const,
  },
};

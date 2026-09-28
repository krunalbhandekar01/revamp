# BuyoFuel Panel — Revamp

A ground-up rebuild of the operations panel. **The existing `panel/` is untouched** and stays as the
reference implementation; nothing here imports from it.

Everything runs on **dummy data**. There is no server call anywhere in this app yet — see
[Connecting the server](#connecting-the-server).

```bash
yarn install
yarn dev        # http://localhost:5173
yarn build      # type-check + production build
yarn preview    # serve the production build
```

---

## Why this exists

The legacy panel is feature-rich and its domain model is right, but three things hold it back:

| | Legacy `panel/` | This |
|---|---|---|
| Stack | CRA 5, React 17, Ant Design 4.17 (Dec 2021), JS | Vite 6, React 19, TypeScript, Tailwind 4, Radix |
| Server state | `axios` imported directly in **282 of 358** view files — no cache, no dedupe, no invalidation | TanStack Query, one typed API layer |
| Initial payload | **769 KB gzipped** entry chunk | ~156 KB gzipped entry; charts and tables split out |
| Permissions | 184 hand-ticked checkboxes per user, no templates, no diff | Canonical registry + role templates + explicit override diff |
| Decisions | Records what happened | Fund allocation cockpit, exception queue, reconciliation console |

The stack deliberately matches `partner-web/`, so the two can share a component library later.

---

## Layout

```
src/
├── api/              ← THE SWAP POINT. Every read/write the app makes.
│   ├── client.ts         mock transport, real `http()`, and all query keys
│   ├── treasury.ts       cash position, fund allocation queue
│   ├── finance.ts        revenue, margin, ageing, receivables
│   ├── analytics.ts      sales / sourcing / marketing roll-ups
│   ├── crm.ts            leads, deals, quotes, activities, tickets, campaigns, automation, audit
│   └── operations.ts     orders, dispatches, payments, business, leads, recon, team
├── mocks/            ← fixtures only. Deleted when the API is wired up.
│   ├── seed.ts           deterministic PRNG + corpora
│   ├── db.ts             core dataset
│   └── crm.ts            CRM dataset
├── rbac/             ← permissions
│   ├── registry.ts       CANONICAL list of modules × actions
│   ├── roles.ts          role templates, resolution, override diff
│   ├── auth.tsx          AuthProvider, useAuth, can()
│   └── can.tsx           <Can>, <RequirePermission>
├── components/
│   ├── ui/               Radix-based primitives (button, card, dialog, …)
│   ├── charts/           palette + ChartFrame (legend, tooltip, table view)
│   ├── crm/              ActivityTimeline, ScoreMeter, SlaBadge, OwnerChip
│   ├── data-table/       TanStack Table: facets, column picker, density, saved prefs
│   ├── common/           StatTile, PageHeader, Money, StatusBadge, EmptyState
│   └── layout/           AppShell, Sidebar, Topbar, CommandPalette
├── pages/            ← one folder per area, every page lazy-loaded
│   ├── crm/              leads, deals, quotes, activities, contacts, companies, campaigns
│   ├── support/          tickets
│   └── manage/           team, automation, catalogue, import, audit, jobs
├── config/nav.ts     ← navigation, generated from permissions
├── lib/              ← cn(), money/date formatting
└── types/domain.ts   ← the domain model
```

---

## The two screens that matter

### `pages/treasury/FundAllocation.tsx` — the cockpit

Answers "should I release funds today, and to whom" in the order the decision is actually made:

1. **What can I release?** Reconciled bank balances + undrawn facility − existing commitments.
2. **What is asking for it?** The demand queue, ranked.
3. **What happens if I do?** A consequence panel — closing position, blended return, and which
   suppliers stay past due — *before* anything is committed.

The ranking metric is **return on working capital (RoWC)**, not gross margin:

```
RoWC = (linked margin + early-pay discount) / amount due × 365 / cash-lock days
```

A 4% deal that recycles cash in 12 days beats an 8% deal that locks it for 60. Every row carries its
reason in words — a bare score nobody acts on is worse than no score.

### `pages/manage/Team.tsx` + `PermissionEditor.tsx` — access

A role is a **template**, per-user overrides are layered on top and shown as an explicit diff, and the
whole checkbox grid is generated from `rbac/registry.ts`. The editor also previews exactly which
screens the person will end up seeing.

Use the **role switcher in the top bar** to see the whole app re-gate instantly — nav items, page
guards, action buttons and even which table columns appear (margin is hidden without
`salesDashboard:viewMargin`).

> **The client-side gate is usability, not security.** It hides what a user may not do. The server
> must run the same check with `permit.check(module, action)` on every route. Today `permit.check`
> exists in `server/app/utils/auth/permit.ts` and is used **zero** times, while `payout.ts`,
> `fundBucket.ts`, `tradePartner.ts`, `payin.ts` and the Zoho routes have no granular check at all.
> Moving `rbac/registry.ts` to the server and enforcing it there is the other half of this work.

---

## CRM

A full CRM module lives inside the panel. It is scoped to **internal users only** — there is no
customer portal, no public form builder and no self-service surface here. Those belong in `web/`.

### Screens

| Area | Screen | What it does |
|---|---|---|
| **Sell** | CRM Overview | Funnel, pipeline by stage, forecast (committed vs best case), win/loss reasons, rep performance, "needs attention" |
| | Leads | Scored and ranked, BANT qualification, duplicate detection, bulk assignment, conversion |
| | Deals | Drag-and-drop Kanban across multiple pipelines, plus a table view with closed deals |
| | Quotations | Line-item builder, price lists, line + header discounts, GST, approval threshold, status tracking |
| | Activities | Tasks, calls, meetings, follow-ups — grouped by day, overdue pinned first |
| **Accounts** | Companies | Lifecycle stage, account tier, owner, open deal value, segments |
| | Contacts | People per company, decision-maker role, one-click call/email/WhatsApp, marketing opt-out |
| **Engage** | Support Tickets | SLA-ordered queue with breach and at-risk states, categories, CSAT, resolution capture |
| | Campaigns | Channel performance, return on spend, audience segments with their rules |
| **Administer** | Automation | Workflow rules (trigger → conditions → actions), assignment rules, email templates |
| | Catalogue | Products, SKUs, HSN, GST, availability; four price lists with variance against default |
| | Data Import | Four-step wizard: upload → map columns → validate → import |
| | Audit Log | Field-level before/after, append-only |

### The parts worth looking at

**Lead conversion** (`pages/crm/ConvertLeadDialog.tsx`) shows the three records it will create before
it creates them, and is gated behind qualifying at least 2 of 4 BANT criteria. Conversion is the one
irreversible step in the lead lifecycle.

**Closing a deal always captures why** (`pages/crm/CloseDealDialog.tsx`). The reason is required, not
optional — a lost deal with no reason is one nobody learns from, and it is the only input that makes
the win/loss panel on the overview possible.

**Quote arithmetic lives in one function.** `computeQuoteTotals()` in `api/crm.ts` is used by the
list, the builder and (later) the PDF. Quote totals re-derived in three places is how a customer ends
up with two different grand totals on the same document.

**Automation rules read as sentences.** Every rule renders as WHEN → IF → THEN in plain words. A rule
an ops lead cannot read is a rule nobody will leave switched on.

**The import wizard writes nothing until a human has seen the problems** — validation errors and
fuzzy duplicate matches are shown with the row numbers, and the duplicate policy (skip / update /
create anyway) is chosen up front.

### Permissions

The CRM adds 10 modules to `rbac/registry.ts`, taking the panel to **19 modules / 84 permissions**.
Try the role switcher in the top bar:

| Role | What the CRM looks like |
|---|---|
| Sales Executive | Own leads and deals only, can quote but not approve discounts, no campaigns or automation |
| Sales Manager | Everything in Sell, can approve discounts, can assign leads, can run imports |
| Finance Analyst | Deals and quotes read-only, catalogue, audit log — **no lead access at all** |
| Operations Manager | Activities, tickets and catalogue; leads and deals are hidden |
| Marketing | Leads, campaigns and segments; no quotes, tickets or catalogue |

Data scoping is real, not cosmetic: without `lead:viewAll` or `deal:viewAll` a user sees only records
they own, and the page says so.

### Deliberately left out

Scoped out because this panel is internal-only, or because the value is in the server rather than the
UI: the customer portal and self-service ticket raising, landing-page and web-form builders, live
email/calendar two-way sync, telephony and call recording, a knowledge base, a drag-and-drop custom
report builder, custom-object definitions, and the integration configuration screens (Gmail/Outlook,
Tally, Razorpay). AI features are represented where they change a decision — lead scoring with its
factor breakdown, collection-probability on receivables — rather than as a separate "AI" section.

---

## Connecting the server

All fixture reads go through `mock()` in `src/api/client.ts`. To go live:

1. Set `VITE_API_URL` and `VITE_USE_MOCKS=false` in `.env`.
2. Replace each `mock(() => …)` body with the matching `http(...)` call. `http()` is already written,
   including the server's `200 + { status: 'error' }` envelope and the 401 redirect.
3. Delete `src/mocks/`.

No component, hook, page or query key changes — that is the entire point of routing every read
through one layer instead of calling axios from each view.

Money is held as **paisa integers** throughout, matching the server. Format at the edge with
`lib/format.ts`; never let a float into a total.

---

## Deploying (Vercel)

`vercel.json` is committed. The one thing that is **not** in the file is the root directory — set it
in the Vercel project settings, and get it right, because Vercel reads `vercel.json` *from the root
directory*. Point it at the wrong place and the file is silently ignored: the build still succeeds,
but no rewrites are applied and every deep link 404s.

This app is at `panel/` inside the `revamp` repository, so:

| Setting | Value |
|---|---|
| Root Directory | `panel` |
| Framework Preset | Vite (auto-detected) |
| Build / Install / Output | Already in `vercel.json` — leave the dashboard fields empty |
| Node.js Version | 20.x or later |

Changing the root directory does not re-run the last build — trigger a redeploy afterwards, with
"Use existing Build Cache" **off**.

To confirm the config is live, check that a deep link returns HTML rather than a 404:

```bash
curl -sI https://<your-deployment>.vercel.app/crm/deals | head -1   # expect: HTTP/2 200
curl -sI https://<your-deployment>.vercel.app/assets/does-not-exist.js | head -1   # expect: 404
```

Then add the environment variables from `.env.example` (Production, Preview and Development).
**Both are read at build time by Vite**, so changing one in Vercel needs a redeploy — restarting is
not enough. Leave `VITE_USE_MOCKS=true` until `src/api/*` actually calls the server.

### What the config does

**SPA rewrite.** Everything serves `index.html`, so `/crm/deals` and `/treasury/allocation` resolve
on a hard refresh instead of 404ing. Real files still win: Vercel checks the filesystem *before*
rewrites, so `/assets/index-abc123.js` is served as itself.

**Stale chunks after a deploy.** Every page is code-split, so a tab opened before a deploy still
references chunk hashes that no longer exist. `lib/lazyWithReload.ts` catches the failed import and
reloads once to pick up the current `index.html`; a one-shot `sessionStorage` flag stops a genuinely
broken deploy becoming a reload loop, and the second failure falls through to a plain "a newer
version was deployed" screen. The rewrite excludes `/assets/`, so a missing chunk 404s honestly
instead of being handed back `index.html` with a `text/html` type — which fails the module MIME check
and is far harder to read in the console.

**Caching.** Vite fingerprints every file in `/assets/`, so those are `immutable` for a year. HTML is
left on Vercel's default (`max-age=0, must-revalidate`) rather than given an explicit rule — header
rules match the *incoming* path, not the rewritten one, so a rule on `/index.html` would never fire
for a request to `/crm/deals`.

**Headers.** `noindex` because this panel is internal-only and should never surface in search,
plus `nosniff`, `DENY` framing and a locked-down `Permissions-Policy`.

> Note: the config sets no CORS headers — in production the API lives on its own origin and must send
> its own. Worth remembering that the server currently runs `cors({ origin: '*' })`, which should be
> narrowed to the real panel origin before this goes anywhere public.

---

## Conventions worth keeping

**Charts.** Series colours are assigned by slot in a fixed, validated order and never cycled — a
filter that drops a series must not repaint the survivors. Sequential (one hue, light→dark) for
magnitude; categorical only when the series *are* the subject. Status colours are reserved and always
ship with a label. Dark mode is a *selected* set of steps, not an inverted light palette. Every chart
gets a legend at 2+ series and a table-view toggle. See `components/charts/palette.ts`.

**Tables.** One `DataTable`. Faceted filters with live counts, a column picker, a density toggle, and
per-viewer preferences saved to `localStorage` (every access guarded — a column picker must never take
the page down in a private window). `onSelectionChange` fires off the selection state, never off the
derived rows array: callers naturally write `data={rows.filter(...)}` inline, which changes identity
every render, and keying the effect off the derived array turns that into an infinite render loop
that pins the main thread and silently blocks navigation.

**Permissions.** Hide an action rather than disabling it, unless the user would reasonably expect it —
then explain why. Never add a `(module, action)` pair anywhere but `rbac/registry.ts`.

**Theme.** Tokens live on `:root` in `index.css`. Dark values are declared twice on purpose: a media
query follows the OS, a `[data-theme]` block follows the toggle, and the toggle wins both ways.

---

## Not built yet

Deliberately scoped out of this first pass, in rough priority order:

- Bank-feed ingestion and the reconciliation *matching* flow (the console lists items; matching is a stub)
- Delivery planner auto-allocation (capacity, vehicles, lanes, ETA) — the table and risk model are here
- Quote-with-margin, pipeline forecast, win/loss capture
- Campaign attribution beyond source-level roll-up
- OorjaData / inventory module
- Audit log UI for permission and fund-release history
- Virtualised rows (pagination covers current volumes; needed past ~10k rows)
- CRM: see **Deliberately left out** under [CRM](#crm)

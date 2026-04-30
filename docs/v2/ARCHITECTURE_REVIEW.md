# Architecture Review — production readiness

**Status:** advisory · written 2026-04-30
**Author:** Tech architect review
**Audience:** Buzzworks engineering + Siddharth as PM
**Sister docs:** BRD.md, PRD.md, fprds/01-12.md

This doc captures the gap between what's shipped today (v2.1) and what
"production-ready" means for a tool that handles real Buzzworks ops at
40k+ employee scale across 11+ clients. Scope: backend, data plane,
audit, agents, integrations, infra. UI/IA gaps are tracked in the
FPRDs themselves.

---

## 1. Credentials hygiene (read this first)

Two sets of working production credentials have appeared in chat
during this build:

- BeeLine (Accenture tenant): `venkatasubbu@buzzworks.com`
- Fieldglass: `Venkat2838`

**Both must be rotated.** Two reasons:

1. **Neither portal supports user-credential auth for integrations.**
   Fieldglass and BeeLine both require OAuth-based service accounts
   for API access. The username/password pairs unlock the human web
   UI only — driving them with Playwright is against ToS, gets locked
   out by MFA the day either client turns it on, and gives the named
   employee zero deniability when something breaks.
2. **Conversational logs aren't a vault.** Treat any credential
   pasted into a chat (with any vendor — Anthropic, OpenAI, Slack,
   email) as compromised by default and rotate.

The right way to obtain Fieldglass / BeeLine programmatic access is
through Buzzworks's customer admin in each tenant, requesting a
service account + OAuth `client_id` + `client_secret`. Section 7
covers this.

---

## 2. What's actually built today

```
                         ┌──────────────────────────┐
                         │  Vercel (Next.js 15)     │
                         │  - Hobby tier, 10s funcs │
                         │  - Auto-deploys from main│
                         └──────────┬───────────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
            ┌─────▼─────┐    ┌──────▼──────┐    ┌─────▼─────┐
            │  /api/    │    │  /api/      │    │  /api/    │
            │  import/  │    │  timesheets │    │  clients/ │
            │  beeline  │    │  /[client]  │    │  stats    │
            │  (CSV)    │    │  (read)     │    │  (read)   │
            └─────┬─────┘    └──────┬──────┘    └─────┬─────┘
                  └─────────────────┼─────────────────┘
                                    │
                          ┌─────────▼──────────┐
                          │  Supabase Postgres │
                          │  (Mumbai, Free)    │
                          │  ─ employees       │
                          │  ─ timesheets      │
                          │  ─ daily_entries   │
                          │  ─ validations     │
                          │  ─ import_runs     │
                          └────────────────────┘
```

Confirmed working:
- Next.js 15 SPA on Vercel + auth via cookie middleware
- Supabase Postgres with universal employees table + RLS-ready schema
- BeeLine CSV import for Accenture (real schema, real DB persistence)
- Per-client live stats from DB
- 6 test clients seeded in DB (`is_test_data=true`)
- 5 real-data clients flagged (acc, cap, hex, lmt, pwc)

Out of scope today:
- Real LLM agents (LEXI, JARVIS, RIPLEY, ORACLE, CASE, TRON are stubs)
- Real email send (NotifyPanel simulates, no Postmark/SES)
- Real portal sync (only manual CSV upload)
- Job queue / background workers
- Authentication beyond a demo cookie
- Audit log / approval archive
- Deep links to source-of-truth records
- Multi-tenancy (single Buzzworks org assumed)
- Observability (errors, perf, agent decision audit)

---

## 3. Production-readiness gaps, ranked

Five layers. Items inside a layer are roughly co-equal in priority.

### Layer 1 — Data plane (highest priority, ~3-4 weeks)

| Gap                                                  | Why it bites                                                                                           | Fix                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **No portal API integration** — only CSV uploads     | Manual file upload doesn't scale past one client. 11 clients × weekly = ~570 manual uploads/year.       | OAuth-based REST integration with Fieldglass and BeeLine. Each client gets a connector + sync job. |
| **No background workers / queue**                    | A real BeeLine sync for 12k Accenture workers ≈ 200k+ rows. Won't fit in 10s function (or 60s on Pro). | Inngest / Trigger.dev / Supabase Edge + Cron. Async ingest with per-client cursor + retry.         |
| **No bulk export**                                   | Accenture asks "all approved last quarter" — currently ops has to manually pull.                        | `/api/export/[client]/[range]` streaming CSV + XLSX. Background-job version for 10MB+ exports.     |
| **No archive of approved items**                     | Approved timesheets stay live forever (or vanish silently in mock). Auditors can't reconstruct.         | New `archived_at` + `archive_reason` columns + a separate **Archive** view. Approved → Archive.    |

### Layer 2 — Auditability + observability (~2 weeks)

| Gap                                           | Why it bites                                                                  | Fix                                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **No state-change audit log**                 | "Why was TS-4812 approved by Sneha at 2:14 PM?" — no trail.                  | `audit_events` table: `(actor, action, entity_type, entity_id, before_json, after_json, occurred_at)`.     |
| **No agent decision log**                     | When JARVIS auto-approves, no record of which checks fired or confidence.    | `agent_decisions` table linked to timesheet_id with reasoning trail JSON + tools called.                  |
| **No deep links to source records**           | An ops user can't click from inbox → Fieldglass detail to verify.            | Persist `external_url` per imported timesheet. Render as button in drawer.                                |
| **No error monitoring**                       | A failed import logs to console and dies. No alerting, no SLA.                | Wire Sentry (free tier good for 5k events/mo). Alert on import failures + 5xx + agent errors.             |

### Layer 3 — Email / agent execution (~3 weeks)

| Gap                                          | Fix                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| RIPLEY emails don't actually send            | Wire Postmark or AWS SES. Add `email_sends` table tracking delivery + reply.                     |
| LEXI is a regex, not an LLM                  | Real Anthropic API calls with structured-output. JSON-schema for parsed policy. Per-client rule packs. |
| JARVIS validation is heuristic               | LLM with policy pack + DB tools. Writes to `agent_decisions` for audit.                          |
| ORACLE doesn't actually scan regulations     | Daily cron + scraper for the 24 authorities + LLM for classification.                            |
| No audit of what the agents read/wrote       | Tied to `agent_decisions` above.                                                                 |

### Layer 4 — Auth, RBAC, multi-tenancy (~2 weeks)

| Gap                                                  | Fix                                                                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Cookie-based fake auth                               | Supabase Auth or Clerk. Email + Google for Buzzworks employees.                                                      |
| Everyone sees everything                             | Per-row RLS in Supabase: `agent_managers` table tied to `accounts_assigned[]`. Ops Lead sees all; AM sees only theirs. |
| No tenant separation if Buzzworks ever sells this    | Add `org_id` column on every business table. Default to single Buzzworks org until cross-sell.                        |

### Layer 5 — Operational hygiene (~1-2 weeks)

| Gap                                  | Fix                                                              |
| ------------------------------------ | ---------------------------------------------------------------- |
| Vercel Hobby = 10s timeout           | Pro at $20/mo for 60s + better isolation.                        |
| No staging environment               | Branch deploys (Vercel free) + Supabase branching ($1 per branch).|
| No backups beyond Supabase 7-day     | Weekly logical dump to Cloudflare R2 / S3.                       |
| No CI checks                         | GitHub Actions: tsc + next build on every PR.                    |
| Secrets management                   | Vercel env vars OK at this scale. Doppler if cred volume grows.   |

---

## 4. Target architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 15)                      │
│  Sidebar / Inbox / Clients / Compliance / Agents / Settings    │
└──────────────────┬──────────────────────────────────────────────┘
                   │ Supabase Auth + RLS
                   │
┌──────────────────▼──────────────────────────────────────────────┐
│                     API ROUTES (thin)                            │
│   /api/inbox/*   /api/timesheets/*   /api/clients/*              │
│   /api/import/*  /api/export/*       /api/admin/*                │
│   /api/agents/*  /api/audit/*                                    │
└──────────────────┬───────────────────────────┬───────────────────┘
                   │                           │
        ┌──────────▼─────────────┐  ┌──────────▼─────────────┐
        │  Supabase Postgres     │  │  Inngest (or similar)  │
        │  - employees           │  │  - portal sync jobs    │
        │  - timesheets          │  │  - LLM agent runs      │
        │  - audit_events  ◀─────┼──┤  - email sends         │
        │  - agent_decisions     │  │  - exports             │
        │  - approval_archive    │  │  - daily ORACLE scans  │
        │  - email_sends         │  │  Cron-triggered or     │
        │  RLS per role          │  │  webhook-triggered     │
        └────────────┬───────────┘  └────────────┬───────────┘
                     │                            │
                     │ ┌──────────────────────────▼──────────────┐
                     │ │  EXTERNAL INTEGRATIONS                  │
                     │ │  ├ Fieldglass REST (OAuth)              │
                     │ │  ├ BeeLine REST (OAuth)                 │
                     │ │  ├ Anthropic Claude (LEXI/JARVIS/ORACLE)│
                     │ │  ├ Postmark / SES (RIPLEY → out)        │
                     │ │  ├ Government regulator scrapers        │
                     │ │  └ Sentry (errors)                      │
                     │ └─────────────────────────────────────────┘
                     │
        ┌────────────▼───────────┐
        │  Cloudflare R2 / S3    │
        │  - CSV uploads         │
        │  - Bulk export results │
        │  - Weekly DB dumps     │
        └────────────────────────┘
```

Key shape changes from today:
- **Queue layer** between API and slow operations (sync, LLM, email, export)
- **Audit log** captures every state change
- **Archive instead of delete** for approved items
- **External integrations** live behind connectors with credentials in env / secrets manager
- **RLS at the DB level**, not just middleware

---

## 5. Phased plan (12 weeks)

### Phase 1 — Production hardening (weeks 1-3)

- Vercel Pro
- Supabase Auth + first RLS policies
- `audit_events` + `approval_archive` tables; approve = move to archive, not delete
- Sentry wired
- Weekly DB dump to R2/S3
- CI: tsc + next build on every PR

**Outcome:** dev.era.ai is safe for real ops users to start clicking.

### Phase 2 — Real Fieldglass + BeeLine integration (weeks 4-7)

- Inngest set up; first job: `sync.beeline.acc.weekly` running on cron
- OAuth credentials in env (proper service accounts, not user creds)
- Fieldglass connector for Capgemini (Phase-1 client for that portal)
- BeeLine real connector replaces CSV-upload POC for Accenture
- Bulk export endpoints (CSV + XLSX)
- Deep links: every imported row stores `source_url` → drawer shows "View in Fieldglass"

**Outcome:** timesheets flow in nightly without anyone touching anything. CSV upload becomes a fallback, not the primary path.

### Phase 3 — Real agents (weeks 8-12)

- LEXI: real Anthropic call, parses uploaded policy PDFs into rule pack
- JARVIS: real validation against rule pack + DB lookups; writes to `agent_decisions`
- RIPLEY: real send via Postmark; tracks delivery + replies
- ORACLE: daily scrape of 24 authorities + LLM classification
- TRON: scheduled digests to AMs

**Outcome:** the "6 agents" pitch is real. Inbox auto-resolves clean items, queues edge cases.

---

## 6. Cost projection (monthly, at 40k employees scale)

| Service              | Tier            | Cost                     |
| -------------------- | --------------- | ------------------------ |
| Vercel               | Pro             | $20                      |
| Supabase             | Pro             | $25                      |
| Inngest              | Free → Hobby    | $0 → $20                 |
| Anthropic API        | ~10M tokens/mo  | $30-100                  |
| Postmark             | 10k emails/mo   | $15                      |
| Sentry               | Free → Team     | $0 → $26                 |
| Cloudflare R2        | <100 GB         | $0                       |
| Domain (era.ai)      | already paid    | —                        |
| **Total Phase 1**    |                 | **~$45-60/mo**           |
| **Total Phase 3 (full)** |             | **~$120-200/mo**         |

For ~₹2.4 Cr/yr in saved ops cost (per the home dashboard math), this is rounding-error infrastructure spend.

---

## 7. Fieldglass integration — proper path

User credentials are NOT how production talks to Fieldglass. The
correct sequence:

1. **Identify Buzzworks's Fieldglass admin** at the supplier-side
   console (probably whoever set up `Venkat2838`'s account). They
   have access to **Configuration → Integrations** which is the entry
   point for setting up service accounts.
2. **In the Fieldglass admin console**, register a new "Integration
   Service Account" with the scopes needed:
   - `worker.read`
   - `timesheet.read` (and `timesheet.write` if pushing approvals back)
   - `assignment.read`
   - `cost-center.read`
3. **Fieldglass issues OAuth `client_id` + `client_secret`** (one-time,
   save in Vercel env vars).
4. **For each customer tenant** (Capgemini, others) — Buzzworks needs
   the customer-side admin to authorize the service account against
   their tenant. One-time OAuth handshake, not weekly.
5. **Webhook subscription** for timesheet events (avoids polling).
   Fieldglass posts to a Buzzworks webhook URL when a timesheet is
   submitted/approved.

**Alternative if API access takes weeks of procurement** — scheduled
reports. Fieldglass admin schedules a daily timesheet export → SFTP
→ Buzzworks-controlled bucket → Inngest job picks it up. This is
what most staffing companies do as the bridge until full API
integration lands.

**Alternative path C — manual CSV upload** (what we're doing today
for BeeLine, and what we're shipping for Fieldglass alongside this
review). Works without admin access. Doesn't scale past Phase 1.

---

## 8. The same-architecture refactor opportunities

When you do start Phase 2, these refactors become natural:

1. **Generalise the import parsers.** Today `lib/beeline-import.ts`
   and `lib/fieldglass-import.ts` are 80% identical. With 3+ portals
   this becomes painful. Move to a per-portal config: `{ aliases,
   employeeDefaults, validator, idPrefix }` and a single shared
   `parsePortalCsv(config, text)`.
2. **Generalise the import API.** `/api/import/[portal]/route.ts`
   dynamic route that picks the parser config at request time.
3. **Generalise the read API.** Already done in this commit:
   `/api/timesheets/[clientId]/route.ts`. Inbox fetches all
   `REAL_DATA_CLIENT_IDS` in parallel.
4. **Push real-data client metadata into DB.** Today
   `REAL_DATA_CLIENT_IDS` is a hardcoded set in mock-data.ts. Move
   to a `client_integrations` table with `(client_id, portal,
   sync_method, last_sync_at, status)`.
5. **Refactor employee resolution.** Today the Inbox builds a
   resolver chain (seed → imported → generated). With real data
   exclusively, this becomes: query DB. The mock generator gets
   dropped entirely once test_data flag is removed.

None of this is required to ship Phase 2; it just becomes obvious
once you're staring at 5 portals.

---

## 9. What I'd recommend doing NEXT

In order:

1. **Rotate both Fieldglass and BeeLine passwords.** Today, before
   anything else.
2. **Decide phasing:** Phase 1 hardening before Phase 2 integrations,
   or chase integrations first?
   - **Recommendation: Phase 1 first.** Real integrations are
     worse than no integrations if there's no audit trail and no
     archive when an ops user makes a mistake at 11pm.
   - **But:** If you need a Fieldglass demo for Buzzworks leadership
     to unlock budget, the manual-CSV path (Phase 1.5, shipping
     alongside this review) is good enough as a demo without paying
     the Phase-1 hardening cost.
3. **Start the Fieldglass admin conversation in parallel.** Whoever
   has Configuration → Integrations access at Buzzworks should
   request a sandbox API key — usually 1-3 business days. The real
   connector code can be tested against the sandbox before flipping
   to production credentials.

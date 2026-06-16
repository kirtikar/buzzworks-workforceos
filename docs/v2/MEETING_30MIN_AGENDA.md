# OpsDesk Dashboard — Walkthrough & Phase-2 Scope (30 min)

**Date:** _to confirm_
**Attendees:** Buzzworks ops / finance leadership · Kirtikar Consulting
**Format:** Screen-share walkthrough, then open discussion. Document attached for context.

---

## Agenda

**00:00 – 00:03 · Context (3 min)**
- Where we are vs the Phase-1 brief; what's live on `dev.era.ai`.

**00:03 – 00:13 · What's shipped — live walkthrough (10 min)**
- **Inbox** — server-paginated; multi-select status / client / source / score filters; bulk-approve rules; drawer detail-on-demand.
- **Employees** — paginated roster with search; drawer with Overview / Timesheets / Leave / Risk tabs.
- **Employee Detail** — new **Google-Calendar-style monthly view** with approval colours (green = approved, orange = pending, red = rejected), 5/6-row dynamic grid, slide animation, today highlight, "Today" button.
- **Client pages** — per-client KPIs, employee table, March/April payroll, expense invoiced/pending.
- **Home** — Ops-Cost-by-Client chart wired to live rosters (1 query instead of 8 fan-outs).
- **Portals** — Fieldglass + BeeLine ingestion live: ~3,400 timesheets, ~24K daily entries, ~300 expense sheets across 5 real-data clients.
- **Backend** — paginated `/api/inbox`, `/api/employees`, `/api/timesheet/[id]`, `/api/employees/[id]/timesheets`, `/api/clients/summary`; pg_trgm + composite indexes; HTTP caching.

**00:13 – 00:25 · Scope of discussion — Phase-2 (12 min)**

1. **Worker Profile snapshot** _(attached doc, §3)_
   - 8-table schema landed (`worker_profiles` + 6 child tabs + snapshots). Probe / crawler ready; need a sample Fieldglass Worker page from Buzzworks side to harden the parser.
   - Goal: canonical **Date of Joining, manager, rate, status** sourced from the Worker portal page, then backfilled into `employees` so DOJ shows correctly everywhere on the dashboard.

2. **Approval workflow** — confirm thresholds
   - Auto-approve cut-off (current proposal: score ≥ 95 AND zero failed checks).
   - OT-over-cap escalation: 45 h cap → manager approval; what's the second cap (60 h?) and the fallback when no manager on file?
   - Reject-with-reason templates: who owns the canonical list?

3. **Compliance overlay** — TeamLease RegTech feed
   - Per-state, per-worker compliance state (PF, ESIC, P-Tax registration status, document expiry).
   - Surfaces as a calendar badge + Inbox category. Ranked by P1 / P2.

4. **Payroll handoff** — downstream system contract
   - Output format expected (CSV / API / SFTP?), cadence (weekly / fortnightly / monthly), what fields downstream needs, when in the cycle.

5. **Data ownership boundaries**
   - Which fields are SI of truth in OpsDesk vs in the client master (e.g., name spellings, rate revisions)?
   - When client data and Buzzworks data disagree, what's the precedence rule?

**00:25 – 00:30 · Open questions & next steps (5 min)**
- Sign-off on Phase-1 scope (in-scope vs out-of-scope items in the attached doc, §7).
- Access to one Fieldglass Worker page sample so we can finalise tab parsers.
- Phase-2 backlog rank: Compliance overlay vs Payroll handoff vs Worker profile DOJ.
- Cadence for the next review (weekly or fortnightly?).

---

**Attached:** _OpsDesk — Workforce & Timesheet Automation, Understanding & Scope (Draft v0.1)._

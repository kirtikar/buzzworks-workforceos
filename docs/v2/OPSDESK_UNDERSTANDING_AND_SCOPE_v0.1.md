# Buzzworks OpsDesk — Workforce & Timesheet Automation
## Understanding & Scope (Draft v0.1)

**Prepared by:** Kirtikar Consulting
**Partner:** Buzzworks / WorkforceOS
**Date:** 29 May 2026
**Status:** Draft for review — to be expanded in subsequent iterations

> **Scope note for this revision:** This document focuses on the **Contract Staffing** business line — the timesheet → approval → invoice → payroll cycle for workers placed at enterprise clients (Capgemini, Accenture, Hexaware, LTIMindtree, PwC India). The other two lines — **Permanent Staffing** (recruitment / placement fee) and **Managed Payroll & Compliance Services** — are referenced for context but will be documented in detail in subsequent revisions. Treat any Permanent / Managed-Services content here as placeholder only.

### Revision history

- v0.1 — Initial draft from discovery notes, sample portals (Fieldglass / BeeLine), and the OpsDesk MVP shipped on `dev.era.ai`. Establishes the three business lines (Contract / Permanent / Managed), the Client → Engagement → Worker → Timesheet hierarchy, the central worker-status DB, and the Phase-1 scope envelope (Onboarding through Payroll handoff through AR Tracking).

---

## 1. Purpose of this Document

This is a first-cut articulation of how Kirtikar Consulting currently understands Buzzworks' **Onboarding-to-Payroll (O2P) lifecycle**, anchored on the **Contract Staffing** business line, and the scope items the automation must address. The objective is to align on the lifecycle, the master data, the timesheet/approval constructs, the AR + payroll handoff layer, and the in/out of scope boundaries before we expand into detailed functional / technical specifications.

**End-to-end scope envelope.** The automation begins at **worker onboarding** (engagement contract + portal credentials) and ends at **payroll handoff + AR tracking** — i.e., timesheets validated and approved, invoices raised on clients, receipts reconciled, AR aged, payroll file shipped to the downstream payroll system. Everything from worker provisioning through validation rules, manager approvals, bulk actions, credit notes, receipts, and customer-level outstanding tracking sits inside the scope envelope.

**Inputs used to inform this draft:**
- Discovery notes from working sessions (Buzzworks operations team).
- Sample timesheet exports — Capgemini / Fieldglass (CGEMTS…), Accenture / BeeLine.
- Sample expense sheets from Fieldglass (CGEMES…).
- Sample worker assignment records and the OpsDesk MVP shipped on `dev.era.ai` (commits up to `85139d2`).
- Reference: TeamLease RegTech compliance corpus (~16K docs) used by the ORACLE compliance agent.

---

## 2. Buzzworks Business Context (as we understand it)

Buzzworks operates **three distinct business lines**, each with its own revenue construct and, consequently, its own operations nuances. The OpsDesk automation must handle all three under a unified platform while respecting their differences.

### 2.1 The Three Business Lines

| Business Line | What it sells | Primary revenue construct |
|---|---|---|
| **Contract Staffing** | Workers placed at enterprise clients (IT / consulting majors). Workers consume client space, submit timesheets via the client's VMS portal. | **Per-worker, per-hour billing** on approved timesheets. Pass-through pay-rate × hours + Buzzworks margin. Weekly / fortnightly / monthly cadence depending on client contract. |
| **Permanent Staffing** | Search & placement of permanent employees at client organisations. | **One-time placement fee** (% of CTC, typically 8.33–12.5%). Billed on the candidate's joining date. |
| **Managed Payroll & Compliance** | Outsourced payroll + statutory compliance for clients who hand over their entire workforce ops to Buzzworks. | **Per-employee per-month** managed-service fee + statutory pass-through. |

### 2.2 Cross-cutting Constructs

- **Worker VMS portals** the workers submit through — currently SAP **Fieldglass** (Capgemini), **BeeLine** (Accenture, PwC India) — and manual CSV / email imports for smaller engagements. The automation must abstract over portal differences.
- **COCO vs Multi-vendor** clients — some clients engage Buzzworks as the sole staffing vendor (single-vendor); others have Buzzworks alongside other staffing companies, with the VMS portal arbitrating the mix. This affects timesheet routing and invoice consolidation.
- A single client may consume **all three** business lines simultaneously (e.g., contract workers + a managed-payroll arrangement for their full-time staff). The automation must support both consolidated and separate-by-line invoicing (see §5.2).

### 2.3 Customer Hierarchy — Client, Engagement (Buying Group), Worker, Timesheet

A single Buzzworks customer is **not** a flat record. The customer side typically maps to a four-level hierarchy, and the OpsDesk automation must respect every level of it:

- **Client:** the umbrella enterprise Buzzworks is engaged with (e.g., Capgemini Technology Services India Ltd).
- **Engagement / Buying Group:** a contract scope under that client — typically a project, cost centre, business unit, or geography (e.g., "Capgemini India — Cloud Practice — Pune"). Each engagement has its own PO, billing cadence, and approval matrix.
- **Worker:** an individual placed under an engagement. Each worker has a worker ID issued by the client VMS portal (e.g., `CGEMW00123` in Fieldglass), a Buzzworks employee code, and a calendar of timesheets.
- **Timesheet:** a week (or other period) of submitted hours for one worker, going through validation → approval → invoice → payroll.

```
                ┌────────────────────────┐
                │       CLIENT           │
                │  (e.g., "Capgemini")   │
                └───────────┬────────────┘
                            │ 1 : N
            ┌───────────────┼────────────────┐
            ▼               ▼                ▼
       ┌─────────┐     ┌─────────┐     ┌─────────┐
       │Engmt A  │     │Engmt B  │     │Engmt C  │   ... distinct PO,
       │(Pune)   │     │(B'lore) │     │(Mumbai) │       cadence,
       └────┬────┘     └─────────┘     └─────────┘       approver matrix
            │ 1 : N
   ┌────────┴──────────┐
   ▼                   ▼
┌────────┐         ┌────────┐
│Worker 1│   ...   │Worker N│  ... per-worker assignment
└───┬────┘         └────────┘
    │ 1 : N (per cycle)
    ▼
Timesheet     Timesheet     Timesheet     ... weekly / cycle entries
  W12          W13           W14
```

#### Why this matters for the automation

- Inbox routing — every timesheet is traceable to exactly one engagement, and engagement-level rules (cap, OT pre-approval requirement, manager email, approval matrix) determine validation and approval behaviour.
- Invoice splitting — the automation **must be able to raise multiple, independent invoices per cycle**, split by:
  i. **Engagement** (default — one invoice per engagement).
  ii. **Cost-centre within engagement** (when the client requests bill-by-cost-centre).
- No forced consolidation across engagements. A client with three engagements can validly receive three invoices per cycle. Consolidation is opt-in.
- **Engagement ≡ "Order Code"-equivalent.** Whenever this document refers to "engagement" treat it as the operational unit from which billing, approvals, and worker assignment flow.

---

## 3. The Onboarding-to-Payroll Lifecycle (as understood)

### 3.1 The Worker Lifecycle and the Three Activation Triggers

For Contract Staffing, a worker moves through **three distinct activation stages** between contracting and being a billable, payable resource. Any one of these three stages can be the contractual **billing trigger** for the client, and the choice has downstream implications because portal verification is partly outside Buzzworks' control.

```
   ┌──────────────────┐    ┌──────────────────┐   ┌──────────────────┐
   │   Onboarded      │ ──▶│  Portal-Active   │──▶│  First-Timesheet │
   │  (contract + ID  │    │  (worker exists  │   │   Approved       │
   │   in Buzzworks   │    │   in client VMS, │   │  (revenue-       │
   │   master)        │    │   ready to log)  │   │   recognisable)  │
   └──────────────────┘    └──────────────────┘   └──────────────────┘
       Buzzworks-controlled    Joint               Client-controlled
       (HR onboarding)         (Buzzworks +        (client manager
                               client provisions   approves first
                               worker in VMS)      week)
   ◀── days ──▶           ◀── days–1 wk ──▶   ◀── 1–2 weeks ──▶

   ── Possible Billing Start Points (chosen at engagement contract) ──
       (a) From Onboarded   (b) From Portal-Active   (c) From First Approval
```

#### Stage definitions

| Stage | Meaning | Under Buzzworks control? |
|---|---|---|
| **Onboarded** | Worker has signed engagement contract, has a Buzzworks employee code, BG verification cleared. | Yes |
| **Portal-Active** | Worker exists in the client's VMS portal (Fieldglass / BeeLine) with credentials, can submit timesheets. | Partial — client provisions credentials |
| **First-Approved** | The worker's first timesheet has been approved by the client's authorised approver. | No — depends on client manager |

### 3.2 The Natural Friction (and How the System Has to Behave)

**The friction:** First-Timesheet-Approved can take 1–2 weeks because it depends on the client manager's diligence. Buzzworks' commercial preference is to start billing on **Portal-Active** so revenue isn't held hostage to the client's approval timeline. Clients, on the other hand, push for **First-Approved** as the trigger because that's when they perceive value.

**Where it gets messy:** A client can contractually agree to billing from Portal-Active, get invoiced for two weeks, and then push back saying timesheets were never actually approved. At that point we typically need to:

1. **Shift the billing trigger** to First-Approved for the affected workers (retroactively).
2. **Issue a credit note** for amounts already billed pre-First-Approval, or adjust the over-billed amount against future invoices.
3. **Pause further billing** for those workers until First-Approved is achieved.
4. **Resume billing automatically** once First-Approved is confirmed.

#### Customer-facing vs internal terminology

- This activation-stage flag is **internal**. Clients should not see "Onboarded / Portal-Active / First-Approved" on invoices.
- Customer-facing communication stays in business terms ("worker go-live", "service start date").
- Internally, every worker carries a `Billing Trigger Stage` flag (Onboarded / Portal-Active / First-Approved) plus a `Current Live Stage` flag. The automation compares the two each cycle to decide whether the worker is billable.

### 3.3 Implication — A Central Worker-Status Database

To make all of the above mechanical (and auditable), we need a **central worker-status database** that is updated daily. Each worker row must carry, at minimum:

- Worker ID (Buzzworks employee code), Portal Worker ID, Client ID, Engagement ID
- **Billing State** (for the worker's posting) and the corresponding **State PF / PT / GSTIN** to be used on the invoice
- Place-of-supply (typically the worker's posting state)
- **Contracted Billing Trigger Stage** (Onboarded / Portal-Active / First-Approved)
- **Current Live Stage** + timestamps of each transition (onboarded date, portal-active date, first-approval date)
- **Billing Eligibility Flag** (computed: is this worker billable this cycle?)
- **Billing Hold Flag** + reason (e.g., "renegotiated to First-Approved, awaiting client manager")
- Stage-shift history (audit trail of any change in Billing Trigger Stage, with credit/adjustment reference)
- Pay grade, bill rate, pay rate, cost centre, manager assignment

This DB becomes the **single source of truth** that the OpsDesk billing engine reads every cycle. It also enables:

- Daily reconciliation against the client VMS portal (did any "Portal-Active" worker actually log time today?).
- Proactive alerts to CS / Finance when a worker is approaching the typical 2-week patience threshold without First-Approved being achieved.
- Clean credit-note generation when a renegotiation happens, because the over-billed period is precisely defined by stage timestamps.

### 3.4 End-to-End Lifecycle (across all three business lines)

```
Sourcing & Sales      Onboarding              Operations              AR Tracking + Payroll
─────────────────     ──────────────          ──────────────────────   ─────────────────────
Lead (L0)             Engagement created       Contract Staffing:        Receipt capture
 → Demo (L2)            (proxy for proposal    Worker moves Onboarded    (bank / advice / portal)
 → Proposal (L3/L4)     acceptance)             → Portal-Active →        Auto + manual receipt
 → Negotiation (L5)   BG / KYC complete        First-Approved           application
 → Estimate            BeeLine / Fieldglass    Timesheet validated      TDS / short-pay handling
 → Go-Ahead (L6/L7)    credentials issued       (rule engine)            AR aging buckets
 → Engagement          Smart Engagement Kit    Approved → Invoiced       Dunning / collections
   Contract            (rates, cadence,         → Paid                   SOA generation
                       approver matrix)        Renegotiation may         Disputes / adjustments
                                                trigger credit note +    Write-offs (with approval)
                                                billing pause
                                              Permanent Staffing:        Payroll handoff
                                                Placement fee on         (downstream payroll
                                                joining                  system, weekly /
                                              Managed Services:          fortnightly / monthly)
                                                Per-employee mgmt fee
                                                + statutory pass-through
                                              Invoice generated per
                                                cycle (consolidated or
                                                per-engagement)
```

**Scope envelope** spans the full pipeline from Onboarding through Operations through Payroll handoff + AR Tracking. **Sales Process (Lead → Engagement contract) remains in the existing CRM** (HubSpot today) and is consumed read-only.

Key stage gates from discovery: **Lead → Engagement Contract → Worker onboarding → Portal-Active → Timesheet cycle → Invoice → Payroll → Receipt**.

The **Engagement** is the central spine — it carries client metadata, financial data, state-level invoicing rules and contract data. Engagement creation date is used as a proxy for "deal-closed".

---

## 4. Master Data Stores

The discovery identifies eight stores that must be reconciled and managed through the automation:

1. **Clients** — Brand → Legal Entity → State-GSTIN hierarchy, with CRM linkage.
2. **Engagements** — sits below Legal Entity. Carries plan / cadence / approval-matrix / contract attributes. Unit of billing.
3. **Workers** — one row per active worker per engagement. Includes Buzzworks employee code, portal worker ID, pay grade, rate, manager, cost centre, status.
4. **Worker Profiles** _(new — sourced from VMS Worker pages)_ — canonical Date of Joining, manager hierarchy, rate revisions, documents, compliance status. _See §6 for the proposed model._
5. **Contracts** — optional. When present, authoritative for commercial terms; when absent, engagement setup is source of truth.
6. **Purchase Orders** — optional. Blanket vs specific; tied to engagement / cost-centre. Some clients mandate a PO before invoice issuance; others do not.
7. **Timesheets** — submitted, validated, approved, invoiced, paid. Includes daily entries and validation-check results.
8. **Receipts / Payment Advice** — bank / gateway / customer advice, applied to invoices.

Open question flagged: _Is there a central repo for POs & Contracts today?_ — to be confirmed.

### 4.1 Optionality of Contract and PO — and the Engagement as Fallback Source of Truth

Two facts the automation must model first-class:

- **Contract:** present for most clients, absent for some. When present, it overrides; when absent, the engagement record stands in.
- **PO:** required by some clients (large enterprises), not required by others. When required, an invoice cannot be raised until a valid, unconsumed PO is linked.

| Contract | PO Required | Source of Truth for Billing | Pre-Invoice Gate |
|---|---|---|---|
| Yes | Yes | Contract + PO + Engagement setup | PO must be active, unconsumed, mapped |
| Yes | No  | Contract + Engagement setup | None (internal approval) |
| No  | Yes | Engagement setup + PO | PO must be active, unconsumed, mapped |
| No  | No  | **Engagement setup alone** | None (higher internal approval threshold) |

In all four cases, the **Engagement record is mandatory and complete enough to be billable on its own**. Contract and PO layer on additional constraints.

---

## 5. Operational Constructs

### 5.1 Inputs feeding each Timesheet

- **Worker assignment** (engagement, pay grade, rate, manager, cost centre).
- **Validation policy** (per client / per engagement — see §5.4).
- **Daily entries** (regular hours, overtime, leave, leave type).
- **Portal source** (Fieldglass, BeeLine, manual, email).
- **External URL** (deep link to the source portal's detail page).

### 5.2 Invoice Output Forms

Two dimensions stack — **what** appears on the invoice and **how many** invoices are raised per cycle.

**Line construction (within a single invoice):**
- **Per-worker breakup** — one line per worker (default for Contract Staffing).
- **Consolidated** — single line summing engagement hours × blended rate.
- **Separate by cost-centre** — group worker lines by cost centre with sub-totals.

**Invoice count (per cycle):**
- **Default — one invoice per engagement**, further split by cost-centre / GSTIN when the engagement spans multiple states.
- **Optional grouping** — multiple engagements collapsed into a single consolidated invoice, only within the same legal entity AND same GSTIN. Never across GSTINs.

### 5.3 Billing Entities

- **India** (Buzzworks Pvt Ltd) — primary, with state-wise GSTINs.
- **Cross-border** clients (planned) — invoicing rules (GST vs export-of-services) to be modelled when this lights up.

### 5.4 Validation Rules (the rule engine)

Each engagement carries a **validation policy** — a set of rules the rule engine evaluates on every submitted timesheet. The policy is per-client today (Accenture, Capgemini, etc.) but the same engine evaluates all of them.

Examples currently in production:

| Rule ID | What it checks | Result |
|---|---|---|
| `weekly-target` | Total hours ≤ 45 h per week (Capgemini) | pass / warning / fail |
| `weekly-cap` | Total hours ≤ 45 h per week (Accenture / BeeLine) | pass / warning / fail |
| `ot-preapproval` | OT hours require pre-approval flag set | pass / warning / fail |
| `leave-inference` | Days flagged "leave" reconcile against client's leave master | pass / warning |
| `leave-balance` | Worker has sufficient balance for inferred leave | pass / fail |
| `holiday-fill` | Holiday days are correctly filled (paid / unpaid / autofilled) | pass / warning |
| `status-recognised` | Status (Submitted / Approved / Rejected) parses to a known value | pass / fail |
| `weekend-policy` | Weekend hours only if engagement allows it | pass / warning |
| `daily-cap` | No day exceeds 12 h | pass / warning |

The engine produces a per-rule result and an aggregate **validation score (0–100)**. The score and rule results drive Inbox routing and auto-approval eligibility.

### 5.5 Approval Workflow — Auto-Approve, Manual Review, Manager Escalation

| Bucket | Criteria (current proposal) | Action |
|---|---|---|
| **Auto-approve** | Score ≥ 95 AND zero failed checks AND no overtime | OpsDesk approves automatically; logged with `approvedBy = JARVIS` |
| **Quick approve** | Score ≥ 85 AND zero failed checks | One-click bulk-approve from Inbox (operator confirms) |
| **Manual review** | Score 60–84, OR any warning, OR has OT under cap | Routed to Inbox for operator decision |
| **Manager escalation** | OT > 45 h cap | Auto-email engagement manager (CC employee) requesting approval before next payroll release |
| **Reject** | Score < 60, OR any fail without operator override | Reject with templated reason + notify worker |

Thresholds and email templates are **engagement-configurable** so different clients can have different stances. Defaults are set per client.

### 5.6 Special Behaviours

- **Credit notes** for post-invoice adjustments (worker did not actually work, timesheet was double-billed, etc.).
- **Billing on hold** until a specified event (manager approval, document expiry resolved, BG re-check).
- **Pro-forma invoices** as a precursor to tax invoices for clients who pre-validate.
- **Portal status** (Active / Suspended / Off-boarded) influences billing eligibility.

### 5.7 Pay-Rate Revisions

Most multi-year engagements include rate-revision clauses — annual % escalation, role-based step revisions, or skill-band promotions. Outside of scheduled revisions, there are **exception revisions** (mid-cycle promotions, discount give-backs, regulatory pass-through such as minimum-wage hikes).

**Patterns the automation must support:**

| Pattern | Description | Example |
|---|---|---|
| Fixed % escalation | Annual % on contract anniversary | "5% on every 1-Apr" |
| Step / tiered | Pre-scheduled absolute new rates | "Year 1 / Year 2 / Year 3" rates |
| Skill-band promotion | Worker moves grade, rate jumps | "Engineer → Senior Engineer ⇒ +20%" |
| Cap / floor | Revision bounded | "Capped at 7%, floor 3%" |
| Regulatory pass-through | Minimum-wage / DA revision | "DA hike applied as-is from notification date" |
| Exception | Out-of-schedule | Mid-cycle promotion, retention bump |

**Treatment on effective date** is per-engagement, defaulted from the contract:
- **Prospective from next cycle** (safest, default).
- **Pro-rated from effective date**.
- **Full-cycle at new rate** (rare; aligns when cycle = anniversary).

Each engagement carries a **Revision Schedule** with cadence, caps/floors, treatment, notice-period rules, and an audit trail. The pricing engine, on every cycle, asks: _"as of the cycle's date, what is the effective rate / grade for this worker?"_ and reads effective-dated entries to answer.

---

## 6. Worker Profile Snapshot — New Source of Truth for Identity

The Worker section in Fieldglass (and equivalent in BeeLine) carries far more than a timesheet — it is the **identity and lifecycle record** for a contracted worker. Buzzworks today reconstructs much of this from CSVs and emails, which is fragile.

Proposed model — **separate `worker_profiles` table with structured child tables for each tab on the Worker page**, plus a per-scrape JSONB snapshot for audit:

```
worker_profiles                       ← canonical "current state" of the worker
├── worker_assignments                ← one row per job posting / role over time
├── worker_documents                  ← contracts, IDs, certs (with expiry tracking)
├── worker_tasks                      ← onboarding / offboarding / compliance todos
├── worker_compliance                 ← BG check, drug test, training, expiries
├── worker_equipment                  ← laptops, badges, phones (asset lifecycle)
├── worker_approvers                  ← primary / backup / delegated approvers
└── worker_profile_snapshots          ← full JSONB capture per scrape (audit log)
```

#### Design principles

| Principle | Why it matters |
|---|---|
| One canonical row per worker in `worker_profiles` | Operational reads are fast; `employees` table backfills DOJ / manager / rate from here |
| Child tables for collections | Native filtering ("workers with docs expiring in 30 days") instead of JSONB-hunting |
| `raw JSONB` column on every child table | New portal fields land here untouched until we promote them to columns |
| `worker_profile_snapshots` with full per-scrape JSONB | Audit trail for rate changes, compliance lapses, manager changes — Type-2 SCD without the join pain |
| `scraped_at TIMESTAMPTZ` on every row | Data freshness; scope ETL backfills to "rows scraped this week" |
| UNIQUE constraints on natural keys | `ON CONFLICT DO UPDATE` makes sync idempotent — re-scrape is safe |

#### First feature unlocked — canonical Date of Joining

Buzzworks today shows DOJ in the dashboard sourced from CSV imports, which can drift from the portal source. Once `worker_profiles.start_date` is populated, a one-line ETL backfills `employees.start_date` everywhere on the dashboard:

```sql
UPDATE employees e
   SET start_date = wp.start_date, updated_at = NOW()
  FROM worker_profiles wp
 WHERE e.worker_id = wp.worker_id
   AND wp.start_date IS NOT NULL
```

After this, the Employee Detail page header, Employees list sort/filter, and tenure-based reports all pick up the canonical DOJ with no UI change.

> _Status:_ schema landed in commit `1136797`. Crawler + ingester scaffolded. Waiting on access to **one sample Fieldglass Worker page** from Buzzworks side so we can finalise tab parsers before running the full crawl.

---

## 7. Scope Items for the Automation

### 7.1 In-Scope (Phase 1 working assumption)

**Legend.** Priority: P1 = must-have for go-live, P2 = important / second wave, P3 = nice-to-have. Status: ☐ Pending review · ◐ Under discussion · ☑ Confirmed.

| # | Scope Item | Inclusions / Key Capabilities | Priority | Status |
|---|---|---|---|---|
| 1 | **Master Data — Customer Hierarchy** | Four-level model: Client → Engagement → Worker → Timesheet. Business-line tagging on every Engagement. | P1 | ☐ |
| 2 | **State-wise GSTIN Registry** | All GSTINs under each legal entity, with registered address and state code. Authoritative source for invoice issuance. | P1 | ☐ |
| 3 | **Worker-to-Posting-State Mapping** | Every worker carries a posting-state tag that resolves to the correct GSTIN at invoice time. | P1 | ☐ |
| 4 | **Engagement = Order Code** | Engagement is the unit of billing. Carries all commercial terms (rate, cadence, payment terms, currency, billing trigger) independent of contract. | P1 | ☐ |
| 5 | **Central Worker-Status DB** | Daily-updated, worker-level store of stage (Onboarded / Portal-Active / First-Approved), eligibility, hold flag, stage-transition history. Single source of truth for the billing engine. | P1 | ☐ |
| 6 | **Billing-Trigger Stage Management** | Per-worker billing trigger configuration. Cycle-time eligibility evaluation. Renegotiation workflow with auto credit-note, billing pause, and auto-resume. Stage flags internal-only. | P1 | ☐ |
| 7 | **Inbox — actionables triage** | Server-paginated, filtered, sorted timesheet feed. Bucket totals (actionable / flagged / OT). Drawer detail-on-demand. Auto-refresh on focus. _Status: shipped, commit `d3faadf`._ | P1 | ☑ |
| 7a | **Validation Rule Engine** | Per-engagement validation policy (weekly cap, OT pre-approval, leave inference, daily cap, weekend policy, status check). Validation score + per-rule result drives Inbox routing. _Partially shipped._ | P1 | ◐ |
| 7b | **Approval Workflow** | Auto-approve (configurable thresholds), bulk-approve quick rules, manual review queue, manager escalation for OT > cap, reject-with-reason templates. _Partially shipped._ | P1 | ◐ |
| 7c | **Bulk Actions** | Select-all-actionable, bulk approve, bulk flag, bulk reject, bulk notify. _Shipped._ | P1 | ☑ |
| 8 | **Employee / Worker Directory** | Server-paginated, filterable by client / city / status, trigram name search. Drawer with Overview / Timesheets / Risk / Leave tabs. _Shipped._ | P1 | ☑ |
| 9 | **Employee Calendar View** | Google-Calendar-style monthly view, approval-colored cells (green / orange / red), sliding month nav, today highlight. _Shipped, commit `85139d2`._ | P1 | ☑ |
| 10 | **Worker Profile Snapshot Ingestion** | Crawl Fieldglass / BeeLine Worker pages, capture all tabs (Overview, Job, Documents, Tasks, Compliance, Equipment, Approvers), upsert into `worker_profiles` + child tables, backfill canonical DOJ / manager / rate / status to `employees`. _Scaffold landed; awaiting one sample Worker page to harden parsers._ | P1 | ◐ |
| 11 | **Compliance Overlay** | TeamLease RegTech feed → per-state, per-worker compliance state (PF, ESIC, P-Tax registration, document expiry). Surfaces as calendar badge + Inbox category. | P2 | ◐ |
| 12 | **Tax Invoice Generation** | Per-engagement / per-cost-centre / per-state. State-wise GSTIN selection, CGST+SGST vs IGST resolution. HSN/SAC, IRN/Ack via integration with the existing invoicing tool. | P1 | ☐ |
| 13 | **Payroll Handoff** | Approved timesheets → structured payroll file / API. Engagement-configurable cadence (weekly / fortnightly / monthly). Audit trail of what was handed off, when, to whom. | P1 | ☐ |
| 14 | **AR Tracking — Receipt Capture & Application** | Capture receipts from bank statements / payment gateways / advices. Auto-match on invoice number / amount + manual override. Partial payments, advance payments, multi-invoice settlement. | P1 | ☐ |
| 14a | **AR Tracking — Dues Reconciliation** | Live "Open Invoices" ledger per client / engagement. TDS tracking (194-series). Short-payment / deduction / rounding handling. | P1 | ☐ |
| 14b | **AR Tracking — Aging & Outstanding** | Aging buckets (0–30 / 31–60 / 61–90 / 91–180 / 180+) at client, engagement, invoice levels. DSO per client and overall. | P1 | ☐ |
| 14c | **AR Tracking — Collections & Dunning** | Configurable reminder schedule, email templates per stage, collections case-management, dispute flag pauses dunning. | P1 | ☐ |
| 14d | **AR Tracking — Statement of Account** | Auto-generated SOAs at client / engagement level. Customer-facing share + confirmation capture. | P1 | ☐ |
| 14e | **AR Tracking — Adjustments & Write-offs** | Credit memo application, manual adjustments (with approval), bad-debt write-off workflow. | P2 | ☐ |
| 15 | **Reporting & Visibility** | Per-client KPIs (active workers, March/April payroll, expense invoiced/pending). Ops-Cost-by-Client home chart. AR dashboards. _Partially shipped._ | P1 | ◐ |
| 16 | **Customer Onboarding Checklist** | Structured capture per engagement of: billing entity, currency, PO required Y/N, contract present Y/N, billing trigger stage, invoice form/count preference, payment terms, billing frequency, state-GSTIN list, validation policy, auto-approve thresholds, manager / approver matrix, payroll handoff format. | P1 | ☐ |

### 7.2 Out of Scope (proposed — to confirm)

| # | Out-of-Scope Item | Why / Boundary | Status |
|---|---|---|---|
| 1 | **Sales CRM workflow** | HubSpot remains source of truth for the sales pipeline; integration is read-only into OpsDesk. | ☐ |
| 2 | **Worker mobile app** | Workers continue to use client VMS portals (Fieldglass / BeeLine) directly. OpsDesk is for the Buzzworks ops team. | ☐ |
| 3 | **Client manager-side approvals** | Client manager approvals happen in the client's VMS portal. OpsDesk consumes the approval status, doesn't replicate the approval UI. | ☐ |
| 4 | **Statutory filing (PF / ESIC / TDS returns)** | Continues via existing statutory tools (TeamLease / dedicated CA). OpsDesk surfaces compliance state and exceptions but does not file. | ☐ |
| 5 | **Detailed Permanent Staffing & Managed Services billing** | Deferred to a later revision; only top-level placement included in Phase 1. | ☐ |
| 6 | **Contract drafting / e-signature** | Tentatively out-of-scope — Buzzworks legal handles contracts today; OpsDesk ingests executed contracts. _To confirm._ | ◐ |

### 7.3 Open Questions to Close Before Detailed Design

#### General
- Central repository for POs & Contracts — does it exist, or do we build it?
- Pro-forma invoice approval flow — does one exist today?
- Engagement-level rate / discount variation rules — fully documented anywhere?
- How are "free workers", "BG-in-progress" workers, and "ad-hoc arrangements" governed and audited?
- Customer Master uniqueness — how managed across CRM and OpsDesk?
- Treatment of Lead ID / Deal ID / Service Period linkage across CRM and billing.

#### Worker Profile Snapshot (§6)
- Which Worker portal will you grant us a sample page for first — Capgemini Fieldglass, Accenture BeeLine, or both?
- How frequently should the crawler refresh (daily, weekly, on-demand)?
- For workers no longer on assignment, do we keep their last profile snapshot indefinitely or archive after N months?
- Permission model — who can view the full worker profile (managers, finance, ops) vs the public-facing card?

#### Approval workflow (§5.5)
- What's the default auto-approve threshold the business is comfortable with? (Current proposal: score ≥ 95.)
- For OT > 45 h, who is the canonical escalation contact when no manager is on file?
- Reject reason templates — who owns the canonical list, and how often does it change?
- Can a single approval rule vary across cost-centres within the same engagement?

#### Payroll handoff (§7.1 row 13)
- What format does the downstream payroll system expect — CSV (which schema?), API, SFTP drop?
- What cadence per client (weekly / fortnightly / monthly), and does cadence vary by worker grade within a client?
- What fields does payroll need beyond hours + rate (e.g., LWP days, bonus components, statutory deductions)?
- Cut-off timings — when in the cycle does payroll need the file, and what's the rule when a timesheet is approved after cut-off?

#### Compliance overlay (§7.1 row 11)
- Which TeamLease RegTech state-rules are P1 (PF, ESIC, P-Tax, Shops & Establishment)?
- For document expiries (PAN, Aadhaar, BGV, training certs), what's the alert lead-time the business wants?
- Who acts on compliance alerts — ops or a separate compliance team?

#### AR Tracking (§7.1 rows 14a-e)
- Receipt sources — which bank accounts / gateways feed today, and is there an API / daily statement?
- Auto-match confidence threshold — what's the bar before a match auto-applies vs queues for manual review?
- TDS — captured at invoice creation (provisional) or only at receipt (actual)? How is the difference reconciled?
- Credit limit per client — does Buzzworks maintain client credit limits today? Should the system block invoice issuance above limit?
- Existing AR data migration — what's the cut-over plan for open invoices / advances / credit balances on Day-1?

#### Customer hierarchy (§2.3)
- Can a single worker ever be shared across more than one engagement, or strictly bound to one?
- Are pay-rate revisions negotiated at client level (inherited by engagements) or independently per engagement?
- When an internal restructure happens (worker moves cost-centre), do we re-assign mid-cycle or from next cycle?
- For state-wise invoicing, is the choice fixed once at engagement onboarding or can it vary cycle-to-cycle?

#### Business-line specific _(placeholder — expanded in later revisions)_
- **Permanent Staffing:** placement fee — payable on candidate-joining or candidate-confirmation (post-probation)? Refund / replacement policy?
- **Managed Services:** per-employee per-month fee — tier structure? What's bundled vs separately billed?

---

## 8. Key Identifiers to Track (Glossary)

| Term | Meaning |
|---|---|
| Engagement | The central commercial spine — equivalent to "Order Code" in SI / Uno360 parlance |
| Worker ID | Buzzworks-issued employee code (e.g., `BZW…`) |
| Portal Worker ID | Worker ID issued by the client's VMS portal (e.g., `CGEMW00123` in Fieldglass) |
| TSN | Time Sheet Number — Fieldglass-issued ID for one weekly timesheet (e.g., `CGEMTS06633095`) |
| ESN | Expense Sheet Number — Fieldglass-issued ID for one expense submission (e.g., `CGEMES…`) |
| BeeLine | Accenture's VMS portal (used also by PwC India) |
| Fieldglass | SAP-owned VMS portal (used by Capgemini and several others) |
| VMS | Vendor Management System — the client-side portal where workers submit timesheets |
| BGV | Background Verification |
| LWP | Leave Without Pay |
| DSO | Days Sales Outstanding |
| TDS | Tax Deducted at Source |
| GBP-Live equivalent | "First-Approved" in our lifecycle — the first time a worker's timesheet is approved by the client manager |
| JARVIS | The OpsDesk validation / auto-approval agent (internal name) |
| ORACLE | The compliance agent (internal name) — consumes TeamLease RegTech corpus |

---

## 9. Next Steps

1. **Walkthrough with Buzzworks Ops + Finance** to validate §3 (lifecycle) and §4 (master data).
2. **Confirm scope boundaries** (§7.1 / 7.2) before we build the detailed functional spec.
3. **Collect samples** for any documents not yet shared — credit notes, payment advices, blanket POs, multi-currency invoices, and **at least one Worker page** from Fieldglass + BeeLine.
4. **Expand this draft into v0.2** with:
   - Detailed process maps per scope item.
   - Entity-relationship data model for the 8 stores.
   - Integration list (Fieldglass, BeeLine, HubSpot, banks, payroll system, TeamLease RegTech).
   - Edge-case catalogue.

---

_This is a v0.1 working document. Sections will be expanded into a full BRD/FSD in subsequent revisions._

# OpsDesk — Master Project Framework

**Product:** OpsDesk — Timesheet & Payroll Operations Dashboard  
**Owner:** Buzzworks Business Services  
**Status:** Phase 2 complete (UI + APIs) · Phase 3 in progress (docs, agents, Jira)  
**Last Updated:** 2026-04-10  

---

## 1. Product Overview

OpsDesk is an internal operations dashboard used exclusively by the Buzzworks ops team to:

- Monitor timesheet submissions from 25+ enterprise clients
- Validate submissions against client-specific HR policies (hours, overtime, leave, compliance)
- Manage two ingestion channels: **portal sync** (10 integrations) and **email** (`candidatemanager@buzzworks.com`)
- Run AI-assisted validation and auto-approval via a fleet of six named AI agents
- Process payroll batches and push approved amounts to finance
- Generate compliance reports for clients and internal SLAs

**Target Users:** Buzzworks ops team (Ops Lead, Ops Associates, Finance team)  
**Not for:** Employees or client HR teams (separate portals handle that)

---

## 2. Tech Stack

| Layer           | Technology                                      |
|-----------------|-------------------------------------------------|
| Framework       | Next.js 15 (App Router), TypeScript             |
| Styling         | Tailwind CSS + CSS Variables (Glassmorphism 2.0)|
| State           | React `useState` / `useMemo` (local state only) |
| Charts          | Recharts (Area, Bar, Pie, Radar)                |
| Icons           | Lucide React                                    |
| AI Layer        | Anthropic Claude (claude-3-5-sonnet) via SDK    |
| Mock APIs       | Next.js Route Handlers (`app/api/`)             |
| Data            | In-memory mock data (`lib/mock-data.ts`)        |
| Type safety     | TypeScript strict mode                          |

### Design System
- **Background:** `#09090e` (near-black)
- **Accent Teal:** `#00C896` / `#00D4A5`
- **Accent Violet:** `#8B5CF6`
- **Accent Coral:** `#FF6B6B`
- **Panel:** `backdrop-filter: blur(20px)` + `rgba(255,255,255,0.04)` glass
- **Font:** System sans-serif stack, monospace for codes/logs

---

## 3. Directory Structure

```
timesheet_explore/
├── app/
│   ├── layout.tsx              # Root layout (sidebar + main)
│   ├── page.tsx                # Overview dashboard
│   ├── timesheets/page.tsx     # Timesheet inbox
│   ├── clients/
│   │   ├── page.tsx            # Client list
│   │   └── [id]/page.tsx       # Client detail (5 tabs)
│   ├── employees/page.tsx      # Employee directory
│   ├── policy/page.tsx         # Policy engine + AI creator
│   ├── payroll/page.tsx        # Payroll batches
│   ├── reports/page.tsx        # Analytics & reports
│   ├── integrations/page.tsx   # Portal integrations
│   ├── agents/page.tsx         # AI agent fleet
│   └── api/
│       ├── portals/[portalId]/sync/route.ts
│       └── email/ingest/route.ts
├── components/
│   └── Sidebar.tsx
├── lib/
│   ├── types.ts                # All TypeScript interfaces
│   ├── mock-data.ts            # 25 clients, 10 portals, employees, timesheets
│   └── mock-generator.ts       # Seeded deterministic employee generator
├── docs/                       # ← This directory
│   ├── PROJECT_FRAMEWORK.md    # This file
│   ├── BRD.md
│   ├── PRD.md
│   ├── FPRD_CLIENT_MANAGEMENT.md
│   ├── FPRD_TIMESHEET_INGESTION.md
│   ├── FPRD_VALIDATION_ENGINE.md
│   ├── FPRD_POLICY_ENGINE.md
│   ├── FPRD_PAYROLL_PROCESSING.md
│   ├── FPRD_REPORTS_ANALYTICS.md
│   ├── FPRD_AI_AGENTS.md
│   └── JIRA_FRAMEWORK.md
└── public/
```

---

## 4. Module Inventory

| # | Module               | Route               | Status    | Key Capability                                   |
|---|----------------------|---------------------|-----------|--------------------------------------------------|
| 1 | Overview Dashboard   | `/`                 | Complete  | KPIs, trends, AI insights, queue snapshot        |
| 2 | Timesheet Inbox      | `/timesheets`       | Complete  | Filter, review, approve/reject timesheets        |
| 3 | Client Management    | `/clients`          | Complete  | 25 clients, detail page with 5 tabs              |
| 4 | Employee Directory   | `/employees`        | Complete  | 80+ employees, rich filters, leave indicators    |
| 5 | Policy Engine        | `/policy`           | Complete  | Per-client rules, AI policy creator              |
| 6 | Payroll Processing   | `/payroll`          | Complete  | Batch approve, OT breakdown, finance export      |
| 7 | Reports & Analytics  | `/reports`          | Complete  | AreaChart, PieChart, RadarChart, leaderboard     |
| 8 | Integrations         | `/integrations`     | Complete  | 10 portal cards, email ingestion, sync triggers  |
| 9 | AI Agent Fleet       | `/agents`           | Complete  | 6 agent profiles, live logs, auto-approval feed  |

---

## 5. Portal Integrations (Fictional Names)

| Slug          | Product Name    | Tier       | Auth    | Webhook | Avg Latency |
|---------------|-----------------|------------|---------|---------|-------------|
| `veltrix`     | Veltrix HCM     | Enterprise | OAuth2  | Yes     | 320ms       |
| `hrloop`      | HRLoop          | Business   | API Key | Yes     | 480ms       |
| `peoplehive`  | PeopleHive      | Business   | OAuth2  | Yes     | 410ms       |
| `orbithcm`    | OrbitHCM        | Enterprise | SAML    | No      | 1240ms      |
| `cloudspire`  | CloudSpire      | Enterprise | OAuth2  | No      | 1820ms      |
| `leafhr`      | LeafHR          | Business   | API Key | Yes     | 280ms       |
| `humanedge`   | HumanEdge       | Starter    | OAuth2  | Yes     | 390ms       |
| `payaxis`     | PayAxis         | Enterprise | OAuth2  | No      | 950ms       |
| `talentweave` | TalentWeave     | Enterprise | API Key | Yes     | 560ms       |
| `staffpulse`  | StaffPulse      | Business   | API Key | Yes     | 310ms       |

---

## 6. AI Agent Fleet

| Agent          | Domain                          | Status | Auto-Actions          |
|----------------|---------------------------------|--------|-----------------------|
| Agent Mark     | Timesheet Validation & Approval | Active | Auto-approve ≥95% conf|
| Agent Nova     | Anomaly Detection & Patterns    | Active | Flag + anomaly report |
| Agent Iris     | Email Parsing & Ingestion       | Active | Parse → hand to Mark  |
| Agent Vault    | Payroll Compliance Checker      | Active | Pre-audit batches     |
| Agent Lumen    | Policy Recommendation Engine    | Idle   | Draft policy rules    |
| Agent Trace    | Audit Trail & Risk Scoring      | Active | Log all events        |

---

## 7. Data Model Summary

### Key Types (`lib/types.ts`)
- `Client` — 25 clients across IT/BFSI/Healthcare/Staffing; includes portalId, complianceScore, monthlyPayroll
- `Employee` — Generated deterministically via seeded RNG; 16 job categories, 20 cities
- `Timesheet` — Source (portal/email/manual), status, daily entries, validation checks, AI confidence
- `PolicyRule` — Per-client, 6 categories, 3 severity levels, AI-generated flag
- `PayrollBatch` — Hour breakdown, OT multipliers, finance status workflow
- `Portal` — 10 integrations with sync metadata, auth method, feature list
- `AIInsight` — Priority-tagged insights from agent fleet

### Mock Data Scale
- **Clients:** 25 (7 large >5k, 12 mid 1k–5k, 6 small <1k)
- **Employees in memory:** 15 seed + generated on demand (seeded, deterministic)
- **Timesheets:** 11 (8 ops-reviewed + 3 Agent Mark auto-approved)
- **Policy rules:** 15 across 5 clients
- **Payroll batches:** 8

---

## 8. API Routes

### `POST /api/portals/[portalId]/sync`
Simulates portal webhook/poll. Returns deterministic timesheets for `(portalId, clientId, fromDate)`.
- Portal-specific latency simulation
- 1–8% error rate (429 rate limit response)
- Returns: timesheets[], summary, AI parsing metadata, next cursor

### `POST /api/email/ingest`
Simulates AI email parsing pipeline.
- Field extraction: employee name, hours, period, days present, LOP
- 5 policy checks: sender domain, attachment present, manager CC, hours range, forward detection
- Returns: extracted fields, validation checks, confidence score, recommendation

### `GET /api/portals/[portalId]/sync`
Health check — returns portal connection status, latency, API version.

### `GET /api/email/ingest`
Health check — returns inbox status, queue depth, parse counts.

---

## 9. Phase Roadmap

| Phase | Scope                                          | Status     |
|-------|------------------------------------------------|------------|
| 1     | Design system, layout shell, core data model  | Complete   |
| 2     | All 9 modules, mock APIs, 25 clients, 10 portals | Complete |
| 3     | Agents page, portal rename, BRD/PRD/FPRDs, Jira framework | In Progress |
| 4     | Real API integration (portal OAuth flows)     | Planned    |
| 5     | Production deployment + IMAP email pipeline   | Planned    |

---

## 10. Key Design Decisions

1. **Seeded deterministic employee generation** — Same `(clientId, index)` always returns the same employee. Enables large client employee counts (up to 15,000) without storing data.
2. **Portal names are fictional** — Not Darwinbox/Keka/SAP. Uses Veltrix/PeopleHive/OrbitHCM etc. to avoid trademark issues in demos.
3. **Agent Mark visible in inbox** — Timesheets auto-approved by Agent Mark show `approvedBy: "Agent Mark"` with timestamp and reasoning note, distinguishable from human approvals.
4. **Policy rules are client-specific** — No global rules. Every rule is scoped to a `clientId`, matching real-world enterprise consulting where each client contract defines its own HR policy.
5. **Email-only clients** — `emailOnly: true` flag on NCS (Nucleus Software). No portal sync; all timesheets come through Iris → email parsing pipeline.

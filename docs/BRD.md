# Business Requirements Document (BRD)
## OpsDesk — Timesheet & Payroll Operations Platform

**Document ID:** BRD-OD-001  
**Version:** 1.0  
**Status:** Approved  
**Date:** 2026-04-10  
**Owner:** Buzzworks Business Services · Ops Leadership  
**Prepared by:** Product & Technology Team  

---

## 1. Executive Summary

Buzzworks Business Services manages HR and payroll operations for 25+ enterprise clients, collectively employing over 95,000 contract and permanent staff across India. Each client has its own timesheet submission workflow (portal-based or email), its own HR policy set (hours caps, overtime rules, leave norms), and its own payroll processing SLA.

Today, this is managed through a fragmented combination of Excel sheets, email threads, and manual portal logins. The ops team spends 60–70% of its time on repetitive validation tasks that offer no strategic value. Errors slip through. SLAs are missed. Clients escalate.

**OpsDesk** is the unified internal operations platform that consolidates all 25 clients, both ingestion channels (portals + email), all policy validation, payroll processing, and compliance reporting into a single AI-assisted dashboard — built exclusively for the Buzzworks ops team.

---

## 2. Business Context

### 2.1 Company Background
Buzzworks Business Services is an HR operations company providing:
- Contract staffing & payroll processing
- Timesheet validation & compliance management
- Client-specific HR policy enforcement
- Monthly payroll disbursement to client employees

### 2.2 Current State (As-Is)

| Process                      | Current Method                          | Pain Point                                  |
|------------------------------|-----------------------------------------|---------------------------------------------|
| Timesheet collection         | Manual portal login per client          | 10 different portals, no single view        |
| Email timesheet handling     | Manual inbox monitoring                 | Missed emails, no audit trail               |
| Policy validation            | Manual Excel checklists                 | Human error, inconsistent across team       |
| Payroll calculation          | Excel-based hour × rate computation    | Calculation errors, no OT multiplier check  |
| Compliance reporting         | Ad-hoc Excel reports                   | Slow, inconsistent, client-specific formats |
| Escalation management        | Email thread + WhatsApp                 | No formal tracking, knowledge loss          |

### 2.3 Trigger for Change
- **Scale:** Client base grew from 8 to 25 in 18 months; ops team size grew from 2 to 4. Process has not scaled.
- **Error rate:** 3.2% payroll error rate in Q1 FY26, resulting in two client escalations.
- **SLA breach:** 12% of timesheets breached the 48-hour validation SLA in March 2026.
- **Competitive pressure:** Peer BPO firms are offering AI-assisted ops as a selling point.

---

## 3. Business Objectives

| ID   | Objective                                                                 | Success Metric                                      |
|------|---------------------------------------------------------------------------|-----------------------------------------------------|
| BO-1 | Consolidate all client timesheet ops into a single dashboard              | 100% of clients visible in OpsDesk within 90 days  |
| BO-2 | Reduce validation SLA breach rate to <2%                                  | <2% breach rate by Month 3 post-launch             |
| BO-3 | Auto-approve ≥70% of clean timesheets via AI (no human intervention)     | ≥70% auto-approval rate within Month 4             |
| BO-4 | Reduce payroll calculation errors to <0.5%                                | <0.5% error rate by Month 3                        |
| BO-5 | Provide clients with standardised compliance reports on demand            | Report generation in <30 seconds                   |
| BO-6 | Enable per-client policy management without developer involvement         | Ops team can create/edit policies via UI            |

---

## 4. Stakeholders

| Stakeholder             | Role                          | Interest in OpsDesk                                     |
|-------------------------|-------------------------------|---------------------------------------------------------|
| Ops Lead (Riya Shah)    | Primary user                  | Complete visibility, team workload, SLA tracking        |
| Ops Associate (×3)      | Daily users                   | Efficient queue processing, clear action prompts        |
| Finance Team            | Payroll consumers             | Accurate payroll batch exports                          |
| Client HR Contacts      | Indirect (via reports)        | Compliance score, timely processing, accurate payroll   |
| Employees (25+ clients) | Indirect                      | On-time, correct salary disbursement                    |
| CTO / Leadership        | Executive sponsors            | ROI, error reduction, scalability                       |
| AI Agent Fleet          | System stakeholder            | Well-defined policy rules and escalation criteria       |

---

## 5. Scope

### 5.1 In Scope

**Modules:**
1. Overview Dashboard — real-time KPIs and AI insights
2. Timesheet Inbox — validation queue with filter and review UI
3. Client Management — 25 client profiles with full ops context
4. Employee Directory — filterable across all clients
5. Policy Engine — per-client rules, AI-assisted policy creation
6. Payroll Processing — batch approval workflow
7. Reports & Analytics — period-based compliance and trend reports
8. Integrations — 10 portal connections + email ingestion
9. AI Agent Fleet — 6 named agents with profile and activity log

**Technical scope:**
- Next.js 15 App Router web application (internal, no public access)
- Mock API routes (Phase 2) → real API integrations (Phase 4)
- AI policy validation via Anthropic Claude claude-3-5-sonnet

### 5.2 Out of Scope (v1.0)
- Employee self-service portal (separate product)
- Client-facing dashboard (separate product roadmap)
- Mobile app
- Direct bank integration for payroll disbursement
- Multi-language support

---

## 6. Business Requirements

### BR-1: Unified Client View
The ops team must be able to see all 25 clients, their current compliance score, pending timesheet count, active portal integration, and monthly payroll value — from a single screen. Navigating to a client must reveal all timesheets, employees, active policies, and payroll batches for that client.

### BR-2: Dual Ingestion Channel Support
The platform must support two timesheet submission channels without requiring separate workflows:
- **Portal sync:** Automated pull/webhook from 10 integrated HR portals
- **Email ingestion:** Automated parsing of emails received at candidatemanager@buzzworks.com

### BR-3: Client-Specific Policy Enforcement
Every timesheet must be validated against the specific policy set of the client it belongs to. Policy rules must be configurable per client by the ops team without code changes. The system must clearly distinguish client policy versions.

### BR-4: AI-Assisted Validation and Auto-Approval
The AI layer (Agent Mark) must run a configurable validation suite on every incoming timesheet and auto-approve timesheets that meet all policy criteria with ≥95% confidence, without requiring human action. All auto-approvals must be auditable and reversible within a 48-hour window.

### BR-5: Payroll Accuracy Guarantees
Every payroll batch must pass a pre-audit check (Agent Vault) verifying hour calculations, OT multipliers, and LOP deductions before being marked ready for finance. Discrepancies must block batch approval.

### BR-6: Compliance Reporting
The ops team must be able to generate compliance reports per client, per period, showing timesheet volume, approval rate, policy violations, and turnaround time — in <30 seconds.

### BR-7: Audit Trail
Every action (submission, validation, approval, rejection, escalation, policy change) must be logged with timestamp, actor (human or agent name), and rationale. The audit trail must be immutable and exportable.

### BR-8: SLA Management
The platform must track validation SLA per client (24–72 hours depending on contract). Timesheets approaching or breaching SLA must be surfaced prominently on the dashboard with urgency indicators.

---

## 7. Constraints

| Constraint              | Detail                                                                 |
|-------------------------|------------------------------------------------------------------------|
| Internal use only       | No public-facing deployment. Internal network / VPN access.            |
| Data residency          | All data must remain within India (AWS Mumbai or Azure Central India). |
| AI model selection      | Anthropic Claude only (existing enterprise agreement).                 |
| Budget                  | Phase 1–3 within existing technology budget; Phase 4 requires approval.|
| Team size               | 2 engineers + 1 product manager for Phase 1–3.                        |
| Jira (free tier)        | Documentation and task tracking on Jira Free (10 users max).          |

---

## 8. Assumptions

1. Portal APIs (Veltrix, HRLoop, etc.) are available and will provide OAuth or API key credentials.
2. The IMAP account `candidatemanager@buzzworks.com` will be accessible by the application server.
3. Client HR contacts will continue using their existing portals; OpsDesk does not replace client systems.
4. All 25 clients have agreed (in principle) to Buzzworks using AI to validate timesheets.
5. Existing payroll calculation logic (Excel-based) will be migrated to the system in Phase 3.

---

## 9. Dependencies

| Dependency               | Owner              | Risk if Delayed                           |
|--------------------------|--------------------|-------------------------------------------|
| Portal API credentials   | Client IT teams    | Portal sync delayed; manual fallback needed|
| Anthropic API access     | Technology team    | AI validation blocked; manual review only |
| Policy rule migration    | Ops Lead           | Validation runs without client-specific rules|
| IMAP server config       | IT/Infrastructure  | Email ingestion channel unavailable        |

---

## 10. Success Criteria

| Metric                          | Baseline (Apr 2026) | Target (Month 3)  |
|---------------------------------|---------------------|-------------------|
| Validation SLA breach rate      | 12%                 | <2%               |
| AI auto-approval rate           | 0%                  | ≥70%              |
| Payroll calculation error rate  | 3.2%                | <0.5%             |
| Time to validate (avg)          | 4.2 hours           | <1 hour           |
| Ops team capacity freed         | —                   | 50% of manual work|
| Client escalations (payroll)    | 2 per quarter       | 0                 |

# Jira Upload Framework
## OpsDesk — Team Visibility & Story Management

**Document ID:** JIRA-OD-001  
**Version:** 1.0  
**Date:** 2026-04-10  
**Platform:** Jira Free (up to 10 users)  
**Project Key:** OPSD  

---

## 1. Overview

This document defines the structure, naming conventions, templates, and upload sequence for creating and maintaining OpsDesk's Jira project. It is designed to maximise clarity and traceability within the constraints of the Jira Free tier.

---

## 2. Project Setup

### 2.1 Project Configuration
- **Project name:** OpsDesk
- **Project key:** OPSD
- **Project type:** Scrum (use the free Scrum board)
- **Issue scheme:** Epic → Story → Subtask (3 levels; Jira Free supports this natively)

### 2.2 Board View
- Use **Board** view for sprint management
- Use **Backlog** view for grooming and prioritisation
- Create a **Roadmap** view (free tier supports this) for phase visibility

---

## 3. Epic → Story → Subtask Hierarchy

Each OpsDesk module maps to a Jira Epic. Each Feature Requirement (FR) maps to a Story. Each Sub-FR maps to a Subtask.

```
Epic: OPSD-MODULE  (e.g., OPSD-INBOX)
  └── Story: OPSD-FR-001  (e.g., Dual Ingestion Channel)
        ├── Subtask: Portal ingestion normalisation
        ├── Subtask: Email ingestion via IMAP + Iris
        └── Subtask: Manual entry UI
```

### 3.1 Epic Mapping

| Epic Key      | Epic Name                    | FPRD Reference       | Priority |
|---------------|------------------------------|----------------------|----------|
| OPSD-E01      | Overview Dashboard           | FPRD-OD-001          | P0       |
| OPSD-E02      | Timesheet Ingestion & Inbox  | FPRD-OD-002          | P0       |
| OPSD-E03      | Client Management            | FPRD-OD-003          | P0       |
| OPSD-E04      | Employee Directory           | FPRD-OD-004          | P1       |
| OPSD-E05      | Policy Engine                | FPRD-OD-005          | P1       |
| OPSD-E06      | Payroll Processing           | FPRD-OD-006          | P1       |
| OPSD-E07      | Reports & Analytics          | FPRD-OD-007          | P1       |
| OPSD-E08      | Integrations                 | FPRD-OD-008          | P1       |
| OPSD-E09      | AI Agent Fleet               | FPRD-OD-009          | P1       |
| OPSD-E10      | Infrastructure & APIs        | —                    | P0       |

---

## 4. Story Template

Use this template for every Story created in Jira. Copy into the Jira description field using Jira's text formatting (or wiki markup).

```
h2. User Story
*As* [role],
*I want* [capability],
*So that* [outcome].

h2. Context
[1–2 sentences explaining why this story matters and what triggers it in the ops workflow.]

h2. Acceptance Criteria
* [Criterion 1 — testable, specific]
* [Criterion 2]
* [Criterion 3]
* [Criterion N]

h2. Design Guidelines
See attachment: [Screen Name] - [Story ID] - Design.png
Design token reference: see docs/PROJECT_FRAMEWORK.md §2 Design System
Key colours:
- Teal #00C896 — positive state, active, approved
- Coral #FF6B6B — warning, flag, error
- Violet #8B5CF6 — AI / agent-generated
- Amber #F5A623 — OT, held, pending
- Background #09090e

h2. Tech Guidelines
- Route: [Next.js route, e.g., app/timesheets/page.tsx]
- Component: [Component name]
- Data source: [lib/mock-data.ts → real API in Phase 4]
- State: [useState / useMemo / no state]
- Key types: [TypeScript interfaces from lib/types.ts]
- API dependency: [If any — route and method]

h2. Related
- FPRD: [Document ID and section]
- Epic: [OPSD-EXX]
- Design: [Figma link or attachment name]

h2. Out of Scope
- [What is explicitly NOT included in this story]
```

---

## 5. Subtask Template

```
Subtask title: [OPSD-SXX] [Short action phrase, e.g., "Build portal card grid"]

Description:
[1–2 sentences describing the specific implementation task.]

Definition of Done:
* Code written and reviewed
* TypeScript: zero errors (npx tsc --noEmit)
* Renders correctly at 1440px and 1280px
* No console errors
* Mock data used (real API deferred to Phase 4)

Tech notes:
[Specific file, function, or API to modify]
```

---

## 6. Label Taxonomy

Labels (free tier supports unlimited labels) — use these consistently:

| Label           | Use for                                          |
|-----------------|--------------------------------------------------|
| `p0`            | Must-have for launch                             |
| `p1`            | High priority, first sprint after launch         |
| `p2`            | Nice to have, second sprint                      |
| `p3`            | Future consideration                             |
| `ai-agent`      | Story involves AI agent logic or display         |
| `portal-sync`   | Story involves portal integration                |
| `email-ingest`  | Story involves email parsing                     |
| `policy-engine` | Story involves policy rules                      |
| `payroll`       | Story involves payroll calculation or batches    |
| `ui-only`       | No backend logic; pure UI/display story          |
| `api-required`  | Requires a new or modified API route             |
| `phase-2`       | In scope for Phase 2 (current)                  |
| `phase-3`       | In scope for Phase 3 (docs + agents)            |
| `phase-4`       | Real API integration phase                       |
| `bug`           | Defect / regression                              |
| `debt`          | Technical debt to address                        |

---

## 7. Component Taxonomy

Create these components in Jira (Project Settings → Components):

| Component         | Description                                    |
|-------------------|------------------------------------------------|
| Dashboard         | Overview page, KPIs, trend charts              |
| Inbox             | Timesheet inbox, filter, review, actions       |
| Clients           | Client list and detail pages                   |
| Employees         | Employee directory and filters                 |
| Policy            | Policy engine, rule cards, AI creator          |
| Payroll           | Payroll batch approval and history             |
| Reports           | Analytics and compliance reporting             |
| Integrations      | Portal cards, email integration, sync triggers |
| Agents            | AI agent fleet page and agent profiles         |
| API               | Next.js route handlers                         |
| Data Layer        | Types, mock data, generator                    |
| Design System     | Global CSS, tokens, layout shell               |

---

## 8. Sprint Planning Guide

### Sprint 0 (Setup — 1 week)
- Set up Next.js project
- Implement design system (tokens, layout shell, Sidebar)
- Create type definitions (`lib/types.ts`)
- Seed mock data (`lib/mock-data.ts`)
- Stories: OPSD-E01 setup, OPSD-E10 infrastructure

### Sprint 1 (Core Ops — 2 weeks)
- Timesheet Inbox (all FR-INBOX stories)
- Client list + overview tab
- Policies in Force tab
- Stories from: OPSD-E02, OPSD-E03

### Sprint 2 (Operations Depth — 2 weeks)
- Employee Directory
- Policy Engine + AI creator
- Payroll Processing
- Stories from: OPSD-E04, OPSD-E05, OPSD-E06

### Sprint 3 (Intelligence — 2 weeks)
- Reports & Analytics
- Integrations page
- AI Agent Fleet page
- Stories from: OPSD-E07, OPSD-E08, OPSD-E09

### Sprint 4 (APIs + Docs — 1 week)
- Mock API routes (portals + email)
- BRD / PRD / FPRDs
- Jira framework upload
- Phase 3 review

---

## 9. Design Guideline Attachment Strategy

Since Jira Free does not include Figma integration, use this attachment workflow:

### For each module:
1. Take a full-page screenshot of the working UI (1440px viewport)
2. Name it: `[Module] - [Story ID] - [State].png`  
   Example: `Inbox - OPSD-E02-S01 - Flagged State.png`
3. Attach to the relevant Story in Jira
4. In the Story description, reference: `See attachment: [filename]`

### Key screenshots to capture:
- Default / loaded state
- Empty state
- Error state (if applicable)
- Agent Mark badge state (for inbox/agents)
- Mobile breakpoint (if applicable)

### Design tokens to include in every story:
```
Background:    #09090e
Panel:         rgba(255,255,255,0.04) + blur(20px)
Text primary:  #ffffff
Text muted:    rgba(255,255,255,0.40)
Teal:          #00C896 / #00D4A5
Violet:        #8B5CF6
Coral:         #FF6B6B
Amber:         #F5A623
Border:        rgba(255,255,255,0.07)
Border hover:  rgba(255,255,255,0.12)
Radius card:   1rem (16px)
Radius small:  0.75rem (12px)
```

---

## 10. Tech Guideline Attachment Strategy

For each Story that involves code:

1. Link to the relevant FPRD section in the story description
2. Specify the exact file(s) to create or modify
3. Include the TypeScript types involved
4. Note the mock data path vs. future real API path
5. Attach a code snippet or pseudocode for complex logic (paste as code block in Jira description)

### Example Tech Block (Story: FR-INBOX-04 Detail Panel):

```
File: app/timesheets/page.tsx (or new component)
Types: Timesheet, ValidationCheck, DailyEntry (lib/types.ts)
Data: timesheets array (lib/mock-data.ts)
State: selectedTimesheetId: string | null (useState)
Pattern: Inline panel expansion (not a modal)
Agent Mark condition: timesheet.approvedBy === "Agent Mark"
API: None (Phase 2 — mock data only)
Phase 4 API: GET /api/timesheets/:id
```

---

## 11. Full Story Upload Sequence

Upload stories to Jira in this order (prioritised by dependency):

**Batch 1 (P0 — Infrastructure):**
1. OPSD-E10-S01: Project setup and design system
2. OPSD-E10-S02: TypeScript types and mock data
3. OPSD-E10-S03: Sidebar and layout shell

**Batch 2 (P0 — Core):**
4. OPSD-E02-S01: Timesheet ingestion (dual channel)
5. OPSD-E02-S02: Inbox filter and sort
6. OPSD-E02-S03: Timesheet list row
7. OPSD-E02-S04: Timesheet detail panel
8. OPSD-E02-S05: Approval / rejection workflow
9. OPSD-E03-S01: Client list view
10. OPSD-E03-S02: Client overview tab
11. OPSD-E03-S03: Policies in Force tab

**Batch 3 (P1 — Depth):**
12. OPSD-E04-S01: Employee directory with filters
13. OPSD-E05-S01: Policy engine and rule cards
14. OPSD-E05-S02: AI policy creator (Agent Lumen)
15. OPSD-E06-S01: Payroll batch approval
16. OPSD-E07-S01: Reports and analytics charts

**Batch 4 (P1 — Intelligence):**
17. OPSD-E08-S01: Portal integration cards
18. OPSD-E08-S02: Email ingestion card
19. OPSD-E09-S01: Agent fleet dashboard
20. OPSD-E09-S02: Agent Mark auto-approval feed
21. OPSD-E09-S03: Agent detail panel and controls

---

## 12. Jira Free Tier Constraints & Workarounds

| Constraint                        | Workaround                                                    |
|-----------------------------------|---------------------------------------------------------------|
| No advanced roadmap (paid)        | Use Jira's built-in Timeline view (available free)            |
| No Figma integration (paid)       | Attach screenshots directly to stories                        |
| No custom issue types beyond Epic/Story/Subtask | Use labels to sub-categorise (ui-only, api-required, etc.) |
| No automation rules (paid)        | Manual status updates; use Discord/Slack for notifications    |
| 10 user limit                     | Reserve seats for: Ops Lead, 3 Ops Associates, 2 Engineers, PM, Finance Lead, CTO, QA |
| No advanced permissions           | Use single project; rely on team discipline for access        |
| No time tracking (paid)           | Use story points (0.5 / 1 / 2 / 3 / 5 / 8) for estimation   |

### Story Point Reference
| Points | Meaning                              |
|--------|--------------------------------------|
| 0.5    | Trivial change (<1h)                 |
| 1      | Small task (half day)                |
| 2      | Medium task (1 day)                  |
| 3      | Medium-large (1.5 days)              |
| 5      | Large (2–3 days)                     |
| 8      | XLarge (1 week; consider splitting)  |

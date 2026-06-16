# Email to Buzzworks Leadership

**Subject:** OpsDesk — Phase-1 Understanding & Scope (Draft v0.1) + 30-min walkthrough invite

---

Hi [First names],

Following our discovery conversations and the MVP we've shipped on `dev.era.ai` over the last few weeks, I've put together a v0.1 **Understanding & Scope** document covering the Contract Staffing line — the timesheet → approval → invoice → payroll → AR-tracking cycle. The aim is to lock alignment on the lifecycle, the master data, the customer hierarchy (Client → Engagement → Worker → Timesheet), the validation / approval constructs, and the Phase-1 in-scope / out-of-scope boundaries before we expand into the detailed functional spec.

A short snapshot of where we are today:

- **Inbox, Employees, Client and Home pages live** on `dev.era.ai` with server-paginated APIs, trigram search, status-coloured Google-Calendar-style monthly view per worker, and bulk-approval rules.
- **~3,400 timesheets and ~24K daily entries** ingested across Capgemini, Accenture, Hexaware, LTIMindtree and PwC India via Fieldglass + BeeLine.
- **Worker Profile schema and crawler** scaffolded — the next milestone is sourcing canonical Date-of-Joining (and the manager / rate / status hierarchy) directly from the VMS Worker page so it flows everywhere on the dashboard.

The attached draft has the lifecycle, the data architecture, the in-scope / out-of-scope matrix, and a section of open questions we'd like to close together (auto-approval thresholds, OT-escalation matrix, payroll-handoff format, compliance overlay priority).

I'm proposing a **30-minute working session** — live walkthrough first, then we go through the scope and open questions together. Calendar invite to follow; please feel free to suggest a slot that works.

Looking forward to your feedback.

Warm regards,
**Siddharth Kirtikar**
Kirtikar Consulting

**Attached:** _OpsDesk — Workforce & Timesheet Automation, Understanding & Scope (Draft v0.1)._

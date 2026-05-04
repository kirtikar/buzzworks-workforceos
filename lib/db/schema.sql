-- Agent Dashboard schema — minimal, only fields actually rendered in
-- Inbox/Timesheets row + drawer. Currently scoped to Accenture (clientId='acc')
-- but client_id is a column so we can extend to other portals later.

CREATE TABLE IF NOT EXISTS employees (
  id              TEXT PRIMARY KEY,
  worker_id       TEXT NOT NULL,
  client_id       TEXT NOT NULL,
  name            TEXT NOT NULL,
  employee_code   TEXT NOT NULL,
  email           TEXT NOT NULL,
  role            TEXT,
  department      TEXT,
  manager_email   TEXT,
  manager_name    TEXT,
  avatar_color    TEXT,
  start_date      DATE,
  earned_leaves   NUMERIC(6,2) NOT NULL DEFAULT 0,
  consumed_leaves NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, worker_id)
);

-- Universal-employee additions: test/real flag + canonical pay fields so
-- /api/clients/stats can compute live activeEmployeeCount + monthlyPayroll
-- from one query across both synthetic and real-data clients.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_test_data    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS rate_per_hour   NUMERIC(10,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_mode        TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_rate        NUMERIC(12,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_employees_client_test ON employees(client_id, is_test_data);

-- Trigram search on employee name + email — used by the Employees and Inbox
-- pages' search box (server-side ILIKE %q% becomes index-eligible).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_employees_name_trgm  ON employees USING gin (name  gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_email_trgm ON employees USING gin (email gin_trgm_ops);

CREATE TABLE IF NOT EXISTS timesheets (
  id                TEXT PRIMARY KEY,
  employee_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  client_id         TEXT NOT NULL,
  period            TEXT,
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  submitted_at      TIMESTAMPTZ,
  source            TEXT NOT NULL DEFAULT 'portal',
  source_detail     TEXT,
  portal_id         TEXT,
  status            TEXT NOT NULL,
  total_hours       NUMERIC(6,2) NOT NULL,
  regular_hours     NUMERIC(6,2) NOT NULL,
  overtime_hours    NUMERIC(6,2) NOT NULL,
  leave_hours       NUMERIC(6,2) NOT NULL,
  total_payable     NUMERIC(12,2),
  validation_score  INTEGER NOT NULL,
  flag_reason       TEXT,
  flagged_by        TEXT,
  approved_by       TEXT,
  approved_at       TIMESTAMPTZ,
  ai_confidence     INTEGER,
  ot_payout_cycle   TEXT,                    -- 'current' or 'next'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Note: UNIQUE (employee_id, period_start) was dropped because
  -- Fieldglass issues multiple TSNs per worker per week (revisions /
  -- amendments). Each TSN is its own row; UI dedups by latest revision.
);

-- Deep link back to the source portal's detail page (Fieldglass time-sheet
-- detail, BeeLine timecard view, etc.). Day-wise data not bulk-exportable
-- from some portals; UI surfaces this URL so ops can drill in directly.
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS external_url TEXT;

CREATE INDEX IF NOT EXISTS idx_timesheets_client_status ON timesheets(client_id, status);
CREATE INDEX IF NOT EXISTS idx_timesheets_period ON timesheets(period_start DESC);
-- Inbox sort+filter path: ORDER BY period_start DESC scoped by client_id (and
-- often filtered by status). Composite covers the common case efficiently.
CREATE INDEX IF NOT EXISTS idx_timesheets_client_period_status ON timesheets(client_id, period_start DESC, status);
-- Employee detail page: per-employee history sorted by period.
CREATE INDEX IF NOT EXISTS idx_timesheets_employee_period ON timesheets(employee_id, period_start DESC);
-- OT-only filter selectivity (~10% of rows) — partial index keeps it small.
CREATE INDEX IF NOT EXISTS idx_timesheets_ot ON timesheets(client_id) WHERE overtime_hours > 0;

CREATE TABLE IF NOT EXISTS daily_entries (
  timesheet_id   TEXT NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  entry_date     DATE NOT NULL,
  day_of_week    TEXT NOT NULL,
  regular_hours  NUMERIC(4,2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(4,2) NOT NULL DEFAULT 0,
  leave_hours    NUMERIC(4,2) NOT NULL DEFAULT 0,
  leave_type     TEXT,
  PRIMARY KEY (timesheet_id, entry_date)
);

CREATE TABLE IF NOT EXISTS timesheet_validations (
  timesheet_id  TEXT NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  rule_id       TEXT NOT NULL,
  category      TEXT NOT NULL,
  rule          TEXT NOT NULL,
  result        TEXT NOT NULL,
  detail        TEXT NOT NULL,
  PRIMARY KEY (timesheet_id, rule_id)
);

-- Expense sheets are a separate Fieldglass artifact (CGEMES… ids vs the
-- CGEMTS… for timesheets). One row per submitted expense; reimbursable
-- to the worker once invoiced. employee_id FK matches the timesheet
-- import (Fieldglass uses the same Worker resolution).
CREATE TABLE IF NOT EXISTS expense_sheets (
  id              TEXT PRIMARY KEY,
  employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  client_id       TEXT NOT NULL,
  worker_name     TEXT,
  site            TEXT,
  buyer           TEXT,
  submitted_at    DATE,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'INR',
  status          TEXT NOT NULL,                          -- "Invoiced" | "Pending Approval" | etc
  revision        INTEGER NOT NULL DEFAULT 0,
  source_detail   TEXT,                                   -- "Fieldglass · CGEMES…"
  external_url    TEXT,                                   -- detail-page deep link
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_sheets_client_status ON expense_sheets(client_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_sheets_employee     ON expense_sheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_sheets_submitted    ON expense_sheets(submitted_at DESC);

-- ─── Worker profile (Fieldglass Worker page snapshot) ───────────────────────
--
-- Canonical "who is this worker" data sourced from the Fieldglass Worker
-- detail page. Child tables capture per-tab collections (assignments,
-- documents, tasks, compliance, equipment, approvers). Each table has a
-- `raw JSONB` safety net so newly-added FG fields land somewhere even
-- before we promote them to columns. `worker_profile_snapshots` stores
-- the full per-scrape capture for audit / SCD-style change tracking.

CREATE TABLE IF NOT EXISTS worker_profiles (
  worker_id        TEXT PRIMARY KEY,
  client_id        TEXT NOT NULL,
  -- Identity
  name             TEXT,
  email            TEXT,
  phone            TEXT,
  alt_phone        TEXT,
  -- Address (current)
  address_line1    TEXT,
  address_line2    TEXT,
  city             TEXT,
  state            TEXT,
  postal_code      TEXT,
  country          TEXT,
  -- Personal (privacy-sensitive — store only what we surface)
  date_of_birth    DATE,
  gender           TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  -- Lifecycle
  start_date       DATE,                                   -- canonical DOJ
  end_date         DATE,
  status           TEXT,                                   -- "Active" | "Ended" | "On Hold"
  employment_type  TEXT,
  -- Reporting hierarchy
  manager_name     TEXT,
  manager_email    TEXT,
  alt_approver_name  TEXT,
  alt_approver_email TEXT,
  -- Job
  job_title        TEXT,
  job_category     TEXT,
  job_seniority    TEXT,
  cost_center      TEXT,
  department       TEXT,
  -- Site
  site             TEXT,
  site_address     TEXT,
  -- Rates
  bill_rate        NUMERIC(10,2),
  pay_rate         NUMERIC(10,2),
  currency         TEXT,
  rate_unit        TEXT,                                   -- "hour" | "day" | "month"
  -- Buyer
  buyer            TEXT,
  buyer_contact    TEXT,
  -- Provenance
  external_url     TEXT,
  raw_overview     JSONB,                                  -- last scraped Overview tab K/V
  scraped_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_client        ON worker_profiles(client_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_client_status ON worker_profiles(client_id, status);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_manager       ON worker_profiles(manager_email);

CREATE TABLE IF NOT EXISTS worker_assignments (
  id               BIGSERIAL PRIMARY KEY,
  worker_id        TEXT NOT NULL REFERENCES worker_profiles(worker_id) ON DELETE CASCADE,
  client_id        TEXT NOT NULL,
  job_posting_id   TEXT,                                   -- FG job posting / requisition ID
  job_title        TEXT,
  start_date       DATE,
  end_date         DATE,
  bill_rate        NUMERIC(10,2),
  pay_rate         NUMERIC(10,2),
  currency         TEXT,
  cost_center      TEXT,
  manager_name     TEXT,
  manager_email    TEXT,
  site             TEXT,
  status           TEXT,
  raw              JSONB,
  scraped_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (worker_id, job_posting_id, start_date)
);
CREATE INDEX IF NOT EXISTS idx_worker_assignments_worker  ON worker_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_assignments_active  ON worker_assignments(client_id, status);

CREATE TABLE IF NOT EXISTS worker_documents (
  id               BIGSERIAL PRIMARY KEY,
  worker_id        TEXT NOT NULL REFERENCES worker_profiles(worker_id) ON DELETE CASCADE,
  document_id      TEXT,                                   -- FG document ID
  name             TEXT,
  category         TEXT,                                   -- "Contract" | "ID Proof" | …
  status           TEXT,                                   -- "Approved" | "Pending Review"
  uploaded_at      DATE,
  expiry_date      DATE,
  uploaded_by      TEXT,
  external_url     TEXT,
  raw              JSONB,
  scraped_at       TIMESTAMPTZ NOT NULL,
  UNIQUE (worker_id, document_id)
);
CREATE INDEX IF NOT EXISTS idx_worker_documents_worker  ON worker_documents(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_documents_expiry  ON worker_documents(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS worker_tasks (
  id               BIGSERIAL PRIMARY KEY,
  worker_id        TEXT NOT NULL REFERENCES worker_profiles(worker_id) ON DELETE CASCADE,
  task_id          TEXT,                                   -- FG task ID
  category         TEXT,                                   -- "Onboarding" | "Offboarding" | "Compliance"
  name             TEXT,
  description      TEXT,
  status           TEXT,                                   -- "Pending" | "Completed" | "Overdue"
  due_date         DATE,
  completed_at     TIMESTAMPTZ,
  assigned_to      TEXT,
  raw              JSONB,
  scraped_at       TIMESTAMPTZ NOT NULL,
  UNIQUE (worker_id, task_id)
);
CREATE INDEX IF NOT EXISTS idx_worker_tasks_status ON worker_tasks(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_worker_tasks_due    ON worker_tasks(due_date) WHERE due_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS worker_compliance (
  id               BIGSERIAL PRIMARY KEY,
  worker_id        TEXT NOT NULL REFERENCES worker_profiles(worker_id) ON DELETE CASCADE,
  check_id         TEXT,
  name             TEXT,                                   -- "Background Check", "Drug Test", …
  status           TEXT,                                   -- "Cleared" | "Pending" | "Failed"
  result_date      DATE,
  expiry_date      DATE,
  external_url     TEXT,
  raw              JSONB,
  scraped_at       TIMESTAMPTZ NOT NULL,
  UNIQUE (worker_id, check_id)
);
CREATE INDEX IF NOT EXISTS idx_worker_compliance_expiry ON worker_compliance(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS worker_equipment (
  id               BIGSERIAL PRIMARY KEY,
  worker_id        TEXT NOT NULL REFERENCES worker_profiles(worker_id) ON DELETE CASCADE,
  asset_id         TEXT,
  asset_type       TEXT,                                   -- "Laptop" | "Phone" | "Badge"
  asset_name       TEXT,
  serial_number    TEXT,
  issued_at        DATE,
  returned_at      DATE,
  status           TEXT,
  raw              JSONB,
  scraped_at       TIMESTAMPTZ NOT NULL,
  UNIQUE (worker_id, asset_id)
);

CREATE TABLE IF NOT EXISTS worker_approvers (
  id               BIGSERIAL PRIMARY KEY,
  worker_id        TEXT NOT NULL REFERENCES worker_profiles(worker_id) ON DELETE CASCADE,
  role             TEXT,                                   -- "Primary" | "Backup" | "Cost Center Owner"
  name             TEXT,
  email            TEXT,
  scraped_at       TIMESTAMPTZ NOT NULL,
  UNIQUE (worker_id, role, email)
);

-- Snapshot history: full JSONB capture per scrape for audit + change tracking.
-- Lets us answer "how did this worker's rate / manager change over time?"
-- without bloating the canonical row tables.
CREATE TABLE IF NOT EXISTS worker_profile_snapshots (
  id               BIGSERIAL PRIMARY KEY,
  worker_id        TEXT NOT NULL,
  snapshot_at      TIMESTAMPTZ NOT NULL,
  raw              JSONB NOT NULL,
  raw_html         TEXT,
  UNIQUE (worker_id, snapshot_at)
);
CREATE INDEX IF NOT EXISTS idx_worker_snapshots_worker ON worker_profile_snapshots(worker_id, snapshot_at DESC);

CREATE TABLE IF NOT EXISTS import_runs (
  id               BIGSERIAL PRIMARY KEY,
  source           TEXT NOT NULL,
  client_id        TEXT NOT NULL,
  imported_by      TEXT,
  row_count        INTEGER NOT NULL,
  error_count      INTEGER NOT NULL DEFAULT 0,
  warning_count    INTEGER NOT NULL DEFAULT 0,
  errors           JSONB,
  warnings         JSONB,
  unmapped_headers TEXT[],
  imported_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

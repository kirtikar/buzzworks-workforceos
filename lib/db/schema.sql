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
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_timesheets_client_status ON timesheets(client_id, status);
CREATE INDEX IF NOT EXISTS idx_timesheets_period ON timesheets(period_start DESC);

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

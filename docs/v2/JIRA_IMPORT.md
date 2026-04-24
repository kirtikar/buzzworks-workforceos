# Jira Import Guide — `STORIES.csv`

This file lists 12 epics and 143 stories. Every row is one Jira issue.
Below: how to import in ~5 minutes via Jira's CSV bulk-import, plus
field mapping notes for non-default Jira fields and a manual JSON-API
fallback for restricted-import environments.

---

## 1. CSV file

**Path:** `docs/v2/STORIES.csv`
**Encoding:** UTF-8
**Delimiter:** comma
**Quote char:** double-quote
**Multi-line values:** fields containing literal newlines (the
Acceptance Criteria column) are wrapped in double-quotes; Jira's
import handles these correctly.

**Columns** (order matters):

```
Issue Type | Summary | Description | Epic Name | Epic Link |
Story Points | Status | Priority | Labels | Acceptance Criteria
```

---

## 2. Field semantics

| Column              | Notes                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Issue Type          | One of `Epic`, `Story`. (No tasks/subtasks/bugs in this import.)                                                       |
| Summary             | Issue title (≤ 80 chars).                                                                                              |
| Description         | For Story rows: user-story narrative ("As X I want Y so Z"). For Epic rows: 1-2 line scope statement.                  |
| Epic Name           | **Set ONLY on Epic rows.** Used internally by Jira to anchor `Epic Link` from Story rows. Empty on Story rows.         |
| Epic Link           | **Set ONLY on Story rows.** Value must match an Epic Name string. Empty on Epic rows.                                  |
| Story Points        | Fibonacci (1, 2, 3, 5, 8, 13). Empty for Epic rows in this import.                                                     |
| Status              | One of `Done`, `In Progress`, `To Do`. Most stories are `Done` (already shipped). v3 / open-question items are `To Do`. |
| Priority            | One of `Highest`, `High`, `Medium`, `Low`.                                                                             |
| Labels              | Space-separated. Examples: `inbox-timesheets jarvis bulk`. No commas.                                                  |
| Acceptance Criteria | Bulleted list, literal `\n`-separated. Wrapped in quotes by CSV writer.                                                |

---

## 3. Bulk import — step-by-step

### 3.1 Prerequisites

- You have a Jira project (Software / Scrum / Kanban — any will work)
- You have **Project Admin** or **Jira Admin** rights
- Your project supports `Story Points` and `Acceptance Criteria` custom
  fields (Acceptance Criteria is custom in most Jira setups; see §4)

### 3.2 Import procedure

1. **Settings** (top-right gear) → **System** → **External System Import**
2. Click **CSV**
3. **Upload** → select `docs/v2/STORIES.csv`
4. Field separator: **comma**, encoding: **UTF-8**, click **Next**
5. **Project**: select your target project (or create a new one — see §3.3)
6. **Date format**: doesn't matter (no date columns in this CSV)
7. Click **Next**
8. **Map fields**:

   | CSV column          | Jira field                                |
   | ------------------- | ----------------------------------------- |
   | Issue Type          | Issue Type                                |
   | Summary             | Summary                                   |
   | Description         | Description                               |
   | Epic Name           | Epic Name (custom)                        |
   | Epic Link           | Epic Link (custom)                        |
   | Story Points        | Story Points (custom)                     |
   | Status              | Status                                    |
   | Priority            | Priority                                  |
   | Labels              | Labels                                    |
   | Acceptance Criteria | Acceptance Criteria (custom)              |

   If your project doesn't have an Acceptance Criteria custom field,
   either (a) create it as a multi-line text field first, or (b) map
   it onto Description (it'll get appended).

9. **Map values**: leave defaults
10. Click **Begin Import**
11. Review the import log; failures are listed inline

Time: ~3 minutes for the import + 1-2 minutes for field mapping
= ~5 minutes total.

### 3.3 Recommended project setup

- **Project key**: `BAD` (Buzz Agent Dashboard) — easy to remember,
  short for ticket IDs (BAD-1, BAD-2, …)
- **Issue types**: enable Epic + Story (default in Scrum/Kanban templates)
- **Default board**: Kanban with columns To Do / In Progress / Done
- **Sprints**: optional; the bulk import doesn't assign sprints

---

## 4. Custom field setup (one-time)

If `Acceptance Criteria` doesn't exist in your project:

1. **Settings** → **Issues** → **Custom fields** → **Add custom field**
2. Type: **Text Field (multi-line)**
3. Name: **Acceptance Criteria**
4. Apply to: your project, screens: Default Screen + Edit Screen +
   View Screen
5. Save

Same for `Story Points` (usually present by default; if not, add as
**Number Field**).

---

## 5. Post-import sanity check

After import, verify on the project board:

- 12 Epic cards visible
- ~143 Story cards (split across the 12 epics)
- Each Story has its Epic Link set (visible in the right panel)
- Story Points populated on Story rows
- Status distribution: ~125 Done + ~18 To Do (matches FPRD coverage)

If any rows fail to import:
- **Most common cause**: Epic Link references an Epic Name that
  doesn't exist (typos). Fix in CSV and re-import only the failed
  rows.
- **Second-most common**: custom field not mapped. Re-run mapping.

---

## 6. JSON-API fallback (no bulk import access)

If your Jira instance restricts CSV import or you don't have project
admin rights, use the REST API. Sample loop:

```bash
#!/usr/bin/env bash
# Requires: jq, curl, an Atlassian API token
# Usage: JIRA_USER=you@buzzworks.com JIRA_TOKEN=... JIRA_HOST=buzzworks.atlassian.net ./push.sh

PROJECT="BAD"
HOST="https://${JIRA_HOST}"
AUTH="-u ${JIRA_USER}:${JIRA_TOKEN}"

# 1. Create epics first; capture issue keys
declare -A EPIC_KEYS
while IFS=, read -r type summary _; do
  [[ "$type" != '"Epic"' ]] && continue
  name=$(echo "$summary" | tr -d '"')
  key=$(curl -s $AUTH -X POST -H "Content-Type: application/json" \
    "$HOST/rest/api/3/issue" \
    -d "{\"fields\":{\"project\":{\"key\":\"$PROJECT\"},\"summary\":\"$name\",\"issuetype\":{\"name\":\"Epic\"},\"customfield_10011\":\"$name\"}}" \
    | jq -r .key)
  EPIC_KEYS["$name"]="$key"
  echo "Epic: $name → $key"
done < <(grep '^"Epic"' docs/v2/STORIES.csv)

# 2. Create stories with Epic Link → epic key
# (Loop over Story rows; map Epic Link → EPIC_KEYS lookup; POST to /rest/api/3/issue)
```

Notes:
- `customfield_10011` is the typical Epic Name custom field ID
  (varies by instance — check yours via `/rest/api/3/field`)
- For Epic Link, use `customfield_10014` (also varies)
- The full bash above is a sketch; production version should batch
  via `/rest/api/3/issue/bulk` (max 50 issues per call)

---

## 7. After import: where to start

1. **Sort by Status: To Do** → that's the v3 backlog (~18 items)
2. **Sort by Story Points: 13 desc** → those are the multi-week
   investments needing breakdown (LLM integration, real backend, etc.)
3. **Sort by Labels: notify ripley v3** → the email-system gaps that
   block real-world rollout

Stories with `Status: Done` represent shipped v2 work — they're in the
backlog as a faithful map of what exists, not as work-to-do.

---

## 8. Re-imports

If you need to re-import (e.g. you modified the CSV):

- **Don't** import the same CSV twice into the same project — Jira
  will create duplicates
- Either: archive the project and re-import into a fresh one, OR
- Filter to "issues created via this import" (Jira tags imports with
  a timestamp), bulk-delete, then re-import

---

## 9. Maintenance

When FPRDs change:
1. Update the relevant FPRD in `docs/v2/fprds/`
2. Update the corresponding stories in `STORIES.csv`
3. In Jira, update the issues directly (don't re-import)

The CSV is the **initial seed**; once issues are in Jira, treat Jira
as the source of truth for execution status. Treat FPRDs as the source
of truth for behavior + acceptance criteria.

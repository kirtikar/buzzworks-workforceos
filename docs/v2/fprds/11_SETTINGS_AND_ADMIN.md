# FPRD-11 — Settings & Admin

**Surface:** `/settings`
**Primary persona:** Buzzworks Agent Manager (own profile + theme),
Operations Lead (notifications + integrations + system),
IT/Admin (security)

---

## 1. Scope

The Settings module is the catch-all admin surface. 6 sub-sections,
each behind a left-rail tab on desktop or a horizontal scroll tab
on mobile.

Most of v2 is read-only / cosmetic (toggle UI without backend
persistence). v3 hooks each section to its respective backend.

---

## 2. Information architecture

```
Settings page
├─ Header                         (h1 "Settings" + subtitle + version footer right)
├─ Section nav
│  ├─ Sidebar tabs (sm-up)         vertical
│  └─ Horizontal scroll (mobile)
└─ Section content
   one of: Appearance | Notifications | Account | Integrations | Security | System
```

Section icon per tab:
- Appearance → Sun
- Notifications → Bell
- Account → Users
- Integrations → Webhook
- Security → Shield
- System → Database

Header right-side: `Agent Dashboard v2.1.0 · JARVIS v2.1`

---

## 3. Appearance

### 3.1 Theme picker

Two options as side-by-side preview cards:
- **Light** — Microsoft Fluent-inspired, clean white surfaces, blue accent
- **Dark** — Glassmorphism, dark surfaces with teal accent

Each card:
- Mini preview (sidebar mock + content mock with mini bars)
- Theme name + subtitle + 1-line description
- Selected state: 2px accent border + check badge top-right

Click → calls `setTheme(t.id)` from ThemeProvider context. Persists
in `localStorage`.

### 3.2 Display section (toggles)

| Setting                            | Default | Description                                                    |
| ---------------------------------- | ------- | -------------------------------------------------------------- |
| Compact table rows                  | off     | Reduces row height in timesheet/employee tables for density   |
| Animate transitions                 | on      | Page transitions and micro-interactions                        |
| Show AI confidence scores           | on      | Display JARVIS confidence percentages in timesheet rows        |

All toggles are local-state only in v2; v3 persists per-user preferences.

---

## 4. Notifications

### 4.1 Email Alerts

- Flagged timesheets (default on)
- Payroll approvals (default on)
- Daily digest (default off)

### 4.2 Push & SLA

- Urgent push notifications (default on)
- Approval push notifications (default off)
- SLA breach notifications (default on)

All toggles wire to a single `notifs` state object; v3 persists +
hooks to push provider (FCM / OneSignal).

---

## 5. Account

### 5.1 Profile section

| Field      | Value (default)                   |
| ---------- | --------------------------------- |
| Full name  | Siddharth Kirtikar                |
| Email      | siddharth.k@buzzworks.in          |
| Role       | Ops Agent (default selected)       |
| Timezone   | Asia/Kolkata (IST)                 |

Role dropdown options: Ops Agent · Ops Manager · Payroll Lead · Analyst.

"Save profile" button (no-op in v2).

### 5.2 What's removed in v2

- Old "Buzzworks Ops Lead" / "Riya Shah" identity → replaced
- Account name + email in Sidebar user chip mirror these fields
  (initials = SK)

---

## 6. Integrations

### 6.1 Connected portals (3-card layout)

For each of the 2 active portals (Fieldglass + BeeLine) + email
ingestion:

```
┌──────────────────────────────────────┐
│ [icon]  Portal name                   │
│ Subtitle / description                 │
│                                       │
│ Status: connected · last sync · next  │
│ Total synced this month                │
│                                       │
│ [Sync now]  [Configure]  [Disconnect] │
└──────────────────────────────────────┘
```

### 6.2 Email ingestion card

- Buzzworks ingestion mailbox: `timesheets@buzzworks.com`
- Forwarding rules (read-only summary in v2)
- "Send test email" button (no-op v2)

### 6.3 Webhooks

- Endpoint URL field (placeholder)
- Secret token field (masked)
- Event toggles (timesheet.approved / payroll.released / compliance.flagged)

---

## 7. Security

### 7.1 Sign-in

- Current session: device + IP + last-seen (read-only)
- "Sign out all sessions" button (warn-styled)
- 2FA toggle (off; v3 enforces)

### 7.2 API tokens

- List of active tokens with name + last-used + scopes
- "Generate new token" button → modal (placeholder)
- Per-token "Revoke" button

### 7.3 Audit log link

Read-only link to "View full audit log" (v3 backend).

---

## 8. System

### 8.1 Build info

- Version: v2.1.0
- Last deploy: <date>
- Region: ap-south-1 (Mumbai)
- Uptime: 99.97% (placeholder)

### 8.2 Operational toggles

- Auto-archive processed batches (default on, 30 days)
- Show debug overlays (default off)
- Enable experimental features (default off)

### 8.3 What's removed from v2

The old "Danger Zone" panel (Purge test data / Reset agent learning)
was removed in commit 15d12dc — destructive ops belong behind
a confirmation flow in admin tooling, not in self-service settings.

---

## 9. Edge cases

| Case                                                            | Handling                                       |
| --------------------------------------------------------------- | ---------------------------------------------- |
| Theme switch mid-render                                         | ThemeProvider re-renders; CSS variable swap is instant |
| Save profile with invalid email                                 | HTML5 input validation only in v2; v3 server-side |
| Disconnect portal → reconnect                                   | Mock; v3 needs OAuth flow                      |
| 2FA toggle when no phone is on file                              | Disabled with tooltip (v3)                     |
| User on mobile: section nav becomes horizontal scroll            | Already implemented                            |

---

## 10. Telemetry events (proposed)

```
settings.section.viewed         { section }
settings.theme.changed          { from, to }
settings.toggle.changed         { section, key, value }
settings.profile.saved          { fieldChanges: string[] }
settings.portal.sync.clicked    { portalId }
settings.integration.connected  { portalId }
```

---

## 11. Acceptance criteria summary

### Section navigation
- AC-1: 6 sections render: Appearance, Notifications, Account, Integrations, Security, System
- AC-2: Sidebar nav on sm+; horizontal scroll on mobile
- AC-3: Active section indicated with accent

### Account
- AC-4: Profile name = "Siddharth Kirtikar", email = "siddharth.k@buzzworks.in"
- AC-5: Role dropdown defaults to "Ops Agent"; alt options below

### System
- AC-6: No "Danger Zone" panel (removed from v2)
- AC-7: Footer reads "Agent Dashboard v2.1.0 · JARVIS v2.1"

### Theme
- AC-8: Two cards (Light, Dark); selected gets 2px accent border + check
- AC-9: Theme persists in localStorage via ThemeProvider

---

## 12. Open questions

1. All toggles are local-only. v3 needs per-user persistence in
   backend.
2. Per-Agent settings should live here too — e.g. raise JARVIS
   auto-approve threshold from 95 → 97 globally. v3.
3. Audit log surface — list view of every state mutation in the
   product. v3.
4. SAML / OAuth integration for sign-in. v3.
5. Per-section permissions (some users can edit Integrations,
   others cannot). v3.
6. Real portal Sync-now should call Fieldglass / BeeLine API and
   return success/failure inline. v3.

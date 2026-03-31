# Pathways V31 — Access Control & Visibility Tiers

## What this update does

Adds a tiered visibility system so mentors can no longer see every detail about young people from other mentors' sessions.

### The access model

| Role | Sees own sessions | Sees other mentors' sessions | Safeguarding | Sensitive notes |
|------|------------------|------------------------------|--------------|-----------------|
| **Director** (Nathan, Toni) | Everything | Everything | Full details | Full details |
| **Mentor** (everyone else) | Full notes + reflection | AI-generated summary only | "Check with directors" message | Never visible |

### What changes for mentors

- Their own session notes, reflections, and scores show in full (as before)
- Other mentors' sessions show with a purple "Summary" badge and an AI-generated 2-3 sentence summary
- Safeguarding flags show as "check with Nathan or Toni" — no details
- Dashboard safeguarding section shows a count and names, not the actual notes
- AI summary "Concerns" section is hidden from mentors
- New "Sensitive / Director-Only Notes" field in session log form

### What changes for directors

- Everything works exactly as before, plus:
- New purple "Sensitive Notes (Director Only)" block visible in expanded sessions
- Safeguarding and sensitive notes clearly labelled with lock icons
- Full visibility on all data from all mentors

---

## Deployment steps

### 1. Run the database migration

Go to **Supabase → SQL Editor** and run:

```
migration-v31-access-control.sql
```

This adds three columns to the sessions table:
- `sensitive_notes` (text) — director-only notes field
- `visibility` (text) — for future use, defaults to 'all'
- `mentor_summary` (text) — cached AI summaries for mentor view

It also updates the `sessions_full` view and ensures Rhianna and Eva are in the mentors table.

**Safe to run:** All existing sessions keep working. No data is hidden until mentors start using the new fields.

### 2. Replace the code files

From the `pathways-v31-full.zip`, replace these files in your repo:

- `app/page.js` — updated UI with access filtering
- `app/api/mentor-summary/route.js` — **NEW** API endpoint for generating safe summaries
- `lib/db.js` — updated with access control functions

### 3. Deploy to Vercel

```
git add .
git commit -m "v31: access control and visibility tiers"
git push origin main
```

### 4. Clear service worker cache

After deploy, all users need to clear their service worker cache (the usual gotcha). Either:
- Go to Settings → Clear Cache in the app
- Or manually: DevTools → Application → Service Workers → Unregister

---

## Files changed

| File | What changed |
|------|-------------|
| `app/page.js` | Session form: added sensitive_notes field with director-only label. YP Profile: sessions filtered by role, mentor summaries loaded via API, redacted sessions show purple summary badge. Dashboard: safeguarding section split into admin/mentor views. AISummaryCard: concerns hidden from mentors. |
| `lib/db.js` | Added `redactSessionForMentor()`, `filterSessionsForUser()`, `getSessionsForYPFiltered()`, `generateMentorSummaries()`, `saveMentorSummary()`, `createSessionWithSensitive()`. Updated `createSession()` to accept `sensitiveNotes`. |
| `app/api/mentor-summary/route.js` | **New file.** Server-side API that fetches full session data from Supabase, sends it to Claude with strict rules about what to include/exclude, caches the generated summaries back to the sessions table. |
| `migration-v31-access-control.sql` | Adds `sensitive_notes`, `visibility`, `mentor_summary` columns. Updates view. Adds Rhianna and Eva. |

---

## How the AI summaries work

When a mentor opens a young person's profile:

1. Sessions are split: own sessions shown in full, other mentors' sessions marked as "redacted"
2. If redacted sessions don't have cached summaries, the app calls `/api/mentor-summary`
3. That endpoint fetches the **full** session data from Supabase server-side (including sensitive notes and safeguarding)
4. It sends this to Claude with strict instructions: include creative progress, energy, what worked — never include safeguarding details, family situations, or sensitive disclosures
5. The generated summaries are cached in the `mentor_summary` column so they only need generating once
6. Future views of the same session use the cached version instantly

This means the AI session plan generator still has full context (it runs server-side), but the mentor UI only shows the safe summary.

---

## Testing checklist

- [ ] Log in as Nathan (admin) — verify you see everything as before
- [ ] Log in as Nathan — check YP profile shows sensitive notes in purple block
- [ ] Log in as Benjamin (mentor) — verify dashboard shows safeguarding count, not details
- [ ] Log in as Benjamin — open a YP profile, verify "Mentor View" banner shows
- [ ] Log in as Benjamin — verify own sessions show in full
- [ ] Log in as Benjamin — verify Nathan's sessions show with purple "Summary" badge
- [ ] Log a new session with sensitive notes — verify they save and show for admin only
- [ ] Check that AI session plans still generate correctly (server-side, full context)

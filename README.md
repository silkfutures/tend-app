# SilkFutures Pathways

Youth mentoring assessment and tracking platform built for SilkFutures CIC, Cardiff.

## What It Does

- **PIN-based mentor login** — each mentor signs in with their name and a 4-digit PIN
- **Session logging** — 1:1 and group sessions with the full Pathways framework (Reset → Reframe → Rebuild → Release → Rise)
- **AI session plans** — generates next-session plans using Claude, tailored to each young person's scores and history
- **Role-based access** — admins (Nathan, Toni) see all data; mentors see only young people they've actually worked with
- **Group sessions** — multiple young people + co-mentors, data links to everyone's dashboards
- **Funder export** — filtered CSV exports for reporting
- **Safeguarding flags** — visible to all with access, highlighted in dashboards

## Access Model

**No pre-assigned mentees.** Any mentor can log a session with any young person (including adding new ones on the fly). Access to *view* a young person's data is earned by having session history with them. Admins see everything.

This means if Isaak ends up working with someone new at a group session, he logs it immediately — no admin approval needed.

## Setup (Under 1 Hour)

### You Need

- **GitHub** account — [github.com](https://github.com) (free)
- **Supabase** account — [supabase.com](https://supabase.com) (free tier is plenty)
- **Vercel** account — [vercel.com](https://vercel.com) (free, sign up with GitHub)
- **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com) (pay-as-you-go, pennies per session plan)

### Step 1: Create the Database (10 mins)

1. Go to **supabase.com**, sign up / log in
2. Click **New Project**
   - Name: `silkfutures-pathways`
   - Region: **London**
   - Set a database password (save it)
3. Go to **SQL Editor** → **New query**
4. Paste the entire contents of `supabase-setup.sql` and click **Run**
5. Go to **Settings → API** and copy:
   - Your **Project URL** (e.g. `https://abcdef.supabase.co`)
   - Your **anon/public key**

### Step 2: Push to GitHub (5 mins)

1. Create a **new private repository** on GitHub called `silkfutures-pathways`
2. In your terminal:

```bash
cd silkfutures-pathways
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/silkfutures-pathways.git
git push -u origin main
```

### Step 3: Deploy on Vercel (10 mins)

1. Go to **vercel.com**, sign in with GitHub
2. Click **Add New → Project**, import your repo
3. Add **Environment Variables**:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |

4. Click **Deploy** — wait 1-2 minutes
5. Your app is live at `silkfutures-pathways.vercel.app`

### Step 4: Change Default PINs

1. Log in as Nathan (PIN: 1234)
2. Go to **Team** tab
3. Change everyone's PINs to something they'll remember

## Costs

| Service | Cost |
|---------|------|
| Supabase (free tier) | £0/month |
| Vercel (free tier) | £0/month |
| Anthropic API | ~£0.01 per session plan |

## Default Team

| Name | Role | Default PIN |
|------|------|-------------|
| Nathan | Admin | 1234 |
| Toni | Admin | 1234 |
| Benjamin | Mentor | 1234 |
| Kaylum | Mentor | 1234 |
| Isaak | Mentor | 1234 |

## Custom Domain

Want `pathways.silkfutures.org`? In Vercel → Project Settings → Domains → add your domain and follow the DNS instructions.

## Project Structure

```
├── app/
│   ├── api/session-plan/  → AI session plan endpoint (server-side, API key hidden)
│   ├── globals.css        → Styles
│   ├── layout.js          → Root layout
│   └── page.js            → Main app (client component)
├── lib/
│   ├── constants.js       → Pathways framework, form sections, step definitions
│   ├── db.js              → All Supabase queries
│   ├── supabase.js        → Supabase client
│   └── utils.js           → Stage calculations, CSV export helpers
├── supabase-setup.sql     → Database schema + seed data
└── package.json
```

## Troubleshooting

**App shows "Loading Pathways..." forever**
→ Check Supabase URL and anon key in Vercel environment variables

**Session plans fail**
→ Check Anthropic API key is correct and has credit

**Data not saving**
→ Check the SQL was run correctly (tables should exist in Supabase Table Editor)

**"Login failed" for everyone**
→ Make sure the seed data SQL ran (check `mentors` table in Supabase)

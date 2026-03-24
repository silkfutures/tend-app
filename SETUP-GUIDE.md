# Tend — Business Setup Guide

Everything you need to get Tend running as a proper business. Work through these in order.

---

## 1. Google Workspace (Professional Email) — 30 mins

This gives you nathan@tendmentorapp.com, hello@tendmentorapp.com, and support@tendmentorapp.com with proper Gmail inboxes.

**Cost:** ~$7/user/month (14-day free trial)

### Steps:
1. Go to [workspace.google.com](https://workspace.google.com) → click "Get started"
2. Choose **Business Starter** plan
3. Enter your domain: **tendmentorapp.com**
4. Google will ask you to verify you own the domain — it gives you a text code to copy

### Add verification to Namecheap:
5. Log into [Namecheap](https://namecheap.com) → Domain List → click **Manage** next to tendmentorapp.com
6. Go to **Advanced DNS** tab
7. Click **Add New Record** → choose **TXT Record**
8. Host: `@` | Value: paste Google's verification code | TTL: Automatic
9. Save, wait 10-30 mins, go back to Google and click **Verify**

### Set up email routing (MX records):
10. Back in Namecheap Advanced DNS, delete any existing MX records
11. Add a new **MX Record**: Host: `@` | Value: `smtp.google.com` | Priority: `1` | TTL: Automatic
12. Save — email will start working within 30 mins (sometimes up to 72 hours)

### Create your accounts:
13. In Google Workspace Admin (admin.google.com) → Users → Add user
14. Create: **nathan@tendmentorapp.com**, **hello@tendmentorapp.com**, **support@tendmentorapp.com**
15. Set up forwarding: In Admin → Users → click hello@ → Mail settings → Forward to nathan@. Same for support@.

**Note:** Your Resend transactional emails (confirmations, invites) will keep working fine — they use their own infrastructure.

---

## 2. Cal.com (Demo Booking) — 15 mins

Free scheduling tool. People book demos directly — no back-and-forth emails.

### Steps:
1. Go to [cal.com/signup](https://cal.com/signup)
2. Sign up (use Google once Workspace is set up, or personal email for now)
3. Choose username: **tendapp** → this gives you `cal.com/tendapp/demo`
4. Create a new **Event Type**:
   - Title: "Book a Demo"
   - Duration: 30 minutes
   - Location: Google Meet
   - Description: "A 30-minute walkthrough of Tend — see how it works for your team."
5. Set your availability (e.g. Mon-Fri, 10am-4pm)
6. Go to Settings → Customization → set colour to **#4A7C59** (sage green)
7. Toggle OFF "Cal.com branding" (free to remove)
8. Your link: **cal.com/tendapp/demo** — test it in an incognito tab

### Embed on your website:
- In Cal.com, go to your Demo event → Share → Embed
- Choose "Floating button" or "Inline" and copy the code
- Give it to whoever manages tendmentorapp.com, or paste it into the HTML

---

## 3. AI Chatbot (Deploy to App) — 10 mins

Two files to add to your Tend app:

### chatbot-api-route.js → goes to `app/api/chatbot/route.js`
1. In your tend-app GitHub repo, create folder: `app/api/chatbot/`
2. Upload `chatbot-api-route.js` and rename it to `route.js`
3. It uses your existing ANTHROPIC_API_KEY — no new env vars needed
4. Vercel will auto-deploy it

### tend-chatbot-widget.html → embed on tendmentorapp.com
- This is the chat bubble that sits in the bottom-right corner
- For the landing page: copy the `<style>`, the HTML elements, and the `<script>` block into your landing page
- The widget calls `/api/chatbot` — if your landing page is on a different domain, update the `apiEndpoint` in the script to: `https://tend-app-murex.vercel.app/api/chatbot`

### What the chatbot knows:
- Everything about Tend (features, pricing, target customers)
- Common FAQs (data security, setup time, migration, training)
- Links to book a demo and contact support
- Warm, practitioner-friendly tone

**Cost:** Pennies per conversation (Claude API usage only)

---

## 4. Customer Support — Already Done

With Google Workspace set up:
- **support@tendmentorapp.com** forwards to your inbox
- Reply personally for now — at your stage, personal touch builds trust
- Use the email templates in the Business Operations Playbook (the .docx file)

---

## 5. What You Have When This Is All Set Up

| System | What it does | Cost |
|--------|-------------|------|
| Google Workspace | Professional email (nathan@, hello@, support@) | ~$21/mo (3 users) |
| Cal.com | Demo booking with zero admin | Free |
| AI Chatbot | 24/7 first-response on website + in app | ~$5/mo (API costs) |
| Resend | Transactional emails (signup, invites) | Already set up |
| Vercel + Supabase | App hosting + database | Already set up |

**Total new cost: ~$26/month** to run Tend like a real business.

---

## 6. Before Thursday's Demo with Dionne

Priority checklist:
- [ ] Run the SQL to add work_context column: `ALTER TABLE mentors ADD COLUMN IF NOT EXISTS work_context text;`
- [ ] Deploy v17 to Vercel (upload to GitHub)
- [ ] Add the chatbot API route (`app/api/chatbot/route.js`)
- [ ] Test the full flow: signup → onboarding → add YP → session prep → session log → impact report
- [ ] Have Cal.com set up so you can say "book your team in at cal.com/tendapp/demo"
- [ ] Print/know your pricing: £99/mo (up to 5 mentors), £199/mo (larger teams)

# Email & Google Sheets Setup

## 1. Email Notifications (Resend — free tier)

### What you get:
- **Friday 5pm** — automatic weekly summary email to you and Toni
- **Instant safeguarding alerts** — email sent immediately when any mentor flags a concern

### Setup:
1. Go to [resend.com](https://resend.com) and sign up (free — 100 emails/day)
2. Add your domain `silkfutures.com` and verify it (follow their DNS instructions)
3. Create an API key
4. In Vercel → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | Your Resend API key |
| `ALERT_EMAILS` | `nathan@silkfutures.com,toni@silkfutures.com` |
| `CRON_SECRET` | Any random string (e.g. generate one at random.org) |

5. Redeploy

The weekly cron runs automatically via `vercel.json`. Safeguarding alerts fire when sessions are saved.


## 2. Google Sheets Auto-Backup

### What you get:
- Every session automatically pushed to a Google Sheet
- You'll never lose data — even if Supabase goes down, the Sheet has everything

### Setup:

#### Step 1: Create the Google Sheet
1. Create a new Google Sheet called "SilkFutures Pathways Data"
2. In Row 1, add these headers:
   `date | mentor | youngPerson | focusStep | sessionLength | partnerOrg | isGroup | regulation | engagement | overall | confidence | relationalConnection | adaptedAgenda | resetAvg | reframeAvg | rebuildAvg | releaseAvg | riseAvg | notes | mentorReflection | safeguarding | timestamp`

#### Step 2: Create the Apps Script webhook
1. In the Google Sheet, go to **Extensions → Apps Script**
2. Delete everything in the editor and paste this:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.date,
    data.mentor,
    data.youngPerson,
    data.focusStep,
    data.sessionLength,
    data.partnerOrg,
    data.isGroup,
    data.regulation,
    data.engagement,
    data.overall,
    data.confidence,
    data.relationalConnection,
    data.adaptedAgenda,
    data.resetAvg,
    data.reframeAvg,
    data.rebuildAvg,
    data.releaseAvg,
    data.riseAvg,
    data.notes,
    data.mentorReflection,
    data.safeguarding,
    data.timestamp,
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Deploy → New deployment**
4. Type: **Web app**
5. Execute as: **Me**
6. Who has access: **Anyone**
7. Click **Deploy** and copy the URL

#### Step 3: Add to Vercel
In Vercel → Settings → Environment Variables, add:

| Name | Value |
|------|-------|
| `GOOGLE_SHEETS_WEBHOOK` | The Apps Script URL you just copied |

Redeploy. Every session saved in the app will now automatically appear in the Google Sheet.

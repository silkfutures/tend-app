export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() { return createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
); }

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    // Get all sessions from the last week
    const { data: sessions } = await supabase
      .from("sessions_full")
      .select("*")
      .gte("date", weekAgoStr)
      .order("date", { ascending: false });

    // Get all scheduled sessions from the last week
    const { data: scheduled } = await supabase
      .from("schedule")
      .select(`
        *,
        mentor:mentor_id(id, name, email),
        young_person:young_person_id(id, name)
      `)
      .eq("is_active", true);

    // Get mentors list
    const { data: mentors } = await supabase
      .from("mentors")
      .select("*");

    // Find missing sessions (scheduled but not logged)
    const missingSessions = [];
    if (scheduled) {
      const loggedKeys = new Set(sessions?.map(s => `${s.young_person_name}_${s.date}`) || []);
      
      // Check recurring sessions
      const weekStart = new Date(weekAgoStr);
      const weekEnd = new Date(today);
      
      scheduled.filter(s => s.schedule_type !== 'one_off').forEach(slot => {
        const dow = slot.day_of_week; // 0 = Sunday
        let checkDate = new Date(weekStart);
        
        while (checkDate <= weekEnd) {
          if (checkDate.getDay() === dow) {
            const dateStr = checkDate.toISOString().split('T')[0];
            const key = `${slot.young_person?.name}_${dateStr}`;
            
            if (!loggedKeys.has(key) && dateStr >= weekAgoStr && dateStr <= today) {
              missingSessions.push({
                date: dateStr,
                young_person_name: slot.young_person?.name || "Unknown",
                mentor_name: slot.mentor?.name || "Unknown",
                mentor_email: slot.mentor?.email,
                location: slot.location,
                time: slot.start_time,
              });
            }
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }
      });

      // Check one-off sessions
      scheduled.filter(s => s.schedule_type === 'one_off').forEach(slot => {
        const dateStr = slot.one_off_date;
        if (dateStr >= weekAgoStr && dateStr <= today) {
          const key = `${slot.young_person?.name}_${dateStr}`;
          if (!loggedKeys.has(key)) {
            missingSessions.push({
              date: dateStr,
              young_person_name: slot.young_person?.name || "Unknown",
              mentor_name: slot.mentor?.name || "Unknown",
              mentor_email: slot.mentor?.email,
              location: slot.location,
              time: slot.start_time,
            });
          }
        }
      });
    }

    if (!sessions?.length && missingSessions.length === 0) {
      const subject = "Pathways Weekly — No activity this week";
      const body = "No sessions were logged this week and no scheduled sessions were missed.";
      await sendEmail(subject, body, false, mentors);
      return NextResponse.json({ sent: true, sessions: 0, missing: 0 });
    }

    // Build data summary
    const uniqueYP = [...new Set(sessions?.map(s => s.young_person_name) || [])];
    const uniqueMentors = [...new Set(sessions?.map(s => s.mentor_name) || [])];
    const safeguarding = sessions?.filter(s => s.safeguarding?.trim()) || [];
    const avgEngagement = sessions?.length ? (sessions.reduce((a, s) => a + (s.quick?.engagement || 0), 0) / sessions.length).toFixed(1) : "—";

    // Build raw session data for AI
    const sessionSummaries = sessions?.map(s => {
      const sg = s.safeguarding?.trim() ? `\n  SAFEGUARDING: ${s.safeguarding}` : "";
      return `${s.date} | ${s.young_person_name} with ${s.mentor_name} (${s.focus_step})
  Notes: ${s.notes || "None"}
  Mentor reflection: ${s.mentor_reflection || "None"}${sg}`;
    }).join("\n\n") || "";

    // Generate AI narrative
    let aiSummary = "";
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && sessionSummaries) {
      try {
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 800,
            messages: [{
              role: "user",
              content: `You are writing a weekly recap email for the directors of SilkFutures, a Cardiff-based CIC running rap and music mentoring with young people from high-deprivation areas.

Here are this week's sessions:

${sessionSummaries}

Write a warm, insightful 3-4 paragraph narrative summary. Highlight:
- Key moments and breakthroughs for individual young people (use their names)
- Any patterns or themes across the week
- Creative work produced (songs, lyrics, freestyles)
- Anything to watch or be aware of

Write it like a colleague updating you over coffee — not clinical, not overly formal. These are real young people doing real work. Keep it under 300 words.`,
            }],
          }),
        });
        const aiData = await aiRes.json();
        aiSummary = aiData.content?.find(b => b.type === "text")?.text || "";
      } catch (e) {
        aiSummary = "(AI summary unavailable this week)";
      }
    }

    // Extract photo URLs from session notes
    const photoUrls = [];
    sessions?.forEach(s => {
      const notes = s.notes || "";
      const mediaMatch = notes.match(/--- Media ---\n([\s\S]*?)($|\n---)/);
      if (mediaMatch) {
        const lines = mediaMatch[1].trim().split("\n");
        lines.forEach(line => {
          if (line.startsWith("photo:")) {
            const url = line.replace("photo:", "").split(" — ")[0].trim();
            if (url) photoUrls.push({ url, yp: s.young_person_name, date: s.date });
          }
        });
      }
    });

    // Build missing sessions section
    const missingSection = missingSessions.length > 0
      ? `<div style="background:#FEF9E7;border-left:3px solid #F59E0B;padding:16px;border-radius:8px;margin:20px 0">
          <h3 style="color:#D97706;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Sessions Not Logged</h3>
          <p style="font-size:13px;color:#B45309;margin:0 0 12px">These scheduled sessions haven't been logged yet:</p>
          ${missingSessions.map(m => `
            <div style="background:#FFFFFF;padding:10px 12px;border-radius:6px;margin:6px 0;border:1px solid #FDE68A">
              <div style="font-size:13px;color:#1A1A1A;font-weight:600">${m.young_person_name} with ${m.mentor_name}</div>
              <div style="font-size:11px;color:#8A8278;margin-top:2px">${m.date} at ${m.time} · ${m.location}</div>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tend-app-murex.vercel.app'}/api/send-reminder?mentor=${encodeURIComponent(m.mentor_email)}&yp=${encodeURIComponent(m.young_person_name)}&date=${m.date}&auth=${process.env.CRON_SECRET}" 
                 style="display:inline-block;margin-top:8px;padding:6px 12px;background:#D97706;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:11px;font-weight:600">
                Send Reminder to ${m.mentor_name.split(' ')[0]}
              </a>
            </div>
          `).join("")}
        </div>`
      : "";

    // Build HTML email
    const photoSection = photoUrls.length > 0
      ? `<div style="margin:24px 0">
          <h3 style="color:#8A8278;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px">This Week in the Studio</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${photoUrls.slice(0, 6).map(p => `<img src="${p.url}" alt="${p.yp}" style="width:160px;height:160px;object-fit:cover;border-radius:8px" />`).join("")}
          </div>
        </div>`
      : "";

    const sgHtml = safeguarding.length > 0
      ? `<div style="background:#FEF2F2;border-left:3px solid #DC2626;padding:16px;border-radius:8px;margin:20px 0">
          <h3 style="color:#DC2626;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Safeguarding Flags</h3>
          ${safeguarding.map(s => `<p style="margin:4px 0;font-size:13px;color:#B91C1C"><strong>${s.young_person_name}</strong> (${s.date}, ${s.mentor_name}): ${s.safeguarding}</p>`).join("")}
        </div>`
      : "";

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F7F5F2;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E0D8">

  <div style="background:#1A1A1A;padding:24px 28px;text-align:center">
    <div style="color:#F7F5F2;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700">SilkFutures Pathways</div>
    <div style="color:#8A8278;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-top:4px">Weekly Recap</div>
  </div>

  <div style="padding:28px">
    <p style="color:#8A8278;font-size:12px;margin:0 0 20px">Week ending ${new Date().toLocaleDateString("en-GB")}</p>

    ${aiSummary ? `<div style="font-size:14px;line-height:1.7;color:#1A1A1A;margin-bottom:24px">${aiSummary.replace(/\n\n/g, "</p><p style='margin:12px 0'>").replace(/\n/g, "<br>")}</div>` : ""}

    <div style="display:flex;gap:12px;margin:20px 0;flex-wrap:wrap">
      <div style="flex:1;min-width:80px;text-align:center;padding:16px 8px;background:#F0EDE8;border-radius:10px">
        <div style="font-size:28px;font-weight:900;color:#047857">${sessions?.length || 0}</div>
        <div style="font-size:10px;color:#8A8278;text-transform:uppercase;letter-spacing:1px;margin-top:4px">Sessions</div>
      </div>
      <div style="flex:1;min-width:80px;text-align:center;padding:16px 8px;background:#F0EDE8;border-radius:10px">
        <div style="font-size:28px;font-weight:900;color:#2563EB">${uniqueYP.length}</div>
        <div style="font-size:10px;color:#8A8278;text-transform:uppercase;letter-spacing:1px;margin-top:4px">Young People</div>
      </div>
      <div style="flex:1;min-width:80px;text-align:center;padding:16px 8px;background:#F0EDE8;border-radius:10px">
        <div style="font-size:28px;font-weight:900;color:#7C3AED">${avgEngagement}/4</div>
        <div style="font-size:10px;color:#8A8278;text-transform:uppercase;letter-spacing:1px;margin-top:4px">Avg Engagement</div>
      </div>
    </div>

    ${uniqueYP.length > 0 ? `
    <div style="margin:20px 0">
      <h3 style="color:#8A8278;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px">Young People Seen</h3>
      <p style="font-size:14px;color:#1A1A1A;margin:0">${uniqueYP.join(", ")}</p>
      <p style="font-size:12px;color:#8A8278;margin:6px 0 0">Mentors: ${uniqueMentors.join(", ")}</p>
    </div>` : ""}

    ${photoSection}
    ${missingSection}
    ${sgHtml}
  </div>

  <div style="background:#F0EDE8;padding:16px 28px;text-align:center">
    <p style="font-size:10px;color:#B5B0A8;margin:0">Sent automatically from SilkFutures Pathways</p>
  </div>
</div>
</body>
</html>`;

    const subject = sessions?.length 
      ? `Pathways Weekly — ${uniqueYP.length} young people, ${sessions.length} sessions${missingSessions.length > 0 ? ` (${missingSessions.length} missing)` : ""}`
      : `Pathways Weekly — ${missingSessions.length} sessions not logged`;
      
    await sendEmail(subject, htmlBody, true, mentors, {
      sessions_count: sessions?.length || 0,
      missing_count: missingSessions.length,
      young_people: uniqueYP,
      date_range: { from: weekAgoStr, to: today },
    });

    return NextResponse.json({ 
      sent: true, 
      sessions: sessions?.length || 0, 
      missing: missingSessions.length,
      photos: photoUrls.length 
    });
  } catch (err) {
    console.error("Weekly summary error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function sendEmail(subject, body, isHtml = false, mentors = null, metadata = {}) {
  const recipients = process.env.ALERT_EMAILS || "";
  if (!recipients) return;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const recipientList = recipients.split(",").map(e => e.trim());
  const payload = {
    from: "SilkFutures Pathways <pathways@silkfutures.com>",
    to: recipientList,
    subject,
  };

  if (isHtml) {
    payload.html = body;
  } else {
    payload.text = body;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify(payload),
    });

    // Log to database
    const supabase = getSupabase();
    for (const email of recipientList) {
      const recipient = mentors?.find(m => m.email === email);
      await supabase.from("email_log").insert({
        email_type: "weekly_admin",
        recipient_email: email,
        recipient_name: recipient?.name || email,
        subject,
        body_html: isHtml ? body : null,
        body_text: isHtml ? null : body,
        metadata: { ...metadata, sent_at: new Date().toISOString() },
        sent_successfully: true,
      });
    }
  } catch (error) {
    console.error("Email send error:", error);
    // Log failure
    const supabase = getSupabase();
    for (const email of recipientList) {
      await supabase.from("email_log").insert({
        email_type: "weekly_admin",
        recipient_email: email,
        subject,
        metadata,
        sent_successfully: false,
        error_message: error.message,
      });
    }
  }
}

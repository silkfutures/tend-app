export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  try {
    // Get last 2 weeks of sessions
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const { data: sessions } = await supabase
      .from("sessions_full")
      .select("*")
      .gte("date", twoWeeksAgoStr)
      .order("date", { ascending: false });

    // Get all mentors
    const { data: mentors } = await supabase
      .from("mentors")
      .select("*")
      .eq("role", "mentor"); // Only send to mentors, not admins

    if (!sessions || !mentors) {
      return NextResponse.json({ sent: 0, message: "No data" });
    }

    // Group sessions by mentor
    const byMentor = {};
    sessions.forEach(s => {
      if (!byMentor[s.mentor_id]) {
        byMentor[s.mentor_id] = [];
      }
      byMentor[s.mentor_id].push(s);
    });

    let emailsSent = 0;
    const emailResults = [];

    // Send summary to each mentor who logged sessions
    for (const mentor of mentors) {
      const mentorSessions = byMentor[mentor.id] || [];
      
      // Skip mentors with no sessions in the last 2 weeks
      if (mentorSessions.length === 0) continue;
      
      // Skip mentors without email
      if (!mentor.email) continue;

      const mentorFirstName = mentor.name?.split(" ")[0] || mentor.name;
      
      // Calculate stats
      const uniqueYP = [...new Set(mentorSessions.map(s => s.young_person_name))];
      const avgEngagement = mentorSessions.length > 0
        ? (mentorSessions.reduce((a, s) => a + (s.quick?.engagement || 0), 0) / mentorSessions.length).toFixed(1)
        : "—";

      // Group by young person for breakdown
      const byYP = {};
      mentorSessions.forEach(s => {
        if (!byYP[s.young_person_name]) byYP[s.young_person_name] = [];
        byYP[s.young_person_name].push(s);
      });

      // Generate AI reflection for this mentor
      const sessionSummaries = mentorSessions.map(s => 
        `${s.date} | ${s.young_person_name} (${s.focus_step})
  Notes: ${s.notes || "None"}
  Reflection: ${s.mentor_reflection || "None"}
  Engagement: ${s.quick?.engagement || "—"}/4`
      ).join("\n\n");

      let aiReflection = "";
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey && mentorSessions.length > 0) {
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
              max_tokens: 600,
              messages: [{
                role: "user",
                content: `You're writing a fortnightly progress reflection for ${mentor.name}, a mentor at SilkFutures working with young people through music and mentoring.

Here are their last 2 weeks of sessions:

${sessionSummaries}

Write a warm, personal 2-3 paragraph reflection addressing ${mentorFirstName} directly. Focus on:
- Their impact on the young people they've worked with
- Patterns in engagement or progress you notice
- Any creative breakthroughs or moments worth celebrating
- One thing to be mindful of or consider going forward

Write like a supportive colleague checking in — encouraging, specific, and grounded in what actually happened. Keep it under 200 words.`,
              }],
            }),
          });
          const aiData = await aiRes.json();
          aiReflection = aiData.content?.find(b => b.type === "text")?.text || "";
        } catch (e) {
          aiReflection = "Great work over the last two weeks. Your sessions are making a real difference.";
        }
      }

      // Build young person breakdown
      const ypBreakdown = Object.entries(byYP)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ypName, ypSessions]) => {
          const avgEng = (ypSessions.reduce((a, s) => a + (s.quick?.engagement || 0), 0) / ypSessions.length).toFixed(1);
          const latestStage = ypSessions[0]?.focus_step || "—";
          return `
          <div style="background:#F0EDE8;padding:14px 16px;border-radius:10px;margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div style="font-size:15px;font-weight:700;color:#1A1A1A">${ypName}</div>
              <div style="font-size:12px;color:#8A8278">${ypSessions.length} session${ypSessions.length !== 1 ? "s" : ""}</div>
            </div>
            <div style="display:flex;gap:16px;font-size:12px;color:#8A8278">
              <div>Stage: <span style="color:#1A1A1A;font-weight:600">${latestStage}</span></div>
              <div>Avg engagement: <span style="color:#1A1A1A;font-weight:600">${avgEng}/4</span></div>
            </div>
          </div>`;
        }).join("");

      // Build HTML email
      const subject = `Your Pathways Fortnight — ${uniqueYP.length} young people, ${mentorSessions.length} sessions`;
      
      const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F7F5F2;margin:0;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E5E0D8">

  <div style="background:#1A1A1A;padding:24px 28px;text-align:center">
    <div style="color:#F7F5F2;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700">SilkFutures Pathways</div>
    <div style="color:#8A8278;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-top:4px">Fortnightly Mentor Recap</div>
  </div>

  <div style="padding:28px">
    <h2 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#1A1A1A">Hey ${mentorFirstName},</h2>
    <p style="color:#8A8278;font-size:12px;margin:0 0 20px">Your last 2 weeks · ${new Date(twoWeeksAgoStr).toLocaleDateString("en-GB")} — ${new Date(today).toLocaleDateString("en-GB")}</p>

    ${aiReflection ? `<div style="font-size:14px;line-height:1.7;color:#1A1A1A;margin-bottom:24px;padding:16px;background:#F9F7F4;border-radius:10px;border-left:3px solid #7C3AED">${aiReflection.replace(/\n\n/g, "</p><p style='margin:12px 0'>").replace(/\n/g, "<br>")}</div>` : ""}

    <div style="display:flex;gap:12px;margin:20px 0;flex-wrap:wrap">
      <div style="flex:1;min-width:80px;text-align:center;padding:16px 8px;background:#F0EDE8;border-radius:10px">
        <div style="font-size:28px;font-weight:900;color:#047857">${mentorSessions.length}</div>
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

    <div style="margin:24px 0">
      <h3 style="color:#8A8278;font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px">Young People You've Worked With</h3>
      ${ypBreakdown}
    </div>

    <p style="font-size:12px;line-height:1.5;color:#8A8278;margin:20px 0 0">
      Keep up the brilliant work. These sessions are making a real difference.
    </p>

    <p style="font-size:12px;line-height:1.5;color:#8A8278;margin:8px 0 0">
      — Nathan & Toni
    </p>
  </div>

  <div style="background:#F0EDE8;padding:16px 28px;text-align:center">
    <p style="font-size:10px;color:#B5B0A8;margin:0">Sent automatically from SilkFutures Pathways</p>
  </div>
</div>
</body>
</html>`;

      // Send email via Resend
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: "SilkFutures Pathways <pathways@silkfutures.com>",
              to: mentor.email,
              subject,
              html: htmlBody,
            }),
          });

          // Log success
          await supabase.from("email_log").insert({
            email_type: "fortnightly_mentor",
            recipient_email: mentor.email,
            recipient_name: mentor.name,
            subject,
            body_html: htmlBody,
            metadata: {
              mentor_id: mentor.id,
              date_range: { from: twoWeeksAgoStr, to: today },
              sessions_count: mentorSessions.length,
              young_people: uniqueYP,
              sent_at: new Date().toISOString(),
            },
            sent_successfully: true,
          });

          emailsSent++;
          emailResults.push({ mentor: mentor.name, sessions: mentorSessions.length, sent: true });

        } catch (error) {
          console.error(`Failed to send to ${mentor.name}:`, error);
          
          // Log failure
          await supabase.from("email_log").insert({
            email_type: "fortnightly_mentor",
            recipient_email: mentor.email,
            recipient_name: mentor.name,
            subject,
            metadata: {
              mentor_id: mentor.id,
              date_range: { from: twoWeeksAgoStr, to: today },
              sessions_count: mentorSessions.length,
            },
            sent_successfully: false,
            error_message: error.message,
          });

          emailResults.push({ mentor: mentor.name, sessions: mentorSessions.length, sent: false, error: error.message });
        }
      }
    }

    return NextResponse.json({ 
      sent: emailsSent,
      results: emailResults,
      period: { from: twoWeeksAgoStr, to: today }
    });

  } catch (err) {
    console.error("Mentor fortnightly error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

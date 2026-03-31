export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() { return createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
); }

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 });

  try {
    const { mentorId, mentorName, dateFrom, dateTo, type,
            // Legacy support for old month/year params
            year, month } = await request.json();
    const supabase = getSupabase();

    // Resolve date range — support both new dateFrom/dateTo and legacy year/month
    let startDate, endDate, periodLabel;
    if (dateFrom && dateTo) {
      startDate = dateFrom;
      // Add one day to dateTo to make it inclusive
      const endD = new Date(dateTo + "T12:00");
      endD.setDate(endD.getDate() + 1);
      endDate = endD.toISOString().split("T")[0];
      const fromD = new Date(dateFrom + "T12:00");
      const toD = new Date(dateTo + "T12:00");
      periodLabel = `${fromD.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} — ${toD.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;
    } else if (year && month) {
      startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
      const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      periodLabel = `${monthNames[month]} ${year}`;
    } else {
      return NextResponse.json({ error: "Please provide a date range" });
    }

    // Fetch this mentor's sessions for the period
    const { data: sessions } = await supabase
      .from("sessions_full")
      .select("*")
      .eq("mentor_id", mentorId)
      .gte("date", startDate)
      .lt("date", endDate)
      .is("deleted_at", null)
      .order("date", { ascending: true });

    if (!sessions?.length) {
      return NextResponse.json({ error: "No sessions found for this period" });
    }

    // Get unique young people
    const ypNames = [...new Set(sessions.map(s => s.young_person_name))];

    // Build session summaries
    const sessionLines = sessions.map(s => {
      const scores = s.quick || {};
      return `[${s.date}] ${s.young_person_name} (${s.focus_step}) - Reg:${scores.regulation || "?"} Eng:${scores.engagement || "?"} Overall:${scores.overall || "?"}${s.safeguarding?.trim() ? " [SG FLAG]" : ""}
Notes: ${(s.notes || "None").substring(0, 200)}
Reflection: ${(s.mentor_reflection || "None").substring(0, 150)}`;
    }).join("\n\n");

    // Calculate stats
    const totalSessions = sessions.length;
    const groupSessions = sessions.filter(s => s.is_group).length;
    const sgFlags = sessions.filter(s => s.safeguarding?.trim()).length;
    const avgEng = (sessions.reduce((a, s) => a + (parseFloat(s.quick?.engagement) || 0), 0) / totalSessions).toFixed(1);
    const avgReg = (sessions.reduce((a, s) => a + (parseFloat(s.quick?.regulation) || 0), 0) / totalSessions).toFixed(1);
    const avgOverall = (sessions.reduce((a, s) => a + (parseFloat(s.quick?.overall) || 0), 0) / totalSessions).toFixed(1);

    // Fetch schedule to check consistency
    const { data: schedule } = await supabase
      .from("session_schedule")
      .select("*")
      .eq("mentor_id", mentorId)
      .eq("is_active", true);
    const scheduledSlots = (schedule || []).length;
    const daysDiff = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const weeksInRange = Math.max(1, Math.round(daysDiff / 7));
    const expectedSessions = scheduledSlots * weeksInRange;

    let prompt;
    if (type === "admin") {
      prompt = `You are writing a performance summary for a SilkFutures mentor, to be read by the programme directors (Nathan and Toni).

MENTOR: ${mentorName}
PERIOD: ${periodLabel}

STATS:
- Sessions delivered: ${totalSessions}
- Expected sessions (from schedule): ${expectedSessions || "No schedule set"}
- Young people worked with: ${ypNames.join(", ")} (${ypNames.length} total)
- Group sessions: ${groupSessions}
- Average engagement: ${avgEng}/4
- Average regulation: ${avgReg}/4
- Average overall: ${avgOverall}/4
- Safeguarding flags raised: ${sgFlags}

SESSION DETAILS:
${sessionLines}

Write a director-facing summary for ${mentorName}. Be honest, specific, and constructive. Include:
1. Overview - what they delivered this period
2. Strengths - specific things they did well (cite real examples from sessions)
3. Patterns - any trends in scores, young person engagement, or session quality
4. Areas for development - honest, kind, actionable (not generic)
5. Young person highlights - brief note on each YP they worked with
6. Consistency - did they deliver what was scheduled?
${sgFlags > 0 ? "7. Safeguarding - note that flags were raised (don't include details)" : ""}

Keep it to ~400 words. Professional but warm. This is a tool for directors to support their mentors, not judge them.

Respond with ONLY valid JSON:
{"overview":"...","strengths":"...","patterns":"...","development":"...","ypHighlights":"...","consistency":"...","safeguarding":"..."}`; 
    } else {
      prompt = `You are writing an impact feedback message for a SilkFutures mentor. This goes TO the mentor to show them their impact and encourage them.

MENTOR: ${mentorName}
PERIOD: ${periodLabel}

STATS:
- Sessions delivered: ${totalSessions}
- Young people worked with: ${ypNames.join(", ")}
- Average engagement across sessions: ${avgEng}/4
- Average regulation: ${avgReg}/4

SESSION DETAILS:
${sessionLines}

Write a warm, specific, encouraging feedback message for ${mentorName}. This is about making them feel seen and valued. Include:
1. A personal opening that acknowledges their commitment
2. Specific impact moments from their sessions (quote real things that happened)
3. Numbers that matter - what shifted for their young people this period
4. One gentle growth area framed as an invitation, not criticism
5. A closing that reinforces why their work matters

Keep it to ~300 words. Human, warm, specific. Not corporate. Think of how Nathan would speak to a mentor he respects.

Respond with ONLY valid JSON:
{"greeting":"Opening line","impact":"2-3 paragraphs about specific impact","numbers":"Key stats with meaning","growth":"One area to explore","closing":"Warm sign-off"}`;
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
    });

    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const report = JSON.parse(clean);

    // Save to database
    const reportMonth = dateFrom ? new Date(dateFrom + "T12:00").getMonth() + 1 : month;
    const reportYear = dateFrom ? new Date(dateFrom + "T12:00").getFullYear() : year;
    await supabase.from("monthly_reports").insert({
      mentor_id: mentorId,
      report_type: type,
      year: reportYear,
      month: reportMonth,
      content: { ...report, stats: { totalSessions, ypNames, groupSessions, avgEng, avgReg, avgOverall, sgFlags, expectedSessions }, periodLabel },
    });

    return NextResponse.json({ report: { ...report, stats: { totalSessions, ypNames, groupSessions, avgEng, avgReg, avgOverall, sgFlags, expectedSessions }, periodLabel } });
  } catch (err) {
    console.error("Monthly report error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

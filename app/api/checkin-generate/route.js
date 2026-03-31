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
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { youngPersonId, youngPersonName, stage, mentorId, mentorName } = await request.json();

    if (!youngPersonId || !youngPersonName) {
      return NextResponse.json({ error: "Young person details required" }, { status: 400 });
    }

    // Fetch recent sessions for context (server-side, full data)
    const { data: sessions } = await getSupabase()
      .from("sessions_full")
      .select("*")
      .eq("young_person_id", youngPersonId)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(6);

    // Fetch previous check-in responses for continuity
    const { data: prevCheckins } = await getSupabase()
      .from("checkin_questionnaires")
      .select("*")
      .eq("young_person_id", youngPersonId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(2);

    // Fetch onboarding data
    const { data: onboarding } = await getSupabase()
      .from("onboarding_assessments")
      .select("*")
      .eq("young_person_id", youngPersonId)
      .order("created_at", { ascending: false })
      .limit(1);

    const sessionContext = (sessions || []).map(s =>
      `${s.date} (${s.focus_step}): ${s.notes || "No notes"}${s.safeguarding?.trim() ? "\nSafeguarding: " + s.safeguarding : ""}${s.sensitive_notes?.trim() ? "\nSensitive: " + s.sensitive_notes : ""}\nQuick: Reg=${s.quick?.regulation || "?"} Eng=${s.quick?.engagement || "?"} Overall=${s.quick?.overall || "?"}`
    ).join("\n\n");

    const prevCheckinContext = (prevCheckins || []).map(c => {
      const qs = c.questions || [];
      const rs = c.responses || {};
      return `Check-in (${new Date(c.completed_at).toLocaleDateString()}):\n` +
        qs.map(q => `  Q: ${q.question}\n  A: ${rs[q.id] || "No answer"}`).join("\n");
    }).join("\n\n");

    const onboardContext = onboarding?.[0]
      ? `Onboarding (${new Date(onboarding[0].created_at).toLocaleDateString()}): Suggested stage: ${onboarding[0].suggested_stage}. Notes: ${onboarding[0].notes || "None"}`
      : "No onboarding data yet.";

    const prompt = `You are a SilkFutures youth mentor assistant. SilkFutures is a Cardiff-based CIC running RAP and MUSIC PRODUCTION mentoring sessions with young people from high-deprivation areas.

The Pathways framework stages: Reset (stabilising inner world), Reframe (rewriting identity & beliefs), Rebuild (discipline, skills, creative practice), Release (responsible creative voice), Rise (leadership & contribution).

You need to generate a CHECK-IN QUESTIONNAIRE for ${youngPersonName}. This is NOT an exam or a clinical assessment. It's a vibe check — designed to subtly help the mentor understand where this young person is at mentally, emotionally, and creatively right now.

YOUNG PERSON: ${youngPersonName}
CURRENT STAGE: ${stage}
MENTOR RUNNING THIS: ${mentorName}

RECENT SESSION CONTEXT:
${sessionContext || "No sessions yet."}

PREVIOUS CHECK-INS:
${prevCheckinContext || "No previous check-ins."}

ONBOARDING:
${onboardContext}

RULES FOR GENERATING QUESTIONS:
- Generate exactly 6 questions
- Questions should feel NATURAL and CONVERSATIONAL — like a mentor chatting, not a therapist probing
- Mix question types: some with emoji/scale options (1-4), some with short text answers, some with multiple choice
- At least 2 questions should be MUSIC-RELATED ("If you had to name an album after this week...", "What beat are you on right now — slow and heavy, or light and quick?")
- At least 1 question should subtly check emotional regulation / safety
- At least 1 question should check how they feel about the programme / the space / their mentor relationship
- Questions should be INFORMED by their recent sessions — if they were writing about something specific, reference it naturally
- NEVER repeat questions from previous check-ins
- Don't be cringe — these are young people from Cardiff estates, they'll see through fake-casual instantly
- Each question needs a unique ID, the question text, the type (emoji, scale, text, choice), and options if applicable
- For "emoji" type: provide 4 options each with an emoji, label, and value (1-4)
- For "scale" type: provide a min label, max label, and range (1-4)
- For "text" type: just the question and a placeholder
- For "choice" type: provide 3-5 short text options

Respond with ONLY valid JSON, no markdown:
{"questions":[
  {"id":"q1","question":"The question text","type":"emoji","options":[{"emoji":"😴","label":"Dead","value":1},{"emoji":"😐","label":"Meh","value":2},{"emoji":"🙂","label":"Alright","value":3},{"emoji":"⚡","label":"Locked in","value":4}]},
  {"id":"q2","question":"The question text","type":"scale","minLabel":"Not at all","maxLabel":"Completely","min":1,"max":4},
  {"id":"q3","question":"The question text","type":"text","placeholder":"Whatever comes to mind..."},
  {"id":"q4","question":"The question text","type":"choice","options":["Option A","Option B","Option C","Option D"]}
]}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.find((b) => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Save the questionnaire to the database
    const { data: saved, error } = await getSupabase()
      .from("checkin_questionnaires")
      .insert({
        young_person_id: youngPersonId,
        mentor_id: mentorId,
        stage,
        questions: parsed.questions,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to save questionnaire:", error);
      return NextResponse.json({ ...parsed, saved: false });
    }

    return NextResponse.json({ ...parsed, id: saved.id, saved: true });
  } catch (err) {
    console.error("Check-in generate error:", err);
    return NextResponse.json({ error: "Failed to generate check-in" }, { status: 500 });
  }
}

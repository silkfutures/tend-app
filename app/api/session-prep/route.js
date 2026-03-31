export const dynamic = "force-dynamic";
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
    const { mentorName, youngPersonName, youngPersonId, stage } = await request.json();
    const supabase = getSupabase();

    // Get recent sessions for this YP
    const { data: sessions } = await supabase
      .from("sessions_full")
      .select("*")
      .eq("young_person_id", youngPersonId)
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(5);

    const sessionContext = (sessions || []).map(s =>
      `[${s.date}] with ${s.mentor_name}: ${(s.notes || "No notes").substring(0, 250)}${s.mentor_reflection ? "\nReflection: " + s.mentor_reflection.substring(0, 150) : ""}`
    ).join("\n\n") || "No previous sessions.";

    const prompt = `You are a SilkFutures mentor assistant. A mentor is preparing for their next session. Give them a brief, practical prep note.

MENTOR: ${mentorName}
YOUNG PERSON: ${youngPersonName}
CURRENT STAGE: ${stage}

RECENT SESSIONS:
${sessionContext}

Write a 2-3 sentence prep note for ${mentorName} before their session with ${youngPersonName}. Be specific - reference what happened last time, suggest what to pick up on, mention anything to be mindful of. Keep it conversational, like a quick note from a colleague. No headers, no bullet points, just a natural paragraph.

Respond with ONLY valid JSON:
{"prep":"The prep note text"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500, messages: [{ role: "user", content: prompt }] }),
    });

    const data = await response.json();
    const text = data.content?.find(b => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Session prep error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

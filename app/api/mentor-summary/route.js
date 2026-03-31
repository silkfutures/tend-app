export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client
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
    const { youngPersonName, requestingMentorName, requestingMentorId } = await request.json();

    if (!youngPersonName) {
      return NextResponse.json({ error: "Young person name required" }, { status: 400 });
    }

    // Fetch ALL sessions for this young person — full data, server-side
    const { data: sessions, error } = await getSupabase()
      .from("sessions_full")
      .select("*")
      .eq("young_person_name", youngPersonName)
      .is("deleted_at", null)
      .order("date", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }

    // Only summarise sessions from OTHER mentors that don't already have a cached summary
    const otherMentorSessions = (sessions || []).filter(
      s => s.mentor_id !== requestingMentorId && !s.mentor_summary
    );

    if (!otherMentorSessions.length) {
      // Return any existing cached summaries for other mentors' sessions
      const cached = (sessions || [])
        .filter(s => s.mentor_id !== requestingMentorId && s.mentor_summary)
        .map(s => ({
          sessionId: s.id,
          summary: s.mentor_summary,
          hasSafeguarding: !!(s.safeguarding?.trim()),
        }));
      return NextResponse.json({ summaries: cached });
    }

    // Batch into groups of 8 to keep prompt size manageable
    const batches = [];
    for (let i = 0; i < otherMentorSessions.length; i += 8) {
      batches.push(otherMentorSessions.slice(i, i + 8));
    }

    const allSummaries = [];

    for (const batch of batches) {
      const sessionTexts = batch.map(s => {
        return `SESSION ${s.id}:
Date: ${s.date}
Mentor: ${s.mentor_name}
Focus: ${s.focus_step}
Duration: ${s.session_length}
Notes: ${s.notes || "No notes"}
Mentor Reflection: ${s.mentor_reflection || "None"}
Sensitive Notes: ${s.sensitive_notes || "None"}
Safeguarding: ${s.safeguarding || "None"}
Quick Scores: Regulation=${s.quick?.regulation || "?"}, Engagement=${s.quick?.engagement || "?"}, Overall=${s.quick?.overall || "?"}`;
      }).join("\n\n---\n\n");

      const prompt = `You are a SilkFutures youth mentor assistant. SilkFutures runs RAP and MUSIC PRODUCTION mentoring sessions with young people from high-deprivation areas in Cardiff.

You have access to FULL session data for ${youngPersonName}, including sensitive notes and safeguarding information. Your job is to create MENTOR-SAFE SUMMARIES — these will be shown to ${requestingMentorName}, who is a mentor (not a director).

CRITICAL RULES:
- NEVER include specific safeguarding disclosures (home situations, family details, court cases, bereavements, abuse, neglect, illness)
- NEVER include sensitive personal details the young person shared in confidence
- NEVER include content from the "Sensitive Notes" field
- DO include: general emotional state, creative progress, themes they're exploring in music, energy levels, what kind of session approach worked well
- DO include: practical context that helps the next mentor (e.g. "was working on a track they want to continue", "responded well to freestyle warmups", "was low energy — gentle start worked")
- If safeguarding concerns exist for a session, set hasSafeguarding to true — the UI will show a standard "check with directors" message. Don't describe the concern.
- Keep each summary to 2-3 sentences maximum
- Write like a mentor talking to another mentor — warm, specific, useful

Here are the sessions to summarise:

${sessionTexts}

Respond with ONLY valid JSON, no markdown:
{"summaries":[{"sessionId":"the session UUID","summary":"2-3 sentence mentor-safe summary","hasSafeguarding":true or false}]}`;

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

      if (parsed.summaries) {
        allSummaries.push(...parsed.summaries);

        // Cache each summary back to the sessions table for future requests
        for (const s of parsed.summaries) {
          if (s.sessionId && s.summary) {
            await getSupabase()
              .from("sessions")
              .update({ mentor_summary: s.summary })
              .eq("id", s.sessionId);
          }
        }
      }
    }

    // Also include any previously cached summaries
    const cached = (sessions || [])
      .filter(s => s.mentor_id !== requestingMentorId && s.mentor_summary)
      .map(s => ({
        sessionId: s.id,
        summary: s.mentor_summary,
        hasSafeguarding: !!(s.safeguarding?.trim()),
      }));

    return NextResponse.json({
      summaries: [...allSummaries, ...cached],
    });
  } catch (err) {
    console.error("Mentor summary API error:", err);
    return NextResponse.json({ error: "Failed to generate summaries" }, { status: 500 });
  }
}

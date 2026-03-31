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
    return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
  }

  try {
    const { youngPerson, stage, scores, weakAreas, recentNotes, generateThree } = await request.json();

    // Fetch full context server-side
    let fullContext = "";
    try {
      // Get YP record
      const { data: ypRecord } = await getSupabase()
        .from("young_people")
        .select("id")
        .eq("name", youngPerson)
        .single();

      if (ypRecord) {
        // Fetch recent sessions (all mentors, full data including sensitive)
        const { data: sessions } = await getSupabase()
          .from("sessions_full")
          .select("*")
          .eq("young_person_id", ypRecord.id)
          .is("deleted_at", null)
          .order("date", { ascending: false })
          .limit(8);

        // Fetch check-in responses
        const { data: checkins } = await getSupabase()
          .from("checkin_questionnaires")
          .select("*")
          .eq("young_person_id", ypRecord.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(3);

        // Fetch onboarding
        const { data: onboarding } = await getSupabase()
          .from("onboarding_assessments")
          .select("*")
          .eq("young_person_id", ypRecord.id)
          .order("created_at", { ascending: false })
          .limit(1);

        // Fetch YP feedback
        const { data: feedback } = await getSupabase()
          .from("yp_feedback")
          .select("*")
          .eq("young_person_id", ypRecord.id)
          .order("created_at", { ascending: false })
          .limit(5);

        // Build rich context
        if (sessions?.length) {
          fullContext += "\n\nFULL SESSION HISTORY (most recent first):\n";
          sessions.forEach(s => {
            fullContext += `\n[${s.date}] with ${s.mentor_name} — ${s.focus_step} — ${s.session_length}`;
            fullContext += `\nNotes: ${s.notes || "None"}`;
            if (s.mentor_reflection) fullContext += `\nMentor reflection: ${s.mentor_reflection}`;
            if (s.sensitive_notes?.trim()) fullContext += `\nSensitive context: ${s.sensitive_notes}`;
            if (s.safeguarding?.trim()) fullContext += `\nSafeguarding: ${s.safeguarding}`;
            if (s.quick) fullContext += `\nScores: Reg=${s.quick.regulation || "?"} Eng=${s.quick.engagement || "?"} Overall=${s.quick.overall || "?"}`;
            fullContext += "\n";
          });
        }

        if (checkins?.length) {
          fullContext += "\n\nRECENT CHECK-IN RESPONSES:\n";
          checkins.forEach(c => {
            const qs = c.questions || [];
            const rs = c.responses || {};
            fullContext += `\n[${new Date(c.completed_at).toLocaleDateString()}] Stage: ${c.stage}\n`;
            qs.forEach(q => {
              const a = rs[q.id];
              if (a !== undefined && a !== null) {
                const display = typeof a === "number" ? `${a}/4` : (typeof a === "object" ? `${a.label || a.emoji || a.value}` : a);
                fullContext += `  Q: ${q.question} → A: ${display}\n`;
              }
            });
          });
        }

        if (onboarding?.[0]) {
          fullContext += `\n\nONBOARDING: Suggested stage: ${onboarding[0].suggested_stage}. Notes: ${onboarding[0].notes || "None"}\n`;
        }

        if (feedback?.length) {
          fullContext += "\n\nYP FEEDBACK (their own words):\n";
          feedback.forEach(fb => {
            const r = fb.responses || {};
            if (r.yp_takeaway) fullContext += `  Takeaway: "${r.yp_takeaway}"\n`;
            if (r.yp_next) fullContext += `  Next time: "${r.yp_next}"\n`;
          });
        }
      }
    } catch (e) {
      console.warn("Session plan: couldn't fetch full context:", e);
    }

    const prompt = `You are a SilkFutures youth mentor assistant. SilkFutures is a Cardiff-based CIC running mentoring sessions with young people from high-deprivation areas (Ely, Grangetown, Trowbridge, St Mellons) in Cardiff. Sessions use RAP, MUSIC PRODUCTION, and CREATIVE WORK as the vehicle — but the session is not always about making a song.

CRITICAL: Match the session format to the young person's current stage and needs. Not every session should be "write a song". The activity should serve the developmental goal.

SESSION ACTIVITY TYPES (use the right one for the stage):
- CONVERSATION: Structured reflective dialogue. Pulse Card-led, theme-led, or open. Primary tool for Reset and Reframe. Can be the whole session.
- LISTENING: Playing a track (theirs, a published track, or something the mentor brings) and discussing what it brings up. Low-pressure creative engagement.
- FREEWRITE: Timed, unstructured writing. Bars, thoughts, lists, stream of consciousness. No quality expectation. Builds creative muscle.
- VOICE NOTE: Recording a short personal voice memo. Private, low-stakes expression. Good for Reset when the mic feels too much.
- PULSE CARD: Drawing a Pulse Card and using it as the session anchor. 15-20 minutes of unpacking. The conversation IS the session.
- SONGWRITING: Writing bars, hooks, verses with intention. This is Rebuild-onwards. Don't default to this for Reset/Reframe unless the YP is ready.
- RECORDING: Studio work — takes, delivery, quality. Rebuild-onwards. Implies they have material to record.
- REVIEW: Listening back to their own work and interrogating it. Release-onwards. "Why this word? Who is this for?"
- PEER WORK: Working with or mentoring another young person. Rise stage. Giving feedback, co-facilitating, supporting.
- COLLABORATION: Working together with the mentor or another YP on a shared track.

STAGE WEIGHTING — how to distribute activity types:
RESET: 70% conversation/listening/pulse-card, 20% freewrite/voice-note, 10% songwriting. The session might be entirely relational. That's fine. The win is them staying and engaging.
REFRAME: 50% conversation/pulse-card, 30% freewrite/listening, 20% songwriting. Reflection-heavy. The creative work serves the self-awareness, not the other way around.
REBUILD: 20% conversation, 60% songwriting/recording/freewrite, 20% collaboration. This is where creative discipline matters. Push for completion and quality.
RELEASE: 20% conversation/review, 60% songwriting/recording, 20% peer-work. Intentionality in expression. Challenge the work.
RISE: 30% peer-work/conversation, 40% songwriting/recording, 30% review. Leadership-oriented. Step back and let them lead.

THE PATHWAYS FRAMEWORK — each stage has specific learning points:

RESET (Stabilising inner world):
- Feeling safe in the space
- Basic emotional regulation — being able to sit with discomfort without exploding or shutting down
- Trust in the mentor relationship
- Showing up consistently
- Beginning to use music as an outlet rather than holding everything in
- Learning that the studio is their space, not a place of judgement

REFRAME (Rewriting identity & beliefs):
- Challenging "I can't" or "I'm not good enough" narratives through creative evidence
- Separating identity from circumstances — "I'm from Ely" doesn't define the ceiling
- Processing difficult experiences through lyrics without being consumed by them
- Developing a creative identity — "I'm someone who makes music"
- Seeing their own story as material, not just pain
- Building capacity to reflect on their own patterns

REBUILD (Discipline, skills, creative practice):
- Consistent creative output — finishing tracks, not just starting them
- Technical skill development — flow, delivery, writing structure, studio skills
- Discipline without rigidity — showing up, doing the work, accepting imperfection
- Collaborating with others in the studio
- Setting creative goals and following through
- Building a body of work they're proud of

RELEASE (Responsible creative voice):
- Understanding the weight of their words — who hears this, what does it say
- Creating with intention, not just reaction
- Sharing work publicly with awareness of impact
- Mentoring others informally — "showing younger ones"
- Taking ownership of their creative direction
- Navigating the tension between authenticity and responsibility

RISE (Leadership & contribution):
- Actively supporting others' creative journeys
- Running or co-leading sessions
- Using their platform (however small) deliberately
- Contributing to the community through their art
- Becoming someone others look up to — and handling that well
- Giving back to the programme that held them

YOUNG PERSON: ${youngPerson}
CURRENT STAGE: ${stage}
PATHWAY SCORES: ${scores || "No scores yet"}
WEAKEST AREAS: ${weakAreas || "Not enough data yet"}
${fullContext}

YOUR TASK: Generate ${generateThree ? "3 DIFFERENT" : "a"} session plan${generateThree ? "s" : ""} for ${youngPerson}.

CRITICAL INSTRUCTIONS:
- Each plan should target a SPECIFIC learning point from ${youngPerson}'s current stage (${stage}) listed above
- Choose the activity type that best serves that learning point — NOT always songwriting
- For Reset/Reframe, the opening activity might BE most of the session. A 25-minute conversation with a 10-minute freewrite is a valid session plan.
- Connect the session to what's actually happening in ${youngPerson}'s life
- Name the specific learning point being targeted
- Name the activity type in the plan (conversation, songwriting, recording, etc.)
- If there are safeguarding concerns, factor that into HOW you approach the session
- The "theme" should connect their current life context to the pathway learning point
${generateThree ? "- Each of the 3 plans should target a DIFFERENT learning point and ideally use DIFFERENT activity types" : ""}

Respond with ONLY valid JSON:
${generateThree ? `{"plans":[{"sessionAim":"One clear sentence connecting their life to the learning point","focusArea":"The specific learning point from the pathway stage","theme":"2-4 word theme","openingActivity":{"title":"Name","duration":"X mins","description":"How to start — informed by where they're at"},"mainActivity":{"title":"Name","duration":"X mins","description":"Core music work — specific to their themes and skills"},"closingActivity":{"title":"Name","duration":"5 mins","description":"Closing that reinforces the learning point"},"pulseCards":[{"type":"Unpack","prompt":"Q"},{"type":"Spark","prompt":"Q"}],"mentorNote":"One sentence about what to hold in mind given their current context"},{"sessionAim":"...","focusArea":"...","theme":"...","openingActivity":{"title":"...","duration":"...","description":"..."},"mainActivity":{"title":"...","duration":"...","description":"..."},"closingActivity":{"title":"...","duration":"...","description":"..."},"pulseCards":[{"type":"Unpack","prompt":"Q"},{"type":"Go Deeper","prompt":"Q"}],"mentorNote":"..."},{"sessionAim":"...","focusArea":"...","theme":"...","openingActivity":{"title":"...","duration":"...","description":"..."},"mainActivity":{"title":"...","duration":"...","description":"..."},"closingActivity":{"title":"...","duration":"...","description":"..."},"pulseCards":[{"type":"Spark","prompt":"Q"},{"type":"Go Deeper","prompt":"Q"}],"mentorNote":"..."}]}`
: `{"sessionAim":"One clear sentence","focusArea":"The specific learning point","theme":"2-4 word theme","openingActivity":{"title":"Name","duration":"X mins","description":"How to start"},"mainActivity":{"title":"Name","duration":"X mins","description":"Core music work"},"closingActivity":{"title":"Name","duration":"5 mins","description":"Closing"},"pulseCards":[{"type":"Unpack","prompt":"Q"},{"type":"Spark","prompt":"Q"},{"type":"Go Deeper","prompt":"Q"}],"watchFors":["Thing","Another"],"mentorNote":"One sentence"}`}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: generateThree ? 3000 : 1500, messages: [{ role: "user", content: prompt }] }),
    });

    const data = await response.json();
    const text = data.content?.find((b) => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const plan = JSON.parse(clean);
    return NextResponse.json(plan);
  } catch (err) {
    console.error("Session plan error:", err);
    return NextResponse.json({ error: "Failed to generate session plan" }, { status: 500 });
  }
}

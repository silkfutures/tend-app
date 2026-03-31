export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextResponse } from "next/server";

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const CONTEXT = `You are a SilkFutures youth mentor assistant. SilkFutures is a Cardiff-based CIC running music mentoring sessions with young people from high-deprivation areas (Ely, Grangetown, Trowbridge, St Mellons, etc).

CRITICAL CONTEXT — what these sessions actually are:
- These are RAP and MUSIC PRODUCTION sessions. Young people come to the studio to write bars, record songs, freestyle, find beats, and develop their sound.
- The creative work IS the mentoring. Writing lyrics is how these young people process their lives. The music is the vehicle for self-expression, emotional processing, and personal growth.
- Many of these young people are street-involved, have experience with gangs, violence, care systems, difficult home situations. The language is raw, the content can be aggressive — that's real, not a problem to fix.
- A typical session: arrive, reconnect/chat, find or pick a beat, write bars, record, mix, sometimes freestyle. Some sessions are chill, some are intense. The mentor follows the young person's energy.
- Sessions happen in studios (SilkCrayon), community centres (Boys & Girls clubs), and sometimes outside or over food.
- The mentor's role is to hold space, guide the creative process, help them develop their craft AND their self-awareness through music. Not therapy — mentoring through music.
- The Pathways framework: Reset (stabilising), Reframe (rewriting beliefs), Rebuild (discipline + creative practice), Release (responsible creative voice), Rise (leadership).`;

  try {
    const body = await request.json();
    const { type } = body;

    let prompt;

    if (type === "reconnect") {
      const { youngPerson, stage, lastNotes, lastDate, lastMentorReflection, isGroup, participants } = body;
      const participantList = isGroup && participants?.length ? `\nGROUP SESSION with: ${participants.join(", ")}` : "";
      const isFirstSession = !lastNotes || lastNotes === "No previous notes" || !lastDate;

      prompt = isFirstSession ? `${CONTEXT}

You're about to start a FIRST EVER session with ${youngPerson}.${participantList}
Their current stage: ${stage}
This is their first session — you have no history together yet.

Generate 3-4 natural things to talk about to get to know them and make them feel comfortable. These should NOT reference any previous sessions (there are none). Focus on: what music they're into, what brought them here, what they're hoping to get out of it, what they've been listening to. Keep it casual and low-pressure — the goal is just to connect, not interrogate. Also suggest a low-pressure way to ease into the session.

Respond with ONLY valid JSON:
{"talkingPoints":["Natural first-session question","Another","Another"],"openingActivity":{"name":"Activity name","description":"One sentence — what to do together to break the ice","duration":"5-10 mins"},"mentorReminder":"One sentence — what to hold in mind for a first session"}` : `${CONTEXT}

You're about to start a session with ${youngPerson}.${participantList}
Their current stage: ${stage}
Last session (${lastDate || "unknown date"}):
Notes: ${lastNotes || "No previous notes"}
Mentor reflection: ${lastMentorReflection || "None"}

Generate 3-4 natural reconnect talking points — things to bring up from last time or check in about. These should feel like how a mentor actually talks to a young person, not clinical. Also suggest a low-pressure way to ease into the session (could be playing a beat, freestyling, listening to something, just chatting).

Respond with ONLY valid JSON:
{"talkingPoints":["Natural thing to ask about","Another","Another"],"openingActivity":{"name":"Activity name","description":"One sentence — what to do","duration":"5-10 mins"},"mentorReminder":"One sentence — what to hold in mind"}`;

    } else if (type === "plan") {
      const { youngPerson, stage, scores, recentNotes, cardResponses, isGroup, participants } = body;
      const participantList = isGroup && participants?.length ? `\nGROUP SESSION with: ${participants.join(", ")}` : "";

      const cardContext = cardResponses?.length
        ? `\nCARD RESPONSES FROM TODAY:\n${cardResponses.map(r => `- [${r.cardType.toUpperCase()}] ${r.question}: "${r.answer}"`).join("\n")}`
        : "";

      prompt = `${CONTEXT}

YOUNG PERSON: ${youngPerson}${participantList}
CURRENT STAGE: ${stage}
SCORES: ${scores || "No scores yet"}
RECENT NOTES: ${recentNotes || "None"}${cardContext}

${cardResponses?.length ? "IMPORTANT: The young person has already shared responses during card work. Adapt the session plan to what they've revealed. If they named a theme, build the session around making a track with that theme. If they're carrying something heavy, give space for that. If they're energised and wanting to go hard, lean into production." : ""}

Generate a session plan for a RAP/MUSIC PRODUCTION session. This means: writing bars, recording, finding beats, maybe freestyling. NOT meditation, NOT art therapy, NOT generic wellbeing activities.

Respond with ONLY valid JSON:
{"sessionAim":"One clear sentence","theme":"2-4 word theme","openingActivity":{"title":"Name","duration":"X mins","description":"How to start — could be playing a beat, freestyling, listening back to old work, just vibing"},"mainActivity":{"title":"Name","duration":"X mins","description":"Core music/creative work — be specific about what they're making"},"closingActivity":{"title":"Name","duration":"5 mins","description":"How to wind down — could be listening back, talking about what they made, setting homework"},"mentorNote":"One honest sentence about what to hold lightly"}`;

    } else if (type === "cards") {
      const { youngPerson, stage, cardType, recentNotes, previousResponses, isGroup, participants } = body;
      const participantList = isGroup && participants?.length ? `\nGROUP SESSION with: ${participants.join(", ")}` : "";

      const prevContext = previousResponses?.length
        ? `\nAlready asked and answered:\n${previousResponses.map(r => `- "${r.question}" → "${r.answer}"`).join("\n")}`
        : "";

      const cardDescription = cardType === "signal"
        ? "Signal cards are used DURING or AFTER creative work. They help a young person interrogate what they've just written or recorded — peeling back the layers of their bars to find what's underneath. These are NOT check-in questions. They're reflection-in-action prompts that sit inside the creative process. Think: 'Every bar has a target — who are you really talking to in this one?' or 'What's the feeling underneath the hardest line in this?'"
        : "Spark cards are used BEFORE or AT THE START of creative work. They help a young person find inspiration — song titles, themes, directions, ideas. They give permission to go somewhere new creatively. Think: 'If this session had no rules — what would you make?' or 'Who in your world deserves a track? What would it say?'";

      prompt = `${CONTEXT}

YOUNG PERSON: ${youngPerson}${participantList}
CURRENT STAGE: ${stage}
RECENT CONTEXT: ${recentNotes || "None"}${prevContext}

${cardDescription}

Generate 3 ${cardType} cards that complement the core deck. Each card should be specific to this young person's situation and stage. Keep the tone real — how a mentor in a Cardiff studio actually talks to a young person writing rap.

Respond with ONLY valid JSON:
{"cards":[{"question":"The prompt","hint":"One-line mentor hint","mapsTo":"What this reveals"}]}`;

    } else {
      return NextResponse.json({ error: "Unknown request type" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.find((b) => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Live session API error:", err);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}

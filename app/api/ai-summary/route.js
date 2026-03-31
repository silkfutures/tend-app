export const dynamic = "force-dynamic";
export const maxDuration = 300;
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Anthropic API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { type, ...payload } = await request.json();

    let prompt = "";

    if (type === "yp-summary") {
      const { name, stage, sessionNotes } = payload;
      prompt = `You are a SilkFutures youth mentor assistant. SilkFutures is a Cardiff-based CIC running RAP and MUSIC PRODUCTION mentoring sessions with young people from high-deprivation areas.

The Pathways framework stages: Reset (stabilising inner world), Reframe (rewriting identity & beliefs), Rebuild (discipline, skills, creative practice), Release (responsible creative voice), Rise (leadership & contribution).

YOUNG PERSON: ${name}
CURRENT STAGE: ${stage}
RECENT SESSION DATA:
${sessionNotes}

Write a narrative summary of where ${name} is at right now. This should read like a mentor update — warm, honest, specific to their journey. Cover:
- Their current emotional/creative state
- Patterns across sessions (positive and concerning)
- Key themes in their work and expression
- Areas of real growth
- Any concerns or flags
- What to focus on in their next session

Write 2-3 paragraphs. Be specific — reference actual session details. Don't be generic.

Respond with ONLY valid JSON, no markdown:
{"summary":"The full narrative summary paragraphs","patterns":["Pattern 1","Pattern 2","Pattern 3"],"recommendation":"One clear recommendation for their next session","concerns":"Any concerns to be aware of, or empty string if none"}`;
    } else if (type === "enhance-notes") {
      const { name, stage, rawNotes, rawReflection, cardResponses, focusStep } = payload;
      prompt = `You are a SilkFutures youth mentor assistant. A mentor has just finished a session and written quick notes. Your job is to turn their rough notes into a proper, detailed session summary — keeping their voice and all their observations, but making it read well, filling in any implied details, and structuring it properly.

YOUNG PERSON: ${name}
CURRENT STAGE: ${stage}
FOCUS STEP: ${focusStep}

MENTOR'S RAW SESSION NOTES:
${rawNotes || "No notes provided"}

MENTOR'S RAW REFLECTION:
${rawReflection || "No reflection provided"}

${cardResponses ? `CARD RESPONSES FROM SESSION:\n${cardResponses}` : ""}

Take the mentor's raw notes and reflection and enhance them into a proper session summary. Keep ALL the information they wrote — don't remove anything. But:
- Make the language clear and professional
- Add structure with natural flow
- Expand on implied points
- Keep the mentor's authentic voice
- Don't add information that wasn't there or implied
- The MENTOR REFLECTION must be written in FIRST PERSON ("I noticed...", "I felt...", "I was able to...") — never refer to the mentor in third person ("The mentor noticed...")
- The SESSION NOTES can use third person when describing what happened, but any mentor observations should still use first person
- Use British English spelling throughout (e.g. 'recognised' not 'recognized', 'emphasising' not 'emphasizing', 'behaviour' not 'behavior', 'organisation' not 'organization', 'colour' not 'color', 'practise' not 'practice' for the verb)

Respond with ONLY valid JSON, no markdown:
{"enhancedNotes":"The enhanced session notes (2-4 paragraphs)","enhancedReflection":"The enhanced mentor reflection (1-2 paragraphs)"}`;
    } else if (type === "voice-reflection") {
      const { transcript, name, stage } = payload;
      prompt = `You are a SilkFutures youth mentor assistant. A mentor has just recorded a voice reflection after their session. The speech-to-text transcript is below. Your job is to listen to everything they said and sort it into three categories:

1. SESSION NOTES — what happened in the session, key moments, breakthroughs, challenges, what the young person did/said. This ALSO includes pastoral observations like sleep issues, peer dynamics, energy levels, behaviour patterns, friendship tensions, or anything worth noting for future sessions. These are important observations but they are NOT safeguarding.

2. MENTOR REFLECTION — how the mentor showed up, what they noticed about themselves, what they'd do differently, what worked well.

3. SAFEGUARDING — ONLY for serious child protection concerns. This means: disclosures of abuse (physical, emotional, sexual, neglect), self-harm or suicidal ideation, involvement in criminal exploitation, domestic violence, substance misuse by a carer, or any situation where a child is at risk of significant harm. 

CRITICAL: The safeguarding field should almost always be an empty string. Most sessions have NO safeguarding concerns. The following are NOT safeguarding and should go in session notes instead:
- Tiredness, poor sleep, uncomfortable sleeping arrangements
- Peer conflict, playfighting, tension between young people
- Low mood, feeling stressed about school or exams
- Family arguments (unless there is a disclosure of abuse or violence)
- Behavioural issues in sessions
- General pastoral concerns about wellbeing

YOUNG PERSON: ${name}
CURRENT STAGE: ${stage}

VOICE TRANSCRIPT:
${transcript}

Take the raw transcript and turn it into well-written content for each box. Keep the mentor's voice and all their observations. Flesh out implied points. Don't invent information that wasn't in the transcript.

IMPORTANT:
- The REFLECTION section must be written in FIRST PERSON ("I noticed...", "I was able to...") — never refer to the mentor in third person ("The mentor noticed...")
- The NOTES section can use third person for describing what happened, but any mentor observations should still use first person
- Use British English spelling throughout (e.g. 'recognised' not 'recognized', 'emphasising' not 'emphasizing', 'behaviour' not 'behavior', 'organisation' not 'organization')

Respond with ONLY valid JSON, no markdown:
{"notes":"Session notes including pastoral observations (1-3 paragraphs)","reflection":"Mentor reflection (1-2 paragraphs)","safeguarding":"ONLY genuine child protection concerns, or empty string if none"}`;
    } else if (type === "impact-report") {
      const { projectName, funder, dateRange, totalSessions, uniqueYP, stageDistribution, quickScoreAverages, safeguardingFlags, mentorsActive, locations, notesSnippets, ypJourneys, objectives, fundingBrief } = payload;

      const parsedObjectives = (() => { try { return JSON.parse(objectives || "[]"); } catch { return []; } })();
      const parsedJourneys = (() => { try { return JSON.parse(ypJourneys || "[]"); } catch { return []; } })();
      const parsedScores = (() => { try { return JSON.parse(quickScoreAverages || "{}"); } catch { return {}; } })();

      const objectivesBlock = parsedObjectives.length > 0
        ? `\nFUNDING OBJECTIVES (you MUST evidence each one specifically):\n${parsedObjectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\nFor EACH objective above, you must provide a dedicated section with:\n- Quantitative evidence (score trends, session counts, progression data)\n- Qualitative evidence (specific examples from session notes, named YP journeys where appropriate)\n- A clear narrative connecting the data to the outcome\n`
        : "";

      const fundingBriefBlock = fundingBrief
        ? `\nFUNDER BRIEF / CONTEXT:\n${fundingBrief.slice(0, 2000)}\n\nUse the language and framing from this brief to shape how you present the evidence. Mirror the funder's terminology where possible.\n`
        : "";

      const journeysBlock = parsedJourneys.length > 0
        ? `\nINDIVIDUAL YOUNG PERSON JOURNEYS:\n${parsedJourneys.map(j => `--- ${j.name} (${j.sessions} sessions, ${j.firstStage} → ${j.lastStage}${j.moved ? " ✓ PROGRESSED" : ""}) ---\nScore trends (early → recent): ${Object.entries(j.scoreTrend).map(([k, v]) => `${k}: ${v.early} → ${v.recent}`).join(", ")}\nSession notes:\n${j.notesSummary}\n${j.reflections ? `Mentor reflections:\n${j.reflections}` : ""}`).join("\n\n")}`
        : "";

      const scoresBlock = Object.keys(parsedScores).length > 0
        ? `\nDETAILED SCORE AVERAGES (out of 4):\n${Object.entries(parsedScores).map(([k, v]) => `- ${k}: ${v || "no data"}`).join("\n")}`
        : "";

      prompt = `You are writing a thorough, evidence-based impact report for SilkFutures CIC, a Cardiff-based community interest company delivering music-based mentoring and wellbeing programmes for young people aged 11-25 in high-deprivation communities.

PROJECT: ${projectName}
${funder ? `FUNDER: ${funder}` : ""}
DATE RANGE: ${dateRange}
LOCATIONS: ${locations}

AGGREGATE DATA:
- Total sessions delivered: ${totalSessions}
- Unique young people engaged: ${uniqueYP}
- Active mentors: ${mentorsActive}
- Stage distribution: ${stageDistribution}
- Safeguarding flags raised: ${safeguardingFlags}
${scoresBlock}
${objectivesBlock}${fundingBriefBlock}${journeysBlock}

SESSION NOTES (qualitative evidence bank — mine these for specific examples):
${notesSnippets || "No detailed notes available"}

INSTRUCTIONS:
Write a comprehensive, funder-ready impact report. This must be THOROUGH — not a summary, but a proper evidenced document.

${parsedObjectives.length > 0 ? `CRITICAL: Structure the outcomes section around the specific funding objectives provided. Each objective gets its own subsection with dedicated evidence. Do not merge them or skip any. Use real names and real examples from the session data where possible.` : "Structure around: confidence & self-expression, emotional regulation, engagement & belonging, creative development, and any other themes visible in the data."}

The report should include:
1. Executive Summary (2-3 paragraphs — the headline story)
2. Key Metrics with context (not just numbers — what they mean)
3. Outcomes Evidence (${parsedObjectives.length > 0 ? "one section PER funding objective" : "structured by theme"} — each with quantitative data AND qualitative examples from session notes. Reference specific young people's journeys.)
4. Case Studies (2-3 detailed YP journeys showing progression, drawn from the individual journey data above)
5. Challenges and how they were addressed
6. Recommendations for the next period

Be specific. Use actual names, dates, and quotes from session notes. This should read like a real impact report that evidences real change — not generic filler.

Respond with ONLY valid JSON, no markdown:
{"title":"Report title","subtitle":"Date range and project","executiveSummary":"2-3 thorough paragraphs","keyMetrics":"Detailed metrics with context and meaning","outcomesEvidence":"${parsedObjectives.length > 0 ? "Structured by each funding objective with dedicated evidence sections. Use clear subheadings for each objective." : "Structured by theme with evidence for each."}","caseStudies":"2-3 detailed individual YP journeys showing progression","challenges":"1-2 paragraphs","recommendations":"5-7 clear recommendations as paragraphs"}`;

    } else if (type === "derive-pathway-scores") {
      // Background AI scoring: derive pathway step averages from session notes + quick indicators
      const { sessionIds, focusStep, notes, mentorReflection, quick, ypName } = payload;
      const STEPS = ["Reset", "Reframe", "Rebuild", "Release", "Rise"];
      const quickStr = Object.entries(quick || {}).map(([k, v]) => `${k}: ${v}/5`).join(", ");

      prompt = `You are a SilkFutures youth development assessor. Based on the following session data, derive scores (1.0 to 5.0, in 0.5 increments) for each of the 5 Pathways stages.

The Pathways framework stages and what they measure:
- Reset: Stabilising inner world (consistency, emotional regulation, safety/trust, detaching from harmful influences, help-seeking)
- Reframe: Rewriting identity & beliefs (self-awareness, creative reflection, identity work, perspective-taking, challenging narratives)
- Rebuild: Discipline, skills, creative practice (work ethic, skill development, creative output, collaboration, goal-setting)
- Release: Responsible creative voice (authentic expression, public output, leadership moments, ownership of creative identity)
- Rise: Leadership & contribution (mentoring others, community contribution, independent decision-making, legacy thinking)

YOUNG PERSON: ${ypName}
FOCUS STEP THIS SESSION: ${focusStep}
SESSION INDICATORS: ${quickStr}

SESSION NOTES:
${(notes || "").substring(0, 500)}

MENTOR REFLECTION:
${(mentorReflection || "").substring(0, 300)}

Score each step based on the evidence available. If there's no evidence for a step, score it null. The focus step should have the strongest evidence. Be conservative — don't inflate scores without evidence.

Respond with ONLY valid JSON:
{"Reset":3.0,"Reframe":null,"Rebuild":2.5,"Release":null,"Rise":null}`;

      // For this type, we process differently — update DB after getting scores
      const response2 = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 500, messages: [{ role: "user", content: prompt }] }),
      });
      const data2 = await response2.json();
      const text2 = data2.content?.find(b => b.type === "text")?.text || "";
      const clean2 = text2.replace(/```json|```/g, "").trim();
      const stepScores = JSON.parse(clean2);

      // Convert nulls and build stepAverages object
      const stepAverages = {};
      STEPS.forEach(s => {
        if (stepScores[s] !== null && stepScores[s] !== undefined) {
          stepAverages[s] = parseFloat(stepScores[s]).toFixed(1);
        }
      });

      // Update the session records in Supabase
      if (sessionIds?.length) {
        const supabase = getSupabase();
        for (const sid of sessionIds) {
          await supabase.from("sessions").update({ step_averages: stepAverages }).eq("id", sid);
        }
      }

      return NextResponse.json({ stepAverages, derived: true });

    } else {
      return NextResponse.json({ error: "Unknown summary type" }, { status: 400 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: type === "impact-report" ? "claude-sonnet-4-20250514" : "claude-sonnet-4-20250514",
        max_tokens: type === "impact-report" ? 8000 : 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.find((b) => b.type === "text")?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(clean);

    return NextResponse.json(result);
  } catch (err) {
    console.error("AI summary error:", err);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

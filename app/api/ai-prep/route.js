import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { youngPersonName, stage, sessions, orgName } = await req.json()

    const recentNotes = (sessions || [])
      .slice(0, 5)
      .map((s, i) => `Session ${sessions.length - i} (${s.date}): ${s.notes || 'No notes'}`)
      .join('\n\n')

    const indicators = sessions?.[0]?.indicators || {}
    const scoreLines = Object.entries(indicators)
      .map(([k, v]) => `${k}: ${v}/10`)
      .join(', ')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are Tend Intelligence — an AI assistant for youth mentors. Generate a session prep briefing for the upcoming session.

Young person: ${youngPersonName}
Organisation: ${orgName || 'Youth mentoring organisation'}
Current pathway stage: ${stage}
Recent scores: ${scoreLines || 'No scores yet'}

Recent session notes:
${recentNotes || 'No previous sessions recorded yet.'}

Generate a JSON response with exactly these fields:
{
  "insight": "2-3 sentences about where this young person is right now, what patterns you notice, what to hold gently going into today. Write in observational, non-clinical language. Second person to the mentor (you/they).",
  "sparkQuestion": "One powerful open question to open the session with. Should feel natural, not clinical. Related to their stage and recent themes.",
  "holdInMind": ["3-5 short phrases", "things the mentor should hold", "going into this session"],
  "stageGuidance": "One sentence about what the ${stage} stage means for how to show up today."
}

Return only valid JSON, no other text.`
      }]
    })

    const text = message.content[0].text
    const json = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Response.json(json)

  } catch (e) {
    console.error('AI prep error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

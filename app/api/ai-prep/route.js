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

    const stageDescriptions = {
      Early:       'building safety, trust and basic engagement',
      Developing:  'growing self-awareness and beginning to reflect on patterns',
      Established: 'taking ownership and building on strengths',
      Advanced:    'consolidating progress and developing resilience',
      Leading:     'moving forward with agency and supporting others',
    }

    const stageDesc = stageDescriptions[stage] || 'developing through the programme'

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are Tend Intelligence — an AI assistant built for youth practitioners. Generate a session prep briefing for an upcoming session.

Young person: ${youngPersonName}
Organisation: ${orgName || 'Youth support organisation'}
Current stage: ${stage} (${stageDesc})
Recent scores: ${scoreLines || 'No scores yet'}

Recent session notes:
${recentNotes || 'No previous sessions recorded yet. This appears to be an early session.'}

Generate a JSON response with exactly these fields:
{
  "insight": "2-3 sentences about where this young person is right now based on their history. What patterns do you notice? What should the practitioner hold gently going into today? Write in warm, observational, non-clinical language. Address the practitioner as 'you'.",
  "sparkQuestion": "One powerful open question to open the session with. Should feel conversational, not clinical. Appropriate for the ${stage} stage.",
  "holdInMind": ["3-5 short phrases", "things the practitioner should hold", "going into this session"],
  "stageGuidance": "One sentence about what the ${stage} stage means for how to show up today with this young person."
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

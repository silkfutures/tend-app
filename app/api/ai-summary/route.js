import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { youngPersonName, stage, notes, arrival } = await req.json()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `You are Tend Intelligence. A mentor has written raw session notes after working with a young person. Structure them into a clean session summary.

Young person: ${youngPersonName}
Pathway stage: ${stage}
How they arrived: ${arrival || 'Not recorded'}
Raw notes: ${notes}

Generate a JSON response with:
{
  "summary": "2-3 sentences. Clear, observational, non-clinical. What happened, what shifted, what was notable. Written as if for a professional case record but in warm human language.",
  "patterns": ["up to 3 short phrases", "patterns or themes noticed"],
  "nextSession": "One sentence suggesting what to pick up or explore next session based on what emerged today."
}

Return only valid JSON, no other text.`
      }]
    })

    const text = message.content[0].text
    const json = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Response.json(json)

  } catch (e) {
    console.error('AI summary error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

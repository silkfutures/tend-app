import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { youngPersonName, stage, notes, arrival, contactType } = await req.json()

    const isVoice = notes && (notes.includes('  ') || notes.length > 200)
    const voiceNote = isVoice
      ? `\n\nIMPORTANT: These notes were captured via voice recording and may contain transcription artefacts, repetition, filler words, incomplete sentences, or grammatical errors. Clean them up into professional prose while preserving every piece of meaningful content. Do not lose any details — just make it read well.`
      : ''

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are Tend Intelligence. A youth practitioner has written raw session notes after working with a young person. Transform them into a clean, professional session record.${voiceNote}

Young person: ${youngPersonName}
Pathway stage: ${stage}
How they arrived: ${arrival || 'Not recorded'}
Contact type: ${contactType || 'Face-to-face session'}
Raw notes:
${notes}

Generate a JSON response with:
{
  "summary": "A clean, professional session record in 3-5 sentences. Written in past tense, third person ('Marcus arrived...', 'They discussed...'). Observational, non-clinical language. Should read like a well-written case note that captures what happened, what was discussed, any shifts or concerns, and the overall tone of the interaction. Preserve all specific details, quotes, and observations from the raw notes — just clean up the language.",
  "cleanedNotes": "The full raw notes rewritten as clean, readable prose. Fix grammar, remove filler words and repetition, structure into clear paragraphs. This should be the practitioner's notes as they would have written them if they had time to write properly. Keep the practitioner's voice and first-person perspective where appropriate. Preserve ALL details.",
  "patterns": ["up to 3 short phrases", "patterns or themes noticed"],
  "nextSession": "One sentence suggesting what to pick up or explore next session based on what emerged today.",
  "riskFlags": ["any risk indicators mentioned in the notes, e.g. 'substance use mentioned', 'disclosed carrying weapon', 'school exclusion'. Return empty array if none."]
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

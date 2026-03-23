import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { orgName, sessions, youngPeople, dateFrom, dateTo } = await req.json()

    const totalSessions = sessions.length
    const uniqueYP = [...new Set(sessions.map(s => s.young_person_id))].length
    const sgCount = sessions.filter(s => s.safeguarding_concern).length

    const ypJourneys = youngPeople.slice(0, 8).map(yp => {
      const ypSessions = sessions.filter(s => s.young_person_id === yp.id)
      const latest = ypSessions[0]
      const earliest = ypSessions[ypSessions.length - 1]
      return `${yp.name}: ${ypSessions.length} sessions, started ${earliest?.focus_step || 'Reset'} → now ${latest?.focus_step || 'Reset'}`
    }).join('\n')

    const notesSnippet = sessions
      .filter(s => s.notes)
      .slice(0, 15)
      .map(s => `[${s.date}]: ${s.notes?.slice(0, 200)}`)
      .join('\n\n')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are Tend Intelligence. Generate a quarterly impact report for a youth mentoring organisation.

Organisation: ${orgName}
Period: ${dateFrom || 'Q1'} to ${dateTo || 'present'}
Total sessions: ${totalSessions}
Young people supported: ${uniqueYP}
Safeguarding concerns raised: ${sgCount}

Young people journeys:
${ypJourneys}

Session notes sample:
${notesSnippet}

Generate a JSON response with:
{
  "executiveSummary": "3-4 sentences. Professional, evidence-based summary of the quarter's work. Suitable for a funder or commissioner.",
  "keyMetrics": "2-3 sentences about what the numbers show.",
  "outcomesEvidence": "3-4 sentences drawing from the session notes to evidence real change in young people. Use observational language.",
  "highlights": ["2-4 specific things", "that stood out this quarter"],
  "recommendations": "2-3 sentences about what the data suggests for the next quarter."
}

Return only valid JSON, no other text.`
      }]
    })

    const text = message.content[0].text
    const json = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Response.json(json)

  } catch (e) {
    console.error('Impact report error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}

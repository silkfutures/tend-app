import { getServiceClient } from '@/lib/supabase'

export async function POST(req) {
  const { action, email, name, orgName, userId } = await req.json()
  const sb = getServiceClient()

  if (action === 'signup') {
    if (!userId || !email || !name || !orgName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let org
    const { data: existingOrg } = await sb
      .from('organisations')
      .select('*')
      .ilike('name', orgName.trim())
      .single()

    if (existingOrg) {
      org = existingOrg
    } else {
      const { data: newOrg, error: orgErr } = await sb
        .from('organisations')
        .insert({ name: orgName.trim() })
        .select()
        .single()
      if (orgErr) return Response.json({ error: orgErr.message }, { status: 500 })
      org = newOrg
    }

    const { error: mentorErr } = await sb.from('mentors').insert({
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      org_id: org.id,
      role: existingOrg ? 'mentor' : 'admin',
    })

    if (mentorErr) return Response.json({ error: mentorErr.message }, { status: 500 })
    return Response.json({ success: true, orgId: org.id })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return Response.json(null)

  const sb = getServiceClient()
  const { data: mentor, error } = await sb
    .from('mentors')
    .select('*, organisations(*)')
    .eq('id', userId)
    .single()

  if (error) return Response.json(null)
  return Response.json(mentor)
}

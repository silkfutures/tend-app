import { getServiceClient } from '@/lib/supabase'

export async function POST(req) {
  const { action, email, name, orgName, userId } = await req.json()
  const sb = getServiceClient()

  if (action === 'signup') {
    if (!email || !name || !orgName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Store pending signup details so we can create the profile after confirmation
    // We use a pending_signups table or just store in organisations with a pending flag
    // Simplest approach: create org now, create mentor after email confirmed

    // Create or find organisation
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

    // Store pending signup metadata - we'll create mentor on first dashboard load
    // For now store in a pending_signups table
    await sb.from('pending_signups').upsert({
      email: email.trim().toLowerCase(),
      name: name.trim(),
      org_id: org.id,
    }, { onConflict: 'email' }).select()

    return Response.json({ success: true, orgId: org.id })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const email = searchParams.get('email')
  if (!userId) return Response.json(null)

  const sb = getServiceClient()

  // Check if mentor profile exists
  const { data: mentor } = await sb
    .from('mentors')
    .select('*, organisations(*)')
    .eq('id', userId)
    .single()

  if (mentor) return Response.json(mentor)

  // No profile yet — check pending signups and create it now
  if (email) {
    const { data: pending } = await sb
      .from('pending_signups')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (pending) {
      // Check if this is the first admin for this org
      const { data: existingMentors } = await sb
        .from('mentors')
        .select('id')
        .eq('org_id', pending.org_id)

      const role = (!existingMentors || existingMentors.length === 0) ? 'admin' : 'mentor'

      const { data: newMentor, error } = await sb
        .from('mentors')
        .insert({
          id: userId,
          name: pending.name,
          email: pending.email,
          org_id: pending.org_id,
          role,
        })
        .select('*, organisations(*)')
        .single()

      if (!error && newMentor) {
        // Clean up pending signup
        await sb.from('pending_signups').delete().eq('email', pending.email)
        return Response.json(newMentor)
      }
    }
  }

  return Response.json(null)
}

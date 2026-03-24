import { getServiceClient } from '@/lib/supabase'

export async function PATCH(req) {
  const { id, ...updates } = await req.json()
  if (!id) return Response.json({ error: 'Missing mentor id' }, { status: 400 })
  const sb = getServiceClient()
  const { data, error } = await sb.from('mentors').update(updates).eq('id', id).select('*, organisations(*)').single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  if (!orgId) return Response.json({ error: 'Missing orgId' }, { status: 400 })
  const sb = getServiceClient()
  const { data, error } = await sb.from('mentors').select('id, name, email, role, created_at').eq('org_id', orgId).order('created_at')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

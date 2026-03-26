import { getServiceClient } from '@/lib/supabase'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  const ypId = searchParams.get('ypId')
  const sb = getServiceClient()
  let query = sb.from('scheduled_sessions').select('*')
  if (ypId) query = query.eq('young_person_id', ypId)
  else if (orgId && orgId !== 'all') query = query.eq('org_id', orgId)
  const { data, error } = await query.order('date', { ascending: true }).order('time', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(req) {
  const body = await req.json()
  const sb = getServiceClient()
  const { data, error } = await sb.from('scheduled_sessions').insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(req) {
  const { id } = await req.json()
  const sb = getServiceClient()
  const { error } = await sb.from('scheduled_sessions').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}

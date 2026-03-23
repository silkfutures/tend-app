import { getServiceClient } from '@/lib/supabase'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  const sb = getServiceClient()
  let query = sb.from('young_people').select('*').order('name')
  if (orgId && orgId !== 'all') query = query.eq('org_id', orgId)
  const { data, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(req) {
  const body = await req.json()
  const sb = getServiceClient()
  const { data, error } = await sb.from('young_people').insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function PATCH(req) {
  const { id, ...updates } = await req.json()
  const sb = getServiceClient()
  const { data, error } = await sb.from('young_people').update(updates).eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

import { getServiceClient } from '@/lib/supabase'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const orgId = searchParams.get('orgId')
  const ypId = searchParams.get('ypId')
  const sb = getServiceClient()
  let query = sb.from('contact_logs').select('*')
  if (ypId) query = query.eq('young_person_id', ypId)
  else if (orgId && orgId !== 'all') query = query.eq('org_id', orgId)
  const { data, error } = await query.order('date', { ascending: false }).order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(req) {
  const body = await req.json()
  const sb = getServiceClient()
  const { data, error } = await sb.from('contact_logs').insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

import { getServiceClient } from '@/lib/supabase'

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const ypId = searchParams.get('ypId')
  if (!ypId) return Response.json({ error: 'ypId required' }, { status: 400 })
  const sb = getServiceClient()
  const { data, error } = await sb.from('risk_markers').select('*').eq('young_person_id', ypId).order('updated_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data || [])
}

export async function POST(req) {
  const body = await req.json()
  const sb = getServiceClient()
  // Upsert — if this marker type already exists for this YP, update it
  const { data, error } = await sb.from('risk_markers').upsert(body, {
    onConflict: 'young_person_id,marker_type'
  }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

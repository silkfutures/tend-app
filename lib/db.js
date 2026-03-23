import { supabase } from './supabase'
import { STEPS } from './constants'

// ── ORGANISATIONS ──
export async function getOrCreateOrg(name) {
  const { data } = await supabase
    .from('organisations')
    .select('*')
    .eq('name', name)
    .single()
  if (data) return data
  const { data: created } = await supabase
    .from('organisations')
    .insert({ name })
    .select()
    .single()
  return created
}

// ── YOUNG PEOPLE ──
export async function getYoungPeople(orgId) {
  const { data } = await supabase
    .from('young_people')
    .select('*')
    .eq('org_id', orgId)
    .order('name')
  return data || []
}

export async function createYoungPerson({ name, orgId, dob, phone, email, postcode }) {
  const { data } = await supabase
    .from('young_people')
    .insert({ name, org_id: orgId, dob, phone, email, postcode })
    .select()
    .single()
  return data
}

export async function updateYoungPerson(id, updates) {
  const { data } = await supabase
    .from('young_people')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  return data
}

// ── SESSIONS ──
export async function getSessions(orgId) {
  const { data } = await supabase
    .from('sessions')
    .select(`*, young_people(name, id)`)
    .eq('org_id', orgId)
    .order('date', { ascending: false })
  return data || []
}

export async function getSessionsForYP(youngPersonId) {
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('young_person_id', youngPersonId)
    .order('date', { ascending: false })
  return data || []
}

export async function createSession(session) {
  const { data } = await supabase
    .from('sessions')
    .insert(session)
    .select()
    .single()
  return data
}

// ── SAFEGUARDING ──
export async function getSafeguardingCases(orgId) {
  const { data } = await supabase
    .from('safeguarding_cases')
    .select(`*, young_people(name)`)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function createSafeguardingCase({ orgId, youngPersonId, sessionId, mentorId, concern }) {
  const { data } = await supabase
    .from('safeguarding_cases')
    .insert({ org_id: orgId, young_person_id: youngPersonId, session_id: sessionId, reported_by: mentorId, concern, status: 'open' })
    .select()
    .single()
  return data
}

// ── UTILITY ──
export function getLatestStage(sessions) {
  if (!sessions?.length) return 'Reset'
  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date))
  return sorted[0]?.focus_step || 'Reset'
}

export function getAverageScores(sessions) {
  if (!sessions?.length) return {}
  const keys = ['presence', 'expression', 'trust', 'regulation', 'agency']
  const result = {}
  keys.forEach(k => {
    const vals = sessions.map(s => s.indicators?.[k]).filter(Boolean)
    result[k] = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null
  })
  return result
}

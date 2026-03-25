"use client"
import { useState, useEffect } from 'react'

import { STEPS, STEP_COLORS, STEP_BG, INDICATORS, ARRIVAL_OPTIONS } from '@/lib/constants'

// ── DESIGN TOKENS ──
const T = {
  forest:'#1C2C22', deep:'#2D4A3E', sage:'#4A7C59', growth:'#6BAF7C',
  mist:'#C5DECA', pale:'#EAF2EC', cream:'#F7F4EE', white:'#FFFFFF',
  amber:'#E8A44A', amberPale:'#FDF3E3', rose:'#C97070', rosePale:'#FAEAEA',
  dark:'#1C2C22', mid:'#4A6455', muted:'#8FAA96', border:'#DDE8DF', bg:'#F4F7F4',
}

// ── EXPORT HELPERS ──
function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  })
}

function showCopiedToast() {
  const el = document.createElement('div')
  el.textContent = '✓ Copied to clipboard'
  el.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1C2C22;color:white;padding:10px 20px;border-radius:10px;font-family:Outfit,sans-serif;font-size:13px;font-weight:400;z-index:10000;animation:up 0.3s ease;letter-spacing:0.02em'
  document.body.appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300) }, 1800)
}

function exportAndCopy(text) {
  copyText(text)
  showCopiedToast()
}

function formatSessionExport(s, ypName) {
  const lines = []
  lines.push(`SESSION RECORD — ${ypName}`)
  lines.push(`Date: ${s.date}`)
  lines.push(`Stage: ${s.focus_step || 'Not recorded'}`)
  if (s.arrival_score) lines.push(`Arrival: ${s.arrival_score}/5`)
  lines.push('')
  if (s.ai_summary) { lines.push('Summary:'); lines.push(s.ai_summary); lines.push('') }
  if (s.notes) { lines.push('Session notes:'); lines.push(s.notes); lines.push('') }
  if (s.indicators && Object.keys(s.indicators).length > 0) {
    lines.push('Indicators:')
    Object.entries(s.indicators).forEach(([k,v]) => { if (v) lines.push(`  ${k}: ${Number(v).toFixed(1)}/10`) })
    lines.push('')
  }
  if (s.safeguarding_concern) { lines.push('⚑ SAFEGUARDING CONCERN:'); lines.push(s.safeguarding_concern); lines.push('') }
  return lines.join('\n')
}

function formatContactExport(c, ypName) {
  const types = { call:'Phone call', text:'Text/message', visit:'Home visit', meeting:'Meeting', email:'Email', professional_contact:'Professional contact', note:'Note' }
  const lines = []
  lines.push(`CONTACT LOG — ${ypName || 'General'}`)
  lines.push(`Date: ${c.date}`)
  lines.push(`Type: ${types[c.contact_type] || c.contact_type}`)
  if (c.professional_involved) lines.push(`Professional: ${c.professional_involved}`)
  lines.push('')
  lines.push(c.ai_cleaned_notes || c.notes || 'No notes recorded')
  return lines.join('\n')
}

function formatDailyExport(sessions, contactLogs, youngPeople, date) {
  const d = date || new Date().toISOString().split('T')[0]
  const daySessions = sessions.filter(s => s.date === d)
  const dayContacts = contactLogs.filter(c => c.date === d)
  const ypName = (id) => youngPeople.find(y => y.id === id)?.name || 'General'

  const lines = []
  lines.push(`═══════════════════════════════════`)
  lines.push(`DAILY RECORD — ${new Date(d).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}`)
  lines.push(`═══════════════════════════════════`)
  lines.push('')

  if (dayContacts.length > 0) {
    lines.push(`CONTACT DIARY (${dayContacts.length} entries)`)
    lines.push('───────────────────────────────────')
    dayContacts.forEach(c => {
      lines.push('')
      lines.push(formatContactExport(c, ypName(c.young_person_id)))
    })
    lines.push('')
  }

  if (daySessions.length > 0) {
    lines.push(`SESSIONS (${daySessions.length})`)
    lines.push('───────────────────────────────────')
    daySessions.forEach(s => {
      lines.push('')
      lines.push(formatSessionExport(s, ypName(s.young_person_id)))
    })
  }

  if (dayContacts.length === 0 && daySessions.length === 0) {
    lines.push('No entries recorded for this date.')
  }

  return lines.join('\n')
}

function formatYPExport(yp, sessions, contactLogs, riskMarkers) {
  const ypSessions = sessions.filter(s => s.young_person_id === yp.id)
  const ypContacts = contactLogs.filter(c => c.young_person_id === yp.id)
  const ypMarkers = riskMarkers.filter(m => m.young_person_id === yp.id)
  const stage = ypSessions[0]?.focus_step || 'Early'
  const markerLabels = { arrested:'Last arrested', carried_weapon:'Last carried weapon', drug_use:'Last drug use', school_exclusion:'Last school exclusion', missing_episode:'Last missing episode', self_harm:'Last self-harm', hospitalisation:'Last hospitalisation', police_contact:'Last police contact', gang_association:'Gang association', custodial:'Last custodial' }

  const lines = []
  lines.push(`═══════════════════════════════════`)
  lines.push(`YOUNG PERSON RECORD — ${yp.name}`)
  lines.push(`═══════════════════════════════════`)
  lines.push(`Area: ${yp.postcode || 'Not recorded'}`)
  lines.push(`DOB: ${yp.dob || 'Not recorded'}`)
  lines.push(`Current stage: ${stage}`)
  lines.push(`Total sessions: ${ypSessions.length}`)
  lines.push(`Total contacts: ${ypContacts.length}`)
  lines.push('')

  if (ypMarkers.length > 0) {
    lines.push('RISK MARKERS')
    lines.push('───────────────────────────────────')
    ypMarkers.forEach(m => {
      lines.push(`${markerLabels[m.marker_type] || m.marker_type}: ${m.last_date || 'No date'} [${m.status}]`)
      if (m.notes) lines.push(`  ${m.notes}`)
    })
    lines.push('')
  }

  if (ypSessions.length > 0) {
    lines.push('SESSION HISTORY')
    lines.push('───────────────────────────────────')
    ypSessions.forEach(s => { lines.push(''); lines.push(formatSessionExport(s, yp.name)) })
    lines.push('')
  }

  if (ypContacts.length > 0) {
    lines.push('CONTACT DIARY')
    lines.push('───────────────────────────────────')
    ypContacts.forEach(c => { lines.push(''); lines.push(formatContactExport(c, yp.name)) })
  }

  return lines.join('\n')
}

// ── PRIVACY HELPER ──
function privacyName(name, privacyMode) {
  if (!privacyMode || !name) return name
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0] + '.'
  return parts.map(p => p[0]).join('.') + '.'
}

// ── SHARED COMPONENTS ──
function ArcMark({ size=22, light=false }) {
  const s = light ? 'rgba(255,255,255,0.55)' : T.growth
  const p = light ? 'white' : T.sage
  const d = light ? 'white' : T.sage
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none">
      <path d="M7 38 Q7 6 22 6 Q37 6 37 38" stroke={s} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M13 38 Q13 14 22 14 Q31 14 31 38" stroke={p} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <circle cx="22" cy="8" r="3.2" fill={d}/>
    </svg>
  )
}

function PulseDot() {
  return <span style={{ width:6, height:6, background:T.sage, borderRadius:'50%', display:'inline-block', animation:'pd 2s infinite' }} />
}

function AITag({ children }) {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:T.pale, border:`1px solid ${T.mist}`, color:T.sage, borderRadius:20, padding:'4px 10px', fontSize:9, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>
      <PulseDot /> {children || 'Tend Intelligence'}
    </div>
  )
}

function Card({ children, style={}, onClick }) {
  return (
    <div onClick={onClick} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:18, padding:18, marginBottom:10, cursor:onClick?'pointer':'default', transition:'all 0.15s', ...style }}>
      {children}
    </div>
  )
}

function StageBadge({ stage }) {
  if (!stage) return null
  const cls = { Early:'b-reset', Developing:'b-reframe', Established:'b-rebuild', Advanced:'b-release', Leading:'b-rise' }
  return <span className={`badge ${cls[stage]||'b-reset'}`}>{stage}</span>
}

function Pathway({ currentStage }) {
  const idx = STEPS.indexOf(currentStage)
  return (
    <div className="pathway">
      {STEPS.map((s, i) => (
        <div key={s} className={`p-step${i < idx ? ' done' : ''}`}>
          <div className={`p-dot${i < idx ? ' done' : i === idx ? ' cur' : ''}`}>{i < idx ? '✓' : i === idx ? '●' : i+1}</div>
          <div className={`p-name${i < idx ? ' done' : i === idx ? ' cur' : ''}`}>{s}</div>
        </div>
      ))}
    </div>
  )
}

function ScoreBar({ label, value, color }) {
  const pct = value ? (value / 10) * 100 : 0
  return (
    <div className="score-row">
      <div className="sl">{label}</div>
      <div className="sb-wrap"><div className="sb-fill" style={{ width:`${pct}%`, background: color || T.sage }} /></div>
      <div className="sv">{value ? Number(value).toFixed(1) : '—'}</div>
    </div>
  )
}

function Spinner() {
  return <div style={{ width:20, height:20, borderRadius:'50%', border:`2px solid ${T.border}`, borderTopColor:T.sage, animation:'spin 0.8s linear infinite', margin:'0 auto' }} />
}

function BottomNav({ active, onNav }) {
  const items = [
    { id:'home', label:'Home', icon: <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><path d="M3 9L11 3L19 9V19H14V14H8V19H3V9Z" stroke={active==='home'?T.sage:'#8FAA96'} strokeWidth="1.7" strokeLinejoin="round"/></svg> },
    { id:'people', label:'People', icon: <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><circle cx="8" cy="8" r="3.5" stroke={active==='people'?T.sage:'#8FAA96'} strokeWidth="1.7"/><path d="M2 19C2 16.2 4.7 14 8 14" stroke={active==='people'?T.sage:'#8FAA96'} strokeWidth="1.7" strokeLinecap="round"/><circle cx="15" cy="10" r="3" stroke={active==='people'?T.sage:'#8FAA96'} strokeWidth="1.7"/><path d="M12 19C12 16.8 13.3 15 15 15C16.7 15 18 16.8 18 19" stroke={active==='people'?T.sage:'#8FAA96'} strokeWidth="1.7" strokeLinecap="round"/></svg> },
    { id:'sessions', label:'Sessions', icon: <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><rect x="3" y="5" width="16" height="14" rx="2" stroke={active==='sessions'?T.sage:'#8FAA96'} strokeWidth="1.7"/><path d="M7 3V7M15 3V7M3 10H19" stroke={active==='sessions'?T.sage:'#8FAA96'} strokeWidth="1.7" strokeLinecap="round"/></svg> },
    { id:'insights', label:'Insights', icon: <svg width="20" height="20" viewBox="0 0 22 22" fill="none"><path d="M11 3C11 3 5 6.5 5 12C5 15.3 7.7 18 11 18C14.3 18 17 15.3 17 12C17 6.5 11 3 11 3Z" stroke={active==='insights'?T.sage:'#8FAA96'} strokeWidth="1.7" strokeLinejoin="round"/></svg> },
  ]
  return (
    <div className="bnav">
      {items.map(item => (
        <div key={item.id} className={`ni${active===item.id?' active':''}`} onClick={() => onNav(item.id)}>
          {item.icon}
          <span className="ni-label" style={active===item.id?{color:T.sage}:{}}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── EMPTY STATE (reusable) ──
function EmptyState({ onAdd }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 24px' }}>
      <div style={{ marginBottom:20, opacity:0.7 }}>
        <ArcMark size={48} />
      </div>
      <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:300, color:T.dark, marginBottom:8, lineHeight:1.3 }}>Your caseload is empty</div>
      <div style={{ fontSize:13, color:T.muted, fontWeight:300, lineHeight:1.6, marginBottom:24, maxWidth:260, margin:'0 auto 24px' }}>Add a young person to get started with Tend — session prep, logging, and insights will be ready for you.</div>
      <button className="btn-p" style={{ maxWidth:280, margin:'0 auto' }} onClick={onAdd}>Add your first young person →</button>
    </div>
  )
}


// ── SCREEN: ONBOARDING WELCOME ──
function OnboardingWelcome({ mentor, onNext }) {
  const firstName = mentor?.name?.split(' ')[0] || 'there'
  return (
    <div className="screen active" style={{ alignItems:'center', justifyContent:'center', padding:32, background:T.forest }}>
      <div style={{ textAlign:'center', maxWidth:340 }}>
        <div style={{ marginBottom:24 }}>
          <ArcMark size={64} light />
        </div>
        <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:300, fontSize:24, letterSpacing:'0.14em', color:'white', marginBottom:32 }}>tend</div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:28, fontWeight:300, color:T.cream, lineHeight:1.3, marginBottom:12 }}>
          Welcome to Tend, {firstName}
        </div>
        <div style={{ fontSize:14, fontWeight:300, color:'rgba(255,255,255,0.55)', lineHeight:1.65, marginBottom:40 }}>
          AI-powered mentoring intelligence — session prep, safeguarding, and impact reporting, all in one place.
        </div>
        <button onClick={onNext} style={{ width:'100%', background:T.sage, color:'white', border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:500, fontFamily:"'Outfit',sans-serif", cursor:'pointer', letterSpacing:'0.03em' }}>
          Let's get started →
        </button>
      </div>
    </div>
  )
}

// ── SCREEN: ONBOARDING WORK CONTEXT ──
function OnboardingWorkContext({ mentor, onNext, onUpdateMentor }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const options = [
    { value: 'youth_mentoring', label: 'Youth mentoring', icon: '🤝', desc: 'One-to-one or group mentoring' },
    { value: 'violence_prevention', label: 'Violence prevention', icon: '🛡️', desc: 'Intervention and diversion work' },
    { value: 'school_pastoral', label: 'School pastoral', icon: '🏫', desc: 'In-school wellbeing support' },
    { value: 'other_support', label: 'Other support work', icon: '💬', desc: 'Counselling, outreach, or other' },
  ]

  const handleNext = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/mentors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mentor.id, work_context: selected })
      })
      const data = await res.json()
      if (data && !data.error) onUpdateMentor(data)
    } catch(e) {}
    setSaving(false)
    onNext()
  }

  return (
    <div className="screen active slide-in" style={{ background:T.bg }}>
      <div style={{ padding:'40px 18px 18px' }}>
        <div style={{ fontSize:10, fontWeight:500, letterSpacing:'0.18em', textTransform:'uppercase', color:T.muted, marginBottom:6 }}>Step 1 of 2</div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:300, color:T.dark, lineHeight:1.2, marginBottom:6 }}>What kind of <em style={{ color:T.sage }}>work</em> do you do?</div>
        <div style={{ fontSize:13, color:T.muted, fontWeight:300, marginBottom:24 }}>This helps Tend tailor AI prompts to your practice.</div>
      </div>
      <div style={{ padding:'0 18px', flex:1 }}>
        {options.map(opt => (
          <div key={opt.value} onClick={() => setSelected(opt.value)} style={{
            background: T.white,
            border: `1.5px solid ${selected === opt.value ? T.sage : T.border}`,
            borderRadius: 16,
            padding: '16px 18px',
            marginBottom: 10,
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            ...(selected === opt.value ? { background: T.pale } : {})
          }}>
            <div style={{ width:44, height:44, borderRadius:12, background: selected === opt.value ? T.white : T.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{opt.icon}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:500, color:T.dark, marginBottom:2 }}>{opt.label}</div>
              <div style={{ fontSize:12, color:T.muted, fontWeight:300 }}>{opt.desc}</div>
            </div>
            {selected === opt.value && (
              <div style={{ marginLeft:'auto', width:22, height:22, borderRadius:'50%', background:T.sage, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ color:'white', fontSize:12, fontWeight:600 }}>✓</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding:'18px 18px 40px' }}>
        <button onClick={handleNext} disabled={!selected || saving} style={{
          width:'100%', background: selected ? T.sage : T.mist, color:'white', border:'none', borderRadius:14, padding:16, fontSize:15, fontWeight:500, fontFamily:"'Outfit',sans-serif", cursor: selected ? 'pointer' : 'default', letterSpacing:'0.03em', opacity: saving ? 0.6 : 1, transition:'all 0.2s',
        }}>
          {saving ? 'Saving...' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}

// ── SCREEN: ONBOARDING ADD FIRST YP ──
function OnboardingAddYP({ orgId, onDone, onSkip }) {
  const [form, setForm] = useState({ name:'', postcode:'' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/young-people', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ name: form.name.trim(), postcode: form.postcode.trim() || null, org_id: orgId })
      })
      const data = await res.json()
      setSaving(false)
      onDone(data)
    } catch(e) {
      setSaving(false)
    }
  }

  return (
    <div className="screen active slide-in" style={{ background:T.bg }}>
      <div style={{ padding:'40px 18px 18px' }}>
        <div style={{ fontSize:10, fontWeight:500, letterSpacing:'0.18em', textTransform:'uppercase', color:T.muted, marginBottom:6 }}>Step 2 of 2</div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:300, color:T.dark, lineHeight:1.2, marginBottom:6 }}>Add your first <em style={{ color:T.sage }}>young person</em></div>
        <div style={{ fontSize:13, color:T.muted, fontWeight:300, marginBottom:24 }}>You can add more later — just one to get started.</div>
      </div>
      <div style={{ padding:'0 18px', flex:1 }}>
        <Card>
          <div className="inp-label">Name *</div>
          <input className="inp" type="text" placeholder="Their name" value={form.name} onChange={e => set('name', e.target.value)} />
          <div className="inp-label">Postcode / area</div>
          <input className="inp" type="text" placeholder="e.g. CF10 or Butetown" value={form.postcode} onChange={e => set('postcode', e.target.value)} />
        </Card>
      </div>
      <div style={{ padding:'18px 18px 40px' }}>
        <button onClick={save} disabled={!form.name.trim() || saving} className="btn-p" style={{ opacity: !form.name.trim() || saving ? 0.5 : 1 }}>
          {saving ? 'Adding...' : 'Add them now →'}
        </button>
        <button onClick={onSkip} style={{ width:'100%', background:'none', border:'none', color:T.muted, padding:14, fontSize:13, fontWeight:400, fontFamily:"'Outfit',sans-serif", cursor:'pointer', letterSpacing:'0.04em', marginTop:4 }}>
          Skip for now
        </button>
      </div>
    </div>
  )
}


// ── SCREEN: HOME ──
function HomeScreen({ mentor, youngPeople, sessions, onNav, onSelectYP, onSelectSession, privacy = (n) => n, contactLogs = [] }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = mentor?.name?.split(' ')[0] || mentor?.name || 'there'
  const today = new Date().toISOString().split('T')[0]
  const todayCount = sessions.filter(s => s.date === today).length
  const [exportDate, setExportDate] = useState(today)

  const disengaged = youngPeople.find(yp => {
    const ypSessions = sessions.filter(s => s.young_person_id === yp.id)
    if (!ypSessions.length) return false
    const last = new Date(ypSessions[0].date)
    const daysSince = Math.floor((Date.now() - last) / 86400000)
    return daysSince > 10
  })

  const openSG = sessions.filter(s => s.safeguarding_concern?.trim()).length

  return (
    <div className="screen active slide-in">
      <div className="greeting">
        <div className="g-time">{new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}</div>
        <div className="g-name">{greeting}, {firstName}</div>
        <div className="g-sub">{youngPeople.length} young {youngPeople.length === 1 ? 'person' : 'people'} in your caseload</div>
      </div>
      <div className="body-start" />
      <div className="scroll">

        {youngPeople.length === 0 && (
          <EmptyState onAdd={() => onNav('add-yp')} />
        )}

        {youngPeople.length > 0 && (
          <>
            <div className="today-hero">
              <div>
                <div className="th-count">{youngPeople.length}</div>
                <div className="th-label">in your caseload</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
                {youngPeople.slice(0,3).map(yp => (
                  <div key={yp.id} className="th-chip">{privacy(yp.name)}</div>
                ))}
                {youngPeople.length > 3 && <div className="th-chip">+{youngPeople.length - 3} more</div>}
              </div>
            </div>

            {youngPeople[0] && (() => {
              const yp = youngPeople[0]
              const ypSessions = sessions.filter(s => s.young_person_id === yp.id)
              const stage = ypSessions[0]?.focus_step || 'Early'
              return (
                <div className="prep-card" onClick={() => { onSelectYP(yp); onNav('prep') }}>
                  <div className="pc-eye"><PulseDot /> Tend Intelligence</div>
                  <div className="pc-title">Prepare for your next session with {privacy(yp.name)}</div>
                  <div className="pc-insight">Currently in {stage} stage · {ypSessions.length} session{ypSessions.length !== 1 ? 's' : ''} logged. Tap to generate your AI session prep.</div>
                  <button className="pc-btn">View session prep →</button>
                </div>
              )
            })()}

            {/* Quick log bar — always visible */}
            <div onClick={() => onNav('quick-log')} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:14, padding:'12px 16px', marginBottom:10, display:'flex', alignItems:'center', gap:12, cursor:'pointer', transition:'all 0.15s' }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'#E8F4FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>✎</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500, color:T.dark }}>Quick log</div>
                <div style={{ fontSize:11, color:T.muted, fontWeight:300 }}>Call, text, visit, or note</div>
              </div>
              <div style={{ fontSize:16, color:T.muted }}>→</div>
            </div>

            {/* Today's Activity */}
            {(() => {
              const todaySess = sessions.filter(s => s.date === today)
              const todayContacts = contactLogs.filter(c => c.date === today)
              const totalToday = todaySess.length + todayContacts.length
              if (totalToday === 0) return null
              const ypName = (id) => youngPeople.find(y => y.id === id)?.name || 'General'
              const ctLabels = { call:'📞', text:'💬', visit:'🏠', meeting:'👥', email:'📧', professional_contact:'🔗', note:'📝' }
              return (
                <>
                  <div className="sec">Today's activity · {totalToday} entries</div>
                  {todayContacts.map(c => (
                    <div key={c.id} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'10px 14px', marginBottom:6, display:'flex', gap:10, alignItems:'flex-start' }}>
                      <div style={{ fontSize:14, marginTop:2 }}>{ctLabels[c.contact_type] || '📝'}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:T.dark }}>{privacy(ypName(c.young_person_id))}{c.professional_involved ? ` · ${c.professional_involved}` : ''}</div>
                        <div style={{ fontSize:11, color:T.muted, fontWeight:300, lineHeight:1.4, marginTop:2 }}>{(c.ai_cleaned_notes || c.notes || '').slice(0, 80)}{(c.notes?.length || 0) > 80 ? '...' : ''}</div>
                      </div>
                    </div>
                  ))}
                  {todaySess.map(s => (
                    <div key={s.id} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'10px 14px', marginBottom:6, display:'flex', gap:10, alignItems:'flex-start' }}>
                      <div style={{ fontSize:14, marginTop:2 }}>📋</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:500, color:T.dark }}>{privacy(ypName(s.young_person_id))} · Session</div>
                        <div style={{ fontSize:11, color:T.muted, fontWeight:300, lineHeight:1.4, marginTop:2 }}>{(s.ai_summary || s.notes || '').slice(0, 80)}...</div>
                      </div>
                    </div>
                  ))}
                </>
              )
            })()}

            {openSG > 0 && (
              <div className="alert" style={{ cursor:'pointer' }} onClick={() => onNav('safeguarding')}>
                <div className="alert-dot">⚑</div>
                <div>
                  <div className="alert-title">Safeguarding concerns</div>
                  <div className="alert-body">{openSG} session{openSG !== 1 ? 's' : ''} with safeguarding notes. Tap to review.</div>
                </div>
              </div>
            )}

            {disengaged && (
              <div className="alert" style={{ background:'#FDF3E3', border:'1px solid #F0C88A' }}>
                <div className="alert-dot" style={{ background:'rgba(232,164,74,0.15)' }}>⏰</div>
                <div>
                  <div className="alert-title" style={{ color:'#7A5020' }}>Check in with {disengaged.name}</div>
                  <div className="alert-body" style={{ color:'#A07030' }}>No session in over 10 days. An early check-in could help maintain engagement.</div>
                </div>
              </div>
            )}

            <div className="sec">Your caseload</div>
            {youngPeople.map(yp => {
              const ypSessions = sessions.filter(s => s.young_person_id === yp.id)
              const stage = ypSessions[0]?.focus_step || 'Early'
              return (
                <div key={yp.id} className="yp" onClick={() => { onSelectYP(yp); onNav('profile') }}>
                  <div className="yp-av" style={{ background: STEP_BG[stage], color: STEP_COLORS[stage] }}>{yp.name[0]}</div>
                  <div className="yp-info">
                    <div className="yp-name">{privacy(yp.name)}</div>
                    <div className="yp-meta">{ypSessions.length} session{ypSessions.length !== 1 ? 's' : ''} · {ypSessions[0]?.date || 'No sessions yet'}</div>
                  </div>
                  <StageBadge stage={stage} />
                </div>
              )
            })}

            <div className="sec">Quick actions</div>
            <div className="qgrid">
              <div className="qbtn" onClick={() => onNav('log')}>
                <div className="qi" style={{ background:T.pale }}>📋</div>
                <div className="qt">Log Session</div>
                <div className="qs">Face-to-face meeting</div>
              </div>
              <div className="qbtn" onClick={() => onNav('quick-log')}>
                <div className="qi" style={{ background:'#E8F4FF' }}>✎</div>
                <div className="qt">Quick Log</div>
                <div className="qs">Call, text, or note</div>
              </div>
              <div className="qbtn" onClick={() => onNav('add-yp')}>
                <div className="qi" style={{ background:T.amberPale }}>＋</div>
                <div className="qt">Add Person</div>
                <div className="qs">New to caseload</div>
              </div>
              <div className="qbtn" onClick={() => onNav('report')}>
                <div className="qi" style={{ background:'#F0EEFF' }}>◎</div>
                <div className="qt">Impact Report</div>
                <div className="qs">AI generated</div>
              </div>
            </div>

            {/* Daily export with date picker */}
            <Card style={{ padding:14 }}>
              <div className="card-label">Export daily record</div>
              <input type="date" value={exportDate} onChange={e => setExportDate(e.target.value)} style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:'8px 12px', fontSize:12, color:T.dark, fontFamily:"'Outfit',sans-serif", marginBottom:10, outline:'none' }} />
              <div style={{ display:'flex', gap:8 }}>
                <button style={{ flex:1, padding:10, background:'none', border:`1px solid ${T.border}`, borderRadius:10, fontSize:12, color:T.muted, cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:500 }} onClick={() => exportAndCopy(formatDailyExport(sessions, contactLogs, youngPeople, exportDate))}>
                  📋 Copy
                </button>
                <button style={{ flex:1, padding:10, background:'none', border:`1px solid ${T.border}`, borderRadius:10, fontSize:12, color:T.muted, cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:500 }} onClick={() => {
                  const text = formatDailyExport(sessions, contactLogs, youngPeople, exportDate)
                  const w = window.open('', '_blank')
                  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Daily Record — ${exportDate}</title><style>body{font-family:Arial,sans-serif;font-size:13px;line-height:1.7;padding:40px;color:#1C2C22;max-width:800px;white-space:pre-wrap}@media print{body{padding:20px}}</style></head><body>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</body></html>`)
                  w.document.close()
                  setTimeout(() => w.print(), 300)
                }}>
                  📄 PDF
                </button>
              </div>
            </Card>
          </>
        )}
      </div>
      <BottomNav active="home" onNav={onNav} />
    </div>
  )
}

// ── SCREEN: PEOPLE ──
function PeopleScreen({ youngPeople, sessions, onNav, onSelectYP, mentor, privacy = (n) => n }) {
  const disengaged = youngPeople.find(yp => {
    const s = sessions.filter(x => x.young_person_id === yp.id)
    if (!s.length) return false
    return Math.floor((Date.now() - new Date(s[0].date)) / 86400000) > 10
  })

  return (
    <div className="screen active slide-in">
      <div className="sh">
        <div className="sh-eye">Caseload</div>
        <div className="sh-title"><em>{youngPeople.length} young {youngPeople.length === 1 ? 'person' : 'people'}</em></div>
      </div>
      <div className="body-start" />
      <div className="scroll">

        {youngPeople.length === 0 && (
          <EmptyState onAdd={() => onNav('add-yp')} />
        )}

        {youngPeople.length > 0 && (
          <>
            {disengaged && (
              <div className="ai-insight">
                <AITag />
                <div className="ai-text">{disengaged.name} hasn't had a session in {Math.floor((Date.now() - new Date(sessions.filter(s => s.young_person_id === disengaged.id)[0]?.date)) / 86400000)} days. Based on their pattern, an early check-in could help maintain momentum and prevent disengagement.</div>
              </div>
            )}

            {youngPeople.map(yp => {
              const ypSessions = sessions.filter(s => s.young_person_id === yp.id)
              const stage = ypSessions[0]?.focus_step || 'Early'
              const hasSG = ypSessions.some(s => s.safeguarding_concern?.trim())
              return (
                <div key={yp.id} className="yp" onClick={() => { onSelectYP(yp); onNav('profile') }}>
                  <div className="yp-av" style={{ background: STEP_BG[stage], color: STEP_COLORS[stage] }}>{yp.name[0]}</div>
                  <div className="yp-info">
                    <div className="yp-name">{privacy(yp.name)}</div>
                    <div className="yp-meta">{ypSessions.length} session{ypSessions.length !== 1 ? 's' : ''} · {hasSG ? '⚑ Flag active' : `Last: ${ypSessions[0]?.date || 'No sessions'}`}</div>
                  </div>
                  <StageBadge stage={stage} />
                </div>
              )
            })}
            <button className="btn-s" style={{ marginTop:8 }} onClick={() => onNav('add-yp')}>+ Add young person</button>
          </>
        )}
      </div>
      <BottomNav active="people" onNav={onNav} />
    </div>
  )
}

// ── SCREEN: SESSIONS ──
function SessionsScreen({ sessions, youngPeople, onNav, onSelectSession, privacy = (n) => n }) {
  const today = new Date().toISOString().split('T')[0]
  const todaySessions = sessions.filter(s => s.date === today)
  const recentSessions = sessions.filter(s => s.date !== today).slice(0, 10)

  const ypName = (id) => youngPeople.find(y => y.id === id)?.name || 'Unknown'

  return (
    <div className="screen active slide-in">
      <div className="sh">
        <div className="sh-eye">Session log</div>
        <div className="sh-title">{new Date().toLocaleString('en-GB', { month:'long' })} <em>{new Date().getFullYear()}</em></div>
      </div>
      <div className="body-start" />
      <div className="scroll">
        {todaySessions.length > 0 && (
          <>
            <div className="sec">Today</div>
            {todaySessions.map(s => (
              <Card key={s.id} style={{ marginBottom:8, cursor:'pointer' }} onClick={() => onSelectSession(s)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:500, color:T.dark }}>{ypName(s.young_person_id)} · Session</div>
                    <div style={{ fontSize:11, color:T.muted, marginTop:3, fontWeight:300 }}>Today · {s.focus_step}</div>
                  </div>
                  <StageBadge stage={s.focus_step} />
                </div>
                {s.ai_summary && <AITag>Prep ready</AITag>}
              </Card>
            ))}
          </>
        )}

        <div className="sec">Recent sessions</div>
        {recentSessions.length === 0 && (
          <Card><div style={{ textAlign:'center', padding:'16px 0', color:T.muted, fontSize:13 }}>No sessions logged yet</div></Card>
        )}
        {recentSessions.map(s => (
          <div key={s.id} className="si">
            <div className="si-dot">✓</div>
            <div>
              <div className="si-date">{ypName(s.young_person_id)} · {s.date}</div>
              <div className="si-note">"{s.notes?.slice(0, 120) || 'No notes recorded'}{s.notes?.length > 120 ? '...' : ''}"</div>
            </div>
          </div>
        ))}
        <button className="btn-s" onClick={() => onNav('log')}>+ Log a session</button>
      </div>
      <BottomNav active="sessions" onNav={onNav} />
    </div>
  )
}

// ── SCREEN: YOUNG PERSON PROFILE ──
function ProfileScreen({ yp, sessions, onNav, onBack, showPrepPrompt, privacy = (n) => n, contactLogs = [], riskMarkers = [], onRefresh }) {
  const ypSessions = sessions.filter(s => s.young_person_id === yp.id)
  const stage = ypSessions[0]?.focus_step || 'Early'
  const totalSessions = ypSessions.length
  const ypContacts = contactLogs.filter(c => c.young_person_id === yp.id)
  const ypMarkers = riskMarkers.filter(m => m.young_person_id === yp.id)

  const [showAddMarker, setShowAddMarker] = useState(false)
  const [newMarkerType, setNewMarkerType] = useState('police_contact')
  const [newMarkerDate, setNewMarkerDate] = useState(new Date().toISOString().split('T')[0])
  const [newMarkerNotes, setNewMarkerNotes] = useState('')
  const [savingMarker, setSavingMarker] = useState(false)

  const avgScores = {}
  INDICATORS.forEach(ind => {
    const vals = ypSessions.map(s => s.indicators?.[ind.key]).filter(Boolean)
    avgScores[ind.key] = vals.length ? (vals.reduce((a,b) => a+b, 0) / vals.length) : null
  })

  const contactTypeLabels = { call:'📞 Call', text:'💬 Text', visit:'🏠 Visit', meeting:'👥 Meeting', email:'📧 Email', professional_contact:'🔗 Professional', note:'📝 Note' }
  const markerLabels = { arrested:'Last arrested', carried_weapon:'Last carried weapon', drug_use:'Last drug use', school_exclusion:'Last school exclusion', missing_episode:'Last missing episode', self_harm:'Last self-harm', hospitalisation:'Last hospitalisation', police_contact:'Last police contact', gang_association:'Gang association', custodial:'Last custodial' }
  const markerOptions = Object.entries(markerLabels)

  const saveMarker = async () => {
    if (!newMarkerType) return
    setSavingMarker(true)
    try {
      await fetch('/api/risk-markers', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ young_person_id: yp.id, marker_type: newMarkerType, last_date: newMarkerDate || null, notes: newMarkerNotes.trim() || null, status: 'active', updated_at: new Date().toISOString() })
      })
      setShowAddMarker(false); setNewMarkerNotes(''); setNewMarkerDate(new Date().toISOString().split('T')[0])
      if (onRefresh) onRefresh()
    } catch(e) {}
    setSavingMarker(false)
  }

  const updateMarkerStatus = async (marker, newStatus) => {
    try {
      await fetch('/api/risk-markers', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ young_person_id: yp.id, marker_type: marker.marker_type, last_date: marker.last_date, notes: marker.notes, status: newStatus, updated_at: new Date().toISOString() })
      })
      if (onRefresh) onRefresh()
    } catch(e) {}
  }

  const exportPDF = () => {
    const text = formatYPExport(yp, sessions, contactLogs, riskMarkers)
    const w = window.open('', '_blank')
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${yp.name} — Tend Record</title><style>body{font-family:Arial,sans-serif;font-size:13px;line-height:1.6;padding:40px;color:#1C2C22;white-space:pre-wrap;max-width:800px}@media print{body{padding:20px}}</style></head><body>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'\n')}</body></html>`)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }

  return (
    <div className="screen active slide-in">
      <button className="back" onClick={onBack}>← Back</button>
      <div className="ph">
        <div className="ph-av">{yp.name[0]}</div>
        <div className="ph-name">{privacy(yp.name)}</div>
        <div className="ph-meta">{yp.postcode || 'No area set'} · {totalSessions} session{totalSessions !== 1 ? 's' : ''}</div>
        <div className="ph-stats">
          <div><div className="ps-num">{totalSessions}</div><div className="ps-lbl">Sessions</div></div>
          <div><div className="ps-num">{stage}</div><div className="ps-lbl">Stage</div></div>
          <div><div className="ps-num">{ypContacts.length}</div><div className="ps-lbl">Contacts</div></div>
        </div>
      </div>
      <div className="body-start" />
      <div className="scroll">

        {/* ── ACTION BUTTONS AT TOP ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
          <button className="btn-p" style={{ margin:0, borderRadius:14, padding:13, fontSize:13 }} onClick={() => onNav('prep')}>✦ Session prep</button>
          <button className="btn-p" style={{ margin:0, borderRadius:14, padding:13, fontSize:13, background:T.deep }} onClick={() => onNav('log')}>📋 Log session</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
          <button className="btn-s" style={{ margin:0, padding:11, fontSize:12 }} onClick={() => onNav('quick-log')}>✎ Quick log</button>
          <button className="btn-s" style={{ margin:0, padding:11, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }} onClick={exportPDF}>
            <span>📄</span> Export PDF
          </button>
        </div>

        {showPrepPrompt && (
          <div style={{ background:'linear-gradient(135deg,#4A7C59 0%,#2D4A3E 100%)', borderRadius:18, padding:18, marginBottom:10, cursor:'pointer' }} onClick={() => onNav('prep')}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
              <PulseDot />
              <span style={{ fontSize:9, fontWeight:600, letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)' }}>Tend Intelligence</span>
            </div>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:17, fontWeight:300, color:'white', lineHeight:1.35, marginBottom:10 }}>Run AI session prep before your first session →</div>
            <div style={{ fontSize:12, fontWeight:300, color:'rgba(255,255,255,0.6)' }}>Generate personalised insight, spark questions, and guidance.</div>
          </div>
        )}

        <Card>
          <div className="card-label">Journey</div>
          <Pathway currentStage={stage} />
        </Card>

        <Card>
          <div className="card-label">Progress indicators</div>
          {INDICATORS.map(ind => (
            <ScoreBar key={ind.key} label={ind.label} value={avgScores[ind.key]} color={ind.color} />
          ))}
        </Card>

        {/* Risk Markers */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div className="card-label" style={{ marginBottom:0 }}>Risk markers</div>
            <div onClick={() => setShowAddMarker(!showAddMarker)} style={{ fontSize:10, fontWeight:500, color:T.sage, cursor:'pointer', padding:'3px 10px', borderRadius:20, border:`1px solid ${T.mist}`, background:T.pale }}>
              {showAddMarker ? '✕ Cancel' : '+ Add'}
            </div>
          </div>

          {showAddMarker && (
            <div style={{ padding:'12px 0', borderBottom:`1px solid ${T.border}`, marginBottom:8 }}>
              <div className="inp-label">Marker type</div>
              <select value={newMarkerType} onChange={e => setNewMarkerType(e.target.value)} style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:12, padding:'10px 14px', fontSize:12, color:T.dark, fontFamily:"'Outfit',sans-serif", fontWeight:400, outline:'none', marginBottom:8 }}>
                {markerOptions.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
              <div className="inp-label">Date</div>
              <input className="inp" type="date" value={newMarkerDate} onChange={e => setNewMarkerDate(e.target.value)} />
              <div className="inp-label">Notes</div>
              <textarea className="inp" rows={2} value={newMarkerNotes} onChange={e => setNewMarkerNotes(e.target.value)} placeholder="Brief description..." />
              <button onClick={saveMarker} disabled={savingMarker} className="btn-p" style={{ fontSize:13, padding:11 }}>
                {savingMarker ? 'Saving...' : 'Add marker'}
              </button>
            </div>
          )}

          {ypMarkers.length === 0 && !showAddMarker && (
            <div style={{ fontSize:12, color:T.muted, padding:'4px 0' }}>No risk markers recorded</div>
          )}
          {ypMarkers.map(m => (
            <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:500, color: m.status === 'active' ? T.rose : T.dark }}>{markerLabels[m.marker_type] || m.marker_type}</div>
                {m.notes && <div style={{ fontSize:11, color:T.muted, fontWeight:300, marginTop:2, lineHeight:1.4 }}>{m.notes}</div>}
                <div onClick={() => updateMarkerStatus(m, m.status === 'active' ? 'historic' : 'active')} style={{ fontSize:10, color:T.sage, cursor:'pointer', marginTop:4, fontWeight:500 }}>
                  {m.status === 'active' ? 'Mark as historic' : 'Mark as active'}
                </div>
              </div>
              <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                <div style={{ fontSize:11, fontWeight:500, color: m.status === 'active' ? T.rose : T.muted }}>{m.last_date || '—'}</div>
                <span style={{ fontSize:9, fontWeight:600, padding:'2px 8px', borderRadius:20, background: m.status === 'active' ? T.rosePale : T.pale, color: m.status === 'active' ? T.rose : T.sage, textTransform:'uppercase', letterSpacing:'0.06em' }}>{m.status}</span>
              </div>
            </div>
          ))}
        </Card>

        {/* Contact Log */}
        {ypContacts.length > 0 && (
          <>
            <div className="sec">Contact diary</div>
            {ypContacts.slice(0, 6).map(c => (
              <div key={c.id} className="si">
                <div className="si-dot" style={{ fontSize:8 }}>{contactTypeLabels[c.contact_type]?.slice(0, 2) || '📝'}</div>
                <div>
                  <div className="si-date">{contactTypeLabels[c.contact_type] || c.contact_type} · {c.date}{c.professional_involved ? ` · ${c.professional_involved}` : ''}</div>
                  <div className="si-note">"{c.ai_cleaned_notes || c.notes?.slice(0, 150) || 'No notes'}{(c.notes?.length || 0) > 150 ? '...' : ''}"</div>
                </div>
              </div>
            ))}
          </>
        )}

        <div className="sec">Session history</div>
        {ypSessions.length === 0 && (
          <Card><div style={{ textAlign:'center', padding:'12px 0', color:T.muted, fontSize:13 }}>No sessions yet</div></Card>
        )}
        {ypSessions.slice(0, 8).map((s, i) => (
          <div key={s.id} className="si">
            <div className="si-dot">{ypSessions.length - i}</div>
            <div>
              <div className="si-date">{s.date}</div>
              <div className="si-note">"{s.ai_summary || s.notes?.slice(0, 120) || 'No notes'}"</div>
            </div>
          </div>
        ))}

        <button className="btn-s" style={{ color:T.muted, borderColor:T.border }} onClick={() => exportAndCopy(formatYPExport(yp, sessions, contactLogs, riskMarkers))}>📋 Copy full record to clipboard</button>
      </div>
    </div>
  )
}

// ── SCREEN: AI SESSION PREP ──
function PrepScreen({ yp, sessions, mentor, onNav, onBack, privacy = (n) => n }) {
  const [prep, setPrep] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const ypSessions = sessions.filter(s => s.young_person_id === yp?.id)
  const stage = ypSessions[0]?.focus_step || 'Early'
  const avgScores = {}
  INDICATORS.forEach(ind => {
    const vals = ypSessions.map(s => s.indicators?.[ind.key]).filter(Boolean)
    avgScores[ind.key] = vals.length ? (vals.reduce((a,b) => a+b, 0) / vals.length) : null
  })

  useEffect(() => {
    if (!yp) return
    const generate = async () => {
      setLoading(true); setError(null)
      try {
        const res = await fetch('/api/ai-prep', {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({
            youngPersonName: yp.name,
            stage,
            sessions: ypSessions.slice(0, 5).map(s => ({ date: s.date, notes: s.notes, indicators: s.indicators })),
            orgName: mentor?.organisations?.name,
            workContext: mentor?.work_context
          })
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setPrep(data)
      } catch(e) {
        setError(e.message)
      }
      setLoading(false)
    }
    generate()
  }, [yp?.id])

  if (!yp) return null

  return (
    <div className="screen active slide-in">
      <button className="back" onClick={onBack}>← Back</button>
      <div className="sh">
        <div className="sh-eye">AI Session Prep</div>
        <div className="sh-title">{privacy(yp.name)} · <em>Session {ypSessions.length + 1}</em></div>
      </div>
      <div className="body-start" />
      <div className="scroll">

        {/* Last session recap */}
        {ypSessions.length > 0 && (
          <Card style={{ borderLeft:`3px solid ${T.mist}` }}>
            <div className="card-label">Last session · {ypSessions[0].date}</div>
            <div className="ai-text">{ypSessions[0].ai_summary || ypSessions[0].notes?.slice(0, 250) || 'No notes recorded'}{(ypSessions[0].notes?.length || 0) > 250 && !ypSessions[0].ai_summary ? '...' : ''}</div>
            {ypSessions[0].safeguarding_concern && (
              <div style={{ marginTop:8, padding:'6px 10px', background:T.rosePale, borderRadius:8, fontSize:11, color:T.rose, fontWeight:500 }}>⚑ Safeguarding concern flagged</div>
            )}
          </Card>
        )}

        <div className="ai-insight">
          <AITag />
          {loading ? (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <Spinner />
              <span className="ai-text" style={{ marginLeft:8 }}>Analysing {privacy(yp.name)}'s journey...</span>
            </div>
          ) : error ? (
            <div className="ai-text" style={{ color:T.rose }}>Couldn't generate prep: {error}</div>
          ) : (
            <div className="ai-text">{prep?.insight}</div>
          )}
        </div>

        {prep && (
          <Card>
            <div className="card-label">Opening spark</div>
            <div className="spark">
              <div className="spark-tag">Spark Card</div>
              <div className="spark-q">"{prep.sparkQuestion}"</div>
              <div className="spark-chips">
                <div className="sc">Unpack</div>
                <div className="sc">Go Deeper</div>
                <div className="sc">Save</div>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="card-label">Journey stage</div>
          <Pathway currentStage={stage} />
          {prep && <div className="ai-text" style={{ marginTop:8 }}>{prep.stageGuidance}</div>}
        </Card>

        <Card>
          <div className="card-label">Progress indicators</div>
          {INDICATORS.map(ind => (
            <ScoreBar key={ind.key} label={ind.label} value={avgScores[ind.key]} color={ind.color} />
          ))}
        </Card>

        {prep?.holdInMind?.length > 0 && (
          <Card>
            <div className="card-label">Hold in mind</div>
            <div style={{ paddingTop:4 }}>
              {prep.holdInMind.map((h, i) => (
                <span key={i} className="chip">{h}</span>
              ))}
            </div>
          </Card>
        )}

        <button className="btn-p" onClick={() => onNav('log')}>Start session log →</button>
      </div>
    </div>
  )
}

// ── SCREEN: LOG SESSION ──
function LogScreen({ yp: initialYP, sessions, mentor, orgId, onDone, onBack, privacy = (n) => n, youngPeople = [] }) {
  const [selectedYP, setSelectedYP] = useState(initialYP)
  const yp = selectedYP
  const ypSessions = sessions.filter(s => s.young_person_id === yp?.id)
  const stage = ypSessions[0]?.focus_step || 'Early'

  const [arrival, setArrival] = useState(null)
  const [notes, setNotes] = useState('')
  const [focusStep, setFocusStep] = useState(stage)
  const [indicators, setIndicators] = useState({ presence:7, expression:6.5, trust:7.5, regulation:6, agency:6.5 })
  const [safeguarding, setSafeguarding] = useState('')
  const [showSG, setShowSG] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiSummary, setAiSummary] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [recording, setRecording] = useState(false)

  const setInd = (k, v) => setIndicators(i => ({ ...i, [k]: v }))

  // Update stage when YP changes
  const handleYPChange = (ypId) => {
    const found = youngPeople.find(y => y.id === ypId)
    if (found) {
      setSelectedYP(found)
      const s = sessions.filter(x => x.young_person_id === found.id)
      setFocusStep(s[0]?.focus_step || 'Early')
    }
  }

  // Voice recording using Web Speech API
  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recording is not supported in this browser. Please use Chrome.')
      return
    }
    if (recording) {
      window._tendRecognition?.stop()
      setRecording(false)
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-GB'
    let finalTranscript = notes
    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + event.results[i][0].transcript
          setNotes(finalTranscript)
        } else {
          interim += event.results[i][0].transcript
        }
      }
    }
    recognition.onerror = () => setRecording(false)
    recognition.onend = () => setRecording(false)
    recognition.start()
    window._tendRecognition = recognition
    setRecording(true)
  }

  const generateSummary = async () => {
    if (!notes.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/ai-summary', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ youngPersonName: yp.name, stage: focusStep, notes, arrival: ARRIVAL_OPTIONS.find(a => a.value === arrival)?.label, contactType: 'Face-to-face session' })
      })
      const data = await res.json()
      if (!data.error) setAiSummary(data)
    } catch(e) {}
    setGenerating(false)
  }

  const save = async () => {
    if (!yp || !mentor) return
    setSaving(true)
    try {
      await fetch('/api/sessions', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          young_person_id: yp.id,
          mentor_id: mentor.id === 'demo' ? null : mentor.id,
          date: new Date().toISOString().split('T')[0],
          focus_step: focusStep,
          arrival_score: arrival,
          notes,
          ai_summary: aiSummary?.summary || null,
          indicators,
          safeguarding_concern: safeguarding.trim() || null,
        })
      })
      setSaved(true)
    } catch(e) {}
    setSaving(false)
  }

  if (!yp) return null
  if (saved) return (
    <div className="screen active" style={{ alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:40 }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:T.pale, border:`1.5px solid ${T.mist}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:22, color:T.sage }}>✓</div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:300, color:T.dark, marginBottom:6 }}>Session saved</div>
        <div style={{ fontSize:13, color:T.muted, marginBottom:20 }}>for {privacy(yp.name)}</div>
        <button onClick={() => exportAndCopy(formatSessionExport({ date: new Date().toISOString().split('T')[0], focus_step: focusStep, arrival_score: arrival, notes, ai_summary: aiSummary?.summary, indicators, safeguarding_concern: safeguarding.trim() || null }, yp.name))} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 20px', fontSize:13, color:T.sage, cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:500, marginBottom:10, display:'block', width:'100%', maxWidth:260, margin:'0 auto 10px' }}>
          📋 Copy session record
        </button>
        <button onClick={onDone} className="btn-p" style={{ maxWidth:260, margin:'0 auto' }}>
          Done →
        </button>
      </div>
    </div>
  )

  return (
    <div className="screen active slide-in">
      <button className="back" onClick={onBack}>← Back</button>
      <div className="sh">
        <div className="sh-eye">Session Log</div>
        <div className="sh-title">{privacy(yp.name)} · <em>Session {ypSessions.length + 1}</em></div>
      </div>
      <div className="body-start" />
      <div className="scroll">

        {/* YP Selector */}
        {youngPeople.length > 1 && (
          <Card>
            <div className="inp-label">Who is this session with?</div>
            <select value={yp.id} onChange={e => handleYPChange(e.target.value)} style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:12, padding:'12px 14px', fontSize:13, color:T.dark, fontFamily:"'Outfit',sans-serif", fontWeight:400, outline:'none', cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%238FAA96' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 14px center' }}>
              {youngPeople.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </Card>
        )}

        <Card>
          <div className="cq">"How did {privacy(yp.name)} show up today?"</div>
          <div className="emoji-row">
            {ARRIVAL_OPTIONS.map(opt => (
              <div key={opt.value} className={`eo${arrival === opt.value ? ' sel' : ''}`} onClick={() => setArrival(opt.value)}>
                <div className="ef">{opt.emoji}</div>
                <div className="el">{opt.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Stage — shows current, allows override */}
        <Card>
          <div className="inp-label">Pathway stage <span style={{ fontWeight:300, textTransform:'none', letterSpacing:0 }}>· currently {stage}</span></div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {STEPS.map(s => (
              <button key={s} onClick={() => setFocusStep(s)} style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${focusStep===s ? T.sage : T.border}`, background: focusStep===s ? T.pale : 'transparent', color: focusStep===s ? T.sage : T.muted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>{s}</button>
            ))}
          </div>
        </Card>

        {/* Notes with voice recording */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
            <div className="inp-label" style={{ marginBottom:0 }}>Session notes</div>
            <div onClick={toggleRecording} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', padding:'4px 10px', borderRadius:20, background: recording ? T.rosePale : T.pale, border:`1px solid ${recording ? '#EDCACA' : T.mist}`, transition:'all 0.2s' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background: recording ? T.rose : T.sage, animation: recording ? 'pd 1s infinite' : 'none' }} />
              <span style={{ fontSize:10, fontWeight:500, color: recording ? T.rose : T.sage }}>{recording ? 'Stop' : 'Voice'}</span>
            </div>
          </div>
          <textarea className="inp" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder={`Write or speak freely — what happened in the room today? Tend will help structure this...`} />
          <div style={{ display:'flex', gap:8 }}>
            <div className="ai-tag" style={{ cursor:'pointer', flex:1 }} onClick={generateSummary}>
              <PulseDot /> {generating ? 'Generating summary...' : 'Generate AI summary'}
            </div>
          </div>
          {generating && <div style={{ marginTop:8 }}><Spinner /></div>}
          {aiSummary && (
            <div style={{ marginTop:12, padding:'12px 14px', background:T.pale, borderRadius:12, border:`1px solid ${T.mist}` }}>
              <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:T.sage, marginBottom:6 }}>AI Summary</div>
              <div className="ai-text">{aiSummary.summary}</div>
              {aiSummary.nextSession && <div style={{ marginTop:8, fontSize:11, color:T.muted, fontStyle:'italic' }}>Next session: {aiSummary.nextSession}</div>}
            </div>
          )}
        </Card>

        <Card>
          <div className="card-label">Update indicators</div>
          {INDICATORS.map(ind => (
            <div key={ind.key} style={{ marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:11, color:T.muted, fontWeight:300 }}>{ind.label}</span>
                <span style={{ fontSize:11, fontWeight:600, color:T.dark }}>{indicators[ind.key]?.toFixed(1)}</span>
              </div>
              <input type="range" min={1} max={10} step={0.5} value={indicators[ind.key]} onChange={e => setInd(ind.key, parseFloat(e.target.value))}
                style={{ width:'100%', accentColor: ind.color, cursor:'pointer' }} />
            </div>
          ))}
        </Card>

        <Card>
          <div className="inp-label">Safeguarding</div>
          {!showSG ? (
            <div style={{ display:'flex', gap:8 }}>
              <button style={{ flex:1, padding:11, background:T.bg, border:`1px solid ${T.border}`, borderRadius:12, fontSize:12, fontWeight:500, color:T.muted, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }} onClick={() => save()}>Nothing to flag</button>
              <button style={{ flex:1, padding:11, background:T.rosePale, border:'1px solid #EDCACA', borderRadius:12, fontSize:12, fontWeight:500, color:T.rose, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }} onClick={() => setShowSG(true)}>Raise concern ⚑</button>
            </div>
          ) : (
            <>
              <textarea className="inp" rows={3} value={safeguarding} onChange={e => setSafeguarding(e.target.value)} placeholder="Describe the safeguarding concern..." style={{ border:`1px solid #EDCACA`, background:'#FFF5F5' }} />
              <button style={{ background:'none', border:'none', color:T.muted, fontSize:12, cursor:'pointer', padding:0 }} onClick={() => { setShowSG(false); setSafeguarding('') }}>Cancel</button>
            </>
          )}
        </Card>

        <button className="btn-p" onClick={save} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : 'Save session →'}
        </button>
      </div>
    </div>
  )
}

// ── SCREEN: QUICK LOG (Contact Diary) ──
function QuickLogScreen({ youngPeople, mentor, orgId, onDone, onBack, privacy = (n) => n }) {
  const [selectedYP, setSelectedYP] = useState(null)
  const [contactType, setContactType] = useState('call')
  const [notes, setNotes] = useState('')
  const [professional, setProfessional] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [recording, setRecording] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [cleanedNotes, setCleanedNotes] = useState(null)

  const contactTypes = [
    { value:'call', label:'Phone call', icon:'📞' },
    { value:'text', label:'Text/message', icon:'💬' },
    { value:'visit', label:'Home visit', icon:'🏠' },
    { value:'meeting', label:'Meeting', icon:'👥' },
    { value:'professional_contact', label:'Professional contact', icon:'🔗' },
    { value:'email', label:'Email', icon:'📧' },
    { value:'note', label:'General note', icon:'📝' },
  ]

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recording is not supported in this browser. Please use Chrome.')
      return
    }
    if (recording) { window._tendRecognition?.stop(); setRecording(false); return }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-GB'
    let finalTranscript = notes
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + event.results[i][0].transcript
          setNotes(finalTranscript)
        }
      }
    }
    recognition.onerror = () => setRecording(false)
    recognition.onend = () => setRecording(false)
    recognition.start()
    window._tendRecognition = recognition
    setRecording(true)
  }

  const cleanUp = async () => {
    if (!notes.trim()) return
    setCleaning(true)
    try {
      const res = await fetch('/api/ai-summary', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ youngPersonName: selectedYP ? youngPeople.find(y => y.id === selectedYP)?.name : 'General', stage: 'N/A', notes, contactType: contactTypes.find(c => c.value === contactType)?.label })
      })
      const data = await res.json()
      if (data.cleanedNotes) setCleanedNotes(data.cleanedNotes)
    } catch(e) {}
    setCleaning(false)
  }

  const save = async () => {
    if (!notes.trim()) return
    setSaving(true)
    try {
      await fetch('/api/contact-logs', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          young_person_id: selectedYP || null,
          mentor_id: mentor?.id === 'demo' ? null : mentor?.id,
          date: new Date().toISOString().split('T')[0],
          contact_type: contactType,
          professional_involved: professional.trim() || null,
          notes: notes.trim(),
          ai_cleaned_notes: cleanedNotes || null,
        })
      })
      setSaved(true)
    } catch(e) {}
    setSaving(false)
  }

  if (saved) return (
    <div className="screen active" style={{ alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:40 }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:T.pale, border:`1.5px solid ${T.mist}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:22, color:T.sage }}>✓</div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:300, color:T.dark, marginBottom:6 }}>Logged</div>
        <div style={{ fontSize:13, color:T.muted, marginBottom:20 }}>Contact recorded.</div>
        <button onClick={() => exportAndCopy(formatContactExport({ date: new Date().toISOString().split('T')[0], contact_type: contactType, professional_involved: professional.trim() || null, notes: cleanedNotes || notes, ai_cleaned_notes: cleanedNotes }, selectedYP ? youngPeople.find(y => y.id === selectedYP)?.name : 'General'))} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:10, padding:'10px 20px', fontSize:13, color:T.sage, cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:500, display:'block', width:'100%', maxWidth:260, margin:'0 auto 10px' }}>
          📋 Copy to clipboard
        </button>
        <button onClick={onDone} className="btn-p" style={{ maxWidth:260, margin:'0 auto' }}>
          Done →
        </button>
      </div>
    </div>
  )

  return (
    <div className="screen active slide-in">
      <button className="back" onClick={onBack}>← Back</button>
      <div className="sh">
        <div className="sh-eye">Quick Log</div>
        <div className="sh-title">Record a <em>contact</em></div>
      </div>
      <div className="body-start" />
      <div className="scroll">

        {/* Contact type */}
        <Card>
          <div className="inp-label">What type of contact?</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {contactTypes.map(ct => (
              <button key={ct.value} onClick={() => setContactType(ct.value)} style={{
                padding:'8px 12px', borderRadius:20,
                border:`1.5px solid ${contactType === ct.value ? T.sage : T.border}`,
                background: contactType === ct.value ? T.pale : 'transparent',
                color: contactType === ct.value ? T.sage : T.muted,
                fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:"'Outfit',sans-serif",
                display:'flex', alignItems:'center', gap:5,
              }}>
                <span style={{ fontSize:13 }}>{ct.icon}</span> {ct.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Who */}
        <Card>
          <div className="inp-label">Young person <span style={{ fontWeight:300, textTransform:'none', letterSpacing:0 }}>· optional for general notes</span></div>
          <select value={selectedYP || ''} onChange={e => setSelectedYP(e.target.value || null)} style={{ width:'100%', background:T.bg, border:`1px solid ${T.border}`, borderRadius:12, padding:'12px 14px', fontSize:13, color:T.dark, fontFamily:"'Outfit',sans-serif", fontWeight:400, outline:'none', cursor:'pointer', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%238FAA96' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 14px center' }}>
            <option value="">General (not YP-specific)</option>
            {youngPeople.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
          </select>
        </Card>

        {/* Professional involved */}
        {(contactType === 'professional_contact' || contactType === 'meeting') && (
          <Card>
            <div className="inp-label">Professional involved</div>
            <input className="inp" type="text" placeholder="e.g. Social worker - Jane Smith, Police, School" value={professional} onChange={e => setProfessional(e.target.value)} />
          </Card>
        )}

        {/* Notes with voice */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
            <div className="inp-label" style={{ marginBottom:0 }}>What happened?</div>
            <div onClick={toggleRecording} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', padding:'4px 10px', borderRadius:20, background: recording ? T.rosePale : T.pale, border:`1px solid ${recording ? '#EDCACA' : T.mist}`, transition:'all 0.2s' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background: recording ? T.rose : T.sage, animation: recording ? 'pd 1s infinite' : 'none' }} />
              <span style={{ fontSize:10, fontWeight:500, color: recording ? T.rose : T.sage }}>{recording ? 'Stop' : 'Voice'}</span>
            </div>
          </div>
          <textarea className="inp" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Speak or type — what happened, who was involved, any outcomes or actions..." />

          {notes.trim().length > 30 && (
            <div style={{ display:'flex', gap:8 }}>
              <div className="ai-tag" style={{ cursor:'pointer', flex:1 }} onClick={cleanUp}>
                <PulseDot /> {cleaning ? 'Cleaning up...' : 'AI clean-up'}
              </div>
            </div>
          )}
          {cleaning && <div style={{ marginTop:8 }}><Spinner /></div>}
          {cleanedNotes && (
            <div style={{ marginTop:12, padding:'12px 14px', background:T.pale, borderRadius:12, border:`1px solid ${T.mist}` }}>
              <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:T.sage, marginBottom:6 }}>Cleaned version</div>
              <div className="ai-text">{cleanedNotes}</div>
              <button onClick={() => { setNotes(cleanedNotes); setCleanedNotes(null) }} style={{ marginTop:8, background:'none', border:`1px solid ${T.mist}`, borderRadius:8, padding:'6px 12px', fontSize:11, color:T.sage, cursor:'pointer', fontFamily:"'Outfit',sans-serif", fontWeight:500 }}>Use this version</button>
            </div>
          )}
        </Card>

        <button className="btn-p" onClick={save} disabled={saving || !notes.trim()} style={{ opacity: !notes.trim() || saving ? 0.5 : 1 }}>
          {saving ? 'Saving...' : 'Save to diary →'}
        </button>
      </div>
    </div>
  )
}


// ── SCREEN: ADD YOUNG PERSON ──
function AddYPScreen({ orgId, onDone, onBack }) {
  const [form, setForm] = useState({ name:'', dob:'', phone:'', email:'', postcode:'', referral_source:'', initial_stage:'Early', background_notes:'' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    // Save the YP
    const res = await fetch('/api/young-people', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ name: form.name.trim(), dob: form.dob || null, phone: form.phone || null, email: form.email || null, postcode: form.postcode || null, org_id: orgId })
    })
    const data = await res.json()

    // If there are background notes or a non-Early stage, create an initial session to capture that context
    if (data?.id && (form.background_notes.trim() || form.initial_stage !== 'Early')) {
      await fetch('/api/sessions', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          young_person_id: data.id,
          mentor_id: null,
          date: new Date().toISOString().split('T')[0],
          focus_step: form.initial_stage,
          notes: [form.background_notes, form.referral_source ? `Referral: ${form.referral_source}` : ''].filter(Boolean).join('\n\n') || `Initial intake — starting at ${form.initial_stage} stage.`,
          ai_summary: null,
          indicators: {},
        })
      })
    }

    setSaving(false)
    onDone(data)
  }

  return (
    <div className="screen active slide-in">
      <button className="back" onClick={onBack}>← Back</button>
      <div className="sh">
        <div className="sh-eye">Add Young Person</div>
        <div className="sh-title">New to <em>your caseload</em></div>
      </div>
      <div className="body-start" />
      <div className="scroll">
        <Card>
          <div className="inp-label">Name *</div>
          <input className="inp" type="text" placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
          <div className="inp-label">Date of birth</div>
          <input className="inp" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
          <div className="inp-label">Postcode / area</div>
          <input className="inp" type="text" placeholder="e.g. CF10 or Butetown" value={form.postcode} onChange={e => set('postcode', e.target.value)} />
          <div className="inp-label">Phone</div>
          <input className="inp" type="tel" placeholder="07..." value={form.phone} onChange={e => set('phone', e.target.value)} />
          <div className="inp-label">Email</div>
          <input className="inp" type="email" placeholder="Optional" value={form.email} onChange={e => set('email', e.target.value)} />
        </Card>

        <Card>
          <div className="inp-label">Referral source</div>
          <input className="inp" type="text" placeholder="e.g. School, self-referral, VRU, social services" value={form.referral_source} onChange={e => set('referral_source', e.target.value)} />

          <div className="inp-label">Where are they on the journey?</div>
          <div style={{ fontSize:11, color:T.muted, fontWeight:300, marginBottom:10 }}>If you've been working with this young person already, select their current stage.</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
            {STEPS.map(s => (
              <button key={s} onClick={() => set('initial_stage', s)} style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${form.initial_stage===s ? T.sage : T.border}`, background: form.initial_stage===s ? T.pale : 'transparent', color: form.initial_stage===s ? T.sage : T.muted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>{s}</button>
            ))}
          </div>

          <div className="inp-label">Background notes</div>
          <textarea className="inp" rows={3} value={form.background_notes} onChange={e => set('background_notes', e.target.value)} placeholder="Any context you want Tend to know — how long you've been working together, key themes, what's working, what's hard..." />
        </Card>

        <button className="btn-p" onClick={save} disabled={saving || !form.name.trim()} style={{ opacity: !form.name.trim() || saving ? 0.5 : 1 }}>
          {saving ? 'Adding...' : 'Add to caseload →'}
        </button>
      </div>
    </div>
  )
}

// ── SCREEN: IMPACT REPORT ──
function ReportScreen({ sessions, youngPeople, mentor, onBack }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [error, setError] = useState(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 45000)
      const res = await fetch('/api/impact-report', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          orgName: mentor?.organisations?.name,
          sessions: sessions.slice(0, 50),
          youngPeople,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setReport(data); setGenerated(true)
    } catch(e) {
      if (e.name === 'AbortError') {
        setError('Report generation timed out. The AI service may be busy — try again in a moment.')
      } else {
        setError(e.message || 'Something went wrong generating the report. Try again.')
      }
    }
    setLoading(false)
  }

  const totalSessions = sessions.length
  const uniqueYP = [...new Set(sessions.map(s => s.young_person_id))].length

  const stageDist = {}
  STEPS.forEach(s => stageDist[s] = 0)
  youngPeople.forEach(yp => {
    const s = sessions.filter(x => x.young_person_id === yp.id)
    const stage = s[0]?.focus_step || 'Early'
    stageDist[stage]++
  })

  return (
    <div className="screen active slide-in">
      <button className="back" onClick={onBack}>← Back</button>
      <div className="sh">
        <div className="sh-eye">Impact Report</div>
        <div className="sh-title">Q{Math.ceil((new Date().getMonth() + 1) / 3)} <em>{new Date().getFullYear()}</em></div>
      </div>
      <div className="body-start" />
      <div className="scroll">
        <div className="report-hero">
          <div className="rh-title">{mentor?.organisations?.name || 'Your Organisation'}</div>
          <div className="rh-sub">{totalSessions} sessions · {uniqueYP} young people · AI generated</div>
        </div>

        {!generated && (
          <Card>
            <div className="card-label">Generate your report</div>
            <div className="ai-text" style={{ marginBottom:14 }}>Tend Intelligence will analyse your session data and generate a funder-ready impact report.</div>
            {error && <div style={{ fontSize:12, color:T.rose, marginBottom:12, padding:'10px 14px', background:T.rosePale, borderRadius:10, border:'1px solid #EDCACA' }}>{error}</div>}
            <button className="btn-p" onClick={generate} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? <span style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}><Spinner /> Generating...</span> : error ? '↺ Try again' : '✦ Generate impact report'}
            </button>
          </Card>
        )}

        {report && (
          <>
            <Card>
              <div className="card-label">Summary</div>
              <AITag />
              <div className="ai-text">{report.executiveSummary}</div>
            </Card>
            <Card>
              <div className="card-label">Key metrics</div>
              <div className="ai-text">{report.keyMetrics}</div>
            </Card>
            <Card>
              <div className="card-label">Outcomes evidence</div>
              <div className="ai-text">{report.outcomesEvidence}</div>
            </Card>
            {report.highlights?.length > 0 && (
              <Card>
                <div className="card-label">Highlights</div>
                {report.highlights.map((h, i) => (
                  <div key={i} style={{ display:'flex', gap:8, marginBottom:8 }}>
                    <span style={{ color:T.growth, fontWeight:600, fontSize:14 }}>✦</span>
                    <span className="ai-text" style={{ marginBottom:0 }}>{h}</span>
                  </div>
                ))}
              </Card>
            )}
            <Card>
              <div className="card-label">Recommendations</div>
              <div className="ai-text">{report.recommendations}</div>
            </Card>
          </>
        )}

        <Card>
          <div className="card-label">Cohort progress</div>
          {INDICATORS.map(ind => {
            const vals = sessions.map(s => s.indicators?.[ind.key]).filter(Boolean)
            const avg = vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : null
            return <ScoreBar key={ind.key} label={ind.label} value={avg} color={ind.color} />
          })}
        </Card>

        <Card>
          <div className="card-label">Pathway movement</div>
          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6 }}>
            {STEPS.map(s => (
              <div key={s} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:300, color: stageDist[s] > 0 ? STEP_COLORS[s] : T.muted }}>{stageDist[s]}</div>
                <div style={{ fontSize:8, color: stageDist[s] > 0 ? STEP_COLORS[s] : T.muted, textTransform:'uppercase', letterSpacing:'0.08em' }}>{s}</div>
              </div>
            ))}
          </div>
        </Card>

        {generated && (
          <>
            <button className="btn-p" onClick={generate} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Regenerating...' : '↺ Regenerate report'}
            </button>
            <button className="btn-s" style={{ color:T.muted, borderColor:T.border }} onClick={() => {
              const lines = []
              lines.push(`IMPACT REPORT — ${mentor?.organisations?.name || 'Organisation'}`)
              lines.push(`Period: Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`)
              lines.push(`Generated: ${new Date().toLocaleDateString('en-GB')}`)
              lines.push(`Sessions: ${sessions.length} · Young people: ${youngPeople.length}`)
              lines.push('')
              if (report.executiveSummary) { lines.push('EXECUTIVE SUMMARY'); lines.push(report.executiveSummary); lines.push('') }
              if (report.keyMetrics) { lines.push('KEY METRICS'); lines.push(report.keyMetrics); lines.push('') }
              if (report.outcomesEvidence) { lines.push('OUTCOMES EVIDENCE'); lines.push(report.outcomesEvidence); lines.push('') }
              if (report.highlights?.length) { lines.push('HIGHLIGHTS'); report.highlights.forEach(h => lines.push(`• ${h}`)); lines.push('') }
              if (report.recommendations) { lines.push('RECOMMENDATIONS'); lines.push(report.recommendations) }
              exportAndCopy(lines.join('\n'))
            }}>📋 Copy report to clipboard</button>
            <button className="btn-s" style={{ color:T.muted, borderColor:T.border }} onClick={() => {
              const lines = []
              lines.push(`IMPACT REPORT — ${mentor?.organisations?.name || 'Organisation'}`)
              lines.push(`Period: Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`)
              lines.push(`Generated: ${new Date().toLocaleDateString('en-GB')}`)
              lines.push(`Sessions: ${sessions.length} · Young people: ${youngPeople.length}`)
              lines.push('')
              if (report.executiveSummary) { lines.push('EXECUTIVE SUMMARY\n'); lines.push(report.executiveSummary); lines.push('') }
              if (report.keyMetrics) { lines.push('KEY METRICS\n'); lines.push(report.keyMetrics); lines.push('') }
              if (report.outcomesEvidence) { lines.push('OUTCOMES EVIDENCE\n'); lines.push(report.outcomesEvidence); lines.push('') }
              if (report.highlights?.length) { lines.push('HIGHLIGHTS\n'); report.highlights.forEach(h => lines.push(`• ${h}`)); lines.push('') }
              if (report.recommendations) { lines.push('RECOMMENDATIONS\n'); lines.push(report.recommendations) }
              const text = lines.join('\n')
              const w = window.open('', '_blank')
              w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Impact Report — ${mentor?.organisations?.name || 'Tend'}</title><style>body{font-family:Arial,sans-serif;font-size:13px;line-height:1.7;padding:40px;color:#1C2C22;max-width:800px;white-space:pre-wrap}@media print{body{padding:20px}}</style></head><body>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</body></html>`)
              w.document.close()
              setTimeout(() => w.print(), 300)
            }}>📄 Export as PDF</button>
          </>
        )}
      </div>
    </div>
  )
}

// ── SCREEN: INSIGHTS ──
function InsightsScreen({ sessions, youngPeople, onNav }) {
  const totalSessions = sessions.length
  const last30 = sessions.filter(s => {
    const d = new Date(s.date)
    return (Date.now() - d) < 30 * 86400000
  })

  const stageCount = {}
  STEPS.forEach(s => stageCount[s] = 0)
  youngPeople.forEach(yp => {
    const s = sessions.filter(x => x.young_person_id === yp.id)
    const stage = s[0]?.focus_step || 'Early'
    stageCount[stage]++
  })

  const sgCount = sessions.filter(s => s.safeguarding_concern?.trim()).length

  return (
    <div className="screen active slide-in">
      <div className="sh">
        <div className="sh-eye">Insights</div>
        <div className="sh-title">Your <em>impact</em></div>
      </div>
      <div className="body-start" />
      <div className="scroll">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
          {[
            { label:'Total sessions', value: totalSessions, color: T.sage },
            { label:'Last 30 days', value: last30.length, color: T.growth },
            { label:'Young people', value: youngPeople.length, color: T.amber },
            { label:'SG concerns', value: sgCount, color: T.rose },
          ].map(item => (
            <Card key={item.label} style={{ textAlign:'center', padding:'16px 12px' }}>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:32, fontWeight:300, color: item.color, lineHeight:1 }}>{item.value}</div>
              <div style={{ fontSize:10, color:T.muted, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:4, fontWeight:600 }}>{item.label}</div>
            </Card>
          ))}
        </div>

        <Card>
          <div className="card-label">Pathway distribution</div>
          <div style={{ display:'flex', justifyContent:'space-between', paddingTop:6 }}>
            {STEPS.map(s => (
              <div key={s} style={{ textAlign:'center' }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:28, fontWeight:300, color: stageCount[s] > 0 ? STEP_COLORS[s] : T.muted }}>{stageCount[s]}</div>
                <div style={{ fontSize:8, color: stageCount[s] > 0 ? STEP_COLORS[s] : T.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginTop:4 }}>{s}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="card-label">Average indicators across caseload</div>
          {INDICATORS.map(ind => {
            const vals = sessions.map(s => s.indicators?.[ind.key]).filter(Boolean)
            const avg = vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : null
            return <ScoreBar key={ind.key} label={ind.label} value={avg} color={ind.color} />
          })}
        </Card>

        <button className="btn-p" onClick={() => onNav('report')}>Generate impact report →</button>
      </div>
      <BottomNav active="insights" onNav={onNav} />
    </div>
  )
}


// ── SCREEN: SAFEGUARDING ──
function SafeguardingScreen({ sessions, youngPeople, onBack, privacy = (n) => n }) {
  const sgSessions = sessions.filter(s => s.safeguarding_concern?.trim())
  const ypName = (id) => youngPeople.find(y => y.id === id)?.name || 'Unknown'

  return (
    <div className="screen active slide-in">
      <button className="back" onClick={onBack}>← Back</button>
      <div className="sh">
        <div className="sh-eye">Safeguarding</div>
        <div className="sh-title"><em>{sgSessions.length} concern{sgSessions.length !== 1 ? 's' : ''}</em> flagged</div>
      </div>
      <div className="body-start" />
      <div className="scroll">
        {sgSessions.length === 0 && (
          <Card><div style={{ textAlign:'center', padding:'20px 0', color:T.muted, fontSize:13 }}>No safeguarding concerns flagged</div></Card>
        )}
        {sgSessions.map(s => (
          <div key={s.id} className="alert" style={{ flexDirection:'column', gap:8 }}>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div className="alert-dot">⚑</div>
              <div>
                <div className="alert-title">{privacy(ypName(s.young_person_id))}</div>
                <div style={{ fontSize:10, color:'#A05050', fontWeight:300 }}>{s.date}</div>
              </div>
            </div>
            <div className="alert-body" style={{ fontSize:12, lineHeight:1.6 }}>{s.safeguarding_concern}</div>
            {s.notes && s.notes !== s.safeguarding_concern && (
              <div style={{ fontSize:11, color:T.mid, fontWeight:300, fontStyle:'italic', lineHeight:1.5, borderTop:'1px solid #EDCACA', paddingTop:8, marginTop:4 }}>
                Session notes: "{s.notes.slice(0, 200)}{s.notes.length > 200 ? '...' : ''}"
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}


// ── SCREEN: SETTINGS ──
function SettingsScreen({ mentor, onBack, onUpdateMentor, onSignOut }) {
  const [name, setName] = useState(mentor?.name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [team, setTeam] = useState([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const isAdmin = mentor?.role === 'admin'

  useEffect(() => {
    if (isAdmin && mentor?.org_id) {
      setLoadingTeam(true)
      fetch(`/api/mentors?orgId=${mentor.org_id}`)
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setTeam(data) })
        .catch(() => {})
        .finally(() => setLoadingTeam(false))
    }
  }, [isAdmin, mentor?.org_id])

  const saveProfile = async () => {
    if (!name.trim()) return
    setSaving(true); setSaved(false)
    try {
      const res = await fetch('/api/mentors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: mentor.id, name: name.trim() })
      })
      const data = await res.json()
      if (data && !data.error) {
        onUpdateMentor(data)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch(e) {}
    setSaving(false)
  }

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) return
    setInviting(true); setInviteError(''); setInviteSent(false)
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          orgId: mentor.org_id,
          orgName: mentor?.organisations?.name,
          invitedBy: mentor.name,
        })
      })
      const data = await res.json()
      if (data.error) { setInviteError(data.error) }
      else { setInviteSent(true); setInviteEmail('') }
    } catch(e) {
      setInviteError('Failed to send invite')
    }
    setInviting(false)
  }

  const handleSignOut = async () => {
    try {
      const { getSupabase } = await import('@/lib/supabase')
      const sb = getSupabase()
      await sb.auth.signOut()
    } catch(e) {}
    onSignOut()
  }

  return (
    <div className="screen active slide-in">
      <button className="back" onClick={onBack}>← Back</button>
      <div className="sh">
        <div className="sh-eye">Settings</div>
        <div className="sh-title">Your <em>account</em></div>
      </div>
      <div className="body-start" />
      <div className="scroll">

        <Card>
          <div className="card-label">Profile</div>
          <div className="inp-label">Name</div>
          <input className="inp" type="text" value={name} onChange={e => setName(e.target.value)} />
          <div className="inp-label">Email</div>
          <input className="inp" type="email" value={mentor?.email || ''} readOnly style={{ opacity:0.5, cursor:'not-allowed' }} />
          <div className="inp-label">Organisation</div>
          <input className="inp" type="text" value={mentor?.organisations?.name || ''} readOnly style={{ opacity:0.5, cursor:'not-allowed' }} />
          <div className="inp-label">Role</div>
          <input className="inp" type="text" value={mentor?.role === 'admin' ? 'Admin' : 'Mentor'} readOnly style={{ opacity:0.5, cursor:'not-allowed' }} />
          <button className="btn-p" onClick={saveProfile} disabled={saving || !name.trim()} style={{ opacity: saving || !name.trim() ? 0.5 : 1 }}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Update profile'}
          </button>
        </Card>

        {isAdmin && (
          <>
            <Card>
              <div className="card-label">Invite a mentor</div>
              <div style={{ fontSize:12, color:T.muted, fontWeight:300, marginBottom:12, lineHeight:1.5 }}>Send an email invitation to a colleague. They'll be able to sign up and join your organisation on Tend.</div>
              <div className="inp-label">Email address</div>
              <input className="inp" type="email" placeholder="colleague@example.com" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteSent(false); setInviteError('') }} />
              {inviteError && <div style={{ fontSize:12, color:T.rose, marginBottom:8 }}>{inviteError}</div>}
              {inviteSent && <div style={{ fontSize:12, color:T.sage, marginBottom:8, padding:'8px 12px', background:T.pale, borderRadius:8, border:`1px solid ${T.mist}` }}>✓ Invitation sent</div>}
              <button className="btn-p" onClick={sendInvite} disabled={inviting || !inviteEmail.includes('@')} style={{ opacity: inviting || !inviteEmail.includes('@') ? 0.5 : 1 }}>
                {inviting ? 'Sending...' : 'Send invitation →'}
              </button>
            </Card>

            <Card>
              <div className="card-label">Your team</div>
              {loadingTeam && <div style={{ padding:'12px 0' }}><Spinner /></div>}
              {!loadingTeam && team.length === 0 && (
                <div style={{ fontSize:13, color:T.muted, padding:'8px 0' }}>No team members yet</div>
              )}
              {team.map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:T.pale, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:300, color:T.sage, flexShrink:0 }}>
                    {m.name?.[0] || '?'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:T.dark }}>{m.name}{m.id === mentor.id ? ' (you)' : ''}</div>
                    <div style={{ fontSize:11, color:T.muted, fontWeight:300 }}>{m.email}</div>
                  </div>
                  <span className="badge" style={{ background: m.role === 'admin' ? T.amberPale : T.pale, color: m.role === 'admin' ? '#B07820' : T.sage }}>{m.role}</span>
                </div>
              ))}
            </Card>
          </>
        )}

        <button onClick={handleSignOut} style={{ width:'100%', background:'transparent', border:`1.5px solid ${T.border}`, borderRadius:14, padding:14, fontSize:13, fontWeight:400, color:T.rose, fontFamily:"'Outfit',sans-serif", cursor:'pointer', letterSpacing:'0.04em', marginTop:8, marginBottom:40 }}>
          Sign out
        </button>
      </div>
    </div>
  )
}


// ── MAIN DASHBOARD ──
export default function Dashboard() {
  const [mentor, setMentor] = useState(null)
  const [youngPeople, setYP] = useState([])
  const [sessions, setSessions] = useState([])
  const [contactLogs, setContactLogs] = useState([])
  const [riskMarkers, setRiskMarkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('home')
  const [selectedYP, setSelectedYP] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [onboardingDone, setOnboardingDone] = useState(false)
  const [showPrepPrompt, setShowPrepPrompt] = useState(false)
  const [privacyMode, setPrivacyMode] = useState(false)

  // Helper: wrap any name through privacy filter
  const pn = (name) => privacyName(name, privacyMode)

  const orgId = mentor?.org_id || '00000000-0000-0000-0000-000000000001'

  const refreshData = async (useOrgId) => {
    const oid = useOrgId || orgId
    const [ypRes, sessRes, clRes] = await Promise.all([
      fetch(`/api/young-people?orgId=${oid}`),
      fetch(`/api/sessions?orgId=${oid}`),
      fetch(`/api/contact-logs?orgId=${oid}`).catch(() => ({ json: async () => [] })),
    ])
    setYP(await ypRes.json())
    setSessions(await sessRes.json())
    try { setContactLogs(await clRes.json()) } catch(e) { setContactLogs([]) }
  }

  useEffect(() => {
    const init = async () => {
      // Check for ?demo=true in URL
      const params = new URLSearchParams(window.location.search)
      const isDemo = params.get('demo') === 'true'

      if (isDemo) {
        // Demo mode — skip auth, load demo org data directly
        const demoOrgId = '00000000-0000-0000-0000-000000000001'
        const [ypRes, sessRes, clRes] = await Promise.all([
          fetch(`/api/young-people?orgId=${demoOrgId}`),
          fetch(`/api/sessions?orgId=${demoOrgId}`),
          fetch(`/api/contact-logs?orgId=${demoOrgId}`).catch(() => ({ json: async () => [] })),
        ])
        setMentor({ name: 'Jordan Clarke', id: 'demo', email: 'jordan@riverside.org.uk', org_id: demoOrgId, role: 'admin', work_context: 'youth_mentoring', organisations: { name: 'Riverside Youth Trust' } })
        const ypData = await ypRes.json()
        setYP(ypData)
        setSessions(await sessRes.json())
        try { setContactLogs(await clRes.json()) } catch(e) { setContactLogs([]) }
        // Load risk markers for all YPs
        const allMarkers = []
        for (const yp of ypData) {
          try {
            const mRes = await fetch(`/api/risk-markers?ypId=${yp.id}`)
            const mData = await mRes.json()
            if (Array.isArray(mData)) allMarkers.push(...mData)
          } catch(e) {}
        }
        setRiskMarkers(allMarkers)
        setOnboardingDone(true)
        setLoading(false)
        return
      }

      try {
        const { getSupabase } = await import('@/lib/supabase')
        const sb = getSupabase()
        const { data: { user } } = await sb.auth.getUser()

        if (user) {
          const mentorRes = await fetch(`/api/auth?userId=${user.id}&email=${encodeURIComponent(user.email)}`)
          const mentorData = await mentorRes.json()

          if (mentorData && mentorData.org_id) {
            setMentor(mentorData)
            const [ypRes, sessRes] = await Promise.all([
              fetch(`/api/young-people?orgId=${mentorData.org_id}`),
              fetch(`/api/sessions?orgId=${mentorData.org_id}`),
            ])
            const ypData = await ypRes.json()
            const sessData = await sessRes.json()
            setYP(ypData)
            setSessions(sessData)

            if (ypData.length === 0 && !mentorData.work_context) {
              setOnboardingDone(false)
            } else {
              setOnboardingDone(true)
            }
          } else {
            setMentor({ name: user.email, id: user.id, email: user.email, org_id: null, role: 'admin', organisations: { name: 'Your Organisation' } })
            setOnboardingDone(true)
          }
        } else {
          const [ypRes, sessRes] = await Promise.all([
            fetch('/api/young-people?orgId=all'),
            fetch('/api/sessions?orgId=all'),
          ])
          setMentor({ name: 'Jordan', id: 'demo', email: 'demo@tend.app', org_id: '00000000-0000-0000-0000-000000000001', role: 'admin', organisations: { name: 'Riverside Youth Trust' } })
          setYP(await ypRes.json())
          setSessions(await sessRes.json())
          setOnboardingDone(true)
        }
      } catch(e) {
        console.error('Load error:', e)
        const [ypRes, sessRes] = await Promise.all([
          fetch('/api/young-people?orgId=all'),
          fetch('/api/sessions?orgId=all'),
        ])
        setMentor({ name: 'Jordan', id: 'demo', email: 'demo@tend.app', org_id: '00000000-0000-0000-0000-000000000001', role: 'admin', organisations: { name: 'Riverside Youth Trust' } })
        setYP(await ypRes.json())
        setSessions(await sessRes.json())
        setOnboardingDone(true)
      }
      setLoading(false)
    }
    init()
  }, [])

  const nav = (s) => { setShowPrepPrompt(false); setScreen(s) }

  const onSelectYP = (yp) => setSelectedYP(yp)

  const onDoneLog = async () => {
    await refreshData()
    setScreen('home')
  }

  const onDoneAddYP = async (newYP) => {
    await refreshData()
    if (newYP && newYP.id) {
      setSelectedYP(newYP)
      setShowPrepPrompt(true)
      setScreen('profile')
    } else {
      setScreen('people')
    }
  }

  const onOnboardingAddYPDone = async (newYP) => {
    await refreshData()
    if (newYP && newYP.id) {
      setSelectedYP(newYP)
      setShowPrepPrompt(true)
    }
    setOnboardingDone(true)
    setScreen(newYP?.id ? 'profile' : 'home')
  }

  const onOnboardingSkip = () => {
    setOnboardingDone(true)
    setScreen('home')
  }

  const onUpdateMentor = (updated) => {
    setMentor(updated)
  }

  const onSignOut = () => {
    window.location.href = '/'
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:T.forest, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:"'Outfit',sans-serif" }}>
      <ArcMark size={56} light />
      <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:300, fontSize:22, letterSpacing:'0.14em', color:'white', marginTop:16 }}>tend</div>
      <div style={{ marginTop:24 }}><Spinner /></div>
    </div>
  )

  // ── ONBOARDING FLOW (no bottom nav) ──
  if (!onboardingDone && mentor?.org_id) {
    if (screen === 'onboard-work') {
      return (
        <>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,200;0,9..144,300;0,9..144,400;1,9..144,200;1,9..144,300;1,9..144,400&display=swap');
            *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
            body{background:#F4F7F4;font-family:'Outfit',sans-serif;color:#1C2C22}
            input,textarea,select,button{font-family:'Outfit',sans-serif}
            .screen{display:flex;flex-direction:column;min-height:100vh}
            .slide-in{animation:slideIn 0.26s ease}
            @keyframes slideIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
            .inp-label{font-size:9px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#8FAA96;margin-bottom:7px}
            textarea.inp,input.inp{width:100%;background:#F4F7F4;border:1px solid #DDE8DF;border-radius:12px;padding:12px 14px;font-size:13px;color:#1C2C22;font-family:'Outfit',sans-serif;font-weight:300;margin-bottom:10px;outline:none;resize:none;line-height:1.5;box-sizing:border-box}
            textarea.inp:focus,input.inp:focus{border-color:#C5DECA}
            textarea.inp::placeholder,input.inp::placeholder{color:#8FAA96}
            .btn-p{width:100%;background:#4A7C59;color:white;border:none;border-radius:14px;padding:15px;font-size:14px;font-weight:500;font-family:'Outfit',sans-serif;cursor:pointer;letter-spacing:0.03em;transition:all 0.2s;margin-top:4px;display:block}
            .btn-p:active{background:#2D4A3E}
          `}</style>
          <OnboardingWorkContext mentor={mentor} onNext={() => setScreen('onboard-addyp')} onUpdateMentor={onUpdateMentor} />
        </>
      )
    }

    if (screen === 'onboard-addyp') {
      return (
        <>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,200;0,9..144,300;0,9..144,400;1,9..144,200;1,9..144,300;1,9..144,400&display=swap');
            *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
            body{background:#F4F7F4;font-family:'Outfit',sans-serif;color:#1C2C22}
            input,textarea,select,button{font-family:'Outfit',sans-serif}
            .screen{display:flex;flex-direction:column;min-height:100vh}
            .slide-in{animation:slideIn 0.26s ease}
            @keyframes slideIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
            .inp-label{font-size:9px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#8FAA96;margin-bottom:7px}
            textarea.inp,input.inp{width:100%;background:#F4F7F4;border:1px solid #DDE8DF;border-radius:12px;padding:12px 14px;font-size:13px;color:#1C2C22;font-family:'Outfit',sans-serif;font-weight:300;margin-bottom:10px;outline:none;resize:none;line-height:1.5;box-sizing:border-box}
            textarea.inp:focus,input.inp:focus{border-color:#C5DECA}
            textarea.inp::placeholder,input.inp::placeholder{color:#8FAA96}
            .btn-p{width:100%;background:#4A7C59;color:white;border:none;border-radius:14px;padding:15px;font-size:14px;font-weight:500;font-family:'Outfit',sans-serif;cursor:pointer;letter-spacing:0.03em;transition:all 0.2s;margin-top:4px;display:block}
            .btn-p:active{background:#2D4A3E}
          `}</style>
          <OnboardingAddYP orgId={orgId} onDone={onOnboardingAddYPDone} onSkip={onOnboardingSkip} />
        </>
      )
    }

    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,200;0,9..144,300;0,9..144,400;1,9..144,200;1,9..144,300;1,9..144,400&display=swap');
          *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
          body{background:#1C2C22;font-family:'Outfit',sans-serif;color:#1C2C22}
          .screen{display:flex;flex-direction:column;min-height:100vh}
        `}</style>
        <OnboardingWelcome mentor={mentor} onNext={() => setScreen('onboard-work')} />
      </>
    )
  }

  const logYP = selectedYP || youngPeople[0]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@200;300;400;500;600&family=Fraunces:ital,opsz,wght@0,9..144,200;0,9..144,300;0,9..144,400;1,9..144,200;1,9..144,300;1,9..144,400&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        body{background:#F4F7F4;font-family:'Outfit',sans-serif;color:#1C2C22}
        input,textarea,select,button{font-family:'Outfit',sans-serif}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#C5DECA;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pd{0%,100%{box-shadow:0 0 0 0 rgba(74,124,89,0.4)}50%{box-shadow:0 0 0 4px rgba(74,124,89,0)}}
        .slide-in{animation:slideIn 0.26s ease}
        @keyframes slideIn{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}

        .screen{display:flex;flex-direction:column;min-height:100vh}
        .scroll{flex:1;overflow-y:auto;padding:0 18px 100px;scrollbar-width:none}
        .scroll::-webkit-scrollbar{display:none}
        .sh{padding:20px 18px 12px;background:#fff;flex-shrink:0}
        .sh-eye{font-size:10px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:#8FAA96;margin-bottom:4px}
        .sh-title{font-family:'Fraunces',serif;font-size:26px;font-weight:300;color:#1C2C22;line-height:1.15}
        .sh-title em{font-style:italic;color:#4A7C59}
        .back{display:flex;align-items:center;gap:5px;font-size:13px;font-weight:400;color:#4A7C59;cursor:pointer;padding:12px 18px;background:#fff;border:none;font-family:'Outfit',sans-serif;width:100%;border-bottom:1px solid #DDE8DF}
        .bnav{display:flex;padding:10px 0 calc(28px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #DDE8DF;position:fixed;bottom:0;left:0;right:0;z-index:100}
        .ni{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;padding:4px 0}
        .ni-label{font-size:9px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#8FAA96}
        .ni.active .ni-label{color:#4A7C59}
        .greeting{padding:20px 18px 4px;background:#fff;position:relative}
        .g-time{font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#8FAA96;margin-bottom:3px}
        .g-name{font-family:'Fraunces',serif;font-size:30px;font-weight:300;color:#1C2C22;margin-bottom:2px}
        .g-sub{font-size:13px;color:#8FAA96;margin-bottom:18px;font-weight:300}
        .body-start{height:12px;background:#F4F7F4;flex-shrink:0}
        .today-hero{background:#1C2C22;border-radius:20px;padding:20px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;position:relative;overflow:hidden}
        .today-hero::before{content:'';position:absolute;top:-40px;right:-40px;width:140px;height:140px;border-radius:50%;background:rgba(107,175,124,0.08)}
        .th-count{font-family:'Fraunces',serif;font-size:48px;font-weight:200;color:#6BAF7C;line-height:1}
        .th-label{font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;font-weight:300}
        .th-chip{background:rgba(107,175,124,0.12);border:1px solid rgba(107,175,124,0.2);border-radius:20px;padding:5px 12px;font-size:11px;color:#C5DECA;font-weight:300;margin-bottom:6px}
        .prep-card{background:linear-gradient(135deg,#4A7C59 0%,#2D4A3E 100%);border-radius:20px;padding:20px;margin-bottom:10px;cursor:pointer;transition:transform 0.2s;position:relative;overflow:hidden}
        .prep-card:active{transform:scale(0.98)}
        .prep-card::after{content:'';position:absolute;bottom:-30px;right:-30px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.04)}
        .pc-eye{font-size:9px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.55);margin-bottom:8px;display:flex;align-items:center;gap:6px}
        .pc-title{font-family:'Fraunces',serif;font-size:19px;font-weight:300;color:white;margin-bottom:10px;line-height:1.3}
        .pc-insight{font-size:12px;line-height:1.65;color:rgba(255,255,255,0.75);font-style:italic;margin-bottom:16px;font-weight:300}
        .pc-btn{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:white;padding:9px 16px;border-radius:10px;font-size:12px;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif;letter-spacing:0.04em}
        .alert{background:#FAEAEA;border:1px solid #EDCACA;border-radius:14px;padding:14px 16px;margin-bottom:10px;display:flex;gap:12px;align-items:flex-start}
        .alert-dot{width:28px;height:28px;background:rgba(201,112,112,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
        .alert-title{font-size:12px;font-weight:600;color:#8B3A3A;margin-bottom:3px}
        .alert-body{font-size:11px;color:#A05050;line-height:1.45;font-weight:300}
        .sec{font-size:9px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#8FAA96;margin:18px 0 10px}
        .yp{background:#fff;border:1px solid #DDE8DF;border-radius:16px;padding:13px 15px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all 0.15s}
        .yp:active{background:#EAF2EC;border-color:#C5DECA}
        .yp-av{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:17px;font-weight:300;flex-shrink:0}
        .yp-info{flex:1}
        .yp-name{font-size:14px;font-weight:500;color:#1C2C22;margin-bottom:3px}
        .yp-meta{font-size:11px;color:#8FAA96;font-weight:300}
        .badge{font-size:9px;font-weight:600;padding:4px 10px;border-radius:20px;letter-spacing:0.06em;text-transform:uppercase}
        .b-rebuild{background:#EAF2EC;color:#4A7C59}
        .b-reframe{background:#FDF3E3;color:#B07820}
        .b-reset{background:#F0EEFF;color:#7060C0}
        .b-release{background:#E8F4FF;color:#3080C0}
        .b-rise{background:#FAEAEA;color:#C97070}
        .qgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
        .qbtn{background:#fff;border:1px solid #DDE8DF;border-radius:16px;padding:16px 14px;cursor:pointer;transition:all 0.15s;text-align:left}
        .qbtn:active{background:#EAF2EC;transform:scale(0.97)}
        .qi{width:32px;height:32px;border-radius:10px;margin-bottom:10px;display:flex;align-items:center;justify-content:center;font-size:15px}
        .qt{font-size:12px;font-weight:500;color:#1C2C22;margin-bottom:2px}
        .qs{font-size:10px;color:#8FAA96;font-weight:300}
        .ai-insight{background:#EAF2EC;border:1px solid #C5DECA;border-radius:14px;padding:14px 16px;margin-bottom:10px}
        .ai-text{font-size:12px;line-height:1.65;color:#4A6455;font-weight:300}
        .pathway{display:flex;align-items:flex-start;margin:6px 0 14px}
        .p-step{flex:1;display:flex;flex-direction:column;align-items:center;position:relative}
        .p-step::after{content:'';position:absolute;top:12px;left:50%;width:100%;height:1px;background:#DDE8DF;z-index:0}
        .p-step:last-child::after{display:none}
        .p-step.done::after{background:#C5DECA}
        .p-dot{width:24px;height:24px;border-radius:50%;background:#F4F7F4;border:1px solid #DDE8DF;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600;color:#8FAA96;position:relative;z-index:1;margin-bottom:6px}
        .p-dot.done{background:#EAF2EC;border-color:#C5DECA;color:#4A7C59}
        .p-dot.cur{background:#FDF3E3;border-color:#E8A44A;color:#E8A44A;box-shadow:0 0 0 3px rgba(232,164,74,0.12)}
        .p-name{font-size:7px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#8FAA96;text-align:center}
        .p-name.done{color:#4A7C59}
        .p-name.cur{color:#E8A44A}
        .score-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
        .sl{font-size:11px;color:#8FAA96;width:84px;flex-shrink:0;font-weight:300}
        .sb-wrap{flex:1;height:5px;background:#DDE8DF;border-radius:3px;overflow:hidden}
        .sb-fill{height:100%;border-radius:3px;background:#4A7C59}
        .sv{font-size:11px;font-weight:600;color:#1C2C22;width:28px;text-align:right}
        .si{display:flex;gap:13px;margin-bottom:18px;position:relative}
        .si::before{content:'';position:absolute;left:14px;top:28px;bottom:-10px;width:1px;background:#DDE8DF}
        .si:last-of-type::before{display:none}
        .si-dot{width:28px;height:28px;border-radius:50%;background:#EAF2EC;border:1px solid #C5DECA;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#4A7C59;flex-shrink:0;z-index:1}
        .si-date{font-size:10px;color:#8FAA96;margin-bottom:5px;font-weight:300}
        .si-note{font-size:12px;line-height:1.6;color:#4A6455;font-style:italic;font-weight:300}
        .ph{background:linear-gradient(160deg,#2D4A3E 0%,#1C2C22 100%);padding:20px 18px 24px;position:relative;overflow:hidden}
        .ph::before{content:'';position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(107,175,124,0.04)}
        .ph-av{width:58px;height:58px;border-radius:50%;background:rgba(107,175,124,0.15);border:1.5px solid rgba(107,175,124,0.3);display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:22px;font-weight:300;color:#C5DECA;margin-bottom:12px}
        .ph-name{font-family:'Fraunces',serif;font-size:22px;font-weight:300;color:#F7F4EE;margin-bottom:3px}
        .ph-meta{font-size:12px;color:rgba(255,255,255,0.5);font-weight:300;margin-bottom:16px}
        .ph-stats{display:flex;gap:24px}
        .ps-num{font-family:'Fraunces',serif;font-size:20px;font-weight:300;color:#F7F4EE}
        .ps-lbl{font-size:9px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.1em}
        .cq{font-family:'Fraunces',serif;font-size:18px;font-weight:300;font-style:italic;color:#1C2C22;line-height:1.45;margin-bottom:16px}
        .emoji-row{display:flex;justify-content:space-between;margin-bottom:6px}
        .eo{display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;padding:10px 6px;border-radius:12px;transition:all 0.15s;border:1.5px solid transparent}
        .eo:active{background:#EAF2EC}
        .eo.sel{background:#EAF2EC;border-color:#C5DECA}
        .ef{font-size:26px}
        .el{font-size:9px;color:#8FAA96;font-weight:400;letter-spacing:0.04em}
        .inp-label{font-size:9px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#8FAA96;margin-bottom:7px}
        textarea.inp,input.inp{width:100%;background:#F4F7F4;border:1px solid #DDE8DF;border-radius:12px;padding:12px 14px;font-size:13px;color:#1C2C22;font-family:'Outfit',sans-serif;font-weight:300;margin-bottom:10px;outline:none;resize:none;line-height:1.5;box-sizing:border-box}
        textarea.inp:focus,input.inp:focus{border-color:#C5DECA}
        textarea.inp::placeholder,input.inp::placeholder{color:#8FAA96}
        .btn-p{width:100%;background:#4A7C59;color:white;border:none;border-radius:14px;padding:15px;font-size:14px;font-weight:500;font-family:'Outfit',sans-serif;cursor:pointer;letter-spacing:0.03em;transition:all 0.2s;margin-top:4px;display:block}
        .btn-p:active{background:#2D4A3E}
        .btn-s{width:100%;background:transparent;color:#4A7C59;border:1.5px solid #C5DECA;border-radius:14px;padding:13px;font-size:13px;font-weight:400;font-family:'Outfit',sans-serif;cursor:pointer;letter-spacing:0.04em;margin-top:8px;display:block}
        .spark{background:#1C2C22;border-radius:16px;padding:18px;margin-bottom:10px}
        .spark-tag{font-size:9px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-bottom:10px}
        .spark-q{font-family:'Fraunces',serif;font-size:17px;font-weight:300;font-style:italic;color:#C5DECA;line-height:1.45;margin-bottom:14px}
        .spark-chips{display:flex;flex-wrap:wrap;gap:7px}
        .sc{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:5px 12px;font-size:10px;color:rgba(255,255,255,0.6);cursor:pointer;font-weight:400}
        .chip{display:inline-flex;align-items:center;background:#EAF2EC;border:1px solid #C5DECA;color:#4A7C59;border-radius:20px;padding:4px 11px;font-size:10px;font-weight:400;margin-right:6px;margin-bottom:6px;letter-spacing:0.02em}
        .report-hero{background:linear-gradient(135deg,#FDF3E3 0%,#FEF8EE 100%);border:1px solid rgba(232,164,74,0.25);border-radius:18px;padding:20px;margin-bottom:10px}
        .rh-title{font-family:'Fraunces',serif;font-size:20px;font-weight:300;color:#7A5020;margin-bottom:5px}
        .rh-sub{font-size:11px;color:rgba(184,120,32,0.6);font-weight:300}
        .card-label{font-size:9px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#8FAA96;margin-bottom:12px}
      `}</style>

      {screen === 'home' && (
        <div style={{ position:'relative' }}>
          <HomeScreen mentor={mentor} youngPeople={youngPeople} sessions={sessions} onNav={nav} onSelectYP={onSelectYP} onSelectSession={setSelectedSession} privacy={pn} contactLogs={contactLogs} />
          <div style={{ position:'fixed', top:22, right:18, display:'flex', gap:8, zIndex:50 }}>
            {/* Privacy toggle */}
            <div onClick={() => setPrivacyMode(!privacyMode)} style={{ cursor:'pointer', padding:8, borderRadius:'50%', background: privacyMode ? T.sage : 'rgba(255,255,255,0.8)', backdropFilter:'blur(8px)', transition:'all 0.2s' }} title={privacyMode ? 'Show names' : 'Hide names'}>
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                {privacyMode ? (
                  <>
                    <path d="M1 11s4-7 10-7 10 7 10 7-4 7-10 7S1 11 1 11z" stroke="white" strokeWidth="1.7" strokeLinejoin="round"/>
                    <circle cx="11" cy="11" r="3" stroke="white" strokeWidth="1.7"/>
                    <line x1="3" y1="3" x2="19" y2="19" stroke="white" strokeWidth="1.7" strokeLinecap="round"/>
                  </>
                ) : (
                  <>
                    <path d="M1 11s4-7 10-7 10 7 10 7-4 7-10 7S1 11 1 11z" stroke={T.muted} strokeWidth="1.7" strokeLinejoin="round"/>
                    <circle cx="11" cy="11" r="3" stroke={T.muted} strokeWidth="1.7"/>
                  </>
                )}
              </svg>
            </div>
            {/* Settings gear */}
            <div onClick={() => nav('settings')} style={{ cursor:'pointer', padding:8, borderRadius:'50%', background:'rgba(255,255,255,0.8)', backdropFilter:'blur(8px)' }}>
              <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="3" stroke={T.muted} strokeWidth="1.7"/>
                <path d="M11 1.5V4M11 18V20.5M1.5 11H4M18 11H20.5M3.8 3.8L5.6 5.6M16.4 16.4L18.2 18.2M18.2 3.8L16.4 5.6M5.6 16.4L3.8 18.2" stroke={T.muted} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>
      )}
      {screen === 'people' && <PeopleScreen youngPeople={youngPeople} sessions={sessions} onNav={nav} onSelectYP={onSelectYP} mentor={mentor} privacy={pn} />}
      {screen === 'sessions' && <SessionsScreen sessions={sessions} youngPeople={youngPeople} onNav={nav} onSelectSession={setSelectedSession} privacy={pn} />}
      {screen === 'insights' && <InsightsScreen sessions={sessions} youngPeople={youngPeople} onNav={nav} />}
      {screen === 'profile' && selectedYP && <ProfileScreen yp={selectedYP} sessions={sessions} onNav={nav} onBack={() => setScreen('people')} showPrepPrompt={showPrepPrompt} privacy={pn} contactLogs={contactLogs} riskMarkers={riskMarkers} onRefresh={() => refreshData()} />}
      {screen === 'prep' && <PrepScreen yp={selectedYP || youngPeople[0]} sessions={sessions} mentor={mentor} onNav={nav} onBack={() => setScreen(selectedYP ? 'profile' : 'home')} privacy={pn} />}
      {screen === 'log' && <LogScreen yp={logYP} sessions={sessions} mentor={mentor} orgId={orgId} onDone={onDoneLog} onBack={() => setScreen('home')} privacy={pn} youngPeople={youngPeople} />}
      {screen === 'quick-log' && <QuickLogScreen youngPeople={youngPeople} mentor={mentor} orgId={orgId} onDone={async () => { await refreshData(); setScreen('home') }} onBack={() => setScreen('home')} privacy={pn} />}
      {screen === 'add-yp' && <AddYPScreen orgId={orgId} onDone={onDoneAddYP} onBack={() => setScreen('people')} />}
      {screen === 'report' && <ReportScreen sessions={sessions} youngPeople={youngPeople} mentor={mentor} onBack={() => setScreen('home')} />}
      {screen === 'safeguarding' && <SafeguardingScreen sessions={sessions} youngPeople={youngPeople} onBack={() => setScreen('home')} privacy={pn} />}
      {screen === 'settings' && <SettingsScreen mentor={mentor} onBack={() => setScreen('home')} onUpdateMentor={onUpdateMentor} onSignOut={onSignOut} />}

      {/* Floating Quick Log button — visible on home, people, sessions, insights, profile */}
      {['home','people','sessions','insights','profile'].includes(screen) && (
        <div onClick={() => nav('quick-log')} style={{ position:'fixed', bottom: 90, right: 20, width:52, height:52, borderRadius:'50%', background:T.forest, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 4px 16px rgba(28,44,34,0.25)', zIndex:99, transition:'transform 0.2s' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </>
  )
}

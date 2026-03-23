"use client"
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { STEPS, STEP_COLORS, STEP_BG, INDICATORS, ARRIVAL_OPTIONS } from '@/lib/constants'

// ── DESIGN TOKENS ──
const T = {
  forest:'#1C2C22', deep:'#2D4A3E', sage:'#4A7C59', growth:'#6BAF7C',
  mist:'#C5DECA', pale:'#EAF2EC', cream:'#F7F4EE', white:'#FFFFFF',
  amber:'#E8A44A', amberPale:'#FDF3E3', rose:'#C97070', rosePale:'#FAEAEA',
  dark:'#1C2C22', mid:'#4A6455', muted:'#8FAA96', border:'#DDE8DF', bg:'#F4F7F4',
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

// ── SCREEN: HOME ──
function HomeScreen({ mentor, youngPeople, sessions, onNav, onSelectYP, onSelectSession }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = mentor?.name?.split(' ')[0] || mentor?.name || 'there'
  const today = new Date().toISOString().split('T')[0]
  const todayCount = sessions.filter(s => s.date === today).length

  // Find YP with no recent session (>10 days)
  const disengaged = youngPeople.find(yp => {
    const ypSessions = sessions.filter(s => s.young_person_id === yp.id)
    if (!ypSessions.length) return false
    const last = new Date(ypSessions[0].date)
    const daysSince = Math.floor((Date.now() - last) / 86400000)
    return daysSince > 10
  })

  // Count days since last session for disengaged YP
  const daysSince = disengaged ? Math.floor((Date.now() - new Date(sessions.filter(s => s.young_person_id === disengaged.id)[0]?.date)) / 86400000) : 0

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

        {/* Today hero */}
        <div className="today-hero">
          <div>
            <div className="th-count">{youngPeople.length}</div>
            <div className="th-label">in your caseload</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end' }}>
            {youngPeople.slice(0,3).map(yp => (
              <div key={yp.id} className="th-chip">{yp.name}</div>
            ))}
            {youngPeople.length > 3 && <div className="th-chip">+{youngPeople.length - 3} more</div>}
          </div>
        </div>

        {/* AI Prep card — shows next YP */}
        {youngPeople[0] && (() => {
          const yp = youngPeople[0]
          const ypSessions = sessions.filter(s => s.young_person_id === yp.id)
          const stage = ypSessions[0]?.focus_step || 'Early'
          return (
            <div className="prep-card" onClick={() => { onSelectYP(yp); onNav('prep') }}>
              <div className="pc-eye"><PulseDot /> Tend Intelligence</div>
              <div className="pc-title">Prepare for your next session with {yp.name}</div>
              <div className="pc-insight">Currently in {stage} stage · {ypSessions.length} session{ypSessions.length !== 1 ? 's' : ''} logged. Tap to generate your AI session prep.</div>
              <button className="pc-btn">View session prep →</button>
            </div>
          )
        })()}

        {/* Safeguarding alert */}
        {openSG > 0 && (
          <div className="alert">
            <div className="alert-dot">⚑</div>
            <div>
              <div className="alert-title">Safeguarding concerns</div>
              <div className="alert-body">{openSG} session{openSG !== 1 ? 's' : ''} with safeguarding notes. Review before your next sessions.</div>
            </div>
          </div>
        )}

        {/* Disengagement alert */}
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
        {youngPeople.length === 0 && (
          <Card>
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:32, marginBottom:8 }}>👋</div>
              <div style={{ fontSize:14, fontWeight:500, color:T.dark, marginBottom:6 }}>Add your first young person</div>
              <div style={{ fontSize:12, color:T.muted }}>Go to People to get started</div>
            </div>
          </Card>
        )}
        {youngPeople.map(yp => {
          const ypSessions = sessions.filter(s => s.young_person_id === yp.id)
          const stage = ypSessions[0]?.focus_step || 'Early'
          return (
            <div key={yp.id} className="yp" onClick={() => { onSelectYP(yp); onNav('profile') }}>
              <div className="yp-av" style={{ background: STEP_BG[stage], color: STEP_COLORS[stage] }}>{yp.name[0]}</div>
              <div className="yp-info">
                <div className="yp-name">{yp.name}</div>
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
            <div className="qs">After a session</div>
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
          <div className="qbtn" onClick={() => onNav('sessions')}>
            <div className="qi" style={{ background:T.rosePale }}>📅</div>
            <div className="qt">Sessions</div>
            <div className="qs">View all logs</div>
          </div>
        </div>
      </div>
      <BottomNav active="home" onNav={onNav} />
    </div>
  )
}

// ── SCREEN: PEOPLE ──
function PeopleScreen({ youngPeople, sessions, onNav, onSelectYP, mentor }) {
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
        {disengaged && (
          <div className="ai-insight">
            <AITag />
            <div className="ai-text">{disengaged.name} hasn't had a session in {daysSince} days. Based on their pattern, an early check-in could help maintain momentum and prevent disengagement.</div>
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
                <div className="yp-name">{yp.name}</div>
                <div className="yp-meta">{ypSessions.length} session{ypSessions.length !== 1 ? 's' : ''} · {hasSG ? '⚑ Flag active' : `Last: ${ypSessions[0]?.date || 'No sessions'}`}</div>
              </div>
              <StageBadge stage={stage} />
            </div>
          )
        })}
        <button className="btn-s" style={{ marginTop:8 }} onClick={() => onNav('add-yp')}>+ Add young person</button>
      </div>
      <BottomNav active="people" onNav={onNav} />
    </div>
  )
}

// ── SCREEN: SESSIONS ──
function SessionsScreen({ sessions, youngPeople, onNav, onSelectSession }) {
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
function ProfileScreen({ yp, sessions, onNav, onBack }) {
  const ypSessions = sessions.filter(s => s.young_person_id === yp.id)
  const stage = ypSessions[0]?.focus_step || 'Early'
  const totalSessions = ypSessions.length

  const avgScores = {}
  INDICATORS.forEach(ind => {
    const vals = ypSessions.map(s => s.indicators?.[ind.key]).filter(Boolean)
    avgScores[ind.key] = vals.length ? (vals.reduce((a,b) => a+b, 0) / vals.length) : null
  })

  return (
    <div className="screen active slide-in">
      <button className="back" onClick={onBack}>← Back</button>
      <div className="ph">
        <div className="ph-av">{yp.name[0]}</div>
        <div className="ph-name">{yp.name}</div>
        <div className="ph-meta">{yp.postcode || 'No area set'} · {totalSessions} session{totalSessions !== 1 ? 's' : ''}</div>
        <div className="ph-stats">
          <div><div className="ps-num">{totalSessions}</div><div className="ps-lbl">Sessions</div></div>
          <div><div className="ps-num">{stage}</div><div className="ps-lbl">Stage</div></div>
          <div><div className="ps-num">{avgScores.trust ? Number(avgScores.trust).toFixed(1) : '—'}</div><div className="ps-lbl">Trust avg</div></div>
        </div>
      </div>
      <div className="body-start" />
      <div className="scroll">
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
        <button className="btn-p" onClick={() => onNav('prep')} style={{ marginTop:8 }}>View session prep →</button>
        <button className="btn-s" onClick={() => onNav('log')}>Log new session</button>
      </div>
    </div>
  )
}

// ── SCREEN: AI SESSION PREP ──
function PrepScreen({ yp, sessions, mentor, onNav, onBack }) {
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
            orgName: mentor?.organisations?.name
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
        <div className="sh-title">{yp.name} · <em>Session {ypSessions.length + 1}</em></div>
      </div>
      <div className="body-start" />
      <div className="scroll">
        <div className="ai-insight">
          <AITag />
          {loading ? (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <Spinner />
              <span className="ai-text" style={{ marginLeft:8 }}>Analysing {yp.name}'s journey...</span>
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
function LogScreen({ yp, sessions, mentor, orgId, onDone, onBack }) {
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

  const setInd = (k, v) => setIndicators(i => ({ ...i, [k]: v }))

  const generateSummary = async () => {
    if (!notes.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/ai-summary', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ youngPersonName: yp.name, stage: focusStep, notes, arrival: ARRIVAL_OPTIONS.find(a => a.value === arrival)?.label })
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
          mentor_id: mentor.id,
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
      setTimeout(() => onDone(), 1500)
    } catch(e) {}
    setSaving(false)
  }

  if (!yp) return null
  if (saved) return (
    <div className="screen active" style={{ alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center', padding:40 }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:T.pale, border:`1.5px solid ${T.mist}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:22, color:T.sage }}>✓</div>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:300, color:T.dark, marginBottom:6 }}>Session saved</div>
        <div style={{ fontSize:13, color:T.muted }}>Returning to home...</div>
      </div>
    </div>
  )

  return (
    <div className="screen active slide-in">
      <button className="back" onClick={onBack}>← Back</button>
      <div className="sh">
        <div className="sh-eye">Session Log</div>
        <div className="sh-title">{yp.name} · <em>Session {ypSessions.length + 1}</em></div>
      </div>
      <div className="body-start" />
      <div className="scroll">
        {/* Arrival check-in */}
        <Card>
          <div className="cq">"How did {yp.name} show up today?"</div>
          <div className="emoji-row">
            {ARRIVAL_OPTIONS.map(opt => (
              <div key={opt.value} className={`eo${arrival === opt.value ? ' sel' : ''}`} onClick={() => setArrival(opt.value)}>
                <div className="ef">{opt.emoji}</div>
                <div className="el">{opt.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Focus step */}
        <Card>
          <div className="inp-label">Pathway stage for this session</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {STEPS.map(s => (
              <button key={s} onClick={() => setFocusStep(s)} style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${focusStep===s ? T.sage : T.border}`, background: focusStep===s ? T.pale : 'transparent', color: focusStep===s ? T.sage : T.muted, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'Outfit',sans-serif" }}>{s}</button>
            ))}
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <div className="inp-label">Session notes</div>
          <textarea className="inp" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder={`Write freely — what happened in the room today? Tend will help structure this...`} />
          <div className="ai-tag" style={{ cursor:'pointer' }} onClick={generateSummary}>
            <PulseDot /> {generating ? 'Generating summary...' : 'Generate AI summary'}
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

        {/* Indicators */}
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

        {/* Safeguarding */}
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

// ── SCREEN: ADD YOUNG PERSON ──
function AddYPScreen({ orgId, onDone, onBack }) {
  const [form, setForm] = useState({ name:'', dob:'', phone:'', email:'', postcode:'' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await fetch('/api/young-people', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ ...form, org_id: orgId })
    })
    setSaving(false)
    onDone()
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
          <div className="inp-label">Phone</div>
          <input className="inp" type="tel" placeholder="07..." value={form.phone} onChange={e => set('phone', e.target.value)} />
          <div className="inp-label">Email</div>
          <input className="inp" type="email" placeholder="Optional" value={form.email} onChange={e => set('email', e.target.value)} />
          <div className="inp-label">Postcode / area</div>
          <input className="inp" type="text" placeholder="e.g. postcode or area" value={form.postcode} onChange={e => set('postcode', e.target.value)} />
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

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/impact-report', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          orgName: mentor?.organisations?.name,
          sessions: sessions.slice(0, 50),
          youngPeople,
        })
      })
      const data = await res.json()
      if (!data.error) { setReport(data); setGenerated(true) }
    } catch(e) {}
    setLoading(false)
  }

  const totalSessions = sessions.length
  const uniqueYP = [...new Set(sessions.map(s => s.young_person_id))].length

  // Pathway distribution
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
            <button className="btn-p" onClick={generate} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? <span style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}><Spinner /> Generating...</span> : '✦ Generate impact report'}
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
          <button className="btn-p" onClick={generate} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Regenerating...' : '↺ Regenerate report'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── SCREEN: INSIGHTS (simple analytics) ──
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

// ── MAIN DASHBOARD ──
export default function Dashboard() {
  const [mentor, setMentor] = useState(null)
  const [youngPeople, setYP] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [screen, setScreen] = useState('home')
  const [selectedYP, setSelectedYP] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)

  const orgId = mentor?.org_id

  const loadData = useCallback(async (mid, oid) => {
    const [ypRes, sessRes] = await Promise.all([
      fetch(`/api/young-people?orgId=${oid}`).then(r => r.json()),
      fetch(`/api/sessions?orgId=${oid}`).then(r => r.json()),
    ])
    setYP(Array.isArray(ypRes) ? ypRes : [])
    setSessions(Array.isArray(sessRes) ? sessRes : [])
  }, [])

  useEffect(() => {
    const init = async () => {
      try {
        const [ypRes, sessRes] = await Promise.all([
          fetch('/api/young-people?orgId=all'),
          fetch('/api/sessions?orgId=all'),
        ])
        const ypData = await ypRes.json()
        const sessData = await sessRes.json()
        setMentor({ name: 'Jordan', id: 'demo', org_id: '00000000-0000-0000-0000-000000000001', role: 'admin', organisations: { name: 'Riverside Youth Trust' } })
        setYP(Array.isArray(ypData) ? ypData : [])
        setSessions(Array.isArray(sessData) ? sessData : [])
      } catch(e) {
        console.error('Load error:', e)
      }
      setLoading(false)
    }
    init()
  }, [])

  const nav = (s) => setScreen(s)

  const onSelectYP = (yp) => setSelectedYP(yp)

  const onDoneLog = async () => {
    const [ypRes, sessRes] = await Promise.all([
      fetch('/api/young-people?orgId=all'),
      fetch('/api/sessions?orgId=all'),
    ])
    setYP(await ypRes.json())
    setSessions(await sessRes.json())
    setScreen('home')
  }

  const onDoneAddYP = async () => {
    const [ypRes, sessRes] = await Promise.all([
      fetch('/api/young-people?orgId=all'),
      fetch('/api/sessions?orgId=all'),
    ])
    setYP(await ypRes.json())
    setSessions(await sessRes.json())
    setScreen('people')
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:T.forest, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:"'Outfit',sans-serif" }}>
      <ArcMark size={56} light />
      <div style={{ fontFamily:"'Outfit',sans-serif", fontWeight:300, fontSize:22, letterSpacing:'0.14em', color:'white', marginTop:16 }}>tend</div>
      <div style={{ marginTop:24 }}><Spinner /></div>
    </div>
  )

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
        .greeting{padding:20px 18px 4px;background:#fff}
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
        /* stage aliases */
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

      {screen === 'home' && <HomeScreen mentor={mentor} youngPeople={youngPeople} sessions={sessions} onNav={nav} onSelectYP={onSelectYP} onSelectSession={setSelectedSession} />}
      {screen === 'people' && <PeopleScreen youngPeople={youngPeople} sessions={sessions} onNav={nav} onSelectYP={onSelectYP} mentor={mentor} />}
      {screen === 'sessions' && <SessionsScreen sessions={sessions} youngPeople={youngPeople} onNav={nav} onSelectSession={setSelectedSession} />}
      {screen === 'insights' && <InsightsScreen sessions={sessions} youngPeople={youngPeople} onNav={nav} />}
      {screen === 'profile' && selectedYP && <ProfileScreen yp={selectedYP} sessions={sessions} onNav={nav} onBack={() => setScreen('people')} />}
      {screen === 'prep' && <PrepScreen yp={selectedYP || youngPeople[0]} sessions={sessions} mentor={mentor} onNav={nav} onBack={() => setScreen(selectedYP ? 'profile' : 'home')} />}
      {screen === 'log' && <LogScreen yp={logYP} sessions={sessions} mentor={mentor} orgId={orgId} onDone={onDoneLog} onBack={() => setScreen('home')} />}
      {screen === 'add-yp' && <AddYPScreen orgId={orgId} onDone={onDoneAddYP} onBack={() => setScreen('people')} />}
      {screen === 'report' && <ReportScreen sessions={sessions} youngPeople={youngPeople} mentor={mentor} onBack={() => setScreen('home')} />}
    </>
  )
}

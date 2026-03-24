"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const S = {
  page: { minHeight:'100vh', background:'#1C2C22', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:"'Outfit', sans-serif" },
  box: { width:'100%', maxWidth:'400px' },
  logo: { textAlign:'center', marginBottom:'40px' },
  logoWord: { fontFamily:"'Outfit', sans-serif", fontWeight:300, fontSize:'28px', letterSpacing:'0.14em', color:'white', display:'block', marginTop:'12px' },
  tagline: { fontSize:'11px', color:'rgba(255,255,255,0.4)', letterSpacing:'0.14em', textTransform:'uppercase', marginTop:'4px', display:'block' },
  card: { background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px', padding:'28px' },
  tabs: { display:'flex', gap:'0', marginBottom:'24px', background:'rgba(255,255,255,0.06)', borderRadius:'10px', padding:'3px' },
  tab: (active) => ({ flex:1, padding:'9px 0', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:500, fontFamily:"'Outfit', sans-serif", letterSpacing:'0.02em', background: active ? 'rgba(255,255,255,0.12)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.4)', transition:'all 0.2s' }),
  label: { display:'block', fontSize:'10px', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:'6px' },
  input: { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'12px 14px', fontSize:'14px', color:'white', fontFamily:"'Outfit', sans-serif", fontWeight:300, outline:'none', boxSizing:'border-box', marginBottom:'14px' },
  btn: { width:'100%', background:'#4A7C59', color:'white', border:'none', borderRadius:'12px', padding:'14px', fontSize:'14px', fontWeight:500, fontFamily:"'Outfit', sans-serif", cursor:'pointer', letterSpacing:'0.03em', marginTop:'4px' },
  error: { fontSize:'12px', color:'#E09090', textAlign:'center', marginTop:'12px', lineHeight:'1.5' },
  success: { fontSize:'13px', color:'#6BAF7C', textAlign:'center', marginTop:'12px', lineHeight:'1.6', padding:'12px', background:'rgba(107,175,124,0.1)', borderRadius:'10px', border:'1px solid rgba(107,175,124,0.2)' },
  divider: { borderTop:'1px solid rgba(255,255,255,0.08)', margin:'18px 0' },
  hint: { fontSize:'11px', color:'rgba(255,255,255,0.3)', textAlign:'center', lineHeight:'1.5', marginTop:'14px' },
}

export default function LoginPage() {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ email:'', password:'', name:'', orgName:'' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleLogin = async () => {
    if (!form.email || !form.password) return
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (e) { setError(e.message); setLoading(false); return }
    window.location.href = '/dashboard'
  }

  const handleSignup = async () => {
    if (!form.email || !form.password || !form.name || !form.orgName) { setError('Please fill in all fields'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      })
      if (authError) throw authError

      // Create org + mentor profile
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup',
          email: form.email,
          name: form.name,
          orgName: form.orgName,
          userId: authData.user?.id
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Send confirmation email via Resend directly
      await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, name: form.name })
      })

      setSuccess(`Check your inbox at ${form.email} — we've sent you a confirmation link to activate your account.`)
      setLoading(false)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.box}>
        <div style={S.logo}>
          <svg width="48" height="48" viewBox="0 0 44 44" fill="none">
            <path d="M7 38 Q7 6 22 6 Q37 6 37 38" stroke="rgba(107,175,124,0.6)" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
            <path d="M13 38 Q13 14 22 14 Q31 14 31 38" stroke="white" strokeWidth="2.4" strokeLinecap="round" fill="none"/>
            <circle cx="22" cy="8" r="3.2" fill="white"/>
          </svg>
          <span style={S.logoWord}>tend</span>
          <span style={S.tagline}>mentoring intelligence</span>
        </div>

        <div style={S.card}>
          <div style={S.tabs}>
            <button style={S.tab(mode==='login')} onClick={() => { setMode('login'); setError(''); setSuccess('') }}>Sign in</button>
            <button style={S.tab(mode==='signup')} onClick={() => { setMode('signup'); setError(''); setSuccess('') }}>Create account</button>
          </div>

          {mode === 'login' ? (
            <>
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" placeholder="you@organisation.com" value={form.email}
                onChange={e => set('email', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              <label style={S.label}>Password</label>
              <input style={S.input} type="password" placeholder="••••••••" value={form.password}
                onChange={e => set('password', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} onClick={handleLogin} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in →'}
              </button>
            </>
          ) : (
            <>
              <label style={S.label}>Your name</label>
              <input style={S.input} type="text" placeholder="Your full name" value={form.name}
                onChange={e => set('name', e.target.value)} />
              <label style={S.label}>Organisation name</label>
              <input style={S.input} type="text" placeholder="e.g. Riverside Youth Trust" value={form.orgName}
                onChange={e => set('orgName', e.target.value)} />
              <div style={S.divider} />
              <label style={S.label}>Email</label>
              <input style={S.input} type="email" placeholder="you@organisation.com" value={form.email}
                onChange={e => set('email', e.target.value)} />
              <label style={S.label}>Password</label>
              <input style={S.input} type="password" placeholder="Min. 8 characters" value={form.password}
                onChange={e => set('password', e.target.value)} />
              {!success && (
                <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} onClick={handleSignup} disabled={loading}>
                  {loading ? 'Creating account...' : 'Create account →'}
                </button>
              )}
              {success && <p style={S.success}>{success}</p>}
              <p style={S.hint}>You'll be the admin for your organisation. You can add mentors after signing up.</p>
            </>
          )}

          {error && <p style={S.error}>{error}</p>}
        </div>
      </div>
    </div>
  )
}

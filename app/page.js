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
  label: { display:'block', fontSize:'10px', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:'6px' },
  input: { width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'12px', padding:'12px 14px', fontSize:'14px', color:'white', fontFamily:"'Outfit', sans-serif", fontWeight:300, outline:'none', boxSizing:'border-box', marginBottom:'14px' },
  btn: { width:'100%', background:'#4A7C59', color:'white', border:'none', borderRadius:'12px', padding:'14px', fontSize:'14px', fontWeight:500, fontFamily:"'Outfit', sans-serif", cursor:'pointer', letterSpacing:'0.03em', marginTop:'4px' },
  error: { fontSize:'12px', color:'#E09090', textAlign:'center', marginTop:'12px', lineHeight:'1.5' },
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email:'', password:'' })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleLogin = async () => {
    if (!form.email || !form.password) return
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    if (e) { setError(e.message); setLoading(false); return }
    window.location.href = '/dashboard'
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
          {error && <p style={S.error}>{error}</p>}
        </div>
      </div>
    </div>
  )
}

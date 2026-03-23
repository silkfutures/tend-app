"use client"
import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    window.location.href = '/dashboard'
  }, [])
  return (
    <div style={{ minHeight:'100vh', background:'#1C2C22', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.3)' }} />
    </div>
  )
}

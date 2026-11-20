import React, { useEffect, useState } from 'react'
import { api, isDemo } from '../lib/api'
import { Icon, Logo } from '../ui'

export default function Auth({ onUser }) {
  const [mode, setMode] = useState('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [code, setCode] = useState('')
  const [wait, setWait] = useState(0)

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t) }, [wait])

  const toCode = (msg) => { setMode('code'); setCode(''); setErr(''); setInfo(msg); setWait(30) }
  const verify = async (e) => {
    e.preventDefault(); setErr('')
    if (code.trim().length < 6) return setErr('Enter the code from your email')
    setBusy(true)
    try { onUser((await api.verifyCode(email.trim(), code)).user) } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }
  const resend = async () => {
    setErr(''); setInfo('')
    try { await api.resendCode(email.trim()); setInfo('A new code is on its way'); setWait(30) } catch (ex) { setErr(ex.message) }
  }

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setInfo('')
    if (mode === 'up' && name.trim().length < 2) return setErr('Please enter your name')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Enter a valid email address')
    if (pw.length < 6) return setErr('Password must be at least 6 characters')
    setBusy(true)
    try {
      const r = mode === 'up' ? await api.signUp(email.trim(), pw, name.trim()) : await api.signIn(email.trim(), pw)
      if (r.needsConfirm) toCode(`We sent a code to ${email.trim()}`)
      else onUser(r.user)
    } catch (ex) {
      if (ex.code === 'unconfirmed') { try { await api.resendCode(email.trim()) } catch {} ; toCode(`Verify your email first. We sent a code to ${email.trim()}`) }
      else setErr(/invalid login/i.test(ex.message) ? 'Wrong email or password' : ex.message)
    } finally { setBusy(false) }
  }

  return (
    <div className="screen">
      <div className="scroll">
        <div className="auth-hero">
          <Logo />
          <h1>Hum Safar</h1>
          <p>Share the ride. Split the cost.<br />Hyderabad, travelling together.</p>
        </div>
        {mode === 'code' ? (
        <form className="auth-card fade-up" onSubmit={verify}>
          <h3 style={{ fontSize: 20, fontWeight: 800, margin: '2px 2px 4px' }}>Check your email</h3>
          <p className="note" style={{ margin: '0 2px 6px' }}>{info || 'Enter the code we emailed you.'}</p>
          <label className="label">VERIFICATION CODE</label>
          <input className="input" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={10} placeholder="123456"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            style={{ fontSize: 28, fontWeight: 800, letterSpacing: 8, textAlign: 'center', height: 64 }} />
          {err && <div className="err">{err}</div>}
          <button className="btn btn-primary" style={{ marginTop: 18 }} disabled={busy}>{busy ? <div className="spinner" /> : 'Verify & continue'}</button>
          <button type="button" className="btn btn-ghost" style={{ marginTop: 10 }} disabled={wait > 0} onClick={resend}>{wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}</button>
          <button type="button" style={{ display: 'block', margin: '14px auto 2px', color: 'var(--muted)', fontWeight: 700, fontSize: 13.5 }} onClick={() => { setMode('up'); setErr(''); setInfo('') }}>Use a different email</button>
        </form>
        ) : (
        <form className="auth-card fade-up" onSubmit={submit}>
          <div className="seg" style={{ margin: '0 0 6px' }}>
            <button type="button" className={mode === 'in' ? 'on' : ''} onClick={() => { setMode('in'); setErr('') }}>Sign in</button>
            <button type="button" className={mode === 'up' ? 'on' : ''} onClick={() => { setMode('up'); setErr('') }}>Create account</button>
          </div>
          {mode === 'up' && (<><label className="label">YOUR NAME</label>
            <input className="input" placeholder="e.g. Priya Sharma" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></>)}
          <label className="label">EMAIL</label>
          <input className="input" type="email" inputMode="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <label className="label">PASSWORD</label>
          <input className="input" type="password" placeholder="At least 6 characters" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'up' ? 'new-password' : 'current-password'} />
          {err && <div className="err">{err}</div>}
          {info && <div className="ok-msg">{info}</div>}
          <button className="btn btn-primary" style={{ marginTop: 18 }} disabled={busy}>
            {busy ? <div className="spinner" /> : mode === 'up' ? 'Create account' : 'Sign in'}
          </button>
          {isDemo && (
            <button type="button" className="btn btn-ghost" style={{ marginTop: 10 }}
              onClick={async () => onUser((await api.signIn('demo@humsafar.app')).user)}>
              Explore demo
            </button>
          )}
        </form>
        )}
        <div className="perks">
          <div><span className="pi"><Icon name="rupee" /></span>Only share fuel costs</div>
          <div><span className="pi"><Icon name="shield" /></span>Rated, verified travellers</div>
          <div><span className="pi"><Icon name="leaf" /></span>Fewer cars on the road</div>
        </div>
        <div style={{ height: 30 }} />
      </div>
    </div>
  )
}

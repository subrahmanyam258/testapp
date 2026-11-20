import React, { useState } from 'react'
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

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setInfo('')
    if (mode === 'up' && name.trim().length < 2) return setErr('Please enter your name')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr('Enter a valid email address')
    if (pw.length < 6) return setErr('Password must be at least 6 characters')
    setBusy(true)
    try {
      const r = mode === 'up' ? await api.signUp(email.trim(), pw, name.trim()) : await api.signIn(email.trim(), pw)
      if (r.needsConfirm) { setInfo('Account created! Check your email and tap the confirmation link, then sign in.'); setMode('in') }
      else onUser(r.user)
    } catch (ex) {
      setErr(/invalid login/i.test(ex.message) ? 'Wrong email or password' : ex.message)
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

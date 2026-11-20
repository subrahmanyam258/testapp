import React, { useCallback, useEffect, useRef, useState } from 'react'
import { api, isDemo } from './lib/api'
import { Icon, Toaster, toast } from './ui'
import Auth from './screens/Auth'
import Home from './screens/Home'
import Results from './screens/Results'
import RideDetail from './screens/RideDetail'
import Publish from './screens/Publish'
import Trips from './screens/Trips'
import Chat from './screens/Chat'
import Profile from './screens/Profile'

const SCREENS = { results: Results, ride: RideDetail, publish: Publish, chat: Chat }

export default function App() {
  const [user, setUser] = useState(undefined)
  const [tab, setTab] = useState('find')
  const [stack, setStack] = useState([])
  const [badge, setBadge] = useState(0)
  const depth = useRef(0)
  const hist = useRef(true) // false if the History API is unavailable (e.g. sandboxed frame)

  useEffect(() => {
    api.init().then(setUser).catch(() => setUser(null))
    return api.onAuth(setUser)
  }, [])

  // Android back button / browser back -> pop the in-app stack
  useEffect(() => {
    const onPop = () => setStack((s) => { depth.current = Math.max(0, depth.current - 1); return s.slice(0, -1) })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const nav = useRef({}).current
  nav.push = (name, props = {}) => {
    try { history.pushState({ d: ++depth.current }, ''); hist.current = true } catch { hist.current = false }
    setStack((s) => [...s, { name, props, k: Math.random() }])
  }
  nav.pop = () => { if (hist.current) history.back(); else setStack((s) => s.slice(0, -1)) }
  nav.replace = (name, props = {}) => setStack((s) => [...s.slice(0, -1), { name, props, k: Math.random() }])

  const signOut = async () => { await api.signOut(); setUser(null); setStack([]); setTab('find'); depth.current = 0 }

  // refresh the Trips badge on live changes
  const refreshBadge = useCallback(async () => {
    try { const d = await api.trips(); setBadge(d.driving.reduce((n, r) => n + (r.status === 'open' ? r.requests.filter((q) => q.status === 'pending').length : 0), 0)) } catch {}
  }, [])
  useEffect(() => { if (!user) return; refreshBadge(); return api.onTripsChange(refreshBadge) }, [user, refreshBadge])

  if (user === undefined) return <div className="app"><div className="splash"><div className="spinner" /></div></div>
  if (!user) return <div className="app"><Auth onUser={setUser} /><Toaster /></div>

  const top = stack[stack.length - 1]
  const onTab = (t) => { setTab(t) }

  return (
    <div className="app">
      {isDemo && <div className="demo-pill">DEMO MODE</div>}
      <div className="screen">
        <div style={{ flex: 1, display: tab === 'find' ? 'flex' : 'none', flexDirection: 'column', minHeight: 0 }}><Home user={user} nav={nav} active={tab === 'find' && !top} /></div>
        <div style={{ flex: 1, display: tab === 'trips' ? 'flex' : 'none', flexDirection: 'column', minHeight: 0 }}><Trips nav={nav} active={tab === 'trips' && !top} onBadge={setBadge} /></div>
        <div style={{ flex: 1, display: tab === 'me' ? 'flex' : 'none', flexDirection: 'column', minHeight: 0 }}><Profile user={user} setUser={setUser} onSignOut={signOut} active={tab === 'me' && !top} /></div>
        <nav className="nav">
          <button className={tab === 'find' ? 'on' : ''} onClick={() => onTab('find')}><Icon name="search" size={24} />Find</button>
          <button className="fab" aria-label="Offer a ride" onClick={() => nav.push('publish')}><Icon name="plus" size={30} stroke={2.6} /></button>
          <button className={tab === 'trips' ? 'on' : ''} onClick={() => onTab('trips')}><Icon name="car" size={24} />Trips{badge > 0 && <span className="dotb">{badge}</span>}</button>
          <button className={tab === 'me' ? 'on' : ''} onClick={() => onTab('me')}><Icon name="user" size={24} />Profile</button>
        </nav>
      </div>
      {stack.map((s) => {
        const C = SCREENS[s.name]
        return <div key={s.k} className="screen push"><C {...s.props} user={user} nav={nav} /></div>
      })}
      <Toaster />
    </div>
  )
}

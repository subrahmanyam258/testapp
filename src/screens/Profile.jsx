import React, { useEffect, useState } from 'react'
import { api, isDemo } from '../lib/api'
import { Avatar, Icon, Rating, Sheet, toast } from '../ui'

export default function Profile({ user, setUser, onSignOut, active }) {
  const [stats, setStats] = useState({ offered: 0, taken: 0 })
  const [edit, setEdit] = useState(false)
  const [name, setName] = useState(user.full_name)
  const [bio, setBio] = useState(user.bio || '')
  const [info, setInfo] = useState(false)

  useEffect(() => { if (active) { api.stats().then(setStats).catch(() => {}); api.me?.().then((u) => u && setUser(u)).catch(() => {}) } }, [active])

  const save = async () => {
    if (name.trim().length < 2) return toast('Please enter your name', 'err')
    try { setUser(await api.updateProfile({ full_name: name.trim(), bio: bio.trim() || null })); setEdit(false); toast('Profile updated', 'ok') }
    catch (e) { toast(e.message, 'err') }
  }

  return (
    <div className="scroll">
      <div className="profile-hero">
        <div style={{ display: 'inline-block', padding: 4, borderRadius: '50%', background: 'rgba(255,255,255,.25)' }}><Avatar name={user.full_name} hue={user.hue} size={92} /></div>
        <h2>{user.full_name}</h2>
        <div style={{ opacity: .85, fontSize: 13.5, fontWeight: 600 }}>{user.email}</div>
        {user.bio && <div style={{ marginTop: 8, fontSize: 14, opacity: .9 }}>{user.bio}</div>}
      </div>
      <div className="pad" style={{ marginTop: -44, position: 'relative' }}>
        <div className="stats">
          <div className="stat"><b>{stats.offered}</b><span>Rides offered</span></div>
          <div className="stat"><b>{stats.taken}</b><span>Seats booked</span></div>
          <div className="stat"><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}><b style={{ display: 'flex' }}><Rating avg={user.rating_avg} count={user.rating_count} /></b></div><span>Rating</span></div>
        </div>
        <div className="card" style={{ padding: '4px 16px' }}>
          <button className="menu-item" onClick={() => { setName(user.full_name); setBio(user.bio || ''); setEdit(true) }}><span className="mi"><Icon name="edit" size={20} /></span><span style={{ flex: 1 }}>Edit profile</span><Icon name="chevron" size={20} /></button>
          <button className="menu-item" onClick={() => setInfo(true)}><span className="mi"><Icon name="shield" size={20} /></span><span style={{ flex: 1 }}>Safety tips & how it works</span><Icon name="chevron" size={20} /></button>
          <button className="menu-item" style={{ color: 'var(--coral)' }} onClick={onSignOut}><span className="mi" style={{ background: 'var(--coral-l)', color: 'var(--coral)' }}><Icon name="out" size={20} /></span><span style={{ flex: 1 }}>Sign out</span></button>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontWeight: 600, margin: '18px 0 30px' }}>
          Hum Safar v1.0 · Made in Hyderabad{isDemo ? ' · Demo mode' : ''}
        </p>
      </div>

      <Sheet open={edit} onClose={() => setEdit(false)} title="Edit profile">
        <label className="label" style={{ marginTop: 0 }}>NAME</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <label className="label">ABOUT YOU (OPTIONAL)</label>
        <textarea className="input" placeholder="e.g. Software engineer, weekend traveller, loves chai stops" maxLength={160} value={bio} onChange={(e) => setBio(e.target.value)} />
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={save}>Save</button>
      </Sheet>

      <Sheet open={info} onClose={() => setInfo(false)} title="Travel safe, share smart">
        <div style={{ overflowY: 'auto' }}>
          {[
            ['rupee', 'Cost sharing only', 'Drivers share fuel and toll costs. Hum Safar takes no commission and doesn’t handle payments. Pay the driver directly.'],
            ['users', 'You approve every rider', 'Drivers accept or decline each request, and riders can chat before the trip.'],
            ['shield', 'Check before you go', 'Read ratings, confirm the car and driver at pickup, and share your trip with a friend or family member.'],
            ['star', 'Rate every trip', 'Ratings keep the community trustworthy for everyone.'],
          ].map(([ic, t, d]) => (
            <div key={t} className="row" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
              <span className="mi" style={{ width: 40, height: 40, borderRadius: 13, background: 'var(--teal-l)', color: 'var(--teal)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon name={ic} size={20} /></span>
              <div><div className="name" style={{ fontSize: 15 }}>{t}</div><p className="note" style={{ fontSize: 13.5 }}>{d}</p></div>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  )
}

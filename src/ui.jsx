import React, { useEffect, useRef, useState } from 'react'
import { hueBg, initials } from './lib/format'
import { searchPlaces, localMatches } from './lib/places'

const PATHS = {
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  chat: <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />,
  pin: <><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  check: <path d="m20 6-11 11-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />,
  send: <><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4z" /></>,
  cal: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  swap: <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />,
  out: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  car: <><path d="M3 13l2-5a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5v5h-2.5M3 13v5h2.5M3 13h18" /><circle cx="7.5" cy="17.5" r="1.8" /><circle cx="16.5" cy="17.5" r="1.8" /></>,
  home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
  back: <path d="M19 12H5m7 7-7-7 7-7" />,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  route: <><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></>,
  rupee: <path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3a4 4 0 0 0 0-8" />,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  leaf: <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.5 6-7" />,
}
export const Icon = ({ name, size = 22, stroke = 2, fill = 'none', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">{PATHS[name]}</svg>
)

export const Logo = ({ size = 76 }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" aria-label="Hum Safar">
    <rect width="96" height="96" rx="28" fill="#fff" />
    <path d="M22 70V46c0-14 11-26 26-26s26 12 26 26v24" fill="none" stroke="#0b6e6e" strokeWidth="7" strokeLinecap="round" />
    <path d="M34 70V48c0-8 6-14 14-14s14 6 14 14v22" fill="none" stroke="#f4a024" strokeWidth="7" strokeLinecap="round" />
    <circle cx="48" cy="48" r="4.5" fill="#0b6e6e" />
    <path d="M16 78h64" stroke="#0b6e6e" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 11" />
  </svg>
)

export const Avatar = ({ name, hue, size = 40 }) => (
  <div className="avatar" style={{ width: size, height: size, background: hueBg(hue), fontSize: size * 0.38 }}>
    {initials(name)}
  </div>
)

export const Stars = ({ value = 0, size = 14, onPick, big }) => (
  <span className={'stars' + (big ? ' big' : '')}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} onClick={onPick ? () => onPick(i) : undefined} style={{ display: 'inline-flex', cursor: onPick ? 'pointer' : 'default' }}>
        <Icon name="star" size={size} fill={i <= Math.round(value) ? 'currentColor' : 'none'} stroke={1.8}
          style={{ opacity: i <= Math.round(value) ? 1 : 0.35 }} />
      </span>
    ))}
  </span>
)

export const Rating = ({ avg, count }) =>
  count > 0 ? (
    <small><Icon name="star" size={13} fill="currentColor" stroke={0} style={{ color: 'var(--saffron)' }} />{Number(avg).toFixed(1)} <span style={{ color: 'var(--muted)', fontWeight: 600 }}>({count})</span></small>
  ) : (<small style={{ color: 'var(--muted)' }}>New</small>)

// ---- toast ----
const bus = new EventTarget()
export const toast = (msg, kind = '') => bus.dispatchEvent(new CustomEvent('t', { detail: { msg, kind, id: Math.random() } }))
export const Toaster = () => {
  const [items, setItems] = useState([])
  useEffect(() => {
    const on = (e) => {
      setItems((l) => [...l, e.detail])
      setTimeout(() => setItems((l) => l.filter((x) => x.id !== e.detail.id)), 3200)
    }
    bus.addEventListener('t', on); return () => bus.removeEventListener('t', on)
  }, [])
  return (
    <div className="toast-wrap">
      {items.map((t) => <div key={t.id} className={'toast ' + t.kind}>{t.kind === 'ok' && <Icon name="check" size={18} />}{t.msg}</div>)}
    </div>
  )
}

export const Sheet = ({ open, onClose, title, children, full }) => {
  if (!open) return null
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={'sheet' + (full ? ' full' : '')} role="dialog">
        {!full && <div className="grab" />}
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </>
  )
}

export const Skeleton = ({ h = 130, n = 3 }) => (
  <div className="pad">{Array.from({ length: n }).map((_, i) => <div key={i} className="skel" style={{ height: h, borderRadius: 20, marginBottom: 12 }} />)}</div>
)

export const Empty = ({ icon = 'car', title, text, action, onAction }) => (
  <div className="empty fade-up">
    <div className="ill"><Icon name={icon} size={40} stroke={1.7} /></div>
    <h3>{title}</h3><p>{text}</p>
    {action && <button className="btn btn-primary" style={{ maxWidth: 260, margin: '0 auto' }} onClick={onAction}>{action}</button>}
  </div>
)

// Full-screen place picker
export const PlacePicker = ({ open, title, onPick, onClose }) => {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState(() => localMatches(''))
  const [busy, setBusy] = useState(false)
  const t = useRef()
  useEffect(() => { if (open) { setQ(''); setRows(localMatches('')) } }, [open])
  useEffect(() => {
    if (!open) return
    setRows(localMatches(q)); clearTimeout(t.current)
    if (q.trim().length < 3) { setBusy(false); return }
    setBusy(true)
    t.current = setTimeout(async () => { const r = await searchPlaces(q); setRows(r); setBusy(false) }, 450)
    return () => clearTimeout(t.current)
  }, [q, open])
  return (
    <Sheet open={open} onClose={onClose} full>
      <div className="searchbar">
        <button className="icon-btn light" onClick={onClose}><Icon name="back" /></button>
        <input className="input" autoFocus placeholder={title} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="place-list">
        {!q && <div className="label" style={{ margin: '4px 8px' }}>POPULAR PLACES</div>}
        {rows.map((p, i) => {
          const [a, ...rest] = p.name.split(',')
          return (
            <button key={p.name + i} className="place" onClick={() => onPick(p)}>
              <span className="pin"><Icon name="pin" size={19} /></span>
              <span><span>{a}</span>{rest.length > 0 && <small>{rest.join(',').trim()}</small>}</span>
            </button>
          )
        })}
        {busy && <div style={{ padding: 18, textAlign: 'center' }}><div className="spinner dark" style={{ margin: '0 auto' }} /></div>}
        {!busy && q.length >= 3 && rows.length === 0 && <div className="empty"><p>No match. Try a nearby landmark or area.</p></div>}
      </div>
    </Sheet>
  )
}

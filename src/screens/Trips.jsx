import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Avatar, Empty, Icon, Skeleton } from '../ui'
import { fmtDay, fmtTime, hasDeparted, inr, shortPlace } from '../lib/format'

const STATUS = { pending: ['warn', 'Waiting'], approved: ['ok', 'Confirmed'], declined: ['bad', 'Declined'], cancelled: ['mute', 'Cancelled'] }

export default function Trips({ nav, active, onBadge }) {
  const [tab, setTab] = useState('riding')
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    try {
      const d = await api.trips(); setData(d)
      onBadge?.(d.driving.reduce((n, r) => n + (r.status === 'open' && !hasDeparted(r.depart_at) ? r.requests.filter((q) => q.status === 'pending').length : 0), 0))
    } catch { setData({ riding: [], driving: [] }) }
  }, [onBadge])
  useEffect(() => { if (active) load() }, [active, load])
  useEffect(() => api.onTripsChange(load), [load])

  const pendingCount = data ? data.driving.reduce((n, r) => n + (r.status === 'open' ? r.requests.filter((q) => q.status === 'pending').length : 0), 0) : 0

  return (
    <>
      <div className="topbar"><h2 style={{ fontSize: 26, letterSpacing: -.5 }}>My trips</h2></div>
      <div className="seg">
        <button className={tab === 'riding' ? 'on' : ''} onClick={() => setTab('riding')}>Riding</button>
        <button className={tab === 'driving' ? 'on' : ''} onClick={() => setTab('driving')}>
          Driving{pendingCount > 0 && <span className="badge warn" style={{ marginLeft: 8, padding: '2px 8px' }}>{pendingCount}</span>}
        </button>
      </div>
      <div className="scroll">
        {data === null && <Skeleton n={3} h={120} />}

        {data && tab === 'riding' && (data.riding.length === 0
          ? <Empty icon="search" title="No trips yet" text="Find a ride and request a seat. Your trips will show up here." />
          : <div className="pad">{data.riding.map((q, i) => {
            const r = q.ride; const [cls, label] = STATUS[q.status]
            return (
              <div key={q.id} className="ride-card" style={{ animationDelay: i * 50 + 'ms' }}>
                <button style={{ width: '100%', textAlign: 'left' }} onClick={() => nav.push('ride', { id: r.id })}>
                  <div className="rc-top">
                    <div className="rc-time"><b>{fmtTime(r.depart_at)}</b><span>{fmtDay(r.depart_at)}</span></div>
                    <div className="timeline"><div className="tl-stop">{shortPlace(r.origin_name)}</div><div className="tl-stop end">{shortPlace(r.dest_name)}</div></div>
                    <span className={'badge ' + cls} style={{ alignSelf: 'flex-start' }}>{label}</span>
                  </div>
                </button>
                <div className="rc-bot">
                  <div className="who"><Avatar name={r.driver.full_name} hue={r.driver.hue} size={30} />{r.driver.full_name}</div>
                  <b style={{ color: 'var(--teal-d)' }}>{inr(q.seats * r.price_per_seat)}</b>
                  {['pending', 'approved'].includes(q.status) && r.status === 'open' &&
                    <button className="mini-btn" style={{ background: 'var(--teal-l)', color: 'var(--teal-d)' }} onClick={() => nav.push('chat', { id: r.id })}><Icon name="chat" size={16} /></button>}
                </div>
              </div>
            )
          })}</div>)}

        {data && tab === 'driving' && (data.driving.length === 0
          ? <Empty icon="car" title="You haven't offered a ride" text="Heading somewhere with empty seats? Share the cost with fellow travellers." action="Offer a ride" onAction={() => nav.push('publish')} />
          : <div className="pad">{data.driving.map((r, i) => {
            const pend = r.requests.filter((q) => q.status === 'pending').length
            const conf = r.requests.filter((q) => q.status === 'approved').reduce((n, q) => n + q.seats, 0)
            const done = r.status === 'cancelled' ? 'Cancelled' : hasDeparted(r.depart_at) ? 'Completed' : null
            return (
              <button key={r.id} className="ride-card" style={{ animationDelay: i * 50 + 'ms' }} onClick={() => nav.push('ride', { id: r.id })}>
                <div className="rc-top">
                  <div className="rc-time"><b>{fmtTime(r.depart_at)}</b><span>{fmtDay(r.depart_at)}</span></div>
                  <div className="timeline"><div className="tl-stop">{shortPlace(r.origin_name)}</div><div className="tl-stop end">{shortPlace(r.dest_name)}</div></div>
                  {done ? <span className={'badge ' + (done === 'Cancelled' ? 'bad' : 'mute')} style={{ alignSelf: 'flex-start' }}>{done}</span>
                    : <div className="rc-price"><b>{inr(r.price_per_seat)}</b><span>per seat</span></div>}
                </div>
                <div className="rc-bot">
                  <div className="who"><Icon name="users" size={18} /> {conf} of {r.seats_total} seats booked</div>
                  {pend > 0 && !done && <span className="badge warn">{pend} request{pend > 1 ? 's' : ''}</span>}
                </div>
              </button>
            )
          })}</div>)}
        <div style={{ height: 24 }} />
      </div>
    </>
  )
}

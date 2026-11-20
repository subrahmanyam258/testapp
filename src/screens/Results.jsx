import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Icon, Skeleton, Empty } from '../ui'
import RideCard from '../RideCard'
import { shortPlace } from '../lib/format'

export default function Results({ from, to, date, seats, nav }) {
  const [rides, setRides] = useState(null)
  const [other, setOther] = useState([])
  const [sort, setSort] = useState('time')
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const r = await api.search({ from, to, date, seats })
        setRides(r)
        if (r.length === 0 && date) setOther(await api.search({ from, to, date: null, seats }))
      } catch (e) { setErr(e.message); setRides([]) }
    })()
  }, [])

  const sorted = rides && [...rides].sort((a, b) => sort === 'price' ? a.price_per_seat - b.price_per_seat : a.depart_at.localeCompare(b.depart_at))
  const when = date ? new Date(date + 'T12:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Any day'

  return (
    <>
      <div className="topbar dark">
        <button className="icon-btn" onClick={nav.pop}><Icon name="back" /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{shortPlace(from.name)} → {shortPlace(to.name)}</h2>
          <div className="sub">{when} · {seats} seat{seats > 1 ? 's' : ''}</div>
        </div>
      </div>
      <div className="scroll" style={{ paddingTop: 14 }}>
        {rides && rides.length > 1 && (
          <div className="chips pad" style={{ marginBottom: 12 }}>
            <button className={'chip soft' + (sort === 'time' ? ' on' : '')} onClick={() => setSort('time')}><Icon name="clock" size={15} /> Earliest</button>
            <button className={'chip soft' + (sort === 'price' ? ' on' : '')} onClick={() => setSort('price')}><Icon name="rupee" size={15} /> Cheapest</button>
          </div>
        )}
        {rides === null && <Skeleton />}
        {err && <div className="err" style={{ margin: 18 }}>{err}</div>}
        {sorted && sorted.length > 0 && (
          <div className="pad">{sorted.map((r, i) => <RideCard key={r.id} ride={r} delay={i * 60} onClick={() => nav.push('ride', { id: r.id })} />)}</div>
        )}
        {rides && rides.length === 0 && !err && (
          <>
            <Empty icon="route" title="No rides on this day yet"
              text={other.length ? 'But there are rides on this route on other days:' : 'Nobody has posted this route yet. Offer a ride and travellers will find you.'}
              action={other.length ? null : 'Offer this ride'} onAction={() => nav.push('publish', { from, to })} />
            {other.length > 0 && <div className="pad">{other.map((r, i) => <RideCard key={r.id} ride={r} delay={i * 60} onClick={() => nav.push('ride', { id: r.id })} />)}</div>}
          </>
        )}
        <div style={{ height: 30 }} />
      </div>
    </>
  )
}

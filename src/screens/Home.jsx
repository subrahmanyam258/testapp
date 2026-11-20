import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Icon, PlacePicker, Skeleton, Empty, toast } from '../ui'
import RideCard from '../RideCard'
import { addDays, firstName, isoDate } from '../lib/format'
import { POPULAR_ROUTES } from '../lib/places'

export default function Home({ user, nav, active }) {
  const [from, setFrom] = useState(null)
  const [to, setTo] = useState(null)
  const [day, setDay] = useState('today')
  const [custom, setCustom] = useState(isoDate(addDays(3)))
  const [seats, setSeats] = useState(1)
  const [picker, setPicker] = useState(null)
  const [feed, setFeed] = useState(null)

  useEffect(() => { if (active) api.upcoming().then(setFeed).catch(() => setFeed([])) }, [active])

  const date = day === 'today' ? isoDate() : day === 'tomorrow' ? isoDate(addDays(1)) : day === 'any' ? null : custom
  const find = () => {
    if (!from || !to) return toast('Choose where you are leaving from and going to', 'err')
    nav.push('results', { from, to, date, seats })
  }
  const swap = () => { setFrom(to); setTo(from) }
  const customLabel = new Date(custom + 'T12:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

  return (
    <div className="scroll">
      <div className="hero">
        <div className="hello">Namaste, {firstName(user.full_name)} 👋</div>
        <h1>Where are you headed today?</h1>
      </div>

      <div className="search-card fade-up">
        <div className="route-fields">
          <button className="field-row" onClick={() => setPicker('from')}>
            <span className="dot" />
            <span className="txt"><div className="lbl">Leaving from</div><div className={'val' + (from ? '' : ' ph')}>{from ? from.name : 'Choose pickup point'}</div></span>
          </button>
          <div className="divider" />
          <button className="field-row" onClick={() => setPicker('to')}>
            <span className="dot dest" />
            <span className="txt"><div className="lbl">Going to</div><div className={'val' + (to ? '' : ' ph')}>{to ? to.name : 'Choose destination'}</div></span>
          </button>
          <button className="swap" onClick={swap} aria-label="Swap"><Icon name="swap" size={18} /></button>
        </div>

        <div className="opts">
          <div className="chips" style={{ flex: 1 }}>
            {[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['any', 'Any day']].map(([k, l]) => (
              <button key={k} className={'chip' + (day === k ? ' on' : '')} onClick={() => setDay(k)}>{l}</button>
            ))}
            <span className="date-pick">
              <span className={'chip' + (day === 'custom' ? ' on' : '')}><Icon name="cal" size={16} />{day === 'custom' ? customLabel : 'Pick'}</span>
              <input type="date" min={isoDate()} value={custom} onChange={(e) => { setCustom(e.target.value); setDay('custom') }} />
            </span>
          </div>
        </div>
        <div className="opts" style={{ margin: '0 0 14px', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink-2)', display: 'flex', gap: 8, alignItems: 'center' }}><Icon name="users" size={18} /> Seats needed</span>
          <div className="stepper">
            <button disabled={seats <= 1} onClick={() => setSeats(seats - 1)}>−</button><span>{seats}</span>
            <button disabled={seats >= 4} onClick={() => setSeats(seats + 1)}>+</button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={find}><Icon name="search" size={20} stroke={2.4} /> Find rides</button>
      </div>

      <div className="section"><h3>Popular routes</h3></div>
      <div className="hscroll">
        {POPULAR_ROUTES.map((r, i) => (
          <button key={i} className="route-chip" onClick={() => { setFrom(r.from); setTo(r.to) }}>
            <b>{r.from.name.split(',')[0]}</b><i>to {r.to.name.split(',')[0].replace(' Airport (RGIA)', ' Airport')}</i>
          </button>
        ))}
      </div>

      <div className="section"><h3>Leaving soon</h3><span>{feed ? `${feed.length} rides` : ''}</span></div>
      {feed === null ? <Skeleton n={2} /> : feed.length === 0 ? (
        <Empty title="No rides posted yet" text="Be the first on your route. Offer a ride and split the fuel cost with fellow travellers."
          action="Offer a ride" onAction={() => nav.push('publish')} />
      ) : (
        <div className="pad">{feed.slice(0, 8).map((r, i) => <RideCard key={r.id} ride={r} delay={i * 50} onClick={() => nav.push('ride', { id: r.id })} />)}</div>
      )}
      <div style={{ height: 24 }} />

      <PlacePicker open={!!picker} title={picker === 'from' ? 'Leaving from…' : 'Going to…'}
        onClose={() => setPicker(null)}
        onPick={(p) => { picker === 'from' ? setFrom(p) : setTo(p); setPicker(null) }} />
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Icon, PlacePicker, toast } from '../ui'
import { addDays, fmtDay, fmtDur, inr, isoDate, shortPlace } from '../lib/format'
import { routeInfo, suggestPrice } from '../lib/places'

const QUICK_TIMES = ['06:00', '07:30', '09:00', '13:00', '17:30', '20:00']

export default function Publish({ nav, from: f0, to: t0, user }) {
  const [step, setStep] = useState(0)
  const [from, setFrom] = useState(f0 || null)
  const [to, setTo] = useState(t0 || null)
  const [picker, setPicker] = useState(null)
  const [info, setInfo] = useState(null)
  const [date, setDate] = useState(isoDate(addDays(1)))
  const [time, setTime] = useState('07:30')
  const [seats, setSeats] = useState(3)
  const [price, setPrice] = useState(0)
  const [vehicle, setVehicle] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!from || !to) return setInfo(null)
    let live = true; setInfo('loading')
    routeInfo(from, to).then((r) => { if (live) { setInfo(r); setPrice(suggestPrice(r.distanceKm)) } })
    return () => { live = false }
  }, [from, to])

  const suggested = info && info !== 'loading' ? suggestPrice(info.distanceKm) : 0
  const departAt = new Date(`${date}T${time}`)
  const inPast = departAt.getTime() < Date.now() - 5 * 60e3
  const can = [
    from && to && info && info !== 'loading' && shortPlace(from.name) !== shortPlace(to.name),
    date && time && !inPast,
    seats >= 1 && price >= 0 && price <= 20000,
    true,
  ]

  const publish = async () => {
    setBusy(true)
    try {
      const id = await api.publish({
        from, to, departAt: departAt.toISOString(), seats, price, vehicle, notes,
        distanceKm: info.distanceKm, durationMin: info.durationMin, geojson: info.geojson,
      })
      toast('Ride published!', 'ok'); nav.replace('ride', { id })
    } catch (e) { toast(e.message, 'err'); setBusy(false) }
  }
  const next = () => (step < 3 ? setStep(step + 1) : publish())
  const back = () => (step > 0 ? setStep(step - 1) : nav.pop())

  return (
    <>
      <div className="topbar">
        <button className="icon-btn light" onClick={back}><Icon name="back" /></button>
        <h2>Offer a ride</h2><span className="badge">{step + 1} / 4</span>
      </div>
      <div className="progress">{[0, 1, 2, 3].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}</div>

      <div className="scroll pad" key={step}>
        <div className="fade-up">
          {step === 0 && (<>
            <h1 className="step-title">Where are you driving?</h1>
            <p className="step-sub">Riders along your route can join, not just at the start and end.</p>
            <div className="card" style={{ padding: 8 }}>
              <button className="field-row" onClick={() => setPicker('from')}><span className="dot" />
                <span className="txt"><div className="lbl">From</div><div className={'val' + (from ? '' : ' ph')}>{from ? from.name : 'Pickup point'}</div></span></button>
              <div className="divider" />
              <button className="field-row" onClick={() => setPicker('to')}><span className="dot dest" />
                <span className="txt"><div className="lbl">To</div><div className={'val' + (to ? '' : ' ph')}>{to ? to.name : 'Destination'}</div></span></button>
            </div>
            {info === 'loading' && <div className="hint"><div className="spinner dark" style={{ width: 18, height: 18, borderWidth: 2.5 }} /> Working out the route…</div>}
            {info && info !== 'loading' && (
              <div className="hint"><Icon name="route" size={20} /><span><b>{Math.round(info.distanceKm)} km</b> · about <b>{fmtDur(info.durationMin)}</b>{info.approx ? ' (estimated)' : ''}</span></div>
            )}
          </>)}

          {step === 1 && (<>
            <h1 className="step-title">When are you leaving?</h1>
            <p className="step-sub">Pick the time you will actually set off, so riders can plan.</p>
            <label className="label">DATE</label>
            <input className="time-input" type="date" min={isoDate()} value={date} onChange={(e) => setDate(e.target.value)} />
            <label className="label">DEPARTURE TIME</label>
            <input className="time-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <div className="chips" style={{ marginTop: 12 }}>
              {QUICK_TIMES.map((t) => <button key={t} className={'chip soft' + (time === t ? ' on' : '')} onClick={() => setTime(t)}>{t}</button>)}
            </div>
            {inPast && <div className="hint warn"><Icon name="info" size={20} /> That time has already passed. Choose a later time.</div>}
          </>)}

          {step === 2 && (<>
            <h1 className="step-title">Seats & cost share</h1>
            <p className="step-sub">Only charge a fair share of fuel and tolls. This isn’t a taxi.</p>
            <label className="label">SEATS YOU CAN OFFER</label>
            <div className="big-num">
              <button onClick={() => setSeats(Math.max(1, seats - 1))}>−</button><b>{seats}</b><button onClick={() => setSeats(Math.min(6, seats + 1))}>+</button>
            </div>
            <label className="label">PRICE PER SEAT (₹)</label>
            <input className="time-input" type="number" inputMode="numeric" min="0" value={price} onChange={(e) => setPrice(Math.max(0, Math.min(20000, parseInt(e.target.value || '0', 10))))} />
            <div className={'hint' + (price > suggested * 1.5 ? ' warn' : '')}>
              <Icon name="rupee" size={20} />
              <span>Fair share for this trip is about <b>{inr(suggested)}</b>. {price > suggested * 1.5 ? 'Your price is high, so fewer riders will join.' : 'Fair prices fill seats faster.'}
                {' '}<button style={{ color: 'inherit', fontWeight: 800, textDecoration: 'underline' }} onClick={() => setPrice(suggested)}>Use suggested</button></span>
            </div>
            <label className="label">YOUR CAR (OPTIONAL)</label>
            <input className="input" placeholder="e.g. White Hyundai Creta" value={vehicle} onChange={(e) => setVehicle(e.target.value)} maxLength={60} />
            <label className="label">NOTE FOR RIDERS (OPTIONAL)</label>
            <textarea className="input" placeholder="Luggage space, chai stops, music, pickup spots…" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={400} />
          </>)}

          {step === 3 && (<>
            <h1 className="step-title">Ready to publish?</h1>
            <p className="step-sub">Check the details. Riders will be able to find and request your ride right away.</p>
            <div className="card">
              <div className="summary-line"><span>From</span><b>{from?.name}</b></div>
              <div className="summary-line"><span>To</span><b>{to?.name}</b></div>
              <div className="summary-line"><span>When</span><b>{fmtDay(departAt.toISOString())}, {time}</b></div>
              <div className="summary-line"><span>Distance</span><b>{Math.round(info?.distanceKm || 0)} km · {fmtDur(info?.durationMin)}</b></div>
              <div className="summary-line"><span>Seats</span><b>{seats}</b></div>
              <div className="summary-line"><span>Price per seat</span><b style={{ color: 'var(--teal-d)' }}>{inr(price)}</b></div>
              {vehicle && <div className="summary-line"><span>Car</span><b>{vehicle}</b></div>}
            </div>
            <div className="hint"><Icon name="shield" size={20} /><span>Only accept riders you are comfortable with. You approve every request and can chat first.</span></div>
          </>)}
        </div>
        <div style={{ height: 20 }} />
      </div>

      <div className="cta">
        <button className="btn btn-primary" disabled={!can[step] || busy} onClick={next}>
          {busy ? <div className="spinner" /> : step === 3 ? 'Publish ride' : 'Continue'}
        </button>
      </div>

      <PlacePicker open={!!picker} title={picker === 'from' ? 'Pickup point…' : 'Destination…'} onClose={() => setPicker(null)}
        onPick={(p) => { picker === 'from' ? setFrom(p) : setTo(p); setPicker(null) }} />
    </>
  )
}

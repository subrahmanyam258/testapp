import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Avatar, Icon, Rating, Sheet, Skeleton, Stars, toast } from '../ui'
import { fmtDay, fmtDur, fmtTime, hasDeparted, inr, shortPlace } from '../lib/format'

const STATUS_COPY = {
  pending: ['pending', 'Request sent. Waiting for the driver to confirm.'],
  approved: ['approved', 'Seat confirmed! Chat with the driver to fix the pickup spot.'],
  declined: ['declined', 'The driver could not take this request.'],
  cancelled: ['cancelled', 'You cancelled this request.'],
}

export default function RideDetail({ id, user, nav }) {
  const [data, setData] = useState(null)
  const [reviewed, setReviewed] = useState([])
  const [sheet, setSheet] = useState(null)
  const [seats, setSeats] = useState(1)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [target, setTarget] = useState(null)
  const [stars, setStars] = useState(5)
  const [comment, setComment] = useState('')

  const load = useCallback(async () => {
    try { const d = await api.getRide(id); setData(d); setReviewed(await api.myReviews(id)) } catch (e) { toast(e.message, 'err') }
  }, [id])
  useEffect(() => { load() }, [load])
  useEffect(() => api.onTripsChange(load), [load])

  if (!data) return (<><div className="topbar"><button className="icon-btn light" onClick={nav.pop}><Icon name="back" /></button></div><Skeleton n={3} h={140} /></>)
  const { ride, requests } = data
  const isDriver = ride.driver_id === user.id
  const mine = requests.find((q) => q.rider_id === user.id)
  const departed = hasDeparted(ride.depart_at)
  const cancelled = ride.status === 'cancelled'
  const approved = requests.filter((q) => q.status === 'approved')
  const pending = requests.filter((q) => q.status === 'pending')

  const run = async (fn, okMsg) => {
    setBusy(true)
    try { await fn(); if (okMsg) toast(okMsg, 'ok'); await load() } catch (e) { toast(e.message, 'err') } finally { setBusy(false) }
  }
  const doRequest = () => run(async () => { await api.requestSeat(ride.id, seats, msg.trim()); setSheet(null); setMsg('') }, 'Request sent')
  const doRate = () => run(async () => { await api.review({ rideId: ride.id, revieweeId: target.id, stars, comment: comment.trim() }); setSheet(null); setComment('') }, 'Thanks for rating!')

  const ratable = []
  if (departed && !cancelled) {
    if (isDriver) approved.forEach((q) => ratable.push({ id: q.rider_id, name: q.rider?.full_name, hue: q.rider?.hue }))
    else if (mine?.status === 'approved') ratable.push({ id: ride.driver_id, name: ride.driver.full_name, hue: ride.driver.hue })
  }
  const toRate = ratable.filter((r) => !reviewed.includes(r.id))

  return (
    <>
      <div className="scroll">
        <div className="detail-hero">
          <div className="topbar" style={{ padding: 'calc(var(--sat) + 12px) 0 6px' }}>
            <button className="icon-btn" onClick={nav.pop}><Icon name="back" /></button>
            <h2 style={{ fontSize: 15, opacity: .9 }}>Ride details</h2>
            {cancelled && <span className="badge bad">Cancelled</span>}
          </div>
          <div className="when">{fmtDay(ride.depart_at, true)} · {fmtTime(ride.depart_at)}</div>
          <div className="timeline">
            <div className="tl-stop">{ride.origin_name}</div>
            <div className="tl-stop end" style={{ marginTop: 22 }}>{ride.dest_name}</div>
          </div>
        </div>

        <div className="pull">
          <div className="stats fade-up">
            <div className="stat"><b style={{ color: 'var(--teal-d)' }}>{inr(ride.price_per_seat)}</b><span>per seat</span></div>
            <div className="stat"><b>{ride.seats_left}<small style={{ color: 'var(--muted)', fontSize: 13 }}>/{ride.seats_total}</small></b><span>seats left</span></div>
            <div className="stat"><b>{ride.duration_min ? fmtDur(ride.duration_min) : '—'}</b><span>{ride.distance_km ? Math.round(ride.distance_km) + ' km' : 'duration'}</span></div>
          </div>

          {!isDriver && mine && (
            <div className={'banner ' + STATUS_COPY[mine.status][0]}>
              <Icon name={mine.status === 'approved' ? 'check' : mine.status === 'pending' ? 'clock' : 'x'} size={22} />
              <span>{STATUS_COPY[mine.status][1]}</span>
            </div>
          )}

          <div className="card">
            <div className="row">
              <Avatar name={ride.driver.full_name} hue={ride.driver.hue} size={52} />
              <div className="grow">
                <div className="name">{ride.driver.full_name}{isDriver && <span className="badge" style={{ marginLeft: 8 }}>You</span>}</div>
                <div className="meta"><Rating avg={ride.driver.rating_avg} count={ride.driver.rating_count} /></div>
              </div>
            </div>
            {(ride.vehicle || ride.notes) && <div style={{ height: 1, background: 'var(--line)', margin: '14px 0' }} />}
            {ride.vehicle && <div className="row" style={{ marginBottom: ride.notes ? 10 : 0, fontWeight: 700, fontSize: 14.5 }}><Icon name="car" size={20} style={{ color: 'var(--teal)' }} /> {ride.vehicle}</div>}
            {ride.notes && <p className="note">{ride.notes}</p>}
          </div>

          {isDriver && (
            <div className="card">
              <div className="row" style={{ marginBottom: 6 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, flex: 1 }}>Passengers</h3>
                {pending.length > 0 && <span className="badge warn">{pending.length} waiting</span>}
              </div>
              {requests.filter((q) => q.status === 'pending' || q.status === 'approved').length === 0 &&
                <p className="note" style={{ padding: '6px 0' }}>No requests yet. Riders who find your ride will appear here.</p>}
              {requests.filter((q) => q.status === 'pending' || q.status === 'approved').map((q) => (
                <div key={q.id} className="req">
                  <Avatar name={q.rider?.full_name} hue={q.rider?.hue} size={42} />
                  <div className="grow">
                    <div className="name" style={{ fontSize: 15 }}>{q.rider?.full_name}</div>
                    <div className="meta">{q.seats} seat{q.seats > 1 ? 's' : ''} · {inr(q.seats * ride.price_per_seat)}</div>
                    {q.message && <div className="note" style={{ fontSize: 13, marginTop: 4 }}>“{q.message}”</div>}
                  </div>
                  {q.status === 'pending' && !departed ? (
                    <div className="row" style={{ gap: 6 }}>
                      <button className="mini-btn no" disabled={busy} onClick={() => run(() => api.respond(q.id, false), 'Declined')}>Decline</button>
                      <button className="mini-btn yes" disabled={busy} onClick={() => run(() => api.respond(q.id, true), 'Seat confirmed')}>Accept</button>
                    </div>
                  ) : <span className="badge ok">Confirmed</span>}
                </div>
              ))}
            </div>
          )}

          {toRate.length > 0 && (
            <div className="card" style={{ background: 'var(--saffron-l)' }}>
              <div className="name" style={{ marginBottom: 8 }}>How was the trip?</div>
              {toRate.map((r) => (
                <button key={r.id} className="req" style={{ width: '100%', textAlign: 'left' }} onClick={() => { setTarget(r); setStars(5); setSheet('rate') }}>
                  <Avatar name={r.name} hue={r.hue} size={38} /><span className="grow name" style={{ fontSize: 15 }}>Rate {r.name}</span>
                  <Icon name="chevron" size={20} />
                </button>
              ))}
            </div>
          )}

          <div className="hint" style={{ marginTop: 0 }}>
            <Icon name="info" size={20} />
            <span>You pay the driver directly (cash or UPI) and only share the fuel cost. Hum Safar takes no commission.</span>
          </div>
          <div style={{ height: 24 }} />
        </div>
      </div>

      <div className="cta">
        {isDriver ? (
          <>
            {!cancelled && !departed && <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => setSheet('cancelRide')}>Cancel ride</button>}
            {requests.some((q) => ['pending', 'approved'].includes(q.status)) && (
              <button className="btn btn-teal" style={{ flex: 1 }} onClick={() => nav.push('chat', { id: ride.id })}><Icon name="chat" size={20} /> Group chat</button>
            )}
          </>
        ) : mine && ['pending', 'approved'].includes(mine.status) ? (
          <>
            {!departed && <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={() => run(() => api.cancelRequest(mine.id), 'Request cancelled')}>Cancel</button>}
            <button className="btn btn-teal" style={{ flex: 2 }} onClick={() => nav.push('chat', { id: ride.id })}><Icon name="chat" size={20} /> Chat with driver</button>
          </>
        ) : (
          <button className="btn btn-primary" disabled={cancelled || departed || ride.seats_left <= 0}
            onClick={() => { setSeats(1); setSheet('request') }}>
            {cancelled ? 'Ride cancelled' : departed ? 'Ride has left' : ride.seats_left <= 0 ? 'Ride is full' : mine ? 'Request again' : 'Request a seat'}
          </button>
        )}
      </div>

      <Sheet open={sheet === 'request'} onClose={() => setSheet(null)} title="Request a seat">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div><div className="name">Seats</div><div className="meta">{ride.seats_left} available</div></div>
          <div className="stepper">
            <button disabled={seats <= 1} onClick={() => setSeats(seats - 1)}>−</button><span>{seats}</span>
            <button disabled={seats >= Math.min(ride.seats_left, 4)} onClick={() => setSeats(seats + 1)}>+</button>
          </div>
        </div>
        <label className="label">MESSAGE TO DRIVER (OPTIONAL)</label>
        <textarea className="input" maxLength={300} placeholder={`Hi ${ride.driver.full_name.split(' ')[0]}, I'll be at ${shortPlace(ride.origin_name)}…`} value={msg} onChange={(e) => setMsg(e.target.value)} />
        <div className="summary-line" style={{ marginTop: 10 }}><span>Your share of the cost</span><b style={{ color: 'var(--teal-d)', fontSize: 18 }}>{inr(seats * ride.price_per_seat)}</b></div>
        <button className="btn btn-primary" style={{ marginTop: 10 }} disabled={busy} onClick={doRequest}>{busy ? <div className="spinner" /> : 'Send request'}</button>
      </Sheet>

      <Sheet open={sheet === 'cancelRide'} onClose={() => setSheet(null)} title="Cancel this ride?">
        <p className="note" style={{ marginBottom: 16 }}>Passengers will see that the ride is cancelled. This can’t be undone.</p>
        <button className="btn btn-danger" disabled={busy} onClick={() => run(async () => { await api.cancelRide(ride.id); setSheet(null) }, 'Ride cancelled')}>Yes, cancel ride</button>
        <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setSheet(null)}>Keep ride</button>
      </Sheet>

      <Sheet open={sheet === 'rate'} onClose={() => setSheet(null)} title={target ? `Rate ${target.name}` : 'Rate'}>
        <div style={{ textAlign: 'center', margin: '4px 0 12px' }}><Stars value={stars} size={36} big onPick={setStars} /></div>
        <textarea className="input" maxLength={500} placeholder="Say a few words (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={busy} onClick={doRate}>Submit rating</button>
      </Sheet>
    </>
  )
}

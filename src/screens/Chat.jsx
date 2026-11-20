import React, { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { Icon, toast } from '../ui'
import { fmtDay, fmtTime, sameDay, shortPlace } from '../lib/format'

export default function Chat({ id, user, nav }) {
  const [ride, setRide] = useState(null)
  const [names, setNames] = useState({})
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const end = useRef()

  useEffect(() => {
    let off
    ;(async () => {
      const { ride: r, requests } = await api.getRide(id)
      setRide(r)
      const n = { [r.driver_id]: r.driver.full_name }
      requests.forEach((q) => { if (q.rider) n[q.rider_id] = q.rider.full_name })
      setNames(n)
      setMsgs(await api.messages(id))
      off = api.onMessage(id, (m) => setMsgs((l) => (l.some((x) => x.id === m.id) ? l : [...l, m])))
    })().catch((e) => toast(e.message, 'err'))
    return () => off?.()
  }, [id])
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async (e) => {
    e.preventDefault()
    const body = text.trim(); if (!body) return
    setText('')
    try { await api.send(id, body) } catch (ex) { toast(ex.message, 'err'); setText(body) }
  }
  const isDriver = ride?.driver_id === user.id

  return (
    <>
      <div className="topbar dark">
        <button className="icon-btn" onClick={nav.pop}><Icon name="back" /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ride ? `${shortPlace(ride.origin_name)} → ${shortPlace(ride.dest_name)}` : 'Chat'}</h2>
          <div className="sub">{ride ? `${fmtDay(ride.depart_at)} · ${fmtTime(ride.depart_at)}${isDriver ? ' · group chat' : ' · with ' + ride.driver.full_name.split(' ')[0]}` : ''}</div>
        </div>
      </div>
      <div className="chat">
        {msgs.length === 0 && (
          <div className="empty" style={{ margin: 'auto' }}>
            <div className="ill"><Icon name="chat" size={38} stroke={1.7} /></div>
            <h3>Say hello 👋</h3><p>Agree on the exact pickup spot and time. Keep your phone number private until you are comfortable.</p>
          </div>
        )}
        {msgs.map((m, i) => {
          const mine = m.sender_id === user.id
          const prev = msgs[i - 1]
          const newDay = !prev || !sameDay(new Date(prev.created_at), new Date(m.created_at))
          return (
            <React.Fragment key={m.id}>
              {newDay && <div className="day-sep">{fmtDay(m.created_at)}</div>}
              <div className={'bubble ' + (mine ? 'me' : 'them')}>
                {!mine && isDriver && <span className="sn">{names[m.sender_id] || 'Rider'}</span>}
                {!mine && !isDriver && m.sender_id !== ride?.driver_id && <span className="sn">{names[m.sender_id] || 'Co-rider'}</span>}
                {m.body}<time>{fmtTime(m.created_at)}</time>
              </div>
            </React.Fragment>
          )
        })}
        <div ref={end} />
      </div>
      <form className="composer" onSubmit={send}>
        <input placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        <button className="send" aria-label="Send"><Icon name="send" size={20} /></button>
      </form>
    </>
  )
}

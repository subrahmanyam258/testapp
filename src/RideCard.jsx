import React from 'react'
import { Avatar, Rating } from './ui'
import { fmtDay, fmtTime, fmtDur, inr, shortPlace } from './lib/format'

export default function RideCard({ ride, onClick, delay = 0 }) {
  const full = ride.seats_left <= 0
  return (
    <button className="ride-card" style={{ animationDelay: delay + 'ms' }} onClick={onClick}>
      <div className="rc-top">
        <div className="rc-time">
          <b>{fmtTime(ride.depart_at)}</b>
          <span>{fmtDay(ride.depart_at)}</span>
        </div>
        <div className="timeline">
          <div className="tl-stop">{shortPlace(ride.origin_name)}</div>
          <div className="tl-stop end">{shortPlace(ride.dest_name)}
            {ride.duration_min ? <span className="tl-sub">{fmtDur(ride.duration_min)} · {Math.round(ride.distance_km)} km</span> : null}
          </div>
        </div>
        <div className="rc-price"><b>{inr(ride.price_per_seat)}</b><span>per seat</span></div>
      </div>
      <div className="rc-bot">
        <div className="who">
          <Avatar name={ride.driver?.full_name} hue={ride.driver?.hue} size={30} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ride.driver?.full_name}</span>
          <Rating avg={ride.driver?.rating_avg} count={ride.driver?.rating_count} />
        </div>
        <span className={'badge' + (full ? ' mute' : ride.seats_left === 1 ? ' warn' : '')}>
          {full ? 'Full' : `${ride.seats_left} seat${ride.seats_left > 1 ? 's' : ''} left`}
        </span>
      </div>
    </button>
  )
}

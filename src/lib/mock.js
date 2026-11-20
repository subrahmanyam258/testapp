// Demo backend (localStorage). Used when no Supabase keys are configured or when opened with ?demo=1.
import { haversineKm, POPULAR } from './places'

const KEY = 'hs_demo_v1'
const P = (n) => POPULAR.find((p) => p.name === n)
const uuid = () => 'd' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
const listeners = { msg: new Set(), trips: new Set() }

const people = {
  me: { id: 'me', full_name: 'Aarav Reddy', hue: 175, rating_avg: 4.8, rating_count: 12 },
  u1: { id: 'u1', full_name: 'Priya Sharma', hue: 330, rating_avg: 4.9, rating_count: 41 },
  u2: { id: 'u2', full_name: 'Karthik Rao', hue: 28, rating_avg: 4.7, rating_count: 23 },
  u3: { id: 'u3', full_name: 'Fatima Begum', hue: 265, rating_avg: 5.0, rating_count: 9 },
  u4: { id: 'u4', full_name: 'Ravi Teja', hue: 140, rating_avg: 4.6, rating_count: 57 },
  u5: { id: 'u5', full_name: 'Sneha Kulkarni', hue: 205, rating_avg: 4.8, rating_count: 18 },
}

const at = (days, h, m = 0) => {
  const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString()
}
const mk = (driver, a, b, dep, seats, left, price, km, min, vehicle, notes) => ({
  id: uuid(), driver_id: driver, origin_name: a, origin_lat: P(a).lat, origin_lng: P(a).lng,
  dest_name: b, dest_lat: P(b).lat, dest_lng: P(b).lng, depart_at: dep, seats_total: seats, seats_left: left,
  price_per_seat: price, distance_km: km, duration_min: min, vehicle, notes, status: 'open', created_at: new Date().toISOString(),
})

function seed() {
  const rides = [
    mk('u1', 'Hyderabad', 'Bangalore', at(1, 6, 30), 3, 2, 750, 570, 560, 'White Hyundai Creta', 'Two short chai breaks. Space for one cabin bag each.'),
    mk('u2', 'Gachibowli, Hyderabad', 'Shamshabad Airport (RGIA)', at(0, 20, 15), 3, 3, 180, 28, 38, 'Grey Maruti Swift', 'Leaving after office. Drop at departures.'),
    mk('u3', 'Hyderabad', 'Vijayawada', at(1, 8, 0), 3, 1, 420, 275, 270, 'Red Tata Nexon', 'Music on, AC on. No smoking please.'),
    mk('u4', 'HITEC City, Hyderabad', 'Secunderabad', at(0, 18, 45), 2, 2, 90, 22, 55, 'Black Honda City', 'Evening commute via Begumpet.'),
    mk('u5', 'Hyderabad', 'Warangal', at(2, 7, 15), 3, 3, 240, 150, 160, 'Silver Toyota Innova', 'Weekend run, flexible pickup at Uppal.'),
    mk('u2', 'Hyderabad', 'Bangalore', at(2, 21, 0), 3, 3, 700, 570, 560, 'Grey Maruti Swift', 'Night drive, steady pace.'),
  ]
  return { user: null, rides, requests: [], messages: [], reviews: [], profile: { ...people.me } }
}
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed() } catch { return seed() } }
let db = load()
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch {} }
const prof = (id) => (id === 'me' ? db.profile : people[id]) || people.u1
const withDriver = (r) => ({ ...r, driver: prof(r.driver_id) })
const emit = (k, v) => listeners[k].forEach((f) => f(v))
const wait = (ms = 220) => new Promise((r) => setTimeout(r, ms))

export const mockApi = {
  mode: 'demo',
  async init() { return db.user ? { id: 'me', email: db.user.email, ...db.profile } : null },
  onAuth() { return () => {} },
  async signUp(email, _pw, name) {
    db.user = { email }; db.profile = { ...people.me, full_name: name || 'Aarav Reddy' }; save()
    return { user: { id: 'me', email, ...db.profile } }
  },
  async signIn(email) {
    db.user = { email: email || 'demo@humsafar.app' }; save()
    return { user: { id: 'me', email: db.user.email, ...db.profile } }
  },
  async signOut() { db.user = null; save() },
  async updateProfile(patch) { db.profile = { ...db.profile, ...patch }; save(); return { id: 'me', email: db.user?.email, ...db.profile } },
  async stats() {
    return {
      offered: db.rides.filter((r) => r.driver_id === 'me' && r.status === 'open').length,
      taken: db.requests.filter((q) => q.rider_id === 'me' && q.status === 'approved').length,
    }
  },

  async upcoming() {
    await wait()
    return db.rides.filter((r) => r.status === 'open' && r.seats_left > 0 && new Date(r.depart_at) > new Date())
      .sort((a, b) => a.depart_at.localeCompare(b.depart_at)).map(withDriver)
  },
  async search({ from, to, date, seats = 1 }) {
    await wait(380)
    const near = (a, b) => haversineKm(a, b) <= 18
    return db.rides.filter((r) => {
      if (r.status !== 'open' || r.seats_left < seats || new Date(r.depart_at) < new Date()) return false
      if (date && new Date(r.depart_at).toDateString() !== new Date(date + 'T12:00').toDateString()) return false
      return near({ lat: r.origin_lat, lng: r.origin_lng }, from) && near({ lat: r.dest_lat, lng: r.dest_lng }, to)
    }).sort((a, b) => a.depart_at.localeCompare(b.depart_at)).map(withDriver)
  },
  async getRide(id) {
    await wait(150)
    const ride = db.rides.find((r) => r.id === id)
    const requests = db.requests.filter((q) => q.ride_id === id && (ride.driver_id === 'me' || q.rider_id === 'me'))
      .map((q) => ({ ...q, rider: prof(q.rider_id) }))
    return { ride: withDriver(ride), requests }
  },
  async publish(f) {
    await wait(500)
    const r = {
      id: uuid(), driver_id: 'me', origin_name: f.from.name, origin_lat: f.from.lat, origin_lng: f.from.lng,
      dest_name: f.to.name, dest_lat: f.to.lat, dest_lng: f.to.lng, depart_at: f.departAt,
      seats_total: f.seats, seats_left: f.seats, price_per_seat: f.price, distance_km: f.distanceKm,
      duration_min: f.durationMin, vehicle: f.vehicle || null, notes: f.notes || null, status: 'open',
      created_at: new Date().toISOString(),
    }
    db.rides.unshift(r); save(); return r.id
  },
  async cancelRide(id) { db.rides.find((r) => r.id === id).status = 'cancelled'; save() },

  async requestSeat(rideId, seats, message) {
    await wait(350)
    const ex = db.requests.find((q) => q.ride_id === rideId && q.rider_id === 'me')
    if (ex) Object.assign(ex, { status: 'pending', seats, message })
    else db.requests.push({ id: uuid(), ride_id: rideId, rider_id: 'me', seats, message, status: 'pending', created_at: new Date().toISOString() })
    save()
    // demo: the driver approves after a few seconds
    setTimeout(() => {
      const q = db.requests.find((x) => x.ride_id === rideId && x.rider_id === 'me')
      const r = db.rides.find((x) => x.id === rideId)
      if (q?.status === 'pending' && r) {
        q.status = 'approved'; r.seats_left = Math.max(0, r.seats_left - q.seats)
        db.messages.push({ id: uuid(), ride_id: rideId, sender_id: r.driver_id, body: 'Hi! Seat confirmed 👍 Share your exact pickup spot when you can.', created_at: new Date().toISOString() })
        save(); emit('trips'); emit('msg', db.messages.at(-1))
      }
    }, 4500)
  },
  async cancelRequest(id) {
    const q = db.requests.find((x) => x.id === id)
    if (q.status === 'approved') { const r = db.rides.find((x) => x.id === q.ride_id); r.seats_left = Math.min(r.seats_total, r.seats_left + q.seats) }
    q.status = 'cancelled'; save()
  },
  async respond(id, approve) {
    const q = db.requests.find((x) => x.id === id); const r = db.rides.find((x) => x.id === q.ride_id)
    if (approve) { if (r.seats_left < q.seats) throw new Error('Not enough seats left on this ride'); r.seats_left -= q.seats }
    q.status = approve ? 'approved' : 'declined'; save()
  },

  async trips() {
    await wait(200)
    const riding = db.requests.filter((q) => q.rider_id === 'me')
      .map((q) => ({ ...q, ride: withDriver(db.rides.find((r) => r.id === q.ride_id)) }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    const driving = db.rides.filter((r) => r.driver_id === 'me').map((r) => ({
      ...r, requests: db.requests.filter((q) => q.ride_id === r.id).map((q) => ({ ...q, rider: prof(q.rider_id) })),
    })).sort((a, b) => b.depart_at.localeCompare(a.depart_at))
    return { riding, driving }
  },
  onTripsChange(cb) { listeners.trips.add(cb); return () => listeners.trips.delete(cb) },

  async messages(rideId) { return db.messages.filter((m) => m.ride_id === rideId) },
  async send(rideId, body) {
    const m = { id: uuid(), ride_id: rideId, sender_id: 'me', body, created_at: new Date().toISOString() }
    db.messages.push(m); save(); emit('msg', m)
    const r = db.rides.find((x) => x.id === rideId)
    if (r && r.driver_id !== 'me') {
      setTimeout(() => {
        const reply = { id: uuid(), ride_id: rideId, sender_id: r.driver_id, body: 'Sounds good! See you at the pickup point 🚗', created_at: new Date().toISOString() }
        db.messages.push(reply); save(); emit('msg', reply)
      }, 1600)
    }
  },
  onMessage(rideId, cb) {
    const f = (m) => m.ride_id === rideId && cb(m)
    listeners.msg.add(f); return () => listeners.msg.delete(f)
  },

  async myReviews(rideId) { return db.reviews.filter((r) => r.ride_id === rideId).map((r) => r.reviewee_id) },
  async review({ rideId, revieweeId, stars }) { db.reviews.push({ ride_id: rideId, reviewee_id: revieweeId, stars }); save() },
}

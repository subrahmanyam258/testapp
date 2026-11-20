import { createClient } from '@supabase/supabase-js'

const URL_ = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const hasSupabase = Boolean(URL_ && KEY)
export const sb = hasSupabase
  ? createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null

const PROFILE = 'id,full_name,hue,rating_avg,rating_count'
const RIDE = 'id,driver_id,origin_name,origin_lat,origin_lng,dest_name,dest_lat,dest_lng,depart_at,seats_total,seats_left,price_per_seat,distance_km,duration_min,vehicle,notes,status,created_at'
const DRIVER = `driver:profiles(${PROFILE})`

const must = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}
const uid = async () => (await sb.auth.getUser()).data.user?.id

export const supaApi = {
  mode: 'live',

  async init() {
    const { data } = await sb.auth.getSession()
    return data.session ? this.me() : null
  },
  onAuth(cb) {
    const { data } = sb.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') cb(null)
      if (event === 'SIGNED_IN' && session) cb(await this.me())
    })
    return () => data.subscription.unsubscribe()
  },
  async me() {
    const { data } = await sb.auth.getUser()
    if (!data.user) return null
    let { data: p } = await sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
    if (!p) {
      await new Promise((r) => setTimeout(r, 600))
      ;({ data: p } = await sb.from('profiles').select('*').eq('id', data.user.id).maybeSingle())
    }
    return { id: data.user.id, email: data.user.email, ...(p || { full_name: 'Traveller', hue: 180 }) }
  },
  async signUp(email, password, full_name) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name } } })
    if (error) throw new Error(error.message)
    if (!data.session) return { needsConfirm: true }
    return { user: await this.me() }
  },
  async signIn(email, password) {
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) {
      if (/not confirmed/i.test(error.message)) { const e = new Error('Please verify your email first'); e.code = 'unconfirmed'; throw e }
      throw new Error(error.message)
    }
    return { user: await this.me() }
  },
  async verifyCode(email, token) {
    const { error } = await sb.auth.verifyOtp({ email, token: token.trim(), type: 'signup' })
    if (error) throw new Error(/expired|invalid/i.test(error.message) ? 'That code is wrong or has expired' : error.message)
    return { user: await this.me() }
  },
  async resendCode(email) {
    const { error } = await sb.auth.resend({ type: 'signup', email })
    if (error) throw new Error(/rate|seconds|limit/i.test(error.message) ? 'Please wait a minute before asking for another code' : error.message)
  },
  async signOut() { await sb.auth.signOut() },
  async updateProfile(patch) {
    must(await sb.from('profiles').update(patch).eq('id', await uid()))
    return this.me()
  },
  async stats() {
    const id = await uid()
    const [a, b] = await Promise.all([
      sb.from('rides').select('id', { count: 'exact', head: true }).eq('driver_id', id).eq('status', 'open'),
      sb.from('ride_requests').select('id', { count: 'exact', head: true }).eq('rider_id', id).eq('status', 'approved'),
    ])
    return { offered: a.count || 0, taken: b.count || 0 }
  },

  async upcoming() {
    return must(
      await sb.from('rides').select(`${RIDE}, ${DRIVER}`)
        .eq('status', 'open').gt('depart_at', new Date().toISOString()).gt('seats_left', 0)
        .order('depart_at').limit(30)
    )
  },
  async search({ from, to, date, seats = 1 }) {
    const rows = must(await sb.rpc('search_rides', {
      p_from_lat: from.lat, p_from_lng: from.lng, p_to_lat: to.lat, p_to_lng: to.lng,
      p_date: date || null, p_seats: seats, p_radius_m: 12000,
    }))
    return rows
  },
  async getRide(id) {
    const ride = must(await sb.from('rides').select(`${RIDE}, ${DRIVER}`).eq('id', id).single())
    const requests = must(
      await sb.from('ride_requests').select(`*, rider:profiles(${PROFILE})`).eq('ride_id', id).order('created_at')
    )
    return { ride, requests }
  },
  async publish(f) {
    return must(await sb.rpc('publish_ride', {
      p_origin_name: f.from.name, p_origin_lat: f.from.lat, p_origin_lng: f.from.lng,
      p_dest_name: f.to.name, p_dest_lat: f.to.lat, p_dest_lng: f.to.lng,
      p_depart_at: f.departAt, p_seats: f.seats, p_price: f.price,
      p_distance_km: f.distanceKm, p_duration_min: f.durationMin,
      p_vehicle: f.vehicle || null, p_notes: f.notes || null,
      p_route_geojson: f.geojson ? JSON.stringify(f.geojson) : null,
    }))
  },
  async cancelRide(id) { must(await sb.from('rides').update({ status: 'cancelled' }).eq('id', id)) },

  async requestSeat(rideId, seats, message) {
    const me = await uid()
    const { data: existing } = await sb.from('ride_requests').select('id,status').eq('ride_id', rideId).eq('rider_id', me).maybeSingle()
    if (existing) {
      must(await sb.from('ride_requests').update({ status: 'pending', seats, message: message || null }).eq('id', existing.id))
    } else {
      must(await sb.from('ride_requests').insert({ ride_id: rideId, rider_id: me, seats, message: message || null }))
    }
  },
  async cancelRequest(id) { must(await sb.from('ride_requests').update({ status: 'cancelled' }).eq('id', id)) },
  async respond(id, approve) {
    must(await sb.from('ride_requests').update({ status: approve ? 'approved' : 'declined' }).eq('id', id))
  },

  async trips() {
    const me = await uid()
    const [riding, driving] = await Promise.all([
      sb.from('ride_requests').select(`*, ride:rides(${RIDE}, ${DRIVER})`).eq('rider_id', me).order('created_at', { ascending: false }),
      sb.from('rides').select(`${RIDE}, requests:ride_requests(id,status,seats,rider_id, rider:profiles(${PROFILE}))`)
        .eq('driver_id', me).order('depart_at', { ascending: false }),
    ])
    return { riding: must(riding), driving: must(driving) }
  },
  onTripsChange(cb) {
    const ch = sb.channel('trips-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, cb)
      .subscribe()
    return () => sb.removeChannel(ch)
  },

  async messages(rideId) {
    return must(await sb.from('messages').select('*').eq('ride_id', rideId).order('created_at').limit(300))
  },
  async send(rideId, body) {
    must(await sb.from('messages').insert({ ride_id: rideId, sender_id: await uid(), body }))
  },
  onMessage(rideId, cb) {
    const ch = sb.channel('chat-' + rideId + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `ride_id=eq.${rideId}` },
        (p) => cb(p.new))
      .subscribe()
    return () => sb.removeChannel(ch)
  },

  async myReviews(rideId) {
    const me = await uid()
    const rows = must(await sb.from('reviews').select('reviewee_id').eq('ride_id', rideId).eq('reviewer_id', me))
    return rows.map((r) => r.reviewee_id)
  },
  async review({ rideId, revieweeId, stars, comment }) {
    must(await sb.from('reviews').insert({
      ride_id: rideId, reviewer_id: await uid(), reviewee_id: revieweeId, stars, comment: comment || null,
    }))
  },
}

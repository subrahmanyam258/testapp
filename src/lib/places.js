// Places: a curated Hyderabad-first list (instant, works offline) + OpenStreetMap Nominatim for anything else.
export const POPULAR = [
  { name: 'Gachibowli, Hyderabad', lat: 17.4401, lng: 78.3489 },
  { name: 'HITEC City, Hyderabad', lat: 17.4435, lng: 78.3772 },
  { name: 'Madhapur, Hyderabad', lat: 17.4486, lng: 78.3908 },
  { name: 'Kondapur, Hyderabad', lat: 17.46, lng: 78.364 },
  { name: 'Miyapur, Hyderabad', lat: 17.4969, lng: 78.3548 },
  { name: 'Kukatpally, Hyderabad', lat: 17.4948, lng: 78.3996 },
  { name: 'Ameerpet, Hyderabad', lat: 17.4375, lng: 78.4483 },
  { name: 'Banjara Hills, Hyderabad', lat: 17.4156, lng: 78.4347 },
  { name: 'Jubilee Hills, Hyderabad', lat: 17.4326, lng: 78.4071 },
  { name: 'Begumpet, Hyderabad', lat: 17.444, lng: 78.4676 },
  { name: 'Secunderabad', lat: 17.4399, lng: 78.4983 },
  { name: 'Charminar, Hyderabad', lat: 17.3616, lng: 78.4747 },
  { name: 'Uppal, Hyderabad', lat: 17.4058, lng: 78.5591 },
  { name: 'LB Nagar, Hyderabad', lat: 17.3457, lng: 78.5522 },
  { name: 'Dilsukhnagar, Hyderabad', lat: 17.3688, lng: 78.5247 },
  { name: 'Shamshabad Airport (RGIA)', lat: 17.2403, lng: 78.4294 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Vijayawada', lat: 16.5062, lng: 80.648 },
  { name: 'Warangal', lat: 17.9689, lng: 79.5941 },
  { name: 'Karimnagar', lat: 18.4386, lng: 79.1288 },
  { name: 'Nizamabad', lat: 18.6725, lng: 78.0941 },
  { name: 'Khammam', lat: 17.2473, lng: 80.1514 },
  { name: 'Kurnool', lat: 15.8281, lng: 78.0373 },
  { name: 'Guntur', lat: 16.3067, lng: 80.4365 },
  { name: 'Tirupati', lat: 13.6288, lng: 79.4192 },
  { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
]

export const POPULAR_ROUTES = [
  ['Hyderabad', 'Bangalore'],
  ['Hyderabad', 'Vijayawada'],
  ['Hyderabad', 'Warangal'],
  ['Gachibowli, Hyderabad', 'Shamshabad Airport (RGIA)'],
  ['HITEC City, Hyderabad', 'Secunderabad'],
].map(([a, b]) => ({ from: POPULAR.find((p) => p.name === a), to: POPULAR.find((p) => p.name === b) }))

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '')

export function localMatches(q) {
  const n = norm(q)
  if (!n) return POPULAR
  return POPULAR.filter((p) => norm(p.name).includes(n)).slice(0, 8)
}

let ctl
export async function searchPlaces(q) {
  const local = localMatches(q)
  if (q.trim().length < 3) return local
  ctl?.abort()
  ctl = new AbortController()
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=in&addressdetails=1' +
      '&viewbox=77.0,19.5,80.5,16.0&q=' + encodeURIComponent(q)
    const r = await fetch(url, { signal: ctl.signal, headers: { 'Accept-Language': 'en' } })
    if (!r.ok) return local
    const rows = await r.json()
    const remote = rows.map((x) => {
      const a = x.address || {}
      const main = x.name || a.suburb || a.neighbourhood || a.city_district || a.village || a.town || a.city || x.display_name.split(',')[0]
      const area = a.suburb || a.city || a.town || a.village || a.county || a.state_district || ''
      const name = area && area !== main ? `${main}, ${area}` : main
      return { name, lat: parseFloat(x.lat), lng: parseFloat(x.lon) }
    })
    const seen = new Set(local.map((l) => norm(l.name)))
    return [...local, ...remote.filter((r2) => !seen.has(norm(r2.name)))]
  } catch {
    return local
  }
}

export const haversineKm = (a, b) => {
  const R = 6371, t = Math.PI / 180
  const dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Route geometry + distance/time from the public OSRM demo server. Falls back to a straight line.
export async function routeInfo(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=simplified&geometries=geojson`
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 7000)
    const r = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    const j = await r.json()
    const rt = j.routes?.[0]
    if (!rt) throw new Error('no route')
    return { distanceKm: Math.round(rt.distance / 100) / 10, durationMin: Math.round(rt.duration / 60), geojson: rt.geometry, approx: false }
  } catch {
    const km = Math.round(haversineKm(from, to) * 1.3 * 10) / 10
    return {
      distanceKm: km,
      durationMin: Math.round((km / 45) * 60),
      geojson: { type: 'LineString', coordinates: [[from.lng, from.lat], [to.lng, to.lat]] },
      approx: true,
    }
  }
}

// Fair cost-sharing suggestion per seat (₹/km), rounded to nearest ₹10 (min ₹20)
export const suggestPrice = (km) => Math.max(20, Math.round((km * 1.9) / 10) * 10)

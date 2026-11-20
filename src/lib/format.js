const pad = (n) => String(n).padStart(2, '0')

export const fmtTime = (iso) => {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export const fmtDay = (iso, long = false) => {
  const d = new Date(iso)
  const now = new Date()
  const tmr = new Date(now.getTime() + 864e5)
  if (sameDay(d, now)) return 'Today'
  if (sameDay(d, tmr)) return 'Tomorrow'
  return d.toLocaleDateString('en-IN', long
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { weekday: 'short', day: 'numeric', month: 'short' })
}
export const fmtDur = (min) => {
  if (!min && min !== 0) return ''
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  return h ? `${h}h ${m ? m + 'm' : ''}`.trim() : `${m}m`
}
export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')
export const initials = (name = '?') =>
  name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() || '').join('') || '?'
export const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'there'
export const hueBg = (hue = 180) => `linear-gradient(135deg, hsl(${hue} 70% 52%), hsl(${(hue + 40) % 360} 65% 40%))`
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const addDays = (n) => new Date(Date.now() + n * 864e5)
export const hasDeparted = (iso) => new Date(iso).getTime() < Date.now()
export const shortPlace = (s = '') => s.split(',')[0]

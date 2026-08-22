export const PRIORITY_COLOR = {
  critical: '#F43F5E',
  high: '#FB923C',
  medium: '#FACC15',
  low: '#4ADE80'
}

export const PRIORITY_BG = {
  critical: 'bg-rose-500/15 text-rose-700 border-rose-300 shadow-sm shadow-rose-500/10',
  high: 'bg-amber-500/15 text-amber-800 border-amber-300 shadow-sm shadow-amber-500/10',
  medium: 'bg-yellow-500/15 text-yellow-800 border-yellow-300 shadow-sm shadow-yellow-500/10',
  low: 'bg-emerald-500/15 text-emerald-800 border-emerald-300 shadow-sm shadow-emerald-500/10'
}

export const STATUS_LABEL = {
  filed: 'Filed',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  closed_unverified: 'Closed (unverified)',
  verified_resolved: 'Verified Resolved',
  reopened: 'Reopened — ghost closure',
  escalated: 'Escalated'
}

export const STATUS_BG = {
  filed: 'bg-slate-200/80 text-slate-700 border-slate-300',
  assigned: 'bg-sky-500/15 text-sky-800 border-sky-300',
  in_progress: 'bg-cyan-500/15 text-cyan-800 border-cyan-300',
  closed_unverified: 'bg-amber-500/15 text-amber-800 border-amber-300',
  verified_resolved: 'bg-emerald-500/15 text-emerald-800 border-emerald-300',
  reopened: 'bg-rose-500/15 text-rose-800 border-rose-300',
  escalated: 'bg-purple-500/15 text-purple-800 border-purple-300'
}

export function timeAgo(ts) {
  // Accepts a Date, an epoch-ms number, or an ISO string (what the API
  // actually sends back). A bare subtraction against a string is NaN, which
  // silently rendered every timestamp in the app as "NaNs ago" — normalise
  // through Date() so all three input shapes work.
  const ms = ts instanceof Date ? ts.getTime() : new Date(ts).getTime()
  if (Number.isNaN(ms)) return ''
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function shortHash(h, n = 6) {
  if (!h) return '—'
  return `${h.slice(0, n + 2)}…${h.slice(-4)}`
}

export const inr = (n) =>
  '₹' + (n >= 10000000 ? (n / 10000000).toFixed(2) + ' Cr'
       : n >= 100000 ? (n / 100000).toFixed(2) + ' L'
       : n.toLocaleString('en-IN'))

export const cx = (...a) => a.filter(Boolean).join(' ')

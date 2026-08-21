// ---------------------------------------------------------------------------
// Swappable data layer.
//
//   VITE_DATA_MODE=mock  -> everything runs offline from src/lib/mockData.js
//   VITE_DATA_MODE=live  -> same function signatures hit your Express backend
//
// Your backend only has to match these routes. Nothing in the UI changes.
// ---------------------------------------------------------------------------
import * as M from './mockData'

const MODE = import.meta.env.VITE_DATA_MODE || 'mock'
const BASE = import.meta.env.VITE_API_BASE || '/api'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function live(path, opts) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

/* GET /api/grievances?ward=&category=&priority=&status= */
export async function getGrievances(filters = {}) {
  if (MODE === 'live') {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v && v !== 'all'))
    return live(`/grievances?${q}`)
  }
  await wait(160)
  return M.GRIEVANCES.filter((g) =>
    (!filters.ward || filters.ward === 'all' || g.wardId === filters.ward) &&
    (!filters.category || filters.category === 'all' || g.category === filters.category) &&
    (!filters.priority || filters.priority === 'all' || g.priority === filters.priority) &&
    (!filters.status || filters.status === 'all' || g.status === filters.status)
  )
}

/* GET /api/wards/silence  — the equity model */
export async function getSilenceModel() {
  if (MODE === 'live') return live('/wards/silence')
  await wait(140)
  return M.silenceModel()
}

/* GET /api/officers */
export async function getOfficers() {
  if (MODE === 'live') return live('/officers')
  await wait(120)
  return M.OFFICERS
}

/* GET /api/assets */
export async function getAssets() {
  if (MODE === 'live') return live('/assets')
  await wait(120)
  return M.ASSETS
}

/* GET /api/chain/log */
export async function getChainLog() {
  if (MODE === 'live') return live('/chain/log')
  await wait(120)
  return M.CHAIN_LOG
}

/* GET /api/stats */
export async function getStats() {
  if (MODE === 'live') return live('/stats')
  await wait(100)
  const g = M.GRIEVANCES
  const open = g.filter((x) => !['verified_resolved'].includes(x.status))
  const silence = M.silenceModel()
  return {
    total: g.length,
    open: open.length,
    critical: g.filter((x) => x.priority === 'critical').length,
    escalated: g.filter((x) => x.status === 'escalated').length,
    ghostCaught: g.filter((x) => x.status === 'reopened').length,
    blindSpots: silence.filter((w) => w.status === 'blind_spot').length,
    avgResolutionDays: +(M.OFFICERS.reduce((a, o) => a + o.avgResolutionDays, 0) / M.OFFICERS.length).toFixed(1),
    trend: M.TREND,
    categorySplit: M.CATEGORY_SPLIT
  }
}

/* POST /api/grievances  — the full intake pipeline.
   onStage() lets the UI narrate each backend step as it completes. */
export async function submitGrievance({ text, channel = 'web', onStage = () => {} }) {
  if (MODE === 'live') {
    return live('/grievances', { method: 'POST', body: JSON.stringify({ text, channel }) })
  }

  const stages = [
    ['transcribe', 'Transcribing code-mixed audio (Whisper / IndicWhisper)', 620],
    ['classify',   'Classifying intent + department (LLM, structured output)', 540],
    ['geo',        'Resolving landmark to coordinates (Nominatim)', 420],
    ['asset',      'Binding to civic asset in the city graph', 480],
    ['cluster',    'Vector + geo dedup against open incidents (Atlas $vectorSearch)', 560],
    ['harm',       'Computing harm-weighted priority (OSM proximity, time, velocity)', 460],
    ['route',      'Routing to accountable officer + SLA contract', 400],
    ['chain',      'Anchoring hash on Polygon (GrievanceRegistry.sol)', 700]
  ]
  for (const [key, label, ms] of stages) {
    onStage({ key, label, state: 'running' })
    await wait(ms)
    onStage({ key, label, state: 'done' })
  }

  const t = (text || '').toLowerCase()
  const guess =
    /kachra|garbage|dustbin|safai|waste/.test(t) ? 'sanitation' :
    /paani|water|pipeline|tanker|nal/.test(t)    ? 'water' :
    /light|andhera|bijli ka pole|street/.test(t) ? 'streetlight' :
    /gadda|pothole|sadak|road|gaddha/.test(t)    ? 'road' :
    /naali|drain|sewage|manhole|gutter/.test(t)  ? 'drainage' :
    /bijli|transformer|current|taar|power/.test(t) ? 'electricity' :
    /kutta|kutte|dog|gaay|cow|stray/.test(t)     ? 'stray' :
    /dengue|mosquito|toilet|health|beemar/.test(t) ? 'health' :
    /signal|traffic|jam|parking/.test(t)         ? 'traffic' : 'encroach'

  const cat = M.catOf(guess)
  const nearSchool = /school|bacch|bachch|college/.test(t)
  const night = /raat|night|andher/.test(t)
  const cluster = 3 + Math.floor(Math.random() * 40)
  const score = Math.max(12, Math.min(99, Math.round(
    cat.baseHarm * 42 + (nearSchool ? 17 : 0) + (night ? 11 : 0) + Math.min(18, cluster * 0.6) + 8
  )))
  const ward = M.WARDS[Math.floor(Math.random() * M.WARDS.length)]
  const officer = M.OFFICERS.find((o) => o.dept === cat.dept) || M.OFFICERS[0]
  const slaDays = score >= 78 ? 2 : score >= 58 ? 5 : score >= 36 ? 10 : 21

  return {
    id: `GRV-${100000 + M.GRIEVANCES.length + Math.floor(Math.random() * 900)}`,
    idHash: '0x' + Math.random().toString(16).slice(2, 14),
    text,
    channel,
    language: 'hi-en (code-mixed)',
    category: cat.key,
    categoryLabel: cat.label,
    dept: cat.dept,
    confidence: +(0.9 + Math.random() * 0.09).toFixed(3),
    wardId: ward.id,
    wardName: ward.name,
    lng: ward.center[0],
    lat: ward.center[1],
    poiKind: nearSchool ? 'school' : null,
    poiDistanceM: nearSchool ? 40 + Math.floor(Math.random() * 200) : null,
    assetId: M.ASSETS[Math.floor(Math.random() * M.ASSETS.length)].id,
    clusterSize: cluster,
    duplicateOf: cluster > 12 ? `INC-${2000 + Math.floor(Math.random() * 400)}` : null,
    harmScore: score,
    priority: M.priorityOf(score),
    status: 'assigned',
    officerId: officer.id,
    officerName: officer.name,
    slaDays,
    createdAt: Date.now(),
    slaDeadline: Date.now() + slaDays * 86400000,
    txHash: '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
    block: 9_484_771 + Math.floor(Math.random() * 400)
  }
}

/* POST /api/grievances/:id/close  — officer claims resolution.
   The system does NOT trust it; it triggers citizen verification. */
export async function closeGrievance(id) {
  if (MODE === 'live') return live(`/grievances/${id}/close`, { method: 'POST' })
  await wait(700)
  return {
    id,
    status: 'closed_unverified',
    proofCid: 'bafybei' + Math.random().toString(36).slice(2, 24),
    txHash: '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
  }
}

/* POST /api/grievances/:id/verify  — citizen callback result. */
export async function verifyGrievance(id, accepted) {
  if (MODE === 'live') {
    return live(`/grievances/${id}/verify`, { method: 'POST', body: JSON.stringify({ accepted }) })
  }
  await wait(900)
  return accepted
    ? { id, status: 'verified_resolved', txHash: '0x' + Math.random().toString(16).slice(2, 66) }
    : {
        id,
        status: 'reopened',
        escalationLevel: 2,
        imageReused: Math.random() < 0.5,
        integrityDelta: -(4 + Math.floor(Math.random() * 8)),
        txHash: '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
      }
}

export { CITY, WARDS, CATEGORIES, catOf, priorityOf } from './mockData'

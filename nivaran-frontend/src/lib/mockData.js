// ---------------------------------------------------------------------------
// Nivaran AI · synthetic corpus (Indore Municipal Corporation)
// Deterministic seeded generation so every demo run looks identical.
// Replace this whole file with real API responses when the backend is live.
// ---------------------------------------------------------------------------

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260822)
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const between = (a, b) => a + rnd() * (b - a)
const intBetween = (a, b) => Math.floor(between(a, b + 1))

export const CITY = { name: 'Indore', center: [75.8577, 22.7196], zoom: 11.6 }

// --- Wards -----------------------------------------------------------------
// digitalAccess drives the Silence Detector: low access => under-reporting.
export const WARDS = [
  { id: 'W-12', name: 'Vijay Nagar',   center: [75.8935, 22.7533], population: 78000, infraAge: 12, roadKm: 64, digitalAccess: 0.92 },
  { id: 'W-08', name: 'Palasia',       center: [75.8830, 22.7245], population: 52000, infraAge: 18, roadKm: 41, digitalAccess: 0.90 },
  { id: 'W-21', name: 'Scheme 78',     center: [75.8880, 22.7620], population: 45000, infraAge: 9,  roadKm: 38, digitalAccess: 0.88 },
  { id: 'W-09', name: 'New Palasia',   center: [75.8790, 22.7290], population: 39000, infraAge: 21, roadKm: 30, digitalAccess: 0.86 },
  { id: 'W-03', name: 'Rajwada',       center: [75.8570, 22.7180], population: 61000, infraAge: 46, roadKm: 33, digitalAccess: 0.61 },
  { id: 'W-02', name: 'Malharganj',    center: [75.8460, 22.7190], population: 57000, infraAge: 52, roadKm: 29, digitalAccess: 0.54 },
  { id: 'W-01', name: 'Juni Indore',   center: [75.8540, 22.7080], population: 49000, infraAge: 49, roadKm: 26, digitalAccess: 0.52 },
  { id: 'W-17', name: 'Khajrana',      center: [75.9010, 22.7360], population: 86000, infraAge: 38, roadKm: 44, digitalAccess: 0.31 },
  { id: 'W-14', name: 'Banganga',      center: [75.8760, 22.7590], population: 74000, infraAge: 41, roadKm: 39, digitalAccess: 0.28 },
  { id: 'W-26', name: 'Musakhedi',     center: [75.8890, 22.6960], population: 68000, infraAge: 35, roadKm: 35, digitalAccess: 0.33 },
  { id: 'W-05', name: 'Chandan Nagar', center: [75.8280, 22.7350], population: 71000, infraAge: 43, roadKm: 37, digitalAccess: 0.26 },
  { id: 'W-30', name: 'Sudama Nagar',  center: [75.8280, 22.6960], population: 58000, infraAge: 27, roadKm: 42, digitalAccess: 0.64 },
  { id: 'W-24', name: 'Bhawarkuan',    center: [75.8660, 22.6970], population: 47000, infraAge: 24, roadKm: 31, digitalAccess: 0.75 },
  { id: 'W-33', name: 'Rau',           center: [75.8100, 22.6480], population: 54000, infraAge: 30, roadKm: 48, digitalAccess: 0.47 },
  { id: 'W-28', name: 'Annapurna',     center: [75.8390, 22.6880], population: 50000, infraAge: 29, roadKm: 34, digitalAccess: 0.68 },
  { id: 'W-06', name: 'Mhow Naka',     center: [75.8410, 22.7040], population: 43000, infraAge: 36, roadKm: 25, digitalAccess: 0.58 }
]

// --- Taxonomy --------------------------------------------------------------
export const CATEGORIES = [
  { key: 'sanitation',  label: 'Sanitation & Waste', dept: 'Health & Sanitation',  baseHarm: 0.45 },
  { key: 'water',       label: 'Water Supply',       dept: 'Water Works',          baseHarm: 0.70 },
  { key: 'streetlight', label: 'Street Lighting',    dept: 'Electrical',           baseHarm: 0.55 },
  { key: 'road',        label: 'Road & Potholes',    dept: 'Public Works (PWD)',   baseHarm: 0.72 },
  { key: 'drainage',    label: 'Drainage & Sewage',  dept: 'Sewerage',             baseHarm: 0.80 },
  { key: 'electricity', label: 'Power Supply',       dept: 'Electrical',           baseHarm: 0.60 },
  { key: 'stray',       label: 'Stray Animals',      dept: 'Veterinary',           baseHarm: 0.50 },
  { key: 'encroach',    label: 'Encroachment',       dept: 'Town Planning',        baseHarm: 0.35 },
  { key: 'health',      label: 'Public Health',      dept: 'Health & Sanitation',  baseHarm: 0.85 },
  { key: 'traffic',     label: 'Traffic & Signals',  dept: 'Traffic Cell',         baseHarm: 0.65 }
]
export const catOf = (k) => CATEGORIES.find((c) => c.key === k) || CATEGORIES[0]

export const CHANNELS = ['voice', 'whatsapp', 'web', 'ivr', 'walk-in']
export const STATUSES = ['filed', 'assigned', 'in_progress', 'closed_unverified', 'verified_resolved', 'reopened', 'escalated']

// Hinglish complaint templates — this is what real intake actually looks like.
const TEMPLATES = {
  sanitation: [
    'Bhaiya yahan pe kachra 5 din se nahi uthaya gaya, poora road pe faila hua hai',
    'Garbage dump ke paas bahut smell aa rahi hai, bacche school jaate waqt beemar ho rahe hain',
    'Dustbin overflow ho gaya hai near market, please koi aake utha lo'
  ],
  water: [
    'Paani 4 din se nahi aaya hai humare area me, tanker bhi nahi bheja',
    'Water supply me gandagi aa rahi hai, brown colour ka paani nikal raha hai tap se',
    'Pipeline leak ho rahi hai main road pe, saara paani waste ja raha hai'
  ],
  streetlight: [
    'Street light band hai pichhle 2 hafte se, raat me ladkiyon ko dar lagta hai nikalne me',
    'Poori gali andhere me hai, koi bhi light kaam nahi kar rahi',
    'Light flicker kar rahi hai pole number ke paas, spark bhi dikha kal raat'
  ],
  road: [
    'Bahut bada gadda hai road pe, kal ek scooty wala gir gaya tha yahan',
    'Sadak poori tut chuki hai, barish me to chalna hi mushkil ho jaata hai',
    'Speed breaker toot gaya hai aur uske paas pothole ban gaya hai'
  ],
  drainage: [
    'Naali ka paani road pe aa raha hai, mosquito bahut ho gaye hain',
    'Manhole ka dhakkan gayab hai school ke saamne, bahut khatarnaak hai bacchon ke liye',
    'Sewage overflow ho raha hai, poore mohalle me badbu hai'
  ],
  electricity: [
    'Transformer se aawaz aa rahi hai aur spark ho raha hai, kabhi bhi blast ho sakta hai',
    'Bijli din me 6-7 baar jaati hai, inverter bhi jawab de gaya',
    'Bijli ka taar latak raha hai neeche tak, koi touch ho gaya to jaan chali jayegi'
  ],
  stray: [
    'Awara kutte bahut ho gaye hain, kal ek bacche ko kaat liya',
    'Gaay road ke beech me baithi rehti hai, accident ho sakta hai',
    'Stray dogs raat bhar bhonkte hain aur log dar ke bahar nahi nikalte'
  ],
  encroach: [
    'Footpath pe thelewalon ne kabza kar liya hai, pedestrian ko road pe chalna padta hai',
    'Shop wale ne apna saaman poora road tak faila diya hai',
    'Illegal construction ho raha hai public land pe'
  ],
  health: [
    'Dengue ke case badh rahe hain area me, fogging nahi ho rahi',
    'Paani jama hai plot me, mosquito breeding ho rahi hai',
    'Public toilet ki halat bahut kharab hai, koi safai nahi hoti'
  ],
  traffic: [
    'Signal kaam nahi kar raha hai chauraha pe, traffic jam lag jaata hai roz',
    'Zebra crossing ka paint mit gaya hai school ke saamne',
    'No parking me gaadiyan khadi rehti hain, jam ho jaata hai'
  ]
}

const LANDMARKS = ['ke paas', 'ke saamne', 'ke peeche', 'wale chauraha pe', 'main road pe', 'gali number 4 me']
const POI_KINDS = ['school', 'hospital', 'bus_stop', 'market', 'temple']

// --- Officers --------------------------------------------------------------
const OFFICER_NAMES = [
  'R. K. Sharma', 'Anita Deshmukh', 'S. P. Verma', 'Farhan Qureshi', 'Meena Chouhan',
  'D. S. Rathore', 'Priya Nair', 'Vikram Solanki', 'N. K. Jain', 'Sunita Yadav',
  'Arjun Bhargava', 'Rekha Pawar'
]

export const OFFICERS = OFFICER_NAMES.map((name, i) => {
  const ward = WARDS[i % WARDS.length]
  const cat = CATEGORIES[i % CATEGORIES.length]
  const ghostRate = i % 4 === 0 ? between(0.22, 0.41) : between(0.01, 0.11)
  const integrity = Math.round(100 - ghostRate * 130 - between(0, 9))
  return {
    id: `OFF-${String(1001 + i)}`,
    name,
    dept: cat.dept,
    wardId: ward.id,
    wardName: ward.name,
    assigned: intBetween(14, 58),
    resolvedOnTime: 0,
    avgResolutionDays: +between(2.4, 19.5).toFixed(1),
    ghostClosureRate: +ghostRate.toFixed(3),
    integrityScore: Math.max(28, Math.min(98, integrity)),
    reopenedCount: Math.round(ghostRate * intBetween(20, 46)),
    walletAddress: '0x' + Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(rnd() * 16)]).join('')
  }
}).map((o) => ({ ...o, resolvedOnTime: Math.round(o.assigned * between(0.45, 0.93)) }))

// --- Civic assets (the graph that makes repeat-failure visible) -------------
const ASSET_TYPES = [
  { type: 'transformer', prefix: 'TRF', label: 'Distribution Transformer', repairCost: 18000, replaceCost: 240000 },
  { type: 'pole',        prefix: 'PLE', label: 'Street Light Pole',        repairCost: 2600,  replaceCost: 21000 },
  { type: 'road_seg',    prefix: 'RSG', label: 'Road Segment',             repairCost: 42000, replaceCost: 610000 },
  { type: 'pipeline',    prefix: 'PIP', label: 'Water Pipeline Segment',   repairCost: 24000, replaceCost: 380000 },
  { type: 'manhole',     prefix: 'MNH', label: 'Manhole / Drain Chamber',  repairCost: 5200,  replaceCost: 46000 },
  { type: 'dump_point',  prefix: 'DMP', label: 'Waste Collection Point',   repairCost: 3100,  replaceCost: 28000 }
]

export const ASSETS = Array.from({ length: 46 }, (_, i) => {
  const t = ASSET_TYPES[i % ASSET_TYPES.length]
  const ward = WARDS[intBetween(0, WARDS.length - 1)]
  const complaints = intBetween(1, 19)
  const repairs = Math.max(1, Math.round(complaints * between(0.35, 0.8)))
  const spent = repairs * t.repairCost
  const ratio = spent / t.replaceCost
  return {
    id: `${t.prefix}-${String(4000 + i * 7)}`,
    type: t.type,
    typeLabel: t.label,
    wardId: ward.id,
    wardName: ward.name,
    lng: ward.center[0] + between(-0.012, 0.012),
    lat: ward.center[1] + between(-0.010, 0.010),
    installedYear: intBetween(1996, 2021),
    complaints,
    repairs,
    repairSpend: spent,
    replaceCost: t.replaceCost,
    spendRatio: +ratio.toFixed(2),
    recommendation: ratio > 0.75 ? 'REPLACE' : ratio > 0.4 ? 'AUDIT' : 'MONITOR',
    failureRisk: +Math.min(0.97, complaints / 20 + between(0, 0.22)).toFixed(2)
  }
}).sort((a, b) => b.spendRatio - a.spendRatio)

// --- Grievances ------------------------------------------------------------
function harmScore({ cat, poiKind, hour, velocity, recurrence }) {
  const c = catOf(cat)
  let s = c.baseHarm * 42
  if (poiKind === 'school') s += 17
  else if (poiKind === 'hospital') s += 14
  else if (poiKind === 'bus_stop') s += 7
  if (hour >= 19 || hour <= 5) s += 11           // night amplifies physical risk
  s += Math.min(18, velocity * 1.6)              // many people reporting the same thing
  s += Math.min(14, recurrence * 2.4)            // asset keeps failing
  return Math.max(1, Math.min(100, Math.round(s)))
}

export const priorityOf = (score) =>
  score >= 78 ? 'critical' : score >= 58 ? 'high' : score >= 36 ? 'medium' : 'low'

const NOW = new Date('2026-08-22T09:30:00+05:30').getTime()
const DAY = 86400000

function makeGrievance(i) {
  const ward = (() => {
    // Reporting volume is biased by digital access — this IS the Silence Detector story.
    const roll = rnd()
    const pool = WARDS.flatMap((w) => Array(Math.max(1, Math.round(w.digitalAccess * 10))).fill(w))
    return pool[Math.floor(roll * pool.length)]
  })()
  const cat = pick(CATEGORIES)
  const text = pick(TEMPLATES[cat.key])
  const poiKind = rnd() < 0.42 ? pick(POI_KINDS) : null
  const ageDays = between(0, 46)
  const created = NOW - ageDays * DAY
  const hour = new Date(created).getHours()
  const velocity = intBetween(1, 12)
  const asset = rnd() < 0.55 ? ASSETS[intBetween(0, ASSETS.length - 1)] : null
  const recurrence = asset ? Math.min(8, asset.complaints) : intBetween(0, 3)
  const score = harmScore({ cat: cat.key, poiKind, hour, velocity, recurrence })
  const slaDays = score >= 78 ? 2 : score >= 58 ? 5 : score >= 36 ? 10 : 21
  const slaDeadline = created + slaDays * DAY
  const officer = OFFICERS.filter((o) => o.dept === cat.dept)[0] || pick(OFFICERS)

  let status = 'filed'
  const r = rnd()
  if (ageDays > 1) status = 'assigned'
  if (ageDays > 3 && r < 0.82) status = 'in_progress'
  if (ageDays > 6 && r < 0.62) status = 'closed_unverified'
  if (ageDays > 8 && r < 0.44) status = 'verified_resolved'
  if (ageDays > 8 && r >= 0.44 && r < 0.56) status = 'reopened'
  if (NOW > slaDeadline && !['verified_resolved'].includes(status) && rnd() < 0.55) status = 'escalated'

  const breachRisk =
    status === 'verified_resolved' ? 0
      : +Math.min(0.98, (NOW - created) / (slaDeadline - created) * between(0.55, 0.95) + (officer.ghostClosureRate)).toFixed(2)

  return {
    id: `GRV-${String(100000 + i)}`,
    idHash: '0x' + Array.from({ length: 12 }, () => '0123456789abcdef'[Math.floor(rnd() * 16)]).join(''),
    text,
    translated: null,
    channel: pick(CHANNELS),
    language: rnd() < 0.72 ? 'hi-en (code-mixed)' : 'hi',
    category: cat.key,
    categoryLabel: cat.label,
    dept: cat.dept,
    confidence: +between(0.86, 0.995).toFixed(3),
    wardId: ward.id,
    wardName: ward.name,
    lng: ward.center[0] + between(-0.016, 0.016),
    lat: ward.center[1] + between(-0.013, 0.013),
    landmark: `${pick(['Sector B', 'Gali 4', 'Main Chauraha', 'Bus Stand', 'Sabzi Mandi', 'School Road'])} ${pick(LANDMARKS)}`,
    poiKind,
    poiDistanceM: poiKind ? intBetween(30, 340) : null,
    assetId: asset ? asset.id : null,
    assetLabel: asset ? asset.typeLabel : null,
    clusterSize: velocity,
    recurrence,
    harmScore: score,
    priority: priorityOf(score),
    status,
    officerId: officer.id,
    officerName: officer.name,
    createdAt: created,
    slaDeadline,
    slaDays,
    breachRisk,
    proofCid: ['closed_unverified', 'verified_resolved', 'reopened'].includes(status)
      ? 'bafybei' + Array.from({ length: 24 }, () => 'abcdefghijklmnopqrstuvwxyz234567'[Math.floor(rnd() * 32)]).join('')
      : null,
    citizenVerified: status === 'verified_resolved' ? true : status === 'reopened' ? false : null,
    imageReused: status === 'reopened' && rnd() < 0.5
  }
}

export const GRIEVANCES = Array.from({ length: 240 }, (_, i) => makeGrievance(i))
  .sort((a, b) => b.createdAt - a.createdAt)

// --- Silence Detector model ------------------------------------------------
// Expected volume from physical reality; actual volume from who can/does report.
export function silenceModel() {
  return WARDS.map((w) => {
    const actual = GRIEVANCES.filter((g) => g.wardId === w.id).length
    // Expected = population pressure x infrastructure decay x road exposure
    const raw = (w.population / 10000) * 1.35 + (w.infraAge / 10) * 2.1 + (w.roadKm / 10) * 1.15
    const expected = Math.round(raw * 1.42)
    const gap = expected === 0 ? 0 : (expected - actual) / expected
    return {
      ...w,
      actual,
      expected,
      gap: +gap.toFixed(3),
      gapPct: Math.round(gap * 100),
      status: gap > 0.45 ? 'blind_spot' : gap > 0.18 ? 'under_reported' : gap < -0.2 ? 'over_reported' : 'balanced'
    }
  }).sort((a, b) => b.gap - a.gap)
}

// --- On-chain audit trail --------------------------------------------------
const CHAIN_EVENTS = ['GrievanceRegistered', 'StatusChanged', 'ProofAnchored', 'CitizenRejected', 'Reopened', 'Escalated', 'MerkleRootAnchored']
const hex = (n) => '0x' + Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(rnd() * 16)]).join('')

export const CHAIN_LOG = Array.from({ length: 60 }, (_, i) => {
  const g = GRIEVANCES[intBetween(0, 80)]
  const ev = pick(CHAIN_EVENTS)
  return {
    id: i,
    event: ev,
    grievanceId: ev === 'MerkleRootAnchored' ? null : g.id,
    grievanceHash: ev === 'MerkleRootAnchored' ? null : g.idHash,
    merkleRoot: ev === 'MerkleRootAnchored' ? hex(64) : null,
    leafCount: ev === 'MerkleRootAnchored' ? intBetween(180, 940) : null,
    txHash: hex(64),
    block: 9_482_100 + i * intBetween(3, 40),
    gasUsed: intBetween(31000, 96000),
    caller: ev === 'Escalated' ? 'PUBLIC (permissionless)' : pick(OFFICERS).walletAddress,
    ts: NOW - i * intBetween(600000, 5400000)
  }
}).sort((a, b) => b.ts - a.ts)

// --- Rolling KPI series ----------------------------------------------------
export const TREND = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(NOW - (13 - i) * DAY)
  const filed = intBetween(38, 96)
  return {
    day: `${d.getDate()}/${d.getMonth() + 1}`,
    filed,
    resolved: Math.round(filed * between(0.42, 0.85)),
    escalated: intBetween(2, 17),
    ghostCaught: intBetween(0, 9)
  }
})

export const CATEGORY_SPLIT = CATEGORIES.map((c) => ({
  name: c.label,
  key: c.key,
  value: GRIEVANCES.filter((g) => g.category === c.key).length
})).sort((a, b) => b.value - a.value)

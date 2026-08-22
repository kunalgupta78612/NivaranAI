// ---------------------------------------------------------------------------
// One shared store for all three dashboards.
//
// This is what makes the demo work: a citizen action mutates the SAME state
// the officer board and the admin leaderboard read from. Switch roles from the
// navbar mid-demo and the consequence is already there.
// ---------------------------------------------------------------------------
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { getGrievances, getOfficers, getChainLog, getAssets } from '../lib/api'
import { silenceModel } from '../lib/mockData'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

const hex = (n) => '0x' + Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')
const cid = () => 'bafybei' + Array.from({ length: 24 }, () => 'abcdefghijklmnopqrstuvwxyz234567'[Math.floor(Math.random() * 32)]).join('')

const DEFAULT_SETTINGS = {
  language: 'hinglish',
  ttsEnabled: true,
  contactChannel: 'whatsapp',
  callVerification: true,
  anonymousFiling: false,
  wardOnlyLocation: true,
  aasaanMode: false
}

export function StoreProvider({ children }) {
  const [grievances, setGrievances] = useState([])
  const [officers, setOfficers] = useState([])
  const [chain, setChain] = useState([])
  const [assets, setAssets] = useState([])
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState(null)

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('nivaran_citizen_settings')
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
    } catch {
      return DEFAULT_SETTINGS
    }
  })

  const updateCitizenSettings = useCallback((newSettings) => {
    setSettings((prev) => {
      const updated = typeof newSettings === 'function' ? newSettings(prev) : { ...prev, ...newSettings }
      try {
        localStorage.setItem('nivaran_citizen_settings', JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save settings:', e)
      }
      return updated
    })
  }, [])

  useEffect(() => {
    Promise.all([getGrievances(), getOfficers(), getChainLog(), getAssets()])
      .then(([g, o, c, a]) => {
        // Seed a few tickets as "mine" so the citizen's My Grievances list is
        // never empty on stage — including one already awaiting verification,
        // so the Re-open trap is visible the moment you open the portal.
        const rawList = Array.isArray(g) ? g : (g?.grievances || g?.data || [])
        const seeded = rawList.map((x, i) => {
          if (i === 0) return { ...x, mine: true, status: 'closed_unverified', proofCid: cid() }
          if (i === 1) return { ...x, mine: true, status: 'in_progress' }
          if (i === 2) return { ...x, mine: true, status: 'verified_resolved' }
          return x
        })
        setGrievances(seeded)
        setOfficers(Array.isArray(o) ? o : (o?.data || []))
        setChain(Array.isArray(c) ? c : (c?.data || []))
        setAssets(Array.isArray(a) ? a : (a?.data || []))
        setReady(true)
      })
      .catch((err) => {
        console.error('Failed to initialize store:', err)
        setReady(true)
      })
  }, [])

  const emit = useCallback((event, g, extra = {}) => {
    setChain((prev) => [{
      id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      event,
      grievanceId: g?.id ?? null,
      grievanceHash: g?.idHash ?? null,
      merkleRoot: null,
      leafCount: null,
      txHash: hex(64),
      block: 9_485_000 + Math.floor(Math.random() * 900),
      gasUsed: 31000 + Math.floor(Math.random() * 60000),
      caller: extra.caller || hex(40),
      ts: Date.now(),
      live: true,
      ...extra
    }, ...prev])
  }, [])

  const patch = useCallback((id, changes) => {
    setGrievances((prev) => prev.map((g) => (g.id === id ? { ...g, ...changes } : g)))
  }, [])

  const notify = useCallback((msg, tone = 'info') => {
    setToast({ msg, tone, at: Date.now() })
    setTimeout(() => setToast(null), 4200)
  }, [])

  /* ---------------- CITIZEN ---------------- */

  const fileGrievance = useCallback((ticket) => {
    const g = { ...ticket, mine: true, breachRisk: 0.1, recurrence: 0 }
    setGrievances((prev) => [g, ...prev])
    emit('GrievanceRegistered', g)
    notify(`${g.id} filed and routed to ${g.officerName}`, 'ok')
    return g
  }, [emit, notify])

  // The trap trigger. Citizen says the "fix" did not happen.
  const citizenReopen = useCallback((id) => {
    const g = grievances.find((x) => x.id === id)
    if (!g) return
    const reused = Math.random() < 0.5
    const delta = -(4 + Math.floor(Math.random() * 8))

    patch(id, {
      status: 'reopened',
      citizenVerified: false,
      imageReused: reused,
      escalationLevel: 2,
      priority: 'critical',
      harmScore: Math.min(99, (g.harmScore || 60) + 22),
      breachRisk: 0.95
    })
    setOfficers((prev) => prev.map((o) => o.id === g.officerId
      ? { ...o, integrityScore: Math.max(12, o.integrityScore + delta), reopenedCount: o.reopenedCount + 1 }
      : o))

    emit('CitizenRejected', g)
    emit('Reopened', g, { escalationLevel: 2 })
    emit('Escalated', g, { caller: 'PUBLIC (permissionless)', escalationLevel: 2 })
    notify(`${id} reopened Â· escalated to Zonal Officer Â· integrity ${delta}`, 'bad')
    return { reused, delta }
  }, [grievances, patch, emit, notify])

  const citizenConfirm = useCallback((id) => {
    const g = grievances.find((x) => x.id === id)
    if (!g) return
    patch(id, { status: 'verified_resolved', citizenVerified: true, breachRisk: 0 })
    emit('VerifiedResolved', g)
    notify(`${id} confirmed fixed by citizen`, 'ok')
  }, [grievances, patch, emit, notify])

  /* ---------------- OFFICER ---------------- */

  const startWork = useCallback((id) => {
    const g = grievances.find((x) => x.id === id)
    patch(id, { status: 'in_progress' })
    emit('StatusChanged', g, { to: 'in_progress' })
  }, [grievances, patch, emit])

  // Officer claims the work is done. The system records it but does NOT
  // trust it â€” status is closed_unverified until the citizen answers.
  const officerResolve = useCallback((id, proofDataUrl) => {
    const g = grievances.find((x) => x.id === id)
    const proof = cid()
    patch(id, { status: 'closed_unverified', proofCid: proof, proofImage: proofDataUrl || null, citizenVerified: null })
    emit('ProofAnchored', g, { proofCid: proof })
    notify(`${id} closed â€” citizen verification dispatched`, 'warn')
    return proof
  }, [grievances, patch, emit, notify])

  /* ---------------- DERIVED ---------------- */

  const stats = useMemo(() => {
    const open = grievances.filter((g) => g.status !== 'verified_resolved')
    const silence = silenceModel()
    return {
      total: grievances.length,
      open: open.length,
      critical: grievances.filter((g) => g.priority === 'critical').length,
      escalated: grievances.filter((g) => g.status === 'escalated').length,
      ghostCaught: grievances.filter((g) => g.status === 'reopened').length,
      blindSpots: silence.filter((w) => w.status === 'blind_spot').length,
      avgIntegrity: officers.length
        ? Math.round(officers.reduce((a, o) => a + o.integrityScore, 0) / officers.length) : 0,
      flagged: officers.filter((o) => o.ghostClosureRate > 0.2).length
    }
  }, [grievances, officers])

  const mine = useMemo(() => grievances.filter((g) => g.mine), [grievances])

  const value = {
    ready, grievances, officers, chain, assets, stats, mine, toast, settings, updateCitizenSettings,
    fileGrievance, citizenReopen, citizenConfirm, startWork, officerResolve, notify
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}


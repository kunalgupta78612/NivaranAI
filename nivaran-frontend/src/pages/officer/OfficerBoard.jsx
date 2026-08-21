import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, AlertTriangle, Camera, X, Loader2, Check, PlayCircle, MapPin,
  Layers, ListTodo, Hammer, PackageCheck, RotateCcw, ShieldAlert, Link2, Zap
} from 'lucide-react'
import { useStore } from '../../store/AppStore'
import { CATEGORIES } from '../../lib/mockData'
import { PriorityBadge, StatTile, Select, Empty } from '../../components/ui'
import { cx } from '../../lib/utils'

const COLUMNS = [
  { key: 'todo', label: 'To-Do', icon: ListTodo, gradient: 'from-slate-400 to-slate-500',
    match: (g) => ['filed', 'assigned', 'reopened', 'escalated'].includes(g.status) },
  { key: 'doing', label: 'In Progress', icon: Hammer, gradient: 'from-indigo-500 to-violet-600',
    match: (g) => g.status === 'in_progress' },
  { key: 'done', label: 'Done & Proofed', icon: PackageCheck, gradient: 'from-emerald-500 to-teal-600',
    match: (g) => ['closed_unverified', 'verified_resolved'].includes(g.status) }
]

function sla(g) {
  const ms = (g.slaDeadline || 0) - Date.now()
  if (ms <= 0) return { text: 'SLA BREACHED', breached: true, urgent: true }
  const h = ms / 3600000
  if (h < 24) return { text: `Breaches in ${Math.max(1, Math.round(h))}h`, urgent: true }
  return { text: `${Math.round(h / 24)}d left`, urgent: false }
}

export default function OfficerBoard() {
  const { grievances, startWork, officerResolve } = useStore()
  const [dept, setDept] = useState('all')
  const [modal, setModal] = useState(null)
  const [proof, setProof] = useState(null)
  const [saving, setSaving] = useState(false)

  const pool = useMemo(() => grievances
    .filter((g) => dept === 'all' || g.dept === dept)
    .sort((a, b) => {
      if (a.mine !== b.mine) return a.mine ? -1 : 1
      if (a.status === 'reopened' !== (b.status === 'reopened')) return a.status === 'reopened' ? -1 : 1
      return (b.harmScore || 0) - (a.harmScore || 0)
    }), [grievances, dept])

  const cols = COLUMNS.map((c) => ({ ...c, items: pool.filter(c.match).slice(0, 24) }))
  const breaching = pool.filter((g) => sla(g).urgent && !['verified_resolved', 'closed_unverified'].includes(g.status)).length
  const reopened = pool.filter((g) => g.status === 'reopened').length

  function onProof(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const rd = new FileReader()
    rd.onload = () => setProof(rd.result)
    rd.readAsDataURL(f)
  }

  async function commit() {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 900))
    officerResolve(modal.id, proof)
    setSaving(false); setModal(null); setProof(null)
  }

  const depts = [...new Set(CATEGORIES.map((c) => c.dept))]

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={ListTodo} label="Assigned" value={pool.length} tone="amber" sub="Zone 3 field crew" />
        <StatTile icon={AlertTriangle} label="SLA at Risk" value={breaching} tone="rose" sub="under 24h or breached" />
        <StatTile icon={RotateCcw} label="Reopened" value={reopened} tone="rose" sub="citizen rejected fix" />
        <StatTile icon={PackageCheck} label="Awaiting Verification" value={pool.filter((g) => g.status === 'closed_unverified').length}
                  tone="violet" sub="citizen confirmation pending" />
      </div>

      <div className="panel p-5 shadow-glass-sm flex items-center justify-between gap-3 flex-wrap">
        <div className="relative z-[2]">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            Ground Officer Task Board <Zap size={16} className="text-amber-500" />
          </h2>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
            AI-routed incident queues with automated SLA timers and proof-of-work validation.
          </p>
        </div>
        <Select value={dept} onChange={setDept}
          options={[{ value: 'all', label: 'All departments' }, ...depts.map((d) => ({ value: d, label: d }))]} />
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {cols.map((c) => (
          <div key={c.key} className="panel flex flex-col overflow-hidden max-h-[700px] shadow-3d-card">
            <div className="panel-hd">
              <h3 className="text-sm font-extrabold flex items-center gap-2.5 text-slate-900 relative z-[2]">
                <div className={cx('w-8 h-8 rounded-xl grid place-items-center text-white shadow-sm bg-gradient-to-br', c.gradient)}>
                  <c.icon size={15} />
                </div>
                {c.label}
              </h3>
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full relative z-[2]"
                    style={{ background: 'rgba(99,102,241,0.06)', color: '#4F46E5' }}>{c.items.length}</span>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 relative z-[2]">
              {c.items.length === 0 && <Empty>Kuch nahi hai.</Empty>}
              <AnimatePresence initial={false}>
                {c.items.map((g) => {
                  const s = sla(g)
                  return (
                    <motion.div key={g.id} layout
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                      className={cx('rounded-2xl p-4 transition-all hover-3d',
                        g.status === 'reopened' ? 'ring-1 ring-rose-300/50' : '',
                        g.mine && 'ring-2 ring-emerald-400/30')}
                      style={{
                        background: g.status === 'reopened' ? 'rgba(244,63,94,0.04)' : 'rgba(255,255,255,0.5)',
                        border: `1px solid ${g.status === 'reopened' ? 'rgba(244,63,94,0.15)' : 'rgba(148,163,184,0.12)'}`,
                        boxShadow: '0 2px 8px -2px rgba(99,102,241,0.04), inset 0 1px 0 rgba(255,255,255,0.7)'
                      }}>

                      {g.status === 'reopened' && (
                        <div className="flex items-center gap-1.5 mb-2.5 text-[10px] font-black text-rose-600 uppercase tracking-wider px-2 py-0.5 rounded-lg w-fit"
                             style={{ background: 'rgba(244,63,94,0.08)' }}>
                          <ShieldAlert size={11} /> Reopened · Escalated
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-[11px] font-bold text-slate-400 px-2 py-0.5 rounded-lg"
                              style={{ background: 'rgba(99,102,241,0.05)' }}>{g.id}</span>
                        <PriorityBadge p={g.priority} />
                      </div>

                      <p className="text-xs font-semibold text-slate-700 leading-snug line-clamp-2">{g.text}</p>

                      <div className="flex items-center gap-2 mt-2.5 text-[11px] font-bold text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin size={11} className="text-indigo-500" />{g.wardName}</span>
                        {g.assetId && <span className="flex items-center gap-1 font-mono px-1.5 py-0.5 rounded"
                                            style={{ background: 'rgba(99,102,241,0.05)' }}><Layers size={10} />{g.assetId}</span>}
                      </div>

                      {!['verified_resolved', 'closed_unverified'].includes(g.status) && (
                        <div className={cx('flex items-center gap-1.5 mt-2.5 text-xs font-extrabold',
                          s.breached ? 'text-rose-600' : s.urgent ? 'text-amber-600' : 'text-slate-400')}>
                          <Clock size={12} /> {s.text}
                        </div>
                      )}

                      {c.key === 'todo' && (
                        <button onClick={() => startWork(g.id)}
                          className="btn-ghost w-full mt-3 text-xs py-2 font-extrabold"
                          style={{ borderColor: 'rgba(99,102,241,0.15)', color: '#4F46E5' }}>
                          <PlayCircle size={15} /> Start Work
                        </button>
                      )}
                      {c.key === 'doing' && (
                        <button onClick={() => { setModal(g); setProof(null) }}
                          className="btn-emerald w-full mt-3 text-xs py-2 font-extrabold">
                          <Camera size={15} /> Mark Resolved
                        </button>
                      )}
                      {c.key === 'done' && (
                        <div className="mt-3 pt-2.5" style={{ borderTop: '1px solid rgba(148,163,184,0.1)' }}>
                          {g.status === 'closed_unverified' ? (
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-600">
                              <Clock size={12} /> Awaiting Citizen Confirmation
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600">
                              <Check size={12} strokeWidth={3} /> Citizen Confirmed
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Warning */}
      <div className="panel p-5 flex items-start gap-4 shadow-glass-sm"
           style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.15)' }}>
        <ShieldAlert size={20} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed font-semibold relative z-[2]">
          Marking a ticket resolved does <span className="text-slate-800 font-extrabold underline">not</span> close it.
          Proof photos are hashed to IPFS and anchored on-chain. Citizen rejection reopens, escalates, and permanently reduces integrity score.
        </p>
      </div>

      {/* Resolve modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center p-4"
            style={{ background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(12px)' }}
            onClick={() => !saving && setModal(null)}>
            <motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()} className="panel w-full max-w-md overflow-hidden shadow-3d-float"
              style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(28px) saturate(200%)' }}>
              <div className="panel-hd">
                <h3 className="text-sm font-extrabold text-slate-900 relative z-[2]">Upload Resolution Proof</h3>
                <button onClick={() => !saving && setModal(null)} className="text-slate-400 hover:text-slate-700 relative z-[2]"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4 relative z-[2]">
                <div>
                  <span className="font-mono text-[11px] font-bold text-slate-400 px-2 py-0.5 rounded-lg"
                        style={{ background: 'rgba(99,102,241,0.05)' }}>{modal.id}</span>
                  <p className="text-xs font-semibold text-slate-700 mt-2 line-clamp-2">{modal.text}</p>
                </div>
                {proof ? (
                  <div className="relative rounded-2xl overflow-hidden shadow-glass-sm" style={{ border: '1px solid rgba(148,163,184,0.15)' }}>
                    <img src={proof} alt="proof" className="w-full h-44 object-cover" />
                    <button onClick={() => setProof(null)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/70 backdrop-blur-md text-white grid place-items-center">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <label className="btn-ghost w-full text-xs font-bold cursor-pointer py-8 flex-col gap-2"
                         style={{ borderStyle: 'dashed', borderWidth: '2px', borderColor: 'rgba(99,102,241,0.2)' }}>
                    <Camera size={26} className="text-indigo-500" />
                    <span>Click / Drag to attach resolution photo</span>
                    <span className="text-[10px] text-slate-400 font-normal">Geotag + perceptual hash verification</span>
                    <input type="file" accept="image/*" className="hidden" onChange={onProof} />
                  </label>
                )}
                <div className="rounded-2xl p-3.5 text-xs font-semibold leading-relaxed"
                     style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)', color: '#92400E' }}>
                  Status → <span className="font-mono font-bold">closed_unverified</span>. Citizen must confirm closure.
                </div>
                <button onClick={commit} disabled={saving} className="btn-primary w-full text-sm font-extrabold py-3">
                  {saving
                    ? <><Loader2 size={16} className="animate-spin" /> Anchoring on IPFS & Chain…</>
                    : <><Link2 size={16} /> Submit Proof</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

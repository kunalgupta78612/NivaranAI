import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Clock, Loader2, AlertTriangle, ImageOff, ArrowUpCircle,
  TrendingDown, Link2, Inbox, ThumbsUp, RotateCcw, ShieldCheck, Zap
} from 'lucide-react'
import { useStore } from '../../store/AppStore'
import { useMyGrievances, useUpdateGrievanceStatus } from '../../lib/grievanceApi'
import { PriorityBadge } from '../../components/ui'
import { cx, timeAgo } from '../../lib/utils'

const STEP = {
  filed:              { i: 0, label: 'Grievance Filed',              tone: 'text-slate-500' },
  assigned:           { i: 1, label: 'Assigned to Officer',          tone: 'text-indigo-600' },
  in_progress:        { i: 2, label: 'Work In Progress',             tone: 'text-indigo-600' },
  closed_unverified:  { i: 3, label: 'Officer Claimed "Resolved"',   tone: 'text-amber-700' },
  verified_resolved:  { i: 4, label: 'Confirmed & Closed',           tone: 'text-emerald-600' },
  reopened:           { i: 3, label: 'Re-opened â€” Escalated',        tone: 'text-rose-600' },
  escalated:          { i: 3, label: 'SLA Breach Escalated',         tone: 'text-violet-600' }
}

export default function CitizenTrack() {
  const { mine, citizenReopen, citizenConfirm } = useStore()
  const [outcome, setOutcome] = useState({})

  function reopen(id) {
    const r = citizenReopen(id)
    setOutcome((p) => ({ ...p, [id]: r }))
  }

  return (
    <div className="space-y-8 animate-slideUp">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel p-7 md:p-8 shadow-3d-card flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(99,102,241,0.04) 50%, rgba(16,185,129,0.03) 100%)' }}>
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest mb-3"
               style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#059669' }}>
            <ShieldCheck size={13} /> Citizen Empowerment Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Meri Tracked Shikayatein</h1>
          <p className="text-sm text-slate-500 font-medium mt-1.5">
            Real-time status updates, SLA timers, and citizen verification power.
          </p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-3xl font-black text-gradient tabular-nums">{mine.length}</div>
          <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Active Grievances</div>
        </div>
      </motion.div>

      <div className="space-y-6">
        {mine.length === 0 && (
          <div className="panel p-16 text-center shadow-glass-md">
            <Inbox size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-base font-extrabold text-slate-700">Abhi koi shikayat nahi hai.</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">Nayi shikayat darj karne ke liye "File Grievance" par jayein.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mine.map((g) => {
            const st = STEP[g.status] || STEP.filed
            const awaiting = g.status === 'closed_unverified'
            const out = outcome[g.id]
            const progColors = {
              reopened: 'linear-gradient(90deg, #F43F5E, #E11D48)',
              verified_resolved: 'linear-gradient(90deg, #10B981, #059669)',
              default: 'linear-gradient(90deg, #6366F1, #4F46E5)'
            }

            return (
              <motion.div key={g.id} layout
                className={cx('panel overflow-hidden shadow-3d-card flex flex-col justify-between',
                  awaiting && 'ring-1 ring-amber-300/50', g.status === 'reopened' && 'ring-1 ring-rose-300/50')}>
                <div className="p-6 space-y-4 relative z-[2]">
                  <div className="flex items-center justify-between gap-2 pb-3" style={{ borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
                    <span className="font-mono text-[11px] font-bold text-slate-400 px-2.5 py-1 rounded-xl"
                          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.08)' }}>{g.id}</span>
                    <PriorityBadge p={g.priority} />
                  </div>

                  <p className="text-sm font-semibold text-slate-700 leading-relaxed line-clamp-3">{g.text}</p>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                    <span className="px-2 py-0.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.06)' }}>{g.wardName}</span>
                    <span>Â·</span>
                    <span className="px-2 py-0.5 rounded-lg" style={{ background: 'rgba(6,182,212,0.06)', color: '#0284C7' }}>{g.categoryLabel}</span>
                    <span>Â·</span>
                    <span>{timeAgo(g.createdAt)}</span>
                  </div>

                  {/* Progress rail */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-2 flex-1 rounded-full transition-all duration-500"
                             style={{
                               background: i <= st.i
                                 ? (progColors[g.status] || progColors.default)
                                 : 'rgba(148,163,184,0.12)',
                               boxShadow: i <= st.i ? '0 2px 6px -1px rgba(99,102,241,0.15)' : 'none'
                             }} />
                      ))}
                    </div>
                    <div className={cx('text-xs font-extrabold flex items-center gap-1.5', st.tone)}>
                      {g.status === 'in_progress' && <Loader2 size={13} className="animate-spin" />}
                      {g.status === 'verified_resolved' && <CheckCircle2 size={13} />}
                      {awaiting && <Clock size={13} />}
                      {g.status === 'reopened' && <AlertTriangle size={13} />}
                      {st.label}
                    </div>
                  </div>
                </div>

                {/* Verification trap */}
                <AnimatePresence>
                  {awaiting && !out && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="p-5 space-y-4 relative z-[2]"
                      style={{ borderTop: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
                      {g.proofImage && (
                        <div className="relative rounded-2xl overflow-hidden shadow-glass-sm" style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
                          <img src={g.proofImage} alt="officer proof" className="w-full h-36 object-cover" />
                          <div className="absolute top-2 left-2 chip text-white font-extrabold" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none' }}>Officer Proof</div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-extrabold text-slate-800">
                          Officer ne is complaint ko <span className="text-amber-700 underline">"Resolved"</span> mark kiya hai.
                        </p>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">Kya sach me kaam hua?</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button onClick={() => reopen(g.id)} className="btn-danger text-xs py-2.5">
                          <RotateCcw size={14} /> Re-open
                        </button>
                        <button onClick={() => confirmFix(g.id || g._id)} className="btn-emerald text-xs py-2.5">
                          <ThumbsUp size={14} /> Confirm
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {out && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="p-5 space-y-3 relative z-[2]"
                      style={{ borderTop: '1px solid rgba(244,63,94,0.2)', background: 'rgba(244,63,94,0.04)' }}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-rose-500" />
                        <span className="text-xs font-black text-rose-600 uppercase tracking-wider">Ghost Closure Penalized</span>
                      </div>
                      <ul className="space-y-2 text-xs font-bold text-slate-600">
                        <li className="flex items-center gap-2"><RotateCcw size={13} className="text-rose-500 shrink-0" />
                          Ticket re-opened with <span className="text-rose-600 font-extrabold">CRITICAL</span> priority</li>
                        <li className="flex items-center gap-2"><ArrowUpCircle size={13} className="text-violet-500 shrink-0" />
                          Escalated to Level 2 Zonal Officer</li>
                        {out.reused && (
                          <li className="flex items-center gap-2"><ImageOff size={13} className="text-rose-500 shrink-0" />
                            <span><span className="text-slate-800 font-extrabold">Fake Photo Detected</span> â€” hash matched</span></li>
                        )}
                        <li className="flex items-center gap-2"><TrendingDown size={13} className="text-rose-500 shrink-0" />
                          Integrity Score: <span className="text-rose-600 font-black">{out.delta} pts</span></li>
                      </ul>
                      <div className="flex items-center gap-2 pt-2 text-xs font-mono font-bold"
                           style={{ borderTop: '1px solid rgba(139,92,246,0.15)', color: '#7C3AED' }}>
                        <Link2 size={13} className="shrink-0" />
                        <span>On-Chain: CitizenRejected + Escalated</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox, Flame, AlertTriangle, EyeOff, ShieldAlert, TrendingDown, Radio,
  Trophy, ArrowRight, Layers, MapPin, Zap
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useStore } from '../../store/AppStore'
import { silenceModel, TREND, WARDS, CATEGORIES } from '../../lib/mockData'
import { IncidentMap, WardMap } from '../../components/MapView'
import { StatTile, PriorityBadge, Select, Bar, Empty } from '../../components/ui'
import { cx, timeAgo, PRIORITY_COLOR } from '../../lib/utils'

export default function GodMode() {
  const { grievances, officers, stats } = useStore()
  const [blindSpots, setBlindSpots] = useState(false)
  const [f, setF] = useState({ ward: 'all', category: 'all', priority: 'all' })
  const [feed, setFeed] = useState([])

  const wards = useMemo(() => silenceModel(), [])

  const filtered = useMemo(() => grievances.filter((g) =>
    (f.ward === 'all' || g.wardId === f.ward) &&
    (f.category === 'all' || g.category === f.category) &&
    (f.priority === 'all' || g.priority === f.priority)
  ), [grievances, f])

  useEffect(() => {
    if (!grievances.length) return
    setFeed(grievances.slice(0, 8))
    const t = setInterval(() => {
      const g = grievances[Math.floor(Math.random() * Math.min(60, grievances.length))]
      setFeed((p) => [{ ...g, _k: Math.random(), createdAt: Date.now() }, ...p].slice(0, 10))
    }, 4500)
    return () => clearInterval(t)
  }, [grievances])

  const leaderboard = useMemo(() =>
    [...officers].sort((a, b) => a.integrityScore - b.integrityScore), [officers])

  return (
    <div className="space-y-6 animate-slideUp">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatTile icon={Inbox} label="Open" value={stats.open} sub={`${stats.total} ingested`} />
        <StatTile icon={Flame} label="Critical" value={stats.critical} tone="rose" sub="harm ≥ 78" />
        <StatTile icon={AlertTriangle} label="Escalated" value={stats.escalated} tone="amber" sub="SLA breached" />
        <StatTile icon={EyeOff} label="Ghost Closures" value={stats.ghostCaught} tone="violet" sub="citizen rejected" />
        <StatTile icon={Radio} label="Blind Spots" value={stats.blindSpots} tone="rose" sub="wards unheard" />
        <StatTile icon={ShieldAlert} label="Flagged Officers" value={stats.flagged} tone="rose" sub="integrity at risk" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        {/* Map */}
        <div className="panel overflow-hidden flex flex-col shadow-3d-float">
          <div className="panel-hd flex-wrap gap-3 relative z-[2]">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                {blindSpots ? 'Silence Detector' : 'Incident Cluster Map'}
                <Zap size={15} className="text-indigo-500" />
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(99,102,241,0.06)', color: '#4F46E5' }}>
                  {blindSpots ? `${wards.length} Wards` : `${filtered.length} Live`}
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!blindSpots && (
                <>
                  <Select value={f.ward} onChange={(v) => setF({ ...f, ward: v })}
                    options={[{ value: 'all', label: 'All Wards' }, ...WARDS.map((w) => ({ value: w.id, label: w.name }))]} />
                  <Select value={f.category} onChange={(v) => setF({ ...f, category: v })}
                    options={[{ value: 'all', label: 'All Categories' }, ...CATEGORIES.map((c) => ({ value: c.key, label: c.label }))]} />
                </>
              )}
              <button onClick={() => setBlindSpots((b) => !b)}
                className={cx('btn text-xs px-3.5 py-1.5 font-extrabold transition-all',
                  blindSpots
                    ? 'text-white shadow-3d-btn'
                    : 'text-slate-600')}
                style={blindSpots
                  ? { background: 'linear-gradient(135deg, #F43F5E, #E11D48)', boxShadow: '0 4px 14px -2px rgba(244,63,94,0.4)' }
                  : { background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(148,163,184,0.2)' }}>
                <EyeOff size={14} /> Blind Spots
              </button>
            </div>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {blindSpots ? (
                <motion.div key="wards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <WardMap wards={wards} className="h-[460px] w-full" />
                </motion.div>
              ) : (
                <motion.div key="inc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <IncidentMap points={filtered} className="h-[460px] w-full" />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute bottom-4 left-4 p-4 rounded-2xl max-w-[300px] relative z-[2]"
                 style={{
                   background: 'rgba(255,255,255,0.8)',
                   backdropFilter: 'blur(16px) saturate(180%)',
                   border: '1px solid rgba(255,255,255,0.8)',
                   boxShadow: '0 8px 24px -6px rgba(99,102,241,0.12)'
                 }}>
              {blindSpots ? (
                <>
                  <div className="label mb-1 text-rose-600 font-extrabold">Reporting Gap Anomaly</div>
                  <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                    Red = Wards filing far <span className="text-slate-900 font-bold">fewer</span> complaints than AI predicts. Silence = structural exclusion.
                  </p>
                </>
              ) : (
                <>
                  <div className="label mb-1 font-extrabold text-slate-700">Cluster Severity</div>
                  <div className="flex items-center gap-3">
                    {['low', 'medium', 'high', 'critical'].map((p) => (
                      <span key={p} className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                        <span className="w-3 h-3 rounded-full shadow-sm" style={{ background: PRIORITY_COLOR[p] }} />{p}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {blindSpots && (
            <div className="p-5 relative z-[2]" style={{ borderTop: '1px solid rgba(148,163,184,0.12)', background: 'rgba(255,255,255,0.3)' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {wards.filter((w) => w.status === 'blind_spot').slice(0, 4).map((w) => (
                  <div key={w.id} className="rounded-2xl p-3 hover-3d"
                       style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.12)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-slate-800 truncate">{w.name}</span>
                      <span className="chip text-white font-extrabold" style={{ background: 'linear-gradient(135deg, #F43F5E, #E11D48)', border: 'none' }}>{w.gapPct}%</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-500">
                      expected {w.expected} · filed <span className="text-rose-600 font-extrabold">{w.actual}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/admin/silence" className="flex items-center gap-2 text-xs font-extrabold mt-4 hover:gap-3 transition-all" style={{ color: '#4F46E5' }}>
                Full Equity Analysis <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {!blindSpots && (
            <div className="p-5 relative z-[2]" style={{ borderTop: '1px solid rgba(148,163,184,0.12)', background: 'rgba(255,255,255,0.25)' }}>
              <ResponsiveContainer width="100%" height={110}>
                <LineChart data={TREND}>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} width={26} />
                  <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 14, fontSize: 12, boxShadow: '0 8px 24px -6px rgba(99,102,241,0.12)', backdropFilter: 'blur(12px)' }} />
                  <Line type="monotone" dataKey="filed" stroke="#6366F1" strokeWidth={2.5} dot={false} name="Filed" />
                  <Line type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2.5} dot={false} name="Resolved" />
                  <Line type="monotone" dataKey="ghostCaught" stroke="#F43F5E" strokeWidth={2.5} dot={false} name="Ghost Caught" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Live feed */}
        <div className="panel flex flex-col overflow-hidden max-h-[680px] shadow-3d-card">
          <div className="panel-hd relative z-[2]">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#F43F5E', boxShadow: '0 0 8px rgba(244,63,94,0.4)' }} /> Live Telemetry
            </h3>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.06)', color: '#4F46E5' }}>socket.io</span>
          </div>
          <div className="overflow-y-auto divide-y relative z-[2]" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
            {feed.length === 0 && <Empty>Waiting…</Empty>}
            <AnimatePresence initial={false}>
              {feed.map((g, i) => (
                <motion.div key={`${g.id}-${g._k ?? i}`} layout
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 hover:bg-white/40 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-[11px] font-bold text-slate-400 px-2 py-0.5 rounded-lg"
                          style={{ background: 'rgba(99,102,241,0.04)' }}>{g.id}</span>
                    <PriorityBadge p={g.priority} />
                  </div>
                  <p className="text-xs font-semibold text-slate-600 line-clamp-2 leading-relaxed">{g.text}</p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] font-bold text-slate-400">
                    <span className="flex items-center gap-1"><MapPin size={11} className="text-indigo-500" />{g.wardName}</span>
                    <span>·</span><span>{timeAgo(g.createdAt)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="panel overflow-hidden shadow-3d-float">
        <div className="panel-hd relative z-[2]">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" /> Officer Integrity Matrix
          </h3>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.06)', color: '#4F46E5' }}>Immutable Chain Ledger</span>
        </div>
        <div className="overflow-x-auto relative z-[2]">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.12)', background: 'rgba(255,255,255,0.3)' }}>
                {['Rank', 'Officer Name', 'Department', 'Ward', 'Assigned', 'Reopened', 'Ghost Rate', 'Integrity'].map((h) => (
                  <th key={h} className="px-5 py-3.5 font-extrabold uppercase tracking-[0.15em] text-[10px] text-slate-400 whitespace-nowrap text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((o, i) => {
                const bad = o.integrityScore < 55
                return (
                  <motion.tr key={o.id} layout className={cx('transition-colors', bad && '')}
                    style={{ borderBottom: '1px solid rgba(148,163,184,0.06)', background: bad ? 'rgba(244,63,94,0.02)' : 'transparent' }}>
                    <td className="px-5 py-3 font-mono font-bold text-slate-400">{i + 1}</td>
                    <td className="px-5 py-3">
                      <div className={cx('font-extrabold', bad ? 'text-rose-600' : 'text-slate-800')}>{o.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{o.id}</div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-500 whitespace-nowrap">{o.dept}</td>
                    <td className="px-5 py-3 font-semibold text-slate-500 whitespace-nowrap">{o.wardName}</td>
                    <td className="px-5 py-3 font-mono font-bold text-slate-600">{o.assigned}</td>
                    <td className="px-5 py-3 font-mono font-bold">
                      <span className={o.reopenedCount > 6 ? 'text-rose-600 font-black' : 'text-slate-500'}>{o.reopenedCount}</span>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold">
                      <span className={o.ghostClosureRate > 0.2 ? 'text-rose-600 font-black' : 'text-slate-500'}>{(o.ghostClosureRate * 100).toFixed(0)}%</span>
                    </td>
                    <td className="px-5 py-3 w-48">
                      <div className="flex items-center gap-3">
                        <Bar className="flex-1" value={o.integrityScore}
                             color={o.integrityScore >= 75 ? '#10B981' : o.integrityScore >= 55 ? '#F59E0B' : '#F43F5E'} />
                        <motion.span key={o.integrityScore} initial={{ scale: 1.4 }} animate={{ scale: 1 }}
                          className={cx('font-black tabular-nums w-8 text-right',
                            o.integrityScore >= 75 ? 'text-emerald-600' : o.integrityScore >= 55 ? 'text-amber-600' : 'text-rose-600')}>
                          {o.integrityScore}
                        </motion.span>
                        {bad && <TrendingDown size={14} className="text-rose-500 shrink-0" />}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 text-xs font-bold text-slate-400 flex items-center gap-2 relative z-[2]"
             style={{ borderTop: '1px solid rgba(148,163,184,0.1)', background: 'rgba(255,255,255,0.2)' }}>
          <Layers size={14} className="text-violet-500 shrink-0" />
          Every reopen, escalation, and rejection is anchored on-chain. Audit records are immutable.
        </div>
      </div>
    </div>
  )
}

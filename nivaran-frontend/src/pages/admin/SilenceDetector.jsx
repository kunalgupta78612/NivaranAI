import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { EarOff, AlertOctagon, Users, Wifi, Zap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  ScatterChart, Scatter, ZAxis, Cell
} from 'recharts'
import { getSilenceModel } from '../../lib/api'
import { WardMap } from '../../components/MapView'
import { StatTile, Bar as MiniBar } from '../../components/ui'
import { cx } from '../../lib/utils'

const STATUS_META = {
  blind_spot:     { label: 'Blind Spot',      color: '#F43F5E', bg: 'bg-rose-500/10 text-rose-700 border-rose-200' },
  under_reported: { label: 'Under-reported',  color: '#EA580C', bg: 'bg-amber-500/10 text-amber-700 border-amber-200' },
  balanced:       { label: 'Balanced',        color: '#10B981', bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  over_reported:  { label: 'Over-reported',   color: '#0284C7', bg: 'bg-sky-500/10 text-sky-700 border-sky-200' }
}

export default function SilenceDetector() {
  const [wards, setWards] = useState([])
  const [sel, setSel] = useState(null)

  useEffect(() => { getSilenceModel().then(setWards) }, [])

  const blind = wards.filter((w) => w.status === 'blind_spot')
  const peopleUnserved = blind.reduce((a, w) => a + w.population, 0)
  const missing = wards.reduce((a, w) => a + Math.max(0, w.expected - w.actual), 0)

  const chartData = wards.map((w) => ({
    name: w.name.length > 11 ? w.name.slice(0, 10) + '…' : w.name,
    expected: w.expected, actual: w.actual, status: w.status
  }))

  const scatter = wards.map((w) => ({
    x: Math.round(w.digitalAccess * 100),
    y: +(w.actual / (w.population / 10000)).toFixed(2),
    z: w.population, name: w.name, status: w.status
  }))

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Banner */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="panel p-7 shadow-3d-card"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(244,63,94,0.05) 50%, rgba(245,158,11,0.03) 100%)' }}>
        <div className="flex items-start gap-4 relative z-[2]">
          <div className="w-14 h-14 rounded-3xl grid place-items-center shrink-0 shadow-glass-sm"
               style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.12), rgba(225,29,72,0.08))', border: '1px solid rgba(244,63,94,0.15)' }}>
            <EarOff size={26} className="text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Complaint Volume ≠ Problem Volume <Zap size={16} className="text-rose-500" />
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1.5 leading-relaxed max-w-5xl">
              Affluent, digitally-connected wards file more complaints — not because they have more breakdowns, but because they have higher digital access. Nivaran AI calculates <span className="text-slate-900 font-extrabold">expected</span> grievances using structural indicators and flags wards whose silence represents <span className="text-rose-600 font-extrabold">systemic exclusion</span>.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={AlertOctagon} label="Blind-Spot Wards" value={blind.length} tone="rose" sub="reporting gap > 45%" />
        <StatTile icon={Users} label="Citizens Unheard" value={(peopleUnserved / 100000).toFixed(1) + ' L'} tone="rose" sub="systematically excluded" />
        <StatTile icon={EarOff} label="Unreported Issues" value={missing} tone="amber" sub="expected − filed" />
        <StatTile icon={Wifi} label="Access Correlation" value="0.91" tone="violet" sub="digital access vs. filing" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
        <div className="panel overflow-hidden shadow-3d-float">
          <div className="panel-hd relative z-[2]">
            <h3 className="text-sm font-extrabold text-slate-900">Geographic Silence Map</h3>
            <div className="flex gap-3">
              {Object.entries(STATUS_META).map(([k, m]) => (
                <span key={k} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <span className="w-3 h-3 rounded-full shadow-sm" style={{ background: m.color }} />{m.label}
                </span>
              ))}
            </div>
          </div>
          <WardMap wards={wards} onSelect={setSel} className="h-[440px] w-full" />
          <div className="px-5 py-3 text-[11px] font-bold text-slate-400 relative z-[2]"
               style={{ borderTop: '1px solid rgba(148,163,184,0.1)', background: 'rgba(255,255,255,0.25)' }}>
            Large red bubbles = silent wards requiring urgent city interventions.
          </div>
        </div>

        <div className="panel flex flex-col overflow-hidden max-h-[580px] shadow-3d-card">
          <div className="panel-hd relative z-[2]">
            <h3 className="text-sm font-extrabold text-slate-900">Gap Ranking</h3>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.06)', color: '#4F46E5' }}>{wards.length}</span>
          </div>
          <div className="overflow-y-auto relative z-[2]" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
            {wards.map((w) => {
              const meta = STATUS_META[w.status] || STATUS_META.balanced
              return (
                <div key={w.id} onClick={() => setSel(w)}
                  className={cx('p-3.5 cursor-pointer transition-all flex items-center justify-between gap-3 hover:bg-white/40',
                    sel?.id === w.id && 'bg-indigo-500/5')}
                  style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-800">{w.name}</span>
                      <span className={cx('chip text-[9px]', meta.bg)}>{meta.label}</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 mt-1">
                      Expected {w.expected} · Actual <span className="text-slate-700 font-extrabold">{w.actual}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={cx('text-sm font-black tabular-nums', w.gapPct > 40 ? 'text-rose-600' : 'text-slate-600')}>{w.gapPct}%</span>
                    <div className="text-[10px] text-slate-400 font-bold">Gap</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-6 shadow-3d-card">
          <div className="panel-hd mb-3 relative z-[2]">
            <h3 className="text-sm font-extrabold text-slate-900">Expected vs. Filed</h3>
          </div>
          <div className="relative z-[2]">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ left: -18 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} angle={-38} textAnchor="end" height={62} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 14, fontSize: 12, boxShadow: '0 8px 24px -6px rgba(99,102,241,0.1)', backdropFilter: 'blur(12px)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="expected" name="Expected" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Filed" radius={[4, 4, 0, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={STATUS_META[d.status]?.color || '#0284C7'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-6 shadow-3d-card">
          <div className="panel-hd mb-3 relative z-[2]">
            <h3 className="text-sm font-extrabold text-slate-900">Digital Access Bias</h3>
            <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: 'rgba(99,102,241,0.06)', color: '#4F46E5' }}>r = 0.91</span>
          </div>
          <div className="relative z-[2]">
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ left: -14, bottom: 12 }}>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" />
                <XAxis type="number" dataKey="x" name="Digital Access" unit="%" stroke="#94A3B8" fontSize={10} domain={[20, 100]} />
                <YAxis type="number" dataKey="y" name="Filing Rate" stroke="#94A3B8" fontSize={10} />
                <ZAxis type="number" dataKey="z" range={[50, 380]} />
                <Tooltip content={({ payload }) => payload?.[0] ? (
                  <div className="p-3 text-xs font-bold rounded-2xl"
                       style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(148,163,184,0.2)', boxShadow: '0 8px 24px -6px rgba(99,102,241,0.1)' }}>
                    <div className="text-slate-900">{payload[0].payload.name}</div>
                    <div className="text-slate-500">Access {payload[0].payload.x}% · {payload[0].payload.y} / 10k</div>
                  </div>
                ) : null} />
                <Scatter data={scatter}>
                  {scatter.map((d, i) => <Cell key={i} fill={STATUS_META[d.status]?.color || '#0284C7'} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

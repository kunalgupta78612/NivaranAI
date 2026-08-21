import { useEffect, useState } from 'react'
import { Boxes, IndianRupee, AlertTriangle, Repeat, Zap } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts'
import { getAssets } from '../../lib/api'
import { StatTile } from '../../components/ui'
import { inr, cx } from '../../lib/utils'

const REC = {
  REPLACE: 'bg-rose-500/10 text-rose-700 border-rose-200',
  AUDIT: 'bg-amber-500/10 text-amber-700 border-amber-200',
  MONITOR: 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
}

export default function AssetIntelligence() {
  const [assets, setAssets] = useState([])
  const [type, setType] = useState('all')

  useEffect(() => { getAssets().then(setAssets) }, [])

  const replace = assets.filter((a) => a.recommendation === 'REPLACE')
  const wasted = replace.reduce((a, x) => a + x.repairSpend, 0)
  const shown = assets.filter((a) => type === 'all' || a.type === type)
  const types = [...new Set(assets.map((a) => a.type))]

  const chart = assets.slice(0, 10).map((a) => ({
    name: a.id, repairs: a.repairSpend, replacement: a.replaceCost, rec: a.recommendation
  }))

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="panel p-7 shadow-3d-card"
           style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(6,182,212,0.05) 50%, rgba(99,102,241,0.03) 100%)' }}>
        <div className="flex items-start gap-4 relative z-[2]">
          <div className="w-14 h-14 rounded-3xl grid place-items-center shrink-0 shadow-glass-sm"
               style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(14,165,233,0.08))', border: '1px solid rgba(6,182,212,0.15)' }}>
            <Boxes size={26} className="text-cyan-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Grievances = Physical Asset Sensor Data <Zap size={16} className="text-cyan-500" />
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1.5 leading-relaxed max-w-5xl">
              Every complaint is entity-resolved and bound to a physical asset. When repeat repair cost exceeds replacement value, Nivaran AI recommends capital replacement.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Boxes} label="Assets Tracked" value={assets.length} sub="Entity-resolved from text" />
        <StatTile icon={AlertTriangle} label="Flagged" value={replace.length} tone="rose" sub="repair > replacement cost" />
        <StatTile icon={IndianRupee} label="Sunk Repairs" value={inr(wasted)} tone="amber" sub="money wasted on re-repair" />
        <StatTile icon={Repeat} label="Mean Failures" value={replace.length ? (replace.reduce((a, x) => a + x.complaints, 0) / replace.length).toFixed(1) : '—'} tone="violet" sub="per flagged asset" />
      </div>

      <div className="panel p-6 shadow-3d-float">
        <div className="panel-hd mb-3 relative z-[2]">
          <h3 className="text-sm font-extrabold text-slate-900">Repair Spend vs. Replacement Cost (Worst 10)</h3>
        </div>
        <div className="relative z-[2]">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chart} margin={{ left: 6 }}>
              <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} angle={-30} textAnchor="end" height={58} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false}
                     tickFormatter={(v) => (v >= 100000 ? (v / 100000).toFixed(0) + 'L' : v / 1000 + 'k')} />
              <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 14, fontSize: 12, boxShadow: '0 8px 24px -6px rgba(99,102,241,0.1)' }}
                       formatter={(v) => inr(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="replacement" name="Replacement Cost" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="repairs" name="Sunk Repairs" radius={[4, 4, 0, 0]}>
                {chart.map((d, i) => <Cell key={i} fill={d.rec === 'REPLACE' ? '#F43F5E' : d.rec === 'AUDIT' ? '#EA580C' : '#10B981'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel overflow-hidden shadow-3d-card">
        <div className="panel-hd flex-wrap gap-2 relative z-[2]">
          <h3 className="text-sm font-extrabold text-slate-900">Asset Register</h3>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setType('all')}
              className={cx('chip text-[10px] font-extrabold border transition-all', type === 'all'
                ? 'text-white border-indigo-600' : 'text-slate-500 border-slate-200')}
              style={type === 'all' ? { background: 'linear-gradient(135deg, #6366F1, #4F46E5)' } : { background: 'rgba(255,255,255,0.5)' }}>All</button>
            {types.map((t) => (
              <button key={t} onClick={() => setType(t)}
                className={cx('chip text-[10px] font-extrabold border capitalize transition-all', type === t
                  ? 'text-white border-indigo-600' : 'text-slate-500 border-slate-200')}
                style={type === t ? { background: 'linear-gradient(135deg, #6366F1, #4F46E5)' } : { background: 'rgba(255,255,255,0.5)' }}>
                {t.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto relative z-[2]">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.12)', background: 'rgba(255,255,255,0.3)' }}>
                {['Asset ID', 'Category', 'Ward', 'Complaints', 'Repair Spend', 'Replace Cost', 'AI Rec.'].map((h) => (
                  <th key={h} className="px-5 py-3.5 font-extrabold uppercase tracking-[0.15em] text-[10px] text-slate-400 whitespace-nowrap text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.id} className="hover:bg-white/40 transition-colors" style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
                  <td className="px-5 py-3 font-mono font-extrabold text-slate-800">{a.id}</td>
                  <td className="px-5 py-3 font-semibold text-slate-500 capitalize">{a.type.replace('_', ' ')}</td>
                  <td className="px-5 py-3 font-semibold text-slate-500">{a.wardName}</td>
                  <td className="px-5 py-3 font-mono font-bold text-slate-700">{a.complaints}</td>
                  <td className="px-5 py-3 font-mono font-bold text-amber-700">{inr(a.repairSpend)}</td>
                  <td className="px-5 py-3 font-mono font-semibold text-slate-500">{inr(a.replaceCost)}</td>
                  <td className="px-5 py-3">
                    <span className={cx('chip border text-[9px] font-extrabold', REC[a.recommendation])}>{a.recommendation}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

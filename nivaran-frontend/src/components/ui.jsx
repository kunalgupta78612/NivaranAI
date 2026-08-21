import { PRIORITY_BG, STATUS_BG, STATUS_LABEL, cx } from '../lib/utils'
import { motion } from 'framer-motion'

export function PriorityBadge({ p }) {
  return <span className={cx('chip border', PRIORITY_BG[p])}>{p}</span>
}

export function StatusBadge({ s }) {
  return <span className={cx('chip border', STATUS_BG[s])}>{STATUS_LABEL[s] || s}</span>
}

const ICON_TONES = {
  cyan:    { wrap: 'bg-gradient-to-br from-cyan-400/20 to-sky-500/10 border-cyan-200/60 shadow-cyan-500/10', icon: 'text-cyan-600' },
  rose:    { wrap: 'bg-gradient-to-br from-rose-400/20 to-pink-500/10 border-rose-200/60 shadow-rose-500/10', icon: 'text-rose-600' },
  amber:   { wrap: 'bg-gradient-to-br from-amber-400/20 to-orange-500/10 border-amber-200/60 shadow-amber-500/10', icon: 'text-amber-600' },
  violet:  { wrap: 'bg-gradient-to-br from-violet-400/20 to-purple-500/10 border-violet-200/60 shadow-violet-500/10', icon: 'text-violet-600' },
  emerald: { wrap: 'bg-gradient-to-br from-emerald-400/20 to-teal-500/10 border-emerald-200/60 shadow-emerald-500/10', icon: 'text-emerald-600' },
  indigo:  { wrap: 'bg-gradient-to-br from-indigo-400/20 to-blue-500/10 border-indigo-200/60 shadow-indigo-500/10', icon: 'text-indigo-600' },
}

export function StatTile({ icon: Icon, label, value, sub, tone = 'cyan' }) {
  const t = ICON_TONES[tone] || ICON_TONES.cyan
  return (
    <motion.div
      whileHover={{ y: -4, rotateX: 1.5 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="stat-tile group"
      style={{ perspective: '800px' }}
    >
      {Icon && (
        <div className={cx('w-12 h-12 rounded-2xl border grid place-items-center shrink-0 shadow-md', t.wrap)}>
          <Icon size={22} strokeWidth={2.2} className={t.icon} />
        </div>
      )}
      <div className="min-w-0 flex-1 relative z-[2]">
        <div className="label text-[9px] text-slate-400 font-extrabold tracking-[0.18em]">{label}</div>
        <div className="text-2xl md:text-3xl font-black text-slate-900 leading-none mt-1.5 tabular-nums tracking-tight">{value}</div>
        {sub && <div className="text-[11px] font-semibold text-slate-500 mt-1.5 truncate">{sub}</div>}
      </div>
    </motion.div>
  )
}

export function Section({ title, right, children, className }) {
  return (
    <div className={cx('panel overflow-hidden', className)}>
      <div className="panel-hd">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  )
}

export function Select({ value, onChange, options, className }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx('bg-white/60 backdrop-blur-md border border-white/60 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 shadow-glass-xs transition-all cursor-pointer', className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

export function Bar({ value, max = 100, color = '#6366F1', className }) {
  return (
    <div className={cx('h-2 rounded-full bg-slate-200/60 overflow-hidden shadow-inner', className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full shadow-sm"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}dd)` }} />
    </div>
  )
}

export function Empty({ children }) {
  return <div className="p-12 text-center text-sm font-semibold text-slate-400">{children}</div>
}

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, FileEdit, Link2, Radar, RotateCcw, CheckCheck, Scale, FileSignature,
  Siren, Check, Loader2,
} from 'lucide-react'
import { cx } from '../../lib/utils'

/* Every tool the agent can call, mapped to a citizen-facing verb + icon.
   This is what turns "the model called a function" into something a person
   in a hackathon audience visibly understands as the agent doing work. */
export const TOOL_META = {
  emergency_protocol:      { icon: Siren,       label: 'Activating emergency protocol', done: 'Emergency protocol activated', tone: 'rose' },
  find_similar_grievances: { icon: Search,       label: 'Scanning nearby reports',        done: 'Scanned nearby reports',        tone: 'violet' },
  file_grievance:          { icon: FileEdit,     label: 'Filing grievance & scoring harm', done: 'Grievance filed & scored',      tone: 'indigo' },
  join_grievance:          { icon: Link2,        label: 'Linking to existing ticket',      done: 'Linked to existing ticket',     tone: 'violet' },
  track_grievance:         { icon: Radar,        label: 'Pulling live ticket status',      done: 'Ticket status pulled',          tone: 'cyan' },
  reopen_and_escalate:     { icon: RotateCcw,    label: 'Reopening & escalating',          done: 'Reopened & escalated',          tone: 'rose' },
  verify_resolved:         { icon: CheckCheck,   label: 'Confirming resolution',           done: 'Resolution confirmed',          tone: 'emerald' },
  explain_entitlement:     { icon: Scale,        label: 'Checking your entitlement',       done: 'Entitlement checked',           tone: 'amber' },
  draft_escalation_letter: { icon: FileSignature,label: 'Drafting formal letter',          done: 'Letter drafted',                tone: 'indigo' },
}

const TONE = {
  rose:    { text: 'text-rose-600', bg: 'bg-rose-500/15', ring: 'ring-rose-400/40' },
  violet:  { text: 'text-violet-600', bg: 'bg-violet-500/15', ring: 'ring-violet-400/40' },
  indigo:  { text: 'text-indigo-600', bg: 'bg-indigo-500/15', ring: 'ring-indigo-400/40' },
  cyan:    { text: 'text-cyan-600', bg: 'bg-cyan-500/15', ring: 'ring-cyan-400/40' },
  emerald: { text: 'text-emerald-600', bg: 'bg-emerald-500/15', ring: 'ring-emerald-400/40' },
  amber:   { text: 'text-amber-600', bg: 'bg-amber-500/15', ring: 'ring-amber-400/40' },
}

/**
 * Live trace of what the agent is actually doing, tool by tool.
 *
 * `steps` — while busy: an array of tool names queued for a staggered reveal
 * `committed` — after the reply lands: the REAL tools that executed, from the
 *               server's `actions` array, each finished with a checkmark.
 */
export default function AgentTrace({ pending = [], committed = null }) {
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    if (!pending.length) { setRevealed(0); return }
    setRevealed(1)
    let i = 1
    const id = setInterval(() => {
      i++
      setRevealed((r) => Math.min(pending.length, i))
      if (i >= pending.length) clearInterval(id)
    }, 420)
    return () => clearInterval(id)
  }, [pending])

  const rows = committed
    ? committed.map((a) => ({ name: a.tool, done: true, failed: a.result && a.result.ok === false }))
    : pending.slice(0, revealed).map((name, i) => ({ name, done: false, active: i === revealed - 1 }))

  if (!rows.length) return null

  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/70 bg-white/50 px-3 py-2.5 backdrop-blur-md">
      <AnimatePresence initial={false}>
        {rows.map((row, i) => {
          const meta = TOOL_META[row.name] || { icon: Loader2, label: row.name, done: row.name, tone: 'indigo' }
          const Icon = meta.icon
          const tone = TONE[meta.tone] || TONE.indigo
          return (
            <motion.div
              key={row.name + i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-2.5"
            >
              <span className={cx(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full ring-1',
                tone.bg, tone.ring,
                row.active && !committed && 'animate-pulse'
              )}>
                {committed ? (
                  row.failed
                    ? <span className={cx('text-[10px] font-black', tone.text)}>!</span>
                    : <Check size={12} className={tone.text} strokeWidth={3} />
                ) : row.active ? (
                  <Loader2 size={12} className={cx(tone.text, 'animate-spin')} />
                ) : (
                  <Icon size={12} className={tone.text} />
                )}
              </span>
              <span className={cx(
                'text-[11.5px] font-bold leading-tight',
                committed ? (row.failed ? 'text-rose-500' : 'text-slate-500') : 'text-slate-600'
              )}>
                {committed ? meta.done : meta.label}
                {!committed && row.active && <span className="ml-0.5 animate-pulse">…</span>}
              </span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

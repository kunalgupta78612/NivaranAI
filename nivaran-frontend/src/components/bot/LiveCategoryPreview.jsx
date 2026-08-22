import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Radar, AlertTriangle } from 'lucide-react'
import { analyzeText } from '../../lib/botApi'
import { cx } from '../../lib/utils'
import { UI } from './uiStrings'

const PRIORITY_DOT = {
  critical: 'bg-rose-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
}

const PRIORITY_TEXT = {
  critical: 'text-rose-600',
  high: 'text-orange-600',
  medium: 'text-amber-600',
  low: 'text-emerald-600',
}

/**
 * Proves self-categorization is real and live: as the citizen types, this
 * calls the actual backend classifier (the same one that runs when a ticket
 * is filed) and shows what it sees — category, department, confidence,
 * priority — before a single message is sent. No mock data, no simulation.
 */
export default function LiveCategoryPreview({ text, lang = 'en' }) {
  const [result, setResult] = useState(null)
  const [plausibility, setPlausibility] = useState(null)
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)
  const lastReq = useRef(0)
  const t = UI[lang] || UI.en

  useEffect(() => {
    const clean = String(text || '').trim()
    if (timer.current) clearTimeout(timer.current)

    if (clean.length < 10) {
      setResult(null)
      setPlausibility(null)
      setLoading(false)
      return
    }

    setLoading(true)
    timer.current = setTimeout(() => {
      const reqId = ++lastReq.current
      analyzeText(clean)
        .then((d) => {
          if (reqId !== lastReq.current) return // stale response, a newer keystroke already fired
          setResult(d.analysis)
          setPlausibility(d.plausibility || null)
        })
        .catch(() => { if (reqId === lastReq.current) { setResult(null); setPlausibility(null) } })
        .finally(() => { if (reqId === lastReq.current) setLoading(false) })
    }, 480)

    return () => clearTimeout(timer.current)
  }, [text])

  const clean = String(text || '').trim()
  if (clean.length < 10) return null

  return (
    <AnimatePresence mode="wait">
      {loading && !result && (
        <motion.div
          key="loading"
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          className="mb-2 flex items-center gap-2 rounded-xl border border-white/70 bg-white/50 px-3 py-2 backdrop-blur-md"
        >
          <Loader2 size={12} className="animate-spin text-indigo-400" />
          <span className="text-[10.5px] font-bold text-slate-400">{t.detecting}</span>
        </motion.div>
      )}

      {result && result.category && (!plausibility || plausibility.verdict === 'gibberish' || plausibility.verdict === 'placeholder_text' || plausibility.verdict === 'too_short') && (
        <motion.div
          key="warning"
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="mb-2 flex items-center gap-2.5 rounded-xl border border-amber-300/70 bg-gradient-to-r from-amber-500/10 to-orange-500/5 px-3 py-2 backdrop-blur-md"
        >
          <AlertTriangle size={13} className="shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-black text-amber-700">{t.notAReportYet}</div>
            <div className="mt-0.5 text-[10px] font-bold text-amber-600/80">{t.notAReportHint}</div>
          </div>
        </motion.div>
      )}

      {result && result.category && !(!plausibility || plausibility.verdict === 'gibberish' || plausibility.verdict === 'placeholder_text' || plausibility.verdict === 'too_short') && (
        <motion.div
          key="result"
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="mb-2 flex items-center gap-2.5 rounded-xl border border-indigo-200/70 bg-gradient-to-r from-indigo-500/10 to-violet-500/5 px-3 py-2 backdrop-blur-md"
        >
          <Radar size={13} className="shrink-0 text-indigo-500" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-500/70">{t.detected}</span>
              <span className="truncate text-[11.5px] font-black text-slate-800">{result.category.label}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[10px] font-bold text-slate-500">
              <span className="truncate">{result.category.dept}</span>
              <span className="text-slate-300">·</span>
              <span className="flex items-center gap-1">
                <span className={cx('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[result.priority] || PRIORITY_DOT.medium)} />
                <span className={cx('capitalize', PRIORITY_TEXT[result.priority] || PRIORITY_TEXT.medium)}>{result.priority}</span>
              </span>
              <span className="text-slate-300">·</span>
              <span>{Math.round((result.category.confidence || 0) * 100)}% {t.confidence}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[15px] font-black leading-none text-slate-800">{result.harmScore}</div>
            <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">/100</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

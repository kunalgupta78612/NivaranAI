import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquareText, Ticket, Plus, Loader2 } from 'lucide-react'
import { listBotSessions } from '../../lib/botApi'
import { timeAgo } from '../../lib/utils'
import { cx } from '../../lib/utils'
import { UI } from './uiStrings'

/**
 * Every past conversation this citizen has ever had with the agent.
 * Nothing here is ever deleted by normal use — this IS the permanent record,
 * read straight from the database on open.
 */
export default function HistoryDrawer({ open, onClose, onSelect, onNewChat, activeSessionId, lang = 'en' }) {
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')
  const t = UI[lang] || UI.en

  useEffect(() => {
    if (!open) return
    setError('')
    listBotSessions()
      .then((d) => setSessions(d.sessions || []))
      .catch(() => setError(t.historyError))
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          className="absolute inset-y-0 left-0 z-20 flex w-full flex-col border-r border-white/70"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(24px) saturate(200%)',
          }}
        >
          <div className="flex items-center justify-between border-b border-white/70 px-4 py-3.5">
            <div className="flex items-center gap-2">
              <MessageSquareText size={16} className="text-indigo-600" />
              <span className="text-[13px] font-black tracking-tight text-slate-800">{t.history}</span>
            </div>
            <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
              <X size={14} />
            </button>
          </div>

          <button
            onClick={onNewChat}
            className="mx-3 mt-3 flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[12.5px] font-bold text-white shadow-3d-btn transition hover:shadow-3d-btn-hover"
            style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}
          >
            <Plus size={14} /> {t.newChat}
          </button>

          <div className="flex-1 overflow-y-auto px-2.5 py-3">
            {sessions === null && !error && (
              <div className="grid place-items-center py-10 text-slate-400">
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}

            {error && (
              <div className="px-2 py-6 text-center text-[12px] font-semibold text-rose-500">{error}</div>
            )}

            {sessions && sessions.length === 0 && (
              <div className="px-3 py-8 text-center text-[12px] font-semibold text-slate-400">
                {t.noHistory}
              </div>
            )}

            {sessions && sessions.map((s) => {
              const active = String(s.sessionId) === String(activeSessionId)
              return (
                <button
                  key={s.sessionId}
                  onClick={() => onSelect(s.sessionId)}
                  className={cx(
                    'mb-1.5 w-full rounded-2xl px-3 py-2.5 text-left transition',
                    active
                      ? 'border border-indigo-200 bg-indigo-50/80 shadow-glass-xs'
                      : 'border border-transparent hover:border-white/80 hover:bg-white/70'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cx('truncate text-[12.5px] font-bold', active ? 'text-indigo-700' : 'text-slate-700')}>
                      {s.title || 'New conversation'}
                    </span>
                    <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wide text-slate-400">
                      {timeAgo ? timeAgo(s.updatedAt) : ''}
                    </span>
                  </div>
                  {s.preview && (
                    <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{s.preview}</div>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    {s.current && (
                      <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-emerald-600">
                        {t.current}
                      </span>
                    )}
                    {s.lastTicketId && (
                      <span className="flex items-center gap-1 rounded-full bg-slate-500/10 px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-slate-500">
                        <Ticket size={9} /> {s.lastTicketId}
                      </span>
                    )}
                    <span className="text-[8.5px] font-bold text-slate-300">{t.turns(s.turnCount)}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

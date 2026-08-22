import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, Send, X, Sparkles, ShieldCheck, AlertTriangle,
  FileText, Download, Users, TrendingUp, ChevronDown, Phone, Cpu, History,
  Plus, Copy, Check,
} from 'lucide-react'
import BotOrb from './BotOrb'
import AgentTrace from './AgentTrace'
import HistoryDrawer from './HistoryDrawer'
import LiveCategoryPreview from './LiveCategoryPreview'
import { UI, LANG_STORAGE_KEY } from './uiStrings'
import {
  sendChat, getBotHealth, getBotSession, getBotSessionById, newBotSession,
} from '../../lib/botApi'
import { cx } from '../../lib/utils'

const PRIORITY_STYLE = {
  critical: { ring: '#DC2626', bg: 'from-rose-500/15 to-red-500/5', text: 'text-rose-600', border: 'border-rose-200' },
  high: { ring: '#EA580C', bg: 'from-orange-500/15 to-amber-500/5', text: 'text-orange-600', border: 'border-orange-200' },
  medium: { ring: '#D97706', bg: 'from-amber-500/15 to-yellow-500/5', text: 'text-amber-600', border: 'border-amber-200' },
  low: { ring: '#059669', bg: 'from-emerald-500/15 to-teal-500/5', text: 'text-emerald-600', border: 'border-emerald-200' },
}

/* Rough guess at which tools a message will trigger, purely for the live
   "thinking" trace before the real response lands — replaced by the actual
   `actions` the server ran the instant the reply arrives. */
function guessTrace(text) {
  const t = (text || '').toLowerCase()
  const steps = []
  if (/gas|leak|आग|fire|spark|चिंगारी|करंट|current|collapse|गिर/.test(t)) steps.push('emergency_protocol')
  if (/nahi hua|नहीं हुआ|not (done|resolved)|reopen|फिर से|jhoot|झूठ/.test(t)) steps.push('reopen_and_escalate')
  else if (/status|स्थिति|track|ट्रैक|grv-/.test(t)) steps.push('track_grievance')
  else if (/adhikar|अधिकार|sla|kitne din|कितने दिन|right/.test(t)) steps.push('explain_entitlement')
  else if (/escalate|एस्केलेट|rti|आरटीआई/.test(t)) steps.push('draft_escalation_letter')
  else if (t.trim().split(/\s+/).length > 3) steps.push('find_similar_grievances', 'file_grievance')
  return steps.length ? steps : ['find_similar_grievances']
}

/* -------------------------------------------------------------- score ring */
function HarmRing({ score = 0, priority = 'medium', size = 54 }) {
  const style = PRIORITY_STYLE[priority] || PRIORITY_STYLE.medium
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="5" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={style.ring} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (circ * Math.min(100, score)) / 100 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[13px] font-black tabular-nums text-slate-800">{score}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------- 8-stage breakdown */
function StageBreakdown({ stages }) {
  const [open, setOpen] = useState(false)
  if (!stages || !stages.length) return null
  return (
    <div className="mt-2.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 hover:text-indigo-700"
      >
        <Cpu size={12} />
        How this score was computed
        <ChevronDown size={12} className={cx('transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1 rounded-xl bg-white/60 border border-white/70 p-2.5">
              {stages.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="w-4 shrink-0 font-black text-slate-400">{s.stage}</span>
                  <span className="flex-1 min-w-0">
                    <span className="font-bold text-slate-700">{s.name}</span>
                    <span className="block text-slate-500 leading-snug">{s.detail}</span>
                  </span>
                  <span className={cx('font-black tabular-nums shrink-0', s.delta > 0 ? 'text-rose-500' : s.delta < 0 ? 'text-emerald-600' : 'text-slate-300')}>
                    {s.delta > 0 ? '+' : ''}{s.delta}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------- action card */
function ActionCard({ action, onQuick }) {
  const r = action.result
  if (!r || !r.ok) return null

  /* ---- emergency ---- */
  if (r.action === 'emergency') {
    return (
      <div className="rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-500/15 to-red-500/5 p-3.5 shadow-glow-rose">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-rose-600" />
          <span className="text-[11px] font-black uppercase tracking-wider text-rose-600">Emergency protocol</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(r.emergencyNumbers || []).map((n) => {
            const num = String(n).match(/\d+/)?.[0] || ''
            return (
              <a key={n} href={`tel:${num}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-[12px] font-bold text-white shadow-md hover:bg-rose-700 transition">
                <Phone size={13} /> {n}
              </a>
            )
          })}
        </div>
        {r.ticket && (
          <div className="mt-2.5 text-[11px] font-semibold text-slate-600">
            {r.ticket.ticketId} · auto-escalated to Commissioner
          </div>
        )}
      </div>
    )
  }

  /* ---- duplicate found: offer to join ---- */
  if (typeof r.count === 'number' && r.matches && r.count > 0) {
    const m = r.matches[0]
    return (
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-500/12 to-purple-500/5 p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <Users size={15} className="text-violet-600" />
          <span className="text-[11px] font-black uppercase tracking-wider text-violet-600">
            {r.count} neighbour{r.count > 1 ? 's' : ''} already reported this
          </span>
        </div>
        <div className="rounded-xl bg-white/70 border border-white/80 p-2.5 text-[12px]">
          <div className="font-black text-slate-800">{m.ticketId}</div>
          <div className="text-slate-600 leading-snug mt-0.5">{m.text}</div>
          <div className="mt-1.5 flex gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            <span>{m.daysOpen}d open</span><span>{m.supportCount} supporters</span><span>{m.priority}</span>
          </div>
        </div>
        <div className="mt-2.5 flex gap-2">
          <button onClick={() => onQuick('haan, jod do')}
            className="flex-1 rounded-xl bg-violet-600 px-3 py-2 text-[12px] font-bold text-white shadow-md hover:bg-violet-700 transition">
            Join their ticket
          </button>
          <button onClick={() => onQuick('nahi, nayi shikayat darj karo')}
            className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-bold text-slate-600 hover:bg-white transition">
            File separately
          </button>
        </div>
      </div>
    )
  }

  /* ---- joined ---- */
  if (r.action === 'joined') {
    return (
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-500/12 to-purple-500/5 p-3.5">
        <div className="flex items-center gap-2 mb-1.5">
          <TrendingUp size={15} className="text-violet-600" />
          <span className="text-[11px] font-black uppercase tracking-wider text-violet-600">Co-signed · priority recalculated</span>
        </div>
        <div className="flex items-center gap-3">
          <HarmRing score={r.after.harmScore} priority={r.after.priority} />
          <div className="text-[12px]">
            <div className="font-black text-slate-800">{r.ticket.ticketId}</div>
            <div className="text-slate-600">
              Severity <span className="font-bold">{r.before.harmScore} → {r.after.harmScore}</span>
              {r.escalatedPriority && <span className="text-rose-600 font-bold"> · now {r.after.priority}</span>}
            </div>
            <div className="text-slate-500">{r.ticket.supportCount} citizens backing this</div>
          </div>
        </div>
      </div>
    )
  }

  /* ---- letter drafted ---- */
  if (r.action === 'letter_drafted') {
    const download = () => {
      const blob = new Blob([r.letter], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = r.filename || 'letter.txt'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    return (
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-500/12 to-blue-500/5 p-3.5">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={15} className="text-indigo-600" />
          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
            {r.mode === 'rti' ? 'RTI application' : 'Escalation letter'} ready
          </span>
        </div>
        <pre className="max-h-40 overflow-y-auto rounded-xl bg-white/75 border border-white/80 p-2.5 text-[10.5px] leading-relaxed text-slate-700 whitespace-pre-wrap font-sans">
          {r.letter}
        </pre>
        <button onClick={download}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-[12px] font-bold text-white shadow-md hover:bg-indigo-700 transition">
          <Download size={13} /> Download
        </button>
      </div>
    )
  }

  /* ---- filed / reopened / escalated / verified / tracked ---- */
  const t = r.ticket
  if (!t) return null
  const a = r.assessment
  const style = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.medium

  return (
    <div className={cx('rounded-2xl border bg-gradient-to-br p-3.5', style.border, style.bg)}>
      <div className="flex items-start gap-3">
        <HarmRing score={t.harmScore} priority={t.priority} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-slate-900 text-[13px]">{t.ticketId}</span>
            <span className={cx('chip border bg-white/70', style.text)}>{t.priority}</span>
            {r.action === 'escalated' && <span className="chip border bg-rose-600 text-white border-rose-600">escalated</span>}
          </div>
          <div className="mt-1 text-[11.5px] text-slate-600 leading-snug">
            {a ? a.category : t.category} · {t.dept}
          </div>
          <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
            {t.ward} · SLA {t.slaDays}d
            {t.slaBreached
              ? <span className="text-rose-600 font-bold"> · overdue {t.overdueDays}d</span>
              : <span className="text-emerald-600 font-bold"> · {t.daysLeft}d left</span>}
          </div>
          {r.officerImpact && (
            <div className="mt-1.5 text-[11px] font-bold text-rose-600">{r.officerImpact}</div>
          )}
          {t.auditHash && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono text-violet-600">
              <ShieldCheck size={11} /> {String(t.auditHash).slice(0, 20)}…
            </div>
          )}
        </div>
      </div>
      <StageBreakdown stages={a ? a.stages : null} />
    </div>
  )
}

/* ------------------------------------------------------ copyable bubble */
function MessageBubble({ role, text, emergency }) {
  const [copied, setCopied] = useState(false)
  const isUser = role === 'user'
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    }).catch(() => {})
  }
  return (
    <div className="group relative max-w-[88%]">
      <div
        className={cx(
          'whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed shadow-glass-xs',
          isUser
            ? 'rounded-br-md bg-gradient-to-br from-indigo-600 to-indigo-700 text-white'
            : emergency
            ? 'rounded-bl-md border border-rose-200 bg-rose-50/90 text-slate-800'
            : 'rounded-bl-md border border-white/80 bg-white/75 text-slate-700'
        )}
      >
        {text}
      </div>
      {!isUser && text && (
        <button
          onClick={copy}
          title="Copy"
          className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-white/80 bg-white/90 text-slate-400 opacity-0 shadow-sm transition hover:text-indigo-600 group-hover:opacity-100"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
        </button>
      )}
    </div>
  )
}

/* ================================================================== main */
export default function NivaranBot() {
  const [open, setOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [amplitude, setAmplitude] = useState(0)
  const [engine, setEngine] = useState(null)
  const [mode, setMode] = useState('idle')
  const [sessionId, setSessionId] = useState(null)
  const [pendingTrace, setPendingTrace] = useState([])
  const [langPref, setLangPref] = useState(() => {
    try { return localStorage.getItem(LANG_STORAGE_KEY) === 'hi' ? 'hi' : 'en' } catch { return 'en' }
  })
  const t = UI[langPref] || UI.en

  const scrollRef = useRef(null)
  const recognitionRef = useRef(null)
  const audioRef = useRef({ ctx: null, stream: null, raf: 0 })

  /* --- engine badge + restore current transcript --- */
  useEffect(() => {
    getBotHealth().then((d) => setEngine(d.engine)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!open || messages.length) return
    getBotSession()
      .then((d) => {
        if (d.sessionId) setSessionId(d.sessionId)
        if (d.messages && d.messages.length) {
          setMessages(d.messages.map((m) => ({ role: m.role, text: m.content, actions: [] })))
        }
        if (d.preferredLanguage === 'en' || d.preferredLanguage === 'hi') {
          setLangPref(d.preferredLanguage)
        }
      })
      .catch(() => {})
  }, [open])

  const switchLanguage = useCallback((next) => {
    setLangPref(next)
    try { localStorage.setItem(LANG_STORAGE_KEY, next) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, busy, pendingTrace])

  /* --- live mic amplitude so the orb reacts to the citizen's voice --- */
  const startMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      audioRef.current = { ctx, stream, raf: 0 }
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v }
        setAmplitude(Math.min(1, Math.sqrt(sum / data.length) * 4))
        audioRef.current.raf = requestAnimationFrame(tick)
      }
      tick()
    } catch { /* mic metering is a nicety, never a blocker */ }
  }, [])

  const stopMeter = useCallback(() => {
    const a = audioRef.current
    if (a.raf) cancelAnimationFrame(a.raf)
    if (a.stream) a.stream.getTracks().forEach((t) => t.stop())
    if (a.ctx && a.ctx.state !== 'closed') a.ctx.close().catch(() => {})
    audioRef.current = { ctx: null, stream: null, raf: 0 }
    setAmplitude(0)
  }, [])

  /* --- send --- */
  const send = useCallback(async (text) => {
    const msg = String(text || '').trim()
    if (!msg || busy) return

    setInput('')
    setMessages((m) => [...m, { role: 'user', text: msg, actions: [] }])
    setBusy(true)
    setMode('thinking')
    setPendingTrace(guessTrace(msg))

    try {
      const data = await sendChat({ message: msg, sessionId, forceLanguage: langPref })
      if (data.sessionId) setSessionId(data.sessionId)
      const isEmergency = data.analysis?.emergency?.isEmergency
      setMessages((m) => [...m, {
        role: 'assistant',
        text: data.reply,
        actions: data.actions || [],
        engine: data.engine,
        emergency: isEmergency,
      }])
      setMode(isEmergency ? 'alert' : 'speaking')
      setTimeout(() => setMode('idle'), isEmergency ? 4000 : 1600)
    } catch (err) {
      setMessages((m) => [...m, {
        role: 'assistant',
        text: err?.message === 'Not authorized, no token provided' || err?.status === 401
          ? t.loginRequired
          : t.connError(err?.message),
        actions: [],
      }])
      setMode('idle')
    } finally {
      setBusy(false)
      setPendingTrace([])
    }
  }, [busy, sessionId, langPref, t])

  /* --- voice --- */
  const toggleMic = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setMessages((m) => [...m, { role: 'assistant', text: t.voiceUnsupported, actions: [] }])
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      return
    }

    const rec = new SR()
    rec.lang = langPref === 'hi' ? 'hi-IN' : 'en-IN'
    rec.continuous = false
    rec.interimResults = true
    recognitionRef.current = rec

    let finalText = ''
    rec.onstart = () => { setListening(true); setMode('listening'); startMeter() }
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tr = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += tr
        else interim += tr
      }
      setInput(finalText || interim)
    }
    rec.onerror = () => { setListening(false); setMode('idle'); stopMeter() }
    rec.onend = () => {
      setListening(false); setMode('idle'); stopMeter()
      const t = (finalText || '').trim()
      if (t) send(t)
    }
    try { rec.start() } catch { setListening(false); setMode('idle') }
  }, [listening, send, startMeter, stopMeter, langPref, t])

  useEffect(() => () => { recognitionRef.current?.abort?.(); stopMeter() }, [stopMeter])

  /* --- history + new chat --- */
  const startNewChat = async () => {
    try {
      const d = await newBotSession()
      setSessionId(d.sessionId)
    } catch { /* fall through — a fresh local thread is still fine */ }
    setMessages([])
    setHistoryOpen(false)
  }

  const openPastChat = async (id) => {
    try {
      const d = await getBotSessionById(id)
      setSessionId(d.sessionId)
      setMessages((d.messages || []).map((m) => ({ role: m.role, text: m.content, actions: [] })))
    } catch { /* ignore */ }
    setHistoryOpen(false)
  }

  const liveMode = busy ? 'thinking' : listening ? 'listening' : mode

  return (
    <>
      {/* ---------------- launcher ---------------- */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-[60] grid place-items-center rounded-full"
            style={{
              width: 68, height: 68,
              background: 'rgba(255,255,255,0.62)',
              backdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.8)',
              boxShadow: '0 10px 30px -6px rgba(99,102,241,0.35), 0 4px 12px rgba(99,102,241,0.15), inset 0 1.5px 0 rgba(255,255,255,1)',
            }}
            aria-label="Open Nivaran AI assistant"
          >
            <BotOrb size={58} mode="idle" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ---------------- panel ---------------- */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed bottom-5 right-5 z-[60] flex flex-col overflow-hidden rounded-[26px]"
            style={{
              width: 'min(440px, calc(100vw - 2.5rem))',
              height: 'min(680px, calc(100vh - 2.5rem))',
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(28px) saturate(200%)',
              WebkitBackdropFilter: 'blur(28px) saturate(200%)',
              border: '1px solid rgba(255,255,255,0.8)',
              boxShadow: '0 24px 64px -16px rgba(99,102,241,0.28), 0 10px 28px -6px rgba(99,102,241,0.14), inset 0 2px 0 rgba(255,255,255,1)',
            }}
          >
            {/* animated gradient border sweep — purely decorative "alive" cue */}
            <div
              className="pointer-events-none absolute inset-0 rounded-[26px] opacity-60"
              style={{
                padding: 1,
                background: 'conic-gradient(from var(--a,0deg), transparent 0%, rgba(99,102,241,0.5) 12%, transparent 24%)',
                WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
                animation: 'nv-sweep 6s linear infinite',
              }}
            />

            {/* header */}
            <div className="relative flex items-center gap-3 px-4 py-3 border-b border-white/70 shrink-0">
              <button
                onClick={() => setHistoryOpen(true)}
                title={t.history}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/70 bg-white/60 text-slate-500 hover:text-indigo-600 hover:bg-white transition"
              >
                <History size={15} />
              </button>

              <BotOrb size={40} mode={liveMode} amplitude={amplitude} interactive />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-black tracking-tight text-gradient leading-none">{t.name}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={cx('h-1.5 w-1.5 rounded-full', engine?.ready ? 'bg-emerald-500' : 'bg-indigo-500')} />
                  <span className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                    {engine ? (engine.ready ? engine.label : 'Civic Engine · offline-capable') : 'connecting…'}
                  </span>
                </div>
              </div>

              {/* EN/HI toggle — the citizen's explicit language choice, sent with
                  every message and persisted to their conversation in the DB */}
              <div className="flex shrink-0 items-center rounded-xl border border-white/70 bg-white/60 p-0.5">
                {['en', 'hi'].map((code) => (
                  <button
                    key={code}
                    onClick={() => switchLanguage(code)}
                    className={cx(
                      'rounded-[9px] px-2 py-1 text-[10.5px] font-black tracking-wide transition',
                      langPref === code ? 'text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    )}
                    style={langPref === code ? { background: 'linear-gradient(135deg,#6366F1,#4F46E5)' } : {}}
                  >
                    {code === 'en' ? 'EN' : 'हिं'}
                  </button>
                ))}
              </div>

              <button onClick={startNewChat} title={t.newChat}
                className="grid h-8 w-8 place-items-center rounded-xl border border-white/70 bg-white/60 text-slate-500 hover:text-slate-800 hover:bg-white transition">
                <Plus size={15} />
              </button>
              <button onClick={() => setOpen(false)} title={t.close}
                className="grid h-8 w-8 place-items-center rounded-xl border border-white/70 bg-white/60 text-slate-500 hover:text-slate-800 hover:bg-white transition">
                <X size={15} />
              </button>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {!messages.length && !busy && (
                <div className="pt-4 text-center">
                  <div className="mx-auto mb-3 w-fit"><BotOrb size={104} mode="idle" interactive /></div>
                  <div className="text-[15px] font-black text-slate-800">{t.heroTitle}</div>
                  <p className="mx-auto mt-1.5 max-w-[290px] text-[12px] font-medium leading-relaxed text-slate-500">
                    {t.heroBody}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {t.chips.map((c) => (
                      <button key={c} onClick={() => send(c)}
                        className="rounded-full border border-white/80 bg-white/60 px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-glass-xs transition hover:bg-white hover:text-indigo-600">
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={cx('flex flex-col gap-2', m.role === 'user' ? 'items-end' : 'items-start')}>
                  <MessageBubble role={m.role} text={m.text} emergency={m.emergency} />
                  {(m.actions || []).map((a, j) => (
                    <div key={j} className="w-full max-w-[88%]"><ActionCard action={a} onQuick={send} /></div>
                  ))}
                </div>
              ))}

              {busy && (
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center gap-2">
                    <BotOrb size={24} mode="thinking" />
                    <span className="text-[11px] font-bold text-slate-400 animate-pulse">{t.thinking}</span>
                  </div>
                  <div className="w-full max-w-[88%]">
                    <AgentTrace pending={pendingTrace} />
                  </div>
                </div>
              )}
            </div>

            {/* composer */}
            <div className="relative shrink-0 border-t border-white/70 px-3 py-3">
              <LiveCategoryPreview text={input} lang={langPref} />
              <div className="flex items-end gap-2">
                <button
                  onClick={toggleMic}
                  className={cx(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-2xl border transition-all',
                    listening
                      ? 'border-rose-300 bg-rose-500 text-white shadow-glow-rose'
                      : 'border-white/80 bg-white/70 text-slate-500 hover:text-indigo-600 hover:bg-white'
                  )}
                  title={listening ? 'Stop' : t.mic}
                >
                  {listening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
                  }}
                  placeholder={listening ? t.placeholderListening : t.placeholder}
                  className="max-h-24 flex-1 resize-none rounded-2xl border border-white/80 bg-white/70 px-3.5 py-2.5 text-[12.5px] font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-400/20"
                />

                <button
                  onClick={() => send(input)}
                  disabled={!input.trim() || busy}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-3d-btn transition disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}
                >
                  <Send size={15} />
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <Sparkles size={9} /> {t.footer}
              </div>
            </div>

            <HistoryDrawer
              open={historyOpen}
              onClose={() => setHistoryOpen(false)}
              onSelect={openPastChat}
              onNewChat={startNewChat}
              activeSessionId={sessionId}
              lang={langPref}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes nv-sweep { to { --a: 360deg; } }
        @property --a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
      `}</style>
    </>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Square, Send, Loader2, Check, Camera, X, MapPin, Building2, Layers,
  ShieldAlert, School, ArrowRight, Volume2, ShieldCheck, Clock, Zap, Sparkles, Brain
} from 'lucide-react'
import { submitGrievance } from '../../lib/api'
import { useStore } from '../../store/AppStore'
import { PriorityBadge } from '../../components/ui'
import { cx } from '../../lib/utils'

const SAMPLES = [
  'Manhole ka dhakkan gayab hai school ke saamne, raat me bahut khatarnaak hai bacchon ke liye',
  'Mere ghar ke paas transformer jal gaya hai, spark bhi ho raha hai',
  'Paani 4 din se nahi aaya hai humare area me, tanker bhi nahi bheja',
  'Street light band hai 2 hafte se, poori gali andhere me rehti hai'
]

const STAGES = ['transcribe', 'classify', 'geo', 'asset', 'cluster', 'harm', 'route', 'chain']

export default function CitizenPortal() {
  const nav = useNavigate()
  const { fileGrievance } = useStore()
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState(null)
  const [recording, setRecording] = useState(false)
  const [stages, setStages] = useState([])
  const [busy, setBusy] = useState(false)
  const [ticket, setTicket] = useState(null)
  const recog = useRef(null)
  const typer = useRef(null)

  useEffect(() => () => { clearInterval(typer.current); recog.current?.stop?.() }, [])

  function toggleRecord() {
    if (recording) { setRecording(false); recog.current?.stop?.(); clearInterval(typer.current); return }
    setTicket(null); setStages([]); setText(''); setRecording(true)
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) {
      const r = new SR()
      r.lang = 'hi-IN'; r.continuous = true; r.interimResults = true
      r.onresult = (e) => setText(Array.from(e.results).map((x) => x[0].transcript).join(' '))
      r.onend = () => setRecording(false)
      r.onerror = () => { setRecording(false); simulate() }
      recog.current = r
      try { r.start() } catch { simulate() }
    } else simulate()
  }

  function simulate() {
    const s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)]
    let i = 0
    clearInterval(typer.current)
    typer.current = setInterval(() => {
      i += 2; setText(s.slice(0, i))
      if (i >= s.length) { clearInterval(typer.current); setRecording(false) }
    }, 32)
  }

  function onPhoto(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const rd = new FileReader()
    rd.onload = () => setPhoto(rd.result)
    rd.readAsDataURL(f)
  }

  async function fire() {
    if (!text.trim() || busy) return
    setBusy(true); setTicket(null); setStages([])
    const t = await submitGrievance({
      text, channel: 'voice',
      onStage: (s) => setStages((p) => [...p.filter((x) => x.key !== s.key), s])
    })
    const saved = fileGrievance({ ...t, photo })
    setTicket(saved); setBusy(false)
  }

  const done = stages.filter((s) => s.state === 'done').length

  return (
    <div className="space-y-8 animate-slideUp">
      {/* ===== HERO BANNER (3D Glass) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-4xl p-7 md:p-10 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.06) 30%, rgba(6, 182, 212, 0.06) 70%, rgba(16, 185, 129, 0.05) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          boxShadow: '0 8px 32px -8px rgba(99, 102, 241, 0.1), 0 16px 48px -16px rgba(99, 102, 241, 0.06), inset 0 2px 0 rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px) saturate(180%)',
        }}>
        {/* Decorative orbs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-30 animate-breathe"
             style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3), transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-20 animate-breathe"
             style={{ background: 'radial-gradient(circle, rgba(6, 182, 212, 0.3), transparent 70%)', animationDelay: '2s' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest mb-4"
                 style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08))', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#4F46E5' }}>
              <Zap size={13} className="animate-pulse" /> Nivaran AI · Nagrik Seva Engine
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Aapki Aawaaz,<br/><span className="text-gradient">Sudhaar Ki Shuruat.</span>
            </h1>
            <p className="text-sm md:text-base text-slate-500 font-medium mt-3 max-w-2xl leading-relaxed">
              Boliye ya likhiye Hindi, Hinglish ya English mein. Humari AI aapki samasya ko samajhkar sahi municipal department aur officer tak 3 seconds mein pahunchati hai.
            </p>
          </div>
          <button onClick={() => nav('/citizen/track')} className="btn-ghost shadow-glass-sm shrink-0">
            <Clock size={16} /> Track My Grievances
          </button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {!ticket ? (
          <motion.div key="form" exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ===== LEFT: Voice Studio ===== */}
            <div className="lg:col-span-7 space-y-6">
              <div className="panel p-7 md:p-8 space-y-7 shadow-3d-float">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl grid place-items-center shadow-sm"
                         style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <Volume2 className="text-indigo-600" size={17} />
                    </div>
                    Voice Input Studio
                  </h2>
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100/60 px-3 py-1 rounded-full">Tap mic to speak</span>
                </div>

                {/* Mic */}
                <div className="flex flex-col items-center justify-center py-8 rounded-3xl relative overflow-hidden"
                     style={{
                       background: 'linear-gradient(180deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.03) 50%, rgba(6,182,212,0.02) 100%)',
                       border: '1px solid rgba(99,102,241,0.08)',
                     }}>
                  <button onClick={toggleRecord}
                    className="relative w-36 h-36 rounded-full grid place-items-center active:scale-95 transition-all duration-300 cursor-pointer group"
                    style={{ perspective: '600px' }}>
                    {recording && <span className="absolute inset-0 rounded-full animate-pulseRing" style={{ background: 'rgba(244, 63, 94, 0.3)' }} />}
                    {recording && <span className="absolute inset-0 rounded-full animate-pulseRing" style={{ background: 'rgba(244, 63, 94, 0.2)', animationDelay: '0.5s' }} />}
                    <span className={cx('absolute inset-0 rounded-full transition-all duration-500',
                      recording
                        ? 'shadow-glow-rose'
                        : 'shadow-glow-blue group-hover:shadow-glow-violet')}
                      style={{
                        background: recording
                          ? 'linear-gradient(135deg, #FCA5A5, #F87171, #EF4444)'
                          : 'linear-gradient(135deg, #818CF8, #6366F1, #4F46E5)',
                        border: '3px solid rgba(255,255,255,0.5)',
                      }} />
                    {recording
                      ? <Square size={40} className="relative text-white" fill="currentColor" />
                      : <Mic size={48} className="relative text-white group-hover:scale-110 transition-transform" />}
                  </button>
                  <p className="text-sm font-extrabold text-slate-700 mt-5 flex items-center gap-2">
                    {recording ? <><span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-sm" /> Sun raha hoon… Boliye aapki samsya</> : 'Mic par click karein aur boliye'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">Automatic Hinglish / Hindi / English transcription</p>
                </div>

                {/* Textarea */}
                <div>
                  <label className="label mb-2 block">Grievance Description (Ya likhein)</label>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
                    placeholder="E.g., Mere area me street light 2 din se band hai aur drainage overflow ho raha hai..."
                    className="w-full rounded-2xl p-4 text-sm font-medium text-slate-800 placeholder:text-slate-300 outline-none resize-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      border: '1px solid rgba(148,163,184,0.2)',
                      boxShadow: 'inset 0 2px 6px rgba(99,102,241,0.03), 0 1px 2px rgba(0,0,0,0.02)',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.4)'; e.target.style.boxShadow = 'inset 0 2px 6px rgba(99,102,241,0.03), 0 0 0 3px rgba(99,102,241,0.08)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(148,163,184,0.2)'; e.target.style.boxShadow = 'inset 0 2px 6px rgba(99,102,241,0.03), 0 1px 2px rgba(0,0,0,0.02)' }}
                  />
                </div>

                {/* Photo */}
                <div>
                  <label className="label mb-2 block">Photo Evidence (Optional geotagged)</label>
                  {photo ? (
                    <div className="relative rounded-2xl overflow-hidden shadow-glass-md" style={{ border: '1px solid rgba(255,255,255,0.7)' }}>
                      <img src={photo} alt="evidence" className="w-full h-48 object-cover" />
                      <button onClick={() => setPhoto(null)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/70 backdrop-blur-md text-white grid place-items-center hover:bg-slate-900/90 transition-colors">
                        <X size={15} />
                      </button>
                      <div className="absolute bottom-3 left-3 chip text-white font-extrabold"
                           style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none' }}>
                        <MapPin size={11} /> Geotag Attached
                      </div>
                    </div>
                  ) : (
                    <label className="btn-ghost w-full py-5 text-sm font-bold cursor-pointer transition-all hover:shadow-glass-sm"
                           style={{ borderStyle: 'dashed', borderWidth: '2px', borderColor: 'rgba(99,102,241,0.2)' }}>
                      <Camera size={18} className="text-indigo-500" /> Photo Upload / Capture
                      <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                    </label>
                  )}
                </div>

                {/* Samples */}
                <div>
                  <span className="label mb-2 block">Quick Examples</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SAMPLES.map((s, i) => (
                      <button key={i} onClick={() => setText(s)}
                        className="text-left text-xs p-3.5 rounded-2xl font-semibold text-slate-600 flex items-center gap-2 transition-all hover-3d"
                        style={{
                          background: 'rgba(255,255,255,0.5)',
                          border: '1px solid rgba(148,163,184,0.15)',
                          boxShadow: '0 2px 8px -2px rgba(99,102,241,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
                        }}>
                        <Sparkles size={13} className="text-amber-500 shrink-0" />
                        <span className="truncate">{s}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button onClick={fire} disabled={!text.trim() || busy}
                  className="btn-emerald w-full py-4 text-base font-extrabold disabled:opacity-40">
                  {busy ? <><Loader2 size={20} className="animate-spin" /> Processing AI Pipeline…</> : <><Send size={20} /> Submit Grievance</>}
                </button>
              </div>
            </div>

            {/* ===== RIGHT: AI Stream & Guidance ===== */}
            <div className="lg:col-span-5 space-y-6">
              <AnimatePresence>
                {stages.length > 0 ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="panel p-6 shadow-3d-float">
                    <div className="flex items-center justify-between mb-5 pb-3" style={{ borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
                      <span className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <Brain size={17} className="text-indigo-600 animate-pulse" /> Live AI Engine
                      </span>
                      <span className="text-[11px] font-extrabold px-3 py-1 rounded-full"
                            style={{ background: 'rgba(99,102,241,0.1)', color: '#4F46E5' }}>{done}/{STAGES.length}</span>
                    </div>
                    <div className="space-y-2.5">
                      {STAGES.map((k) => {
                        const s = stages.find((x) => x.key === k)
                        if (!s) return null
                        return (
                          <motion.div key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 rounded-2xl transition-all"
                            style={{
                              background: s.state === 'done' ? 'rgba(16,185,129,0.06)' : 'rgba(99,102,241,0.04)',
                              border: `1px solid ${s.state === 'done' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.1)'}`,
                            }}>
                            {s.state === 'done'
                              ? <div className="w-7 h-7 rounded-xl grid place-items-center shrink-0 shadow-sm"
                                     style={{ background: 'rgba(16,185,129,0.15)' }}><Check size={14} className="text-emerald-600" strokeWidth={3} /></div>
                              : <div className="w-7 h-7 rounded-xl grid place-items-center shrink-0 shadow-sm"
                                     style={{ background: 'rgba(99,102,241,0.12)' }}><Loader2 size={14} className="text-indigo-600 animate-spin" /></div>}
                            <span className={cx('text-xs font-bold', s.state === 'done' ? 'text-slate-700' : 'text-indigo-700')}>{s.label}</span>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                ) : (
                  <div className="panel p-7 md:p-8 space-y-5 shadow-3d-card"
                       style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(99,102,241,0.04) 100%)' }}>
                    <div className="w-14 h-14 rounded-3xl grid place-items-center shadow-glass-sm"
                         style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.12)' }}>
                      <ShieldCheck size={28} className="text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">How Nivaran AI Protects You</h3>
                    <ul className="space-y-3.5 text-[13px] font-semibold text-slate-600">
                      {[
                        ['Duplicate Clustering', 'Multiple reports of the same issue are fused into 1 high-priority incident automatically.'],
                        ['Priority Amplification', 'Issues near schools, hospitals, or dense residential zones get elevated priority.'],
                        ['Blockchain Audit Trail', 'Every action is cryptographically hashed on Polygon — no complaint can be silently erased.']
                      ].map(([title, desc]) => (
                        <li key={title} className="flex items-start gap-3 p-3 rounded-2xl"
                            style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(148,163,184,0.1)' }}>
                          <Sparkles size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                          <div><span className="text-slate-800 font-extrabold">{title}:</span> {desc}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          /* ===== RECEIPT VIEW ===== */
          <motion.div key="ok" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
            <div className="panel p-8 md:p-10 text-center space-y-6 shadow-3d-float"
                 style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(16,185,129,0.04))' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
                className="w-20 h-20 rounded-3xl grid place-items-center mx-auto shadow-glow-emerald"
                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Check size={40} strokeWidth={3} className="text-emerald-600" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Shikayat Safaltapoorvak Darj Ho Gayi</h2>
                <p className="font-mono text-base font-extrabold mt-2" style={{ color: '#059669' }}>Ticket ID: {ticket.id}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-4" style={{ borderTop: '1px solid rgba(148,163,184,0.15)' }}>
                <Row icon={Building2} label="Department" value={ticket.dept}
                     sub={`${ticket.categoryLabel} · ${(ticket.confidence * 100).toFixed(0)}% confidence`} />
                <Row icon={MapPin} label="Ward Location" value={`${ticket.wardName} (${ticket.wardId})`} />
                <Row icon={Layers} label="City Asset Link" value={ticket.assetId} sub="Entity-resolved via NLP" />
                {ticket.duplicateOf && (
                  <Row icon={Layers} label="Smart Clustering"
                       value={`${ticket.clusterSize} citizens reported this`}
                       sub="Fused into master incident" />
                )}
                {ticket.poiKind === 'school' && (
                  <Row icon={School} label="Vulnerability Risk" tone="text-rose-700 font-extrabold"
                       value={`School ${ticket.poiDistanceM}m away`}
                       sub="Priority boosted automatically" />
                )}
              </div>

              <div className="p-4 rounded-2xl text-left space-y-2.5"
                   style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(148,163,184,0.12)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-amber-500" /> Assigned SLA Priority
                  </span>
                  <PriorityBadge p={ticket.priority} />
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.15)' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${ticket.harmScore}%` }} transition={{ duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ background: ticket.priority === 'critical' ? 'linear-gradient(90deg, #EF4444, #DC2626)' : ticket.priority === 'high' ? 'linear-gradient(90deg, #F97316, #EA580C)' : 'linear-gradient(90deg, #F59E0B, #D97706)' }} />
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500 pt-1">
                  <span>Assigned: {ticket.officerName}</span>
                  <span className="text-slate-800 font-extrabold">{ticket.slaDays} Days SLA</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button onClick={() => nav('/citizen/track')} className="btn-primary flex-1 py-3 text-sm font-extrabold">
                  Track Grievances <ArrowRight size={16} />
                </button>
                <button onClick={() => { setTicket(null); setText(''); setPhoto(null); setStages([]) }}
                  className="btn-ghost flex-1 py-3 text-sm font-bold">
                  File Another
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Row({ icon: Icon, label, value, sub, tone = 'text-slate-900' }) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-2xl transition-all hover-3d"
         style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(148,163,184,0.1)', boxShadow: '0 2px 8px -2px rgba(99,102,241,0.03)' }}>
      <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0 mt-0.5 shadow-sm"
           style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.08)' }}>
        <Icon size={16} className="text-indigo-500" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="label text-[9px] text-slate-400 font-extrabold">{label}</div>
        <div className={cx('text-xs font-bold mt-0.5', tone)}>{value}</div>
        {sub && <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

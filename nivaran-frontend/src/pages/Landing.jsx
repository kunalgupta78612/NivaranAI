import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, HardHat, Building2, Lock, ArrowRight, Check, X, Shield, ShieldCheck,
  Sparkles, KeyRound, LogIn, UserPlus, ChevronRight, Zap, Globe
} from 'lucide-react'
import CivicGlobe from '../components/CivicGlobe'

/* ===========================================================================
   NIVARAN AI — Human-crafted Editorial Landing Page & Authentication
   =========================================================================== */

function useReveal() {
  const ref = useRef(null)
  const [seen, setSeen] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setSeen(true)
  }, [])
  return [ref, seen]
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, seen] = useReveal()
  return (
    <div ref={ref} className={`nv-reveal ${seen ? 'is-in' : ''} ${className}`}
         style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

function useTilt(max = 8) {
  const ref = useRef(null)
  const onMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${(-py * max).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(px * max).toFixed(2)}deg`)
    el.style.setProperty('--mx', `${(px * 100 + 50).toFixed(1)}%`)
    el.style.setProperty('--my', `${(py * 100 + 50).toFixed(1)}%`)
  }, [max])
  const onLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  }, [])
  return { ref, onMouseMove: onMove, onMouseLeave: onLeave }
}

function TiltCard({ children, className = '', max = 8 }) {
  const t = useTilt(max)
  return (
    <div className="nv-tilt-wrap">
      <div ref={t.ref} onMouseMove={t.onMouseMove} onMouseLeave={t.onMouseLeave}
           className={`nv-tilt ${className}`}>
        {children}
      </div>
    </div>
  )
}

function Counter({ to, suffix = '', decimals = 0, duration = 1400 }) {
  const [ref, seen] = useReveal()
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!seen) return
    let start = null, raf = 0
    const step = (ts) => {
      if (start === null) start = ts
      const p = Math.min(1, (ts - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setV(to * eased)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [seen, to, duration])
  return <span ref={ref}>{v.toFixed(decimals)}{suffix}</span>
}

const TICKER = [
  'Manhole ka dhakkan gayab hai school ke saamne',
  'Paani 4 din se nahi aaya hai humare area me',
  'Street light band hai 2 hafte se, gali andhere me',
  'Transformer se spark ho raha hai, kabhi bhi blast ho sakta hai',
  'Naali ka paani road pe aa raha hai, mosquito bahut',
  'Bahut bada gadda hai road pe, kal scooty wala gir gaya',
  'Awara kutte bahut ho gaye hain, kal bacche ko kaat liya',
  'Kachra 5 din se nahi uthaya gaya'
]

const FAILURES = [
  {
    n: '01',
    tag: 'Equity Disparity',
    title: 'Grievance Volume Is Not Problem Volume',
    body: 'Connected, affluent wards file significantly more complaints than marginalized neighborhoods — not due to fewer breakdowns, but due to digital access gaps. Standard systems reward the loudest voices while leaving silent communities unserved.'
  },
  {
    n: '02',
    tag: 'Closed-Loop Failure',
    title: 'Unverified Official Closures',
    body: 'Field staff often resolve their own tickets to satisfy internal SLA metrics. When the department controls its own audit trail, false resolution flags slip through undetected without mandatory citizen verification.'
  },
  {
    n: '03',
    tag: 'Infrastructure Memory',
    title: 'Repeated Maintenance Leakage',
    body: 'Complaints attach to text categories rather than physical asset entities. The same transformer is repaired a dozen times in six months, consuming capital without ever triggering a structural replacement recommendation.'
  }
]

const PILLARS = [
  {
    k: 'silence',
    label: 'Silence Detector',
    title: 'Surfacing the unheard citizens',
    body: 'Nivaran AI calculates expected grievance baselines from physical city indicators — population density, infrastructure age, road surface exposure — flagging wards whose silence signals structural exclusion.',
    stat: '8', statLabel: 'blind-spot wards identified in Indore',
    accent: 'from-rose-500 to-fuchsia-500'
  },
  {
    k: 'ghost',
    label: 'Closed-Loop Accountability',
    title: 'Resolution verified by the citizen',
    body: 'When an officer marks a case resolved with photo evidence, the system tags it as unverified. Only citizen confirmation permits permanent closure. Rejections instantly reopen, escalate, and record integrity penalties on Polygon.',
    stat: '0', statLabel: 'admin backdoor overrides in contract',
    accent: 'from-violet-500 to-indigo-500'
  },
  {
    k: 'asset',
    label: 'Asset Intelligence',
    title: 'Grievances as physical sensor data',
    body: 'Every incident binds to the specific asset (pipe, transformer, streetlight). When repeat repairs exceed replacement cost, Nivaran AI prompts capital asset replacement, stopping endless repair spend.',
    stat: '46', statLabel: 'civic assets entity-resolved from free text',
    accent: 'from-cyan-500 to-violet-500'
  }
]

const PIPELINE = [
  ['Voice Input', 'Understands spoken Hindi, Hinglish, or English naturally'],
  ['Smart Routing', 'Identifies the exact issue & responsible municipal department'],
  ['Location Match', 'Pins precise GPS coordinates from local landmark descriptions'],
  ['Asset Linking', 'Attaches report to the specific streetlight, transformer or drain'],
  ['Auto-Merge', 'Groups duplicate reports from neighbors into 1 central case'],
  ['Safety Priority', 'Escalates urgency for issues near schools & hospitals'],
  ['Direct Dispatch', 'Assigns directly to the ground officer on duty with an SLA timer'],
  ['Public Audit', 'Locks immutable proof on Polygon so no complaint is erased']
]

const ROLES = [
  {
    name: 'Citizen Portal',
    sub: 'Voice-first · Multilingual',
    desc: 'Speak or write in your natural language. Attach photo evidence, track live progress, and retain final approval over every resolution.',
    to: '/citizen',
    roleKey: 'citizen',
    dot: 'bg-emerald-400'
  },
  {
    name: 'Ground Officer Board',
    sub: 'Field queue · SLA timers',
    desc: 'AI-routed work items with live countdowns, map directions, and mandatory photo proof verification upon completion.',
    to: '/officer',
    roleKey: 'officer',
    dot: 'bg-amber-400'
  },
  {
    name: 'Command Center',
    sub: 'God Mode · City-wide intelligence',
    desc: 'Real-time incident cluster maps, Silence Detector anomaly heatmaps, asset maintenance tracking, and officer integrity ratings.',
    to: '/admin',
    roleKey: 'admin',
    dot: 'bg-violet-500'
  }
]

const CONTRACT = `function escalate(bytes32 grievanceId) external {
    Grievance storage g = grievances[grievanceId];
    require(block.timestamp > g.slaDeadline, "SLA not breached");
    require(g.status != Status.VerifiedResolved, "Already resolved");
    g.escalationLevel += 1;
    emit Escalated(grievanceId, g.escalationLevel, msg.sender);
}
// zero onlyOwner · zero pause() · zero backdoors`

export default function Landing() {
  const nav = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [authModal, setAuthModal] = useState(false)
  const [activeTab, setActiveTab] = useState('citizen')

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24)
    h()
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  function handleLogin(roleKey) {
    setAuthModal(false)
    if (roleKey === 'officer') nav('/officer')
    else if (roleKey === 'admin') nav('/admin')
    else nav('/citizen')
  }

  return (
    <div className="nv-root min-h-screen bg-[#FAFAFF] text-[#0B0B14] overflow-x-hidden">
      <NivaranStyles />

      {/* NAV */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'py-3' : 'py-5'}`}>
        <div className="mx-auto max-w-7xl px-5">
          <div className={`flex items-center justify-between gap-4 rounded-2xl px-4 md:px-6 py-3 transition-all duration-500 ${
            scrolled
              ? 'bg-white/80 backdrop-blur-2xl shadow-[0_8px_40px_-12px_rgba(99,102,241,0.18)] border border-white/80'
              : 'bg-white/50 backdrop-blur-xl border border-white/60'
          }`}>
            <a href="#top" className="flex items-center gap-3 shrink-0">
              <span className="w-10 h-10 rounded-2xl grid place-items-center text-white shadow-3d-btn"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #A855F7)' }}>
                <ShieldCheck size={20} strokeWidth={2.5} />
              </span>
              <span className="leading-none">
                <span className="block text-[16px] font-black tracking-tight text-gradient">NIVARAN AI</span>
                <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-indigo-500/80 mt-0.5">
                  Intelligent Civic Resolution
                </span>
              </span>
            </a>

            <nav className="hidden items-center gap-2 md:flex">
              {[['Problem', '#problem'], ['Approach', '#approach'], ['Dashboards', '#dashboards'], ['Pipeline', '#pipeline'], ['Trust', '#trust']]
                .map(([label, href]) => (
                  <a key={href} href={href}
                     className="rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-600 transition-all hover:bg-indigo-50/70 hover:text-indigo-600">
                    {label}
                  </a>
                ))}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <Link to="/login"
                className="px-4 py-2 text-xs font-extrabold text-slate-700 hover:text-indigo-600 transition-colors">
                Log in
              </Link>
              <Link to="/signup"
                className="nv-cta rounded-xl px-5 py-2.5 text-xs font-extrabold text-white shadow-lg flex items-center gap-1.5">
                <UserPlus size={14} /> Sign up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="relative min-h-[100svh] pt-36 pb-20">
        <div className="nv-aurora" aria-hidden="true" />
        <CivicGlobe className="pointer-events-none absolute inset-x-0 top-[4%] mx-auto h-[78vh] w-full max-w-[1400px] opacity-[0.92]" />

        <div className="relative mx-auto flex min-h-[76vh] max-w-7xl flex-col justify-center px-5">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-indigo-600 border border-white shadow-glass-xs backdrop-blur-md">
              <span className="nv-ping" /> Indore Municipal Corporation · Intelligent Public Infrastructure
            </span>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="nv-display mt-7 max-w-5xl text-[clamp(2.8rem,7.5vw,6.5rem)] font-black leading-[0.95] tracking-tight">
              Cities broken by silence.
              <br />
              <span className="nv-grad">Healed by intelligence.</span>
            </h1>
          </Reveal>

          <Reveal delay={170}>
            <p className="mt-8 max-w-xl text-[17px] leading-relaxed text-slate-600 font-medium md:text-[19px]">
              Nivaran AI converts natural voice grievances into physical asset telemetry, enforces closed-loop officer accountability, and ensures no citizen is left unheard.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button onClick={() => { setActiveTab('citizen'); setAuthModal(true) }}
                className="nv-cta nv-cta-lg rounded-2xl px-8 py-4 text-[15px] font-extrabold text-white shadow-xl flex items-center gap-2">
                <LogIn size={18} /> Enter Portal
              </button>
              <a href="#problem"
                 className="rounded-2xl bg-white/70 px-7 py-4 text-[15px] font-bold text-slate-700 border border-white/80 backdrop-blur-md shadow-sm transition-all hover:bg-white hover:shadow-md">
                Learn how it works
              </a>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
              {[
                ['Seconds to route', <Counter key="a" to={8} />, ''],
                ['Wards modelled', <Counter key="b" to={16} />, ''],
                ['Blind spots found', <Counter key="c" to={8} />, ''],
                ['Admin overrides', <Counter key="d" to={0} />, '']
              ].map(([label, val]) => (
                <div key={label}>
                  <dt className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">{label}</dt>
                  <dd className="nv-display mt-1 text-4xl font-black tracking-tight text-slate-900">{val}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* TICKER */}
      <section className="relative border-y border-indigo-100/60 bg-white/60 py-4 backdrop-blur-md">
        <div className="nv-marquee">
          <div className="nv-marquee-track">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="mx-8 inline-flex items-center gap-3 text-sm font-semibold text-slate-600">
                <Sparkles size={14} className="text-amber-500 shrink-0" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section id="problem" className="relative mx-auto max-w-7xl px-5 py-28 md:py-36">
        <Reveal>
          <p className="nv-eyebrow">Systemic Challenges</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="nv-display mt-5 max-w-4xl text-[clamp(2.2rem,4.8vw,4rem)] font-black leading-[1.02] tracking-tight text-slate-900">
            Why traditional complaint portals
            <br />
            <span className="text-slate-400">fail the citizens they serve.</span>
          </h2>
        </Reveal>
        <Reveal delay={150}>
          <p className="mt-8 max-w-2xl text-[17px] leading-relaxed text-slate-600 font-medium">
            Categorizing complaints into generic buckets is easy. Existing municipal portals fail not because of filing speed, but because of three structural design flaws.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {FAILURES.map((f, i) => (
            <Reveal key={f.n} delay={i * 110}>
              <TiltCard className="nv-card h-full rounded-3xl bg-white p-8 border border-white/80 shadow-glass-md">
                <span className="nv-display block text-[52px] font-black leading-none text-indigo-100">{f.n}</span>
                <span className="mt-5 inline-block rounded-full bg-rose-50 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-rose-600 border border-rose-100">
                  {f.tag}
                </span>
                <h3 className="mt-4 text-[21px] font-extrabold leading-snug tracking-tight text-slate-900">{f.title}</h3>
                <p className="mt-3.5 text-[14.5px] leading-relaxed text-slate-500 font-medium">{f.body}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* APPROACH */}
      <section id="approach" className="relative overflow-hidden bg-[#0F172A] py-28 text-white md:py-36">
        <div className="nv-dark-glow" aria-hidden="true" />
        <div className="relative mx-auto max-w-7xl px-5">
          <Reveal>
            <p className="nv-eyebrow text-indigo-400">Core Innovations</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="nv-display mt-5 max-w-4xl text-[clamp(2.2rem,4.8vw,4rem)] font-black leading-[1.02] tracking-tight">
              Three pillars of intelligent civic resolution.
            </h2>
          </Reveal>

          <div className="mt-16 space-y-6">
            {PILLARS.map((p, i) => (
              <Reveal key={p.k} delay={i * 90}>
                <TiltCard max={5} className="nv-card-dark grid gap-8 rounded-3xl p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12 border border-white/10">
                  <div>
                    <span className={`inline-block rounded-full bg-gradient-to-r ${p.accent} px-4 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-sm`}>
                      {p.label}
                    </span>
                    <h3 className="nv-display mt-5 max-w-2xl text-[clamp(1.5rem,2.6vw,2.3rem)] font-black leading-tight tracking-tight text-white">
                      {p.title}
                    </h3>
                    <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-300 font-medium">{p.body}</p>
                  </div>
                  <div className="shrink-0 md:text-right">
                    <div className={`nv-display bg-gradient-to-br ${p.accent} bg-clip-text text-[clamp(3.4rem,7vw,5.4rem)] font-black leading-none text-transparent`}>
                      {p.stat}
                    </div>
                    <div className="mt-2 max-w-[180px] text-[12px] leading-snug text-slate-400 font-semibold md:ml-auto">
                      {p.statLabel}
                    </div>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DASHBOARDS */}
      <section id="dashboards" className="relative mx-auto max-w-7xl px-5 py-28 md:py-36">
        <Reveal>
          <p className="nv-eyebrow">The Platform</p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="nv-display mt-5 max-w-4xl text-[clamp(2.2rem,4.8vw,4rem)] font-black leading-[1.02] tracking-tight text-slate-900">
            One unified architecture,<br />
            <span className="nv-grad">three specialized interfaces.</span>
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="mt-8 max-w-2xl text-[17px] leading-relaxed text-slate-600 font-medium">
            Every action taken in one dashboard instantly propagates across the entire ecosystem.
          </p>
        </Reveal>

        <div className="nv-stage mt-16 grid gap-6 md:grid-cols-3">
          {ROLES.map((r, i) => (
            <Reveal key={r.name} delay={i * 120}>
              <div onClick={() => { setActiveTab(r.roleKey); setAuthModal(true) }} className="group block cursor-pointer">
                <TiltCard max={10} className="nv-card h-full rounded-3xl bg-white p-7 border border-white/80 shadow-glass-md">
                  <div className="nv-mock mb-7">
                    {i === 0 && <MockPhone />}
                    {i === 1 && <MockBoard />}
                    {i === 2 && <MockAdmin />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${r.dot}`} />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{r.sub}</span>
                  </div>
                  <h3 className="nv-display mt-2.5 text-[24px] font-black tracking-tight text-slate-900">{r.name}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-slate-500 font-medium">{r.desc}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 transition-all group-hover:gap-2.5">
                    Sign in to access <ChevronRight size={14} />
                  </span>
                </TiltCard>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PIPELINE */}
      <section id="pipeline" className="relative border-y border-indigo-100/60 bg-white py-28 md:py-36">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal>
            <p className="nv-eyebrow">AI Pipeline</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="nv-display mt-5 max-w-4xl text-[clamp(2.2rem,4.8vw,4rem)] font-black leading-[1.02] tracking-tight text-slate-900">
              Spoken to assigned officer<br />
              <span className="nv-grad">in under three seconds.</span>
            </h2>
          </Reveal>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map(([title, body], i) => (
              <Reveal key={title} delay={i * 60}>
                <div className="nv-step group relative h-full rounded-2xl bg-[#F8FAFC] p-6 ring-1 ring-slate-200/60 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-glass-md">
                  <span className="nv-display text-xs font-black text-indigo-400">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-2 text-[16px] font-extrabold tracking-tight text-slate-900">{title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-500 font-medium">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section id="trust" className="relative overflow-hidden bg-[#0F172A] py-28 text-white md:py-36">
        <div className="nv-dark-glow nv-dark-glow-2" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-2 lg:items-center">
          <div>
            <Reveal><p className="nv-eyebrow text-indigo-400">On-Chain Audit Trail</p></Reveal>
            <Reveal delay={80}>
              <h2 className="nv-display mt-5 text-[clamp(2.2rem,4.2vw,3.5rem)] font-black leading-[1.04] tracking-tight">
                The audited party<br />
                cannot own the audit log.
              </h2>
            </Reveal>
            <Reveal delay={150}>
              <p className="mt-7 max-w-lg text-[16px] leading-relaxed text-slate-300 font-medium">
                Internal databases can be modified by department admins. Nivaran AI commits state transitions, proof CIDs, and escalation events to Polygon Amoy testnet. Personal data is never stored on-chain (DPDP Act compliant) — cryptographic hashes only.
              </p>
            </Reveal>
          </div>

          <Reveal delay={120}>
            <TiltCard max={6} className="nv-code rounded-3xl p-1">
              <div className="rounded-[1.25rem] bg-[#090D16] p-6 md:p-7 border border-white/10">
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 font-mono text-[11px] text-slate-400 font-bold">GrievanceRegistry.sol</span>
                </div>
                <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-indigo-300">
                  <code>{CONTRACT}</code>
                </pre>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-7xl px-5 py-28 md:py-36">
        <Reveal>
          <TiltCard max={4} className="nv-final relative overflow-hidden rounded-[2.5rem] px-8 py-20 text-center md:px-16 md:py-24 border border-white/40">
            <h2 className="nv-display relative mx-auto max-w-4xl text-[clamp(2.2rem,5vw,4.2rem)] font-black leading-[1.02] tracking-tight text-white">
              Civic resolution,<br />re-engineered.
            </h2>
            <div className="relative mt-10 flex flex-wrap justify-center gap-4">
              <button onClick={() => { setActiveTab('citizen'); setAuthModal(true) }}
                className="rounded-2xl bg-white px-8 py-4 text-[15px] font-extrabold text-indigo-700 transition-all hover:scale-105 shadow-2xl">
                Log in to Portal
              </button>
              <button onClick={() => { setActiveTab('admin'); setAuthModal(true) }}
                className="rounded-2xl bg-white/10 px-8 py-4 text-[15px] font-extrabold text-white ring-1 ring-white/30 backdrop-blur-md transition-all hover:bg-white/20">
                Access Admin Suite
              </button>
            </div>
          </TiltCard>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-indigo-100/60 bg-white/80 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl grid place-items-center text-white shadow-3d-btn"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
              <ShieldCheck size={16} strokeWidth={2.5} />
            </span>
            <div>
              <div className="text-[14px] font-black tracking-tight text-gradient">NIVARAN AI</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Intelligent Civic Resolution</div>
            </div>
          </div>
          <p className="text-center text-xs font-semibold text-slate-500">
            Indore Municipal Corporation · 2026
          </p>
        </div>
      </footer>

      {/* ===== AUTH MODAL (Human Sign In / Sign Up) ===== */}
      <AnimatePresence>
        {authModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center p-4"
            style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(16px)' }}
            onClick={() => setAuthModal(false)}>
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-4xl p-7 md:p-8 overflow-hidden shadow-2xl relative"
              style={{
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(32px) saturate(200%)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                boxShadow: '0 24px 64px -16px rgba(99, 102, 241, 0.25)'
              }}>
              <button onClick={() => setAuthModal(false)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 grid place-items-center transition-colors">
                <X size={16} />
              </button>

              <div className="mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 grid place-items-center text-white shadow-3d-btn"
                     style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                  <ShieldCheck size={22} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Nivaran AI Portal</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Select your access role to proceed</p>
              </div>

              {/* Role Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl mb-6 bg-slate-100/80 border border-slate-200/60">
                {[
                  { key: 'citizen', label: 'Citizen', icon: User },
                  { key: 'officer', label: 'Officer', icon: HardHat },
                  { key: 'admin', label: 'Admin', icon: Building2 }
                ].map((t) => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={cx('py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all',
                      activeTab === t.key
                        ? 'bg-white text-indigo-600 shadow-md scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-800')}>
                    <t.icon size={13} /> {t.label}
                  </button>
                ))}
              </div>

              {/* Role specific quick login */}
              <div className="space-y-4">
                {activeTab === 'citizen' && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-200 text-xs font-bold text-emerald-900 leading-relaxed">
                      👤 Citizen Demo Persona: Astha P. (Vijay Nagar, Ward 12)
                    </div>
                    <button onClick={() => handleLogin('citizen')}
                      className="btn-primary w-full py-3.5 text-sm font-extrabold shadow-lg flex items-center justify-center gap-2">
                      <LogIn size={16} /> Enter Citizen Portal
                    </button>
                  </div>
                )}

                {activeTab === 'officer' && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-200 text-xs font-bold text-amber-900 leading-relaxed">
                      👷 Ground Officer Persona: R. K. Sharma (PWD Zone 3)
                    </div>
                    <button onClick={() => handleLogin('officer')}
                      className="btn-primary w-full py-3.5 text-sm font-extrabold shadow-lg flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}>
                      <LogIn size={16} /> Open Officer Task Board
                    </button>
                  </div>
                )}

                {activeTab === 'admin' && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-200 text-xs font-bold text-indigo-900 leading-relaxed">
                      🏛️ Commissioner Persona: Indore Municipal Corporation
                    </div>
                    <button onClick={() => handleLogin('admin')}
                      className="btn-primary w-full py-3.5 text-sm font-extrabold shadow-lg flex items-center justify-center gap-2">
                      <LogIn size={16} /> Access City Command Center
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ArrowIcon({ small }) {
  const s = small ? 14 : 17
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function MockPhone() {
  return (
    <div className="nv-mock-inner grid h-44 place-items-center rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50">
      <div className="nv-float h-36 w-[92px] rounded-[14px] bg-white p-1.5 shadow-[0_18px_40px_-16px_rgba(76,29,149,0.5)] ring-1 ring-violet-100">
        <div className="mx-auto mb-1.5 h-1 w-6 rounded-full bg-slate-200" />
        <div className="grid h-[86px] place-items-center rounded-lg bg-gradient-to-b from-violet-50 to-white">
          <span className="nv-pulse grid h-9 w-9 place-items-center rounded-full bg-violet-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
              <path d="M6 11a6 6 0 0 0 12 0h-1.5a4.5 4.5 0 0 1-9 0H6Zm5.25 6.5h1.5V21h-1.5v-3.5Z" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  )
}

function MockBoard() {
  const cols = [[1, 1, 1], [1, 1], [1]]
  return (
    <div className="nv-mock-inner grid h-44 place-items-center rounded-2xl bg-gradient-to-br from-amber-50 to-violet-50">
      <div className="nv-float flex w-[86%] gap-1.5 rounded-xl bg-white p-2.5 shadow-[0_18px_40px_-16px_rgba(76,29,149,0.5)] ring-1 ring-violet-100">
        {cols.map((c, i) => (
          <div key={i} className="flex-1 space-y-1.5">
            <div className={`h-1.5 rounded-full ${i === 0 ? 'w-8 bg-slate-300' : i === 1 ? 'w-9 bg-cyan-300' : 'w-7 bg-emerald-300'}`} />
            {c.map((_, j) => (
              <div key={j} className="rounded-md bg-slate-50 p-1.5 ring-1 ring-slate-100">
                <div className="h-1 w-full rounded-full bg-slate-200" />
                <div className="mt-1 h-1 w-2/3 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MockAdmin() {
  return (
    <div className="nv-mock-inner grid h-44 place-items-center rounded-2xl bg-gradient-to-br from-violet-50 to-cyan-50">
      <div className="nv-float w-[86%] overflow-hidden rounded-xl bg-white shadow-[0_18px_40px_-16px_rgba(76,29,149,0.5)] ring-1 ring-violet-100">
        <div className="relative h-[74px] bg-gradient-to-br from-[#0B0B14] to-[#1a1435]">
          {[[22, 30, 9, '#F43F5E'], [46, 46, 6, '#FB923C'], [66, 24, 5, '#22D3EE'], [78, 56, 8, '#F43F5E']].map(([l, tp, s, c], i) => (
            <span key={i} className="nv-blip absolute rounded-full" style={{ left: `${l}%`, top: `${tp}%`, width: s, height: s, background: c }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function NivaranStyles() {
  return (
    <style>{`
.nv-root{
  --nv-1:#6366F1; --nv-2:#8B5CF6; --nv-3:#D946EF; --nv-4:#EC4899;
  font-family:'Plus Jakarta Sans','Inter',system-ui,sans-serif;
}
.nv-display{ font-family:'Outfit','Plus Jakarta Sans',system-ui,sans-serif; font-feature-settings:'ss01'; }
.nv-eyebrow{ font-size:11px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; color:#6366F1; }
.nv-grad{ background:linear-gradient(100deg,#6366F1,#8B5CF6 55%,#EC4899); -webkit-background-clip:text; background-clip:text; color:transparent; }
.nv-cta{ display:inline-flex; align-items:center; gap:.5rem; background:linear-gradient(120deg,#6366F1,#8B5CF6 50%,#D946EF); background-size:200% 100%; transition:all .3s ease; }
.nv-cta:hover{ background-position:100% 0; transform:translateY(-2px); box-shadow:0 18px 40px -12px rgba(99,102,241,0.5); }
.nv-ping{ width:6px; height:6px; border-radius:9999px; background:#6366F1; box-shadow:0 0 0 0 rgba(99,102,241,0.6); animation:nvPing 2s infinite; }
@keyframes nvPing{ 70%{ box-shadow:0 0 0 8px rgba(99,102,241,0) } 100%{ box-shadow:0 0 0 0 rgba(99,102,241,0) } }
.nv-aurora{ position:absolute; inset:-20% -10% auto -10%; height:120%; pointer-events:none; background:radial-gradient(48% 42% at 18% 22%, rgba(99,102,241,0.18), transparent 62%), radial-gradient(44% 40% at 82% 16%, rgba(139,92,246,0.15), transparent 64%); filter:blur(8px); animation:nvDrift 22s ease-in-out infinite alternate; }
@keyframes nvDrift{ from{ transform:translate3d(0,0,0) scale(1) } to{ transform:translate3d(-3%,2%,0) scale(1.06) } }
.nv-dark-glow{ position:absolute; inset:0; pointer-events:none; background:radial-gradient(38% 34% at 12% 8%, rgba(99,102,241,0.25), transparent 65%), radial-gradient(36% 32% at 88% 92%, rgba(139,92,246,0.18), transparent 66%); }
.nv-dark-glow-2{ background:radial-gradient(40% 36% at 85% 12%, rgba(99,102,241,0.25), transparent 64%), radial-gradient(34% 30% at 10% 88%, rgba(236,72,153,0.15), transparent 66%); }
.nv-reveal{ opacity:1; transform:none; }
.nv-reveal.is-in{ opacity:1; transform:none; }
.nv-tilt-wrap{ perspective:1100px; height:100%; }
.nv-tilt{ --rx:0deg; --ry:0deg; --mx:50%; --my:50%; height:100%; transform-style:preserve-3d; transform:rotateX(var(--rx)) rotateY(var(--ry)); transition:transform .5s cubic-bezier(.22,1,.36,1), box-shadow .5s ease; will-change:transform; }
.nv-card{ box-shadow:0 1px 2px rgba(16,12,45,.04), 0 12px 34px -18px rgba(99,102,241,0.20); border:1px solid rgba(255,255,255,0.8); }
.nv-card-dark{ background:radial-gradient(120% 140% at var(--mx) var(--my), rgba(99,102,241,0.16), transparent 55%), linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.02)); backdrop-filter:blur(10px); }
.nv-code{ background:linear-gradient(140deg, rgba(99,102,241,.45), rgba(139,92,246,.35) 45%, rgba(6,182,212,.25)); box-shadow:0 40px 90px -40px rgba(99,102,241,0.5); }
.nv-final{ background:radial-gradient(90% 120% at var(--mx,50%) var(--my,10%), rgba(255,255,255,.20), transparent 55%), linear-gradient(125deg,#4F46E5,#6366F1 42%,#8B5CF6 78%,#A855F7); box-shadow:0 50px 100px -40px rgba(99,102,241,0.5); }
.nv-marquee{ overflow:hidden; white-space:nowrap; display:flex; }
.nv-marquee-track{ display:inline-flex; animation:nvMarquee 38s linear infinite; }
@keyframes nvMarquee{ from{ transform:translate3d(0,0,0) } to{ transform:translate3d(-50%,0,0) } }
.nv-pulse{ animation:nvPulse 2s ease-in-out infinite; }
@keyframes nvPulse{ 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.08) } }
.nv-float{ animation:nvFloat 6s ease-in-out infinite; }
@keyframes nvFloat{ 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-6px) } }
.nv-blip{ animation:nvBlip 2.5s ease-in-out infinite alternate; }
@keyframes nvBlip{ 0%{ opacity:.3; transform:scale(.8) } 100%{ opacity:1; transform:scale(1.2) } }
`}</style>
  )
}

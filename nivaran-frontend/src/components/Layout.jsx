import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Activity, ChevronDown, Check, CheckCircle2, AlertTriangle, Info, XCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { ROLES, roleOfPath } from '../roles'
import { useStore } from '../store/AppStore'
import { cx } from '../lib/utils'
import { useLogout } from '../lib/authApi'

export default function Layout({ children }) {
  const loc = useLocation()
  const nav = useNavigate()
  const role = ROLES[roleOfPath(loc.pathname)]
  const { toast } = useStore()
  const logoutMutation = useLogout()
  const [open, setOpen] = useState(false)
  const box = useRef(null)

  useEffect(() => {
    const h = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  if (loc.pathname.startsWith('/citizen')) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen flex flex-col relative text-slate-900 selection:bg-indigo-500/20 selection:text-indigo-900">
      {/* ===== PREMIUM FLOATING 3D GLASS NAV ===== */}
      <header className="sticky top-0 z-40 px-4 md:px-8 pt-3 pb-1">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="max-w-7xl mx-auto h-16 px-5 md:px-6 rounded-3xl flex items-center justify-between gap-4"
          style={{
            background: 'rgba(255, 255, 255, 0.55)',
            backdropFilter: 'blur(24px) saturate(200%)',
            WebkitBackdropFilter: 'blur(24px) saturate(200%)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            borderTop: '1px solid rgba(255, 255, 255, 0.95)',
            boxShadow: '0 4px 16px -4px rgba(99, 102, 241, 0.08), 0 12px 36px -12px rgba(99, 102, 241, 0.06), inset 0 1.5px 0 rgba(255, 255, 255, 0.9)',
          }}>

          {/* Logo */}
          <button onClick={() => nav('/')} className="flex items-center gap-3 shrink-0 group text-left">
            <img src="/logo.png" alt="Nivaran AI Logo" className="w-12 h-12 object-contain transition-all group-hover:scale-105 drop-shadow-md" />
            <div className="hidden sm:block">
              <div className="font-black tracking-tight leading-none text-[17px] text-gradient">
                NIVARAN AI
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em] font-extrabold mt-0.5 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">Intelligent Civic Resolution</div>
            </div>
          </button>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto flex-1 justify-center">
            {role.nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === role.home}
                className={({ isActive }) => cx(
                  'px-4 py-2 rounded-2xl text-[13px] font-bold whitespace-nowrap transition-all duration-300 relative',
                  isActive
                    ? 'text-white shadow-3d-btn'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                )}
                style={({ isActive }) => isActive ? {
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  boxShadow: '0 4px 14px -2px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                } : {}}>
                {n.label}
              </NavLink>
            ))}
          </nav>

          {/* Role Switcher */}
          <div className="relative shrink-0" ref={box}>
            <button onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border border-white/50 bg-white/40 hover:bg-white/70 text-slate-700 shadow-glass-xs hover:shadow-glass-sm transition-all backdrop-blur-md">
              <div className="w-7 h-7 rounded-xl grid place-items-center shrink-0 shadow-sm"
                   style={{ background: `linear-gradient(135deg, ${role.accent}30, ${role.accent}15)` }}>
                <role.icon size={14} style={{ color: role.accent }} />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-[12px] font-extrabold text-slate-800 leading-none">{role.label}</div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{role.person}</div>
              </div>
              <ChevronDown size={14} className={cx('text-slate-400 transition-transform duration-300', open && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="absolute right-0 mt-3 w-80 p-2 rounded-3xl overflow-hidden z-50"
                  style={{
                    background: 'rgba(255, 255, 255, 0.75)',
                    backdropFilter: 'blur(28px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 16px 48px -12px rgba(99, 102, 241, 0.18), 0 6px 20px -4px rgba(30, 41, 59, 0.08)'
                  }}>
                  <div className="px-4 py-2 mb-1">
                    <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-400">Switch Dashboard Role</div>
                  </div>
                  {Object.values(ROLES).map((r) => (
                    <button key={r.key} onClick={() => { nav(r.home); setOpen(false) }}
                      className={cx('w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all text-left mb-0.5',
                        r.key === role.key
                          ? 'bg-white/80 shadow-glass-sm font-bold'
                          : 'hover:bg-white/50')}>
                      <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0 shadow-sm"
                           style={{ background: `linear-gradient(135deg, ${r.accent}30, ${r.accent}10)` }}>
                        <r.icon size={17} style={{ color: r.accent }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-extrabold text-slate-800 leading-tight">{r.label}</div>
                        <div className="text-[11px] text-slate-400 truncate font-semibold">{r.blurb}</div>
                      </div>
                      {r.key === role.key && <Check size={16} style={{ color: r.accent }} strokeWidth={3} />}
                    </button>
                  ))}
                  <button onClick={() => { nav('/'); setOpen(false) }}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all text-left mb-0.5 hover:bg-white/50">
                    <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0 shadow-sm"
                         style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))' }}>
                      <ShieldCheck size={17} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-extrabold text-indigo-600 leading-tight">Landing Page</div>
                      <div className="text-[11px] text-slate-400 truncate font-semibold">Interactive 3D Globe & Overview</div>
                    </div>
                  </button>
                  <div className="px-4 py-2.5 mt-1 rounded-2xl text-[10px] text-slate-400 leading-relaxed font-bold flex items-center gap-1.5"
                       style={{ background: 'rgba(99, 102, 241, 0.04)' }}>
                    <Sparkles size={12} className="text-amber-500 shrink-0" />
                    <span>Live sync: Actions in one view instantly propagate across all dashboards.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 relative z-[1]">{children}</main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className={cx('px-6 py-4 rounded-3xl flex items-center gap-3 max-w-[92vw]',
              'backdrop-blur-xl border')}
              style={{
                background: toast.tone === 'ok' ? 'rgba(16, 185, 129, 0.12)' : toast.tone === 'bad' ? 'rgba(244, 63, 94, 0.12)' : toast.tone === 'warn' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                borderColor: toast.tone === 'ok' ? 'rgba(16, 185, 129, 0.3)' : toast.tone === 'bad' ? 'rgba(244, 63, 94, 0.3)' : toast.tone === 'warn' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(99, 102, 241, 0.3)',
                boxShadow: '0 12px 36px -8px rgba(0, 0, 0, 0.1)'
              }}>
              {toast.tone === 'ok' && <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
              {toast.tone === 'bad' && <XCircle size={18} className="text-rose-600 shrink-0" />}
              {toast.tone === 'warn' && <AlertTriangle size={18} className="text-amber-600 shrink-0" />}
              {!['ok', 'bad', 'warn'].includes(toast.tone) && <Info size={18} className="text-indigo-600 shrink-0" />}
              <span className="text-[13px] font-bold tracking-tight text-slate-800">{toast.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}


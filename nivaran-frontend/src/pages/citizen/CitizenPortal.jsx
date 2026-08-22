import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Plus, Clock, MapPin, Bell, User, Settings, LogOut, Search,
  ArrowRight, ShieldCheck, Layers, AlertTriangle, RotateCcw, ThumbsUp, Camera,
  X, Sparkles, Brain, Building2, Volume2, Square, Send, Loader2,
  CheckCircle2, Users, Calendar, Check, ShieldAlert, Eye, EyeOff, Lock, FileText, Hash, Mic,
  Wand2, FileEdit, CheckSquare, Globe, MessageSquare, PhoneCall, Smartphone, Trash2, HelpCircle, Zap, Shield, KeyRound
} from 'lucide-react'
import { submitGrievance, CATEGORIES, WARDS } from '../../lib/api'
import { useStore } from '../../store/AppStore'
import { PriorityBadge } from '../../components/ui'
import { cx, timeAgo } from '../../lib/utils'
import { useCurrentCitizen, useLogout, useChangePassword } from '../../lib/authApi'
import { useMyGrievances, useGrievanceStats, useSubmitGrievance, useUpdateGrievanceStatus, useDeleteGrievance } from '../../lib/grievanceApi'

const SAMPLES = [
  'Manhole ka dhakkan gayab hai school ke saamne, raat me bahut khatarnaak hai bacchon ke liye',
  'Mere ghar ke paas transformer jal gaya hai, spark bhi ho raha hai',
  'Paani 4 din se nahi aaya hai humare area me, tanker bhi nahi bheja',
  'Street light band hai 2 hafte se, poori gali andhere me rehti hai'
]

const STAGES = ['transcribe', 'classify', 'geo', 'asset', 'cluster', 'harm', 'route', 'chain']

export default function CitizenPortal({ defaultTab }) {
  const nav = useNavigate()
  const loc = useLocation()
  const { data: userRes } = useCurrentCitizen()
  const logoutMutation = useLogout()
  const citizen = userRes?.citizen

  const citizenName = citizen?.fullName || 'Astha Patel'
  const citizenWard = citizen?.city ? `${citizen.city}, Ward 12` : 'Vijay Nagar, Ward 12'

  // Sync tab with URL or prop
  const [tab, setTab] = useState(() => {
    if (defaultTab) return defaultTab
    if (loc.pathname.includes('/settings')) return 'settings'
    if (loc.pathname.includes('/track')) return 'track'
    return 'dashboard'
  })

  const [formMode, setFormMode] = useState('form') // 'form' or 'voice'
  const [searchQuery, setSearchQuery] = useState('')
  const [lookupId, setLookupId] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)

  // Store data & settings
  const { mine, grievances, fileGrievance, citizenReopen, citizenConfirm, settings, updateCitizenSettings } = useStore()

  const isAasaan = Boolean(settings?.aasaanMode)

  // Delete Data Centrepiece Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteStage, setDeleteStage] = useState('confirm') // 'confirm' | 'erasing' | 'erased'

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pwdMsg, setPwdMsg] = useState(null)

  const changePasswordMutation = useChangePassword()

  function handleChangePasswordSubmit(e) {
    e.preventDefault()
    setPwdMsg(null)

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPwdMsg({ text: 'Kripya sabhi password fields ko bharein.', tone: 'bad' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPwdMsg({ text: 'Naya password aur confirm password match nahi ho rahe hain.', tone: 'bad' })
      return
    }

    if (newPassword.length < 6) {
      setPwdMsg({ text: 'Naya password kam se kam 6 characters ka hona chahiye.', tone: 'bad' })
      return
    }

    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: (data) => {
          setPwdMsg({ text: data.message || 'Password kamyabi se update ho gaya hai!', tone: 'ok' })
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
        },
        onError: (err) => {
          const errmsg = err?.response?.data?.message || 'Password update nahi ho saka. Purana password check karein.'
          setPwdMsg({ text: errmsg, tone: 'bad' })
        }
      }
    )
  }

  // Form & Voice Studio States
  const [category, setCategory] = useState('sanitation')
  const [selectedWard, setSelectedWard] = useState('W-12')
  const [subject, setSubject] = useState('')
  const [landmark, setLandmark] = useState('')
  const [text, setText] = useState('')
  const [nearSchool, setNearSchool] = useState(false)
  const [nightRisk, setNightRisk] = useState(false)
  const [footfallRisk, setFootfallRisk] = useState(false)

  const [photo, setPhoto] = useState(null)
  const [recording, setRecording] = useState(false)
  const [stages, setStages] = useState([])
  const [busy, setBusy] = useState(false)
  const [ticket, setTicket] = useState(null)
  const [outcome, setOutcome] = useState({})

  const recog = useRef(null)
  const typer = useRef(null)

  useEffect(() => () => { clearInterval(typer.current); recog.current?.stop?.() }, [])

  // Live MongoDB Grievances & Stats via TanStack Query
  const { data: myGrievancesRes } = useMyGrievances()
  const { data: grievanceStatsRes } = useGrievanceStats()
  const submitGrievanceMutation = useSubmitGrievance()
  const updateStatusMutation = useUpdateGrievanceStatus()
  const deleteGrievanceMutation = useDeleteGrievance()

  const mineList = Array.isArray(myGrievancesRes?.grievances) ? myGrievancesRes.grievances : []
  const liveStats = grievanceStatsRes?.stats

  const totalCount = liveStats?.total ?? mineList.length
  const inProgressCount = liveStats?.inProgress ?? mineList.filter((g) => g.status === 'in_progress').length
  const awaitingCount = liveStats?.awaiting ?? mineList.filter((g) => g.status === 'closed_unverified').length
  const resolvedCount = liveStats?.resolved ?? mineList.filter((g) => g.status === 'verified_resolved').length

  function handleSignOut() {
    logoutMutation.mutate(null, {
      onSettled: () => nav('/login')
    })
  }

  function fillDemoForm() {
    setCategory('road')
    setSelectedWard('W-12')
    setSubject('Deep pothole near school gate on main road')
    setLandmark('Vijay Nagar Main Road, Sector B, Near Oxford School')
    setText('Sadak pe bahut bada gadda ban gaya hai, kal ek scooty gir gayi thi. School ke bacche aate jaate hain, accident ka darr hai.')
    setNearSchool(true)
    setNightRisk(true)
  }

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
    const fullText = subject
      ? `${subject}. ${text} Location: ${landmark}`
      : text

    if (!fullText.trim() || busy) return
    setBusy(true); setTicket(null); setStages([])
    const t = await submitGrievance({
      text: fullText, channel: formMode === 'voice' ? 'voice' : 'web',
      onStage: (s) => setStages((p) => [...p.filter((x) => x.key !== s.key), s])
    })
    const saved = fileGrievance({
      ...t,
      photo,
      category,
      wardId: selectedWard,
      landmark: landmark || t.landmark
    })
    setTicket(saved); setBusy(false)
  }

  async function handleReopen(id) {
    try {
      await updateStatusMutation.mutateAsync({ id, status: 'reopened' })
      setOutcome((p) => ({ ...p, [id]: 'Ticket re-opened with CRITICAL priority and escalated on Polygon.' }))
      notify('Grievance re-opened and escalated', 'ok')
    } catch (err) {
      console.error('Failed to reopen grievance:', err)
      notify(err.message || 'Failed to reopen grievance', 'bad')
    }
  }

  async function handleConfirm(id) {
    try {
      await updateStatusMutation.mutateAsync({ id, status: 'verified_resolved' })
      notify('Grievance resolution confirmed and closed', 'ok')
    } catch (err) {
      console.error('Failed to confirm fix:', err)
      notify(err.message || 'Failed to confirm fix', 'bad')
    }
  }

  function startDeleteFlow() {
    setDeleteStage('erasing')
    setTimeout(() => {
      setDeleteStage('erased')
    }, 1500)
  }

  const doneCount = stages.filter((s) => s.state === 'done').length

  const filteredMine = mineList.filter((g) =>
    searchQuery === '' ||
    (g?.id || g?.ticketId || g?._id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g?.text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g?.categoryLabel || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeTrackTarget = selectedTicket || mineList.find((g) => (g?.id || g?.ticketId || g?._id || '').toLowerCase() === lookupId.trim().toLowerCase()) || mineList[0] || null

  return (
    <div className={cx("fixed inset-0 bg-[#FAFAFF] text-slate-900 flex overflow-hidden font-sans selection:bg-indigo-500/20 selection:text-indigo-900 z-50", isAasaan ? "text-base" : "text-xs")}>
      
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 pointer-events-none z-0"
           style={{
             background: 'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(99, 102, 241, 0.14) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 80%, rgba(139, 92, 246, 0.12) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 50% 50%, rgba(6, 182, 212, 0.06) 0%, transparent 50%)'
           }} />

      {/* ============================================================ */}
      {/* LEFT SIDEBAR (Signature Nivaran Glass Theme)                 */}
      {/* ============================================================ */}
      <aside className="w-64 bg-white/70 backdrop-blur-xl border-r border-white/80 flex flex-col justify-between shrink-0 select-none z-10 shadow-glass-sm">
        <div>
          {/* Top Logo & App Title */}
          <div className="p-5 flex items-center justify-between border-b border-slate-200/60">
            <button onClick={() => nav('/')} className="flex items-center gap-3 text-left group">
              <img src="/logo.png" alt="Nivaran AI Logo" className="w-12 h-12 object-contain transition-all group-hover:scale-105 drop-shadow-md" />
              <div>
                <div className="text-base font-black tracking-tight text-gradient">Nivaran AI</div>
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">Intelligent Civic Resolution</div>
              </div>
            </button>
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/80">
              CITIZEN
            </span>
          </div>

          {/* User Info Card in Sidebar */}
          <div className="p-3.5 mx-3 my-4 rounded-2xl bg-white/80 border border-white/90 shadow-glass-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 grid place-items-center font-black text-indigo-600 text-sm">
              {citizenName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className={cx("font-extrabold text-slate-800 truncate", isAasaan ? "text-sm" : "text-xs")}>{citizenName}</div>
              <div className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{citizenWard}</div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="px-3 space-y-1">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { key: 'file', label: 'New Grievance', icon: Plus },
              { key: 'my_grievances', label: 'My Grievances', icon: Clock },
              { key: 'track', label: 'Track Complaint', icon: MapPin },
              { key: 'notifications', label: 'Notifications', icon: Bell, badge: '2' },
              { key: 'profile', label: 'Citizen Profile', icon: User },
              { key: 'settings', label: 'Settings', icon: Settings },
            ].map((item) => {
              const active = tab === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => { setTab(item.key); setTicket(null) }}
                  className={cx(
                    'w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-extrabold transition-all duration-200',
                    isAasaan ? 'text-sm' : 'text-xs',
                    active
                      ? 'bg-indigo-600 text-white shadow-3d-btn'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                  )}>
                  <div className="flex items-center gap-3">
                    <item.icon size={isAasaan ? 18 : 16} className={active ? 'text-white' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={cx(
                      'px-1.5 py-0.5 text-[10px] font-black rounded-full',
                      active ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Bottom Sign Out */}
        <div className="p-4 border-t border-slate-200/60">
          <button
            onClick={handleSignOut}
            className={cx("w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-extrabold text-rose-600 hover:bg-rose-50/80 transition-colors", isAasaan ? "text-sm" : "text-xs")}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA WITH TOP HEADER BAR                        */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent overflow-hidden z-10">
        
        {/* Top Header Bar */}
        <header className="h-16 px-8 border-b border-slate-200/60 bg-white/40 backdrop-blur-xl flex items-center justify-between gap-4 shrink-0">
          {/* Search Box */}
          <div className="relative w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search grievances, wards, status..."
              className={cx("w-full rounded-2xl bg-white/70 border border-slate-200/80 pl-9 pr-4 py-1.5 font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all shadow-glass-xs", isAasaan ? "text-sm" : "text-xs")}
            />
          </div>

          {/* Right Header User / Notification */}
          <div className="flex items-center gap-4">
            {isAasaan && (
              <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                <Zap size={14} className="text-amber-600" /> Aasaan Mode Active
              </span>
            )}

            <button
              onClick={() => setTab('notifications')}
              className="relative p-2 rounded-2xl bg-white/70 border border-slate-200/80 text-slate-600 hover:text-indigo-600 hover:shadow-glass-xs transition-all">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </button>

            <div className="flex items-center gap-3 pl-3 border-l border-slate-200/80">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 grid place-items-center text-xs font-black text-indigo-600">
                {citizenName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className={cx("font-extrabold text-slate-800", isAasaan ? "text-sm" : "text-xs")}>{citizenName}</div>
                <div className="text-[10px] text-slate-400 font-bold">Verified Citizen â€¢ Ward 12</div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Main Body Scroll Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">

          {/* ============================================================ */}
          {/* TAB 1: DASHBOARD                                             */}
          {/* ============================================================ */}
          {tab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* 1. Hero Welcome Banner */}
              <div className="rounded-3xl p-7 md:p-8 panel shadow-3d-float relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                   style={{
                     background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(99,102,241,0.08) 50%, rgba(139,92,246,0.06) 100%)',
                     border: '1px solid rgba(255, 255, 255, 0.95)'
                   }}>
                <div className="relative z-10 space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Building2 size={12} /> Citizen Member Portal
                  </div>
                  <h1 className={cx("font-black text-slate-900 tracking-tight", isAasaan ? "text-3xl" : "text-2xl md:text-3xl")}>
                    Welcome back, <span className="text-gradient">{citizenName}</span>!
                  </h1>
                  <p className={cx("text-slate-500 font-semibold max-w-xl leading-relaxed", isAasaan ? "text-base" : "text-xs md:text-sm")}>
                    Indore Municipal Corporation â€¢ File complaints via form or voice intake, track SLA timers, and verify resolution proof.
                  </p>
                </div>

                <button
                  onClick={() => { setTab('file'); setTicket(null) }}
                  className={cx("btn-primary font-extrabold flex items-center gap-2 shadow-3d-btn shrink-0", isAasaan ? "px-6 py-3.5 text-sm" : "px-5 py-3 text-xs")}>
                  <Plus size={16} /> + New Grievance
                </button>
              </div>

              {/* 2. Row of 4 KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl panel shadow-glass-xs flex items-center justify-between hover-3d">
                  <div>
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Total Grievances</div>
                    <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">{totalCount}</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 grid place-items-center text-indigo-600">
                    <Users size={18} />
                  </div>
                </div>

                <div className="p-5 rounded-3xl panel shadow-glass-xs flex items-center justify-between hover-3d">
                  <div>
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">In Progress</div>
                    <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">{inProgressCount}</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 grid place-items-center text-purple-600">
                    <Calendar size={18} />
                  </div>
                </div>

                <div className="p-5 rounded-3xl panel shadow-glass-xs flex items-center justify-between hover-3d">
                  <div>
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Awaiting Verification</div>
                    <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">{awaitingCount}</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 grid place-items-center text-amber-600">
                    <Clock size={18} />
                  </div>
                </div>

                <div className="p-5 rounded-3xl panel shadow-glass-xs flex items-center justify-between hover-3d">
                  <div>
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Resolved & Closed</div>
                    <div className="text-2xl font-black text-slate-900 mt-2 tabular-nums">{resolvedCount}</div>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 grid place-items-center text-emerald-600">
                    <ShieldCheck size={18} />
                  </div>
                </div>
              </div>

              {/* 3. Row of 3 Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-6 rounded-3xl panel shadow-3d-card flex flex-col justify-between space-y-4 hover-3d">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 grid place-items-center text-emerald-600">
                      <FileEdit size={20} />
                    </div>
                    <h3 className={cx("font-extrabold text-slate-900", isAasaan ? "text-lg" : "text-base")}>New Grievance Form</h3>
                    <p className={cx("text-slate-500 font-semibold leading-relaxed", isAasaan ? "text-sm" : "text-xs")}>
                      Structured intake form with category, ward, landmark, vulnerability checks, and geotagged evidence upload.
                    </p>
                  </div>
                  <button
                    onClick={() => { setTab('file'); setTicket(null) }}
                    className="text-xs font-extrabold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 pt-2">
                    Open Form <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-6 rounded-3xl panel shadow-3d-card flex flex-col justify-between space-y-4 hover-3d">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 grid place-items-center text-indigo-600">
                      <Clock size={20} />
                    </div>
                    <h3 className={cx("font-extrabold text-slate-900", isAasaan ? "text-lg" : "text-base")}>My Grievances</h3>
                    <p className={cx("text-slate-500 font-semibold leading-relaxed", isAasaan ? "text-sm" : "text-xs")}>
                      View active ticket status, SLA countdowns, officer assignments, and live telemetry across your ward.
                    </p>
                  </div>
                  <button
                    onClick={() => setTab('my_grievances')}
                    className="text-xs font-extrabold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 pt-2">
                    View Tickets <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-6 rounded-3xl panel shadow-3d-card flex flex-col justify-between space-y-4 hover-3d">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-100 grid place-items-center text-purple-600">
                      <MapPin size={20} />
                    </div>
                    <h3 className={cx("font-extrabold text-slate-900", isAasaan ? "text-lg" : "text-base")}>Track Complaint</h3>
                    <p className={cx("text-slate-500 font-semibold leading-relaxed", isAasaan ? "text-sm" : "text-xs")}>
                      Look up any complaint ID, inspect live officer resolution photos, or trigger the Re-open penalty trap.
                    </p>
                  </div>
                  <button
                    onClick={() => setTab('track')}
                    className="text-xs font-extrabold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 pt-2">
                    Track Complaint <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* 4. Embedded Recent Stream */}
              <div className="p-6 rounded-3xl panel shadow-glass-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Clock size={16} className="text-indigo-600" /> Recent Grievances Stream
                  </h3>
                  <button onClick={() => setTab('my_grievances')} className="text-xs font-bold text-slate-400 hover:text-slate-800">
                    View All ({filteredMine.length})
                  </button>
                </div>

                <div className="space-y-3">
                  {filteredMine.slice(0, 3).map((g) => (
                    <div key={g.id} className="p-4 rounded-2xl bg-white/70 border border-slate-200/60 flex items-center justify-between gap-4 hover:bg-white transition-all shadow-glass-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] font-extrabold text-indigo-600 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100">{g.id}</span>
                          <PriorityBadge p={g.priority} />
                        </div>
                        <p className={cx("font-bold text-slate-800 truncate", isAasaan ? "text-sm" : "text-xs")}>{g.text}</p>
                        <div className="text-[10px] text-slate-400 font-semibold mt-1">{g.wardName} â€¢ {g.categoryLabel}</div>
                      </div>
                      <button onClick={() => { setSelectedTicket(g); setTab('track') }} className="btn-ghost text-xs px-3 py-1.5 font-extrabold">
                        Track Status
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: NEW GRIEVANCE (STRUCTURED FORM & VOICE STUDIO)        */}
          {/* ============================================================ */}
          {tab === 'file' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <AnimatePresence mode="wait">
                {!ticket ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Form & Intake */}
                    <div className="lg:col-span-7 space-y-6">
                      <div className="p-7 rounded-3xl panel shadow-3d-float space-y-6">
                        
                        {/* Header & Mode Switcher Pills */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/60">
                          <div>
                            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                              <FileEdit size={20} className="text-indigo-600" /> New Grievance Registration
                            </h2>
                            <p className="text-xs font-semibold text-slate-400 mt-0.5">
                              Fill out the structured form below or use AI Voice Studio to record audio.
                            </p>
                          </div>

                          <button onClick={fillDemoForm} type="button"
                            className="btn-ghost text-xs px-3 py-1.5 font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 flex items-center gap-1.5">
                            <Wand2 size={13} /> Auto-fill Demo Data
                          </button>
                        </div>

                        {/* Intake Mode Switcher */}
                        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100/80 border border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => setFormMode('form')}
                            className={cx('py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all',
                              formMode === 'form' ? 'bg-indigo-600 text-white shadow-3d-btn' : 'text-slate-600 hover:text-slate-900')}>
                            <FileEdit size={14} /> Structured Form Intake
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormMode('voice')}
                            className={cx('py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all',
                              formMode === 'voice' ? 'bg-indigo-600 text-white shadow-3d-btn' : 'text-slate-600 hover:text-slate-900')}>
                            <Mic size={14} /> AI Voice Studio
                          </button>
                        </div>

                        {/* MODE A: STRUCTURED FORM INTAKE */}
                        {formMode === 'form' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">Grievance Category *</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)}
                                  className="w-full rounded-2xl bg-white/80 border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-glass-xs">
                                  {CATEGORIES.map((c) => (
                                    <option key={c.key} value={c.key}>{c.label} ({c.dept})</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">Municipal Ward Location *</label>
                                <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)}
                                  className="w-full rounded-2xl bg-white/80 border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-glass-xs">
                                  {WARDS.map((w) => (
                                    <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">Grievance Subject / Title *</label>
                              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                                placeholder="E.g., Deep pothole on main road causing accidents near school"
                                className="w-full rounded-2xl bg-white/80 border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all shadow-glass-xs"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">Landmark / Street Address *</label>
                              <div className="relative">
                                <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)}
                                  placeholder="E.g., Gali No. 4, Near Oxford School, Vijay Nagar Main Road"
                                  className="w-full rounded-2xl bg-white/80 border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all shadow-glass-xs"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">Detailed Explanation (Hindi / Hinglish / English) *</label>
                              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
                                placeholder="Provide complete details about the issue, how long it has been broken, and urgent risks..."
                                className="w-full rounded-2xl bg-white/80 border border-slate-200 p-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all shadow-glass-xs"
                              />
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/80 space-y-2.5">
                              <div className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wider">Vulnerability Risk Indicators (Auto Priority Boost)</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={nearSchool} onChange={(e) => setNearSchool(e.target.checked)} className="rounded text-indigo-600" />
                                  <span>Near School / College (+17 Harm Score)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={nightRisk} onChange={(e) => setNightRisk(e.target.checked)} className="rounded text-indigo-600" />
                                  <span>Night / Darkness Risk (+11 Harm Score)</span>
                                </label>
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-extrabold text-slate-700 mb-1.5 block">Photo Evidence (Optional Geotagged)</label>
                              {photo ? (
                                <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                                  <img src={photo} alt="evidence" className="w-full h-44 object-cover" />
                                  <button onClick={() => setPhoto(null)} className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white">
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <label className="p-4 rounded-2xl bg-white/70 border border-dashed border-slate-300 text-xs font-bold text-slate-500 flex items-center justify-center gap-2 cursor-pointer hover:border-indigo-500 transition-colors">
                                  <Camera size={16} className="text-indigo-600" /> Upload / Capture Photo Evidence
                                  <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                                </label>
                              )}
                            </div>

                            <button onClick={fire} disabled={(!subject.trim() && !text.trim()) || busy}
                              className="btn-emerald w-full py-3.5 text-xs font-extrabold shadow-3d-btn flex items-center justify-center gap-2 disabled:opacity-40">
                              {busy ? <><Loader2 size={16} className="animate-spin" /> Processing AI PipelineÃ¢â‚¬Â¦</> : <><Send size={16} /> Register Structured Grievance</>}
                            </button>
                          </div>
                        )}

                        {/* MODE B: AI VOICE STUDIO */}
                        {formMode === 'voice' && (
                          <div className="space-y-6">
                            <div className="flex flex-col items-center justify-center py-8 rounded-3xl bg-indigo-50/40 border border-indigo-100 relative overflow-hidden">
                              <button onClick={toggleRecord}
                                className="relative w-32 h-32 rounded-full grid place-items-center active:scale-95 transition-all duration-300 cursor-pointer group">
                                {recording && <span className="absolute inset-0 rounded-full animate-pulseRing bg-rose-500/30" />}
                                <span className={cx('absolute inset-0 rounded-full transition-all duration-500 shadow-3d-btn',
                                  recording ? 'bg-rose-600' : 'bg-gradient-to-br from-indigo-500 to-indigo-700')} />
                                {recording
                                  ? <Square size={36} className="relative text-white" fill="currentColor" />
                                  : <Mic size={42} className="relative text-white group-hover:scale-110 transition-transform" />}
                              </button>
                              <p className="text-xs font-extrabold text-slate-800 mt-4 flex items-center gap-2">
                                {recording ? <><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Sun raha hoonÃ¢â‚¬Â¦ Boliye aapki samasya</> : 'Mic par click karein aur boliye'}
                              </p>
                              <p className="text-[11px] text-slate-400 font-semibold mt-1">Automatic Hinglish / Hindi / English transcription</p>
                            </div>

                            <div>
                              <label className="text-xs font-extrabold text-slate-700 mb-2 block">Voice Transcript / Notes</label>
                              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
                                placeholder="Voice transcription will appear here automatically..."
                                className="w-full rounded-2xl bg-white/80 border border-slate-200 p-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all shadow-glass-xs"
                              />
                            </div>

                            <div>
                              <span className="text-[11px] font-extrabold text-slate-400 block mb-2">Try Voice Complaint Examples</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {SAMPLES.map((s, i) => (
                                  <button key={i} onClick={() => setText(s)}
                                    className="text-left text-xs p-3 rounded-2xl font-bold text-slate-700 bg-white/70 border border-slate-200/60 truncate hover:border-indigo-300 transition-all">
                                    Ã°Å¸Å½Â¤ "{s.slice(0, 35)}Ã¢â‚¬Â¦"
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button onClick={fire} disabled={!text.trim() || busy}
                              className="btn-emerald w-full py-3.5 text-xs font-extrabold shadow-3d-btn flex items-center justify-center gap-2 disabled:opacity-40">
                              {busy ? <><Loader2 size={16} className="animate-spin" /> Processing AI PipelineÃ¢â‚¬Â¦</> : <><Send size={16} /> Submit Voice Grievance</>}
                            </button>
                          </div>
                        )}

                      </div>
                    </div>

                    {/* Right: AI Guidance Stream */}
                    <div className="lg:col-span-5 space-y-6">
                      <div className="p-7 rounded-3xl panel shadow-3d-card space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                          <span className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                            <Brain size={16} className="text-indigo-600 animate-pulse" /> Live AI Engine Stream
                          </span>
                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600">{doneCount}/{STAGES.length}</span>
                        </div>
                        <div className="space-y-2">
                          {STAGES.map((k) => {
                            const s = stages.find((x) => x.key === k)
                            return (
                              <div key={k} className="p-3 rounded-2xl bg-white/70 border border-slate-200/60 flex items-center gap-3">
                                {s?.state === 'done'
                                  ? <Check size={14} className="text-emerald-600" />
                                  : <Loader2 size={14} className="text-indigo-600 animate-spin" />}
                                <span className="text-xs font-bold text-slate-700">{s?.label || k}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Receipt View */
                  <div className="max-w-2xl mx-auto p-8 rounded-3xl panel shadow-3d-float text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 grid place-items-center mx-auto text-emerald-600">
                      <Check size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">Grievance Registered Successfully</h2>
                      <p className="font-mono text-sm font-bold text-emerald-600 mt-1">Ticket ID: {ticket.id}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/80 border border-slate-200 text-left space-y-2">
                      <div className="text-xs font-extrabold text-slate-800">Department: {ticket.dept}</div>
                      <div className="text-xs font-semibold text-slate-500">Ward: {ticket.wardName} ({ticket.wardId})</div>
                      <div className="text-xs font-semibold text-slate-500">Assigned Officer: {ticket.officerName} ({ticket.slaDays} Days SLA)</div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => { setSelectedTicket(ticket); setTab('track') }} className="btn-primary flex-1 py-3 text-xs font-extrabold">
                        Track Complaint
                      </button>
                      <button onClick={() => { setTicket(null); setText(''); setSubject(''); setLandmark(''); setPhoto(null); setStages([]) }} className="btn-ghost flex-1 py-3 text-xs font-bold">
                        File Another
                      </button>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: MY GRIEVANCES                                         */}
          {/* ============================================================ */}
          {tab === 'my_grievances' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="p-6 rounded-3xl panel shadow-3d-card flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">My Grievances</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Active ticket records, status timeline, and citizen confirmation actions.</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-indigo-600 tabular-nums">{filteredMine.length}</div>
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">Total Tickets</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredMine.map((g) => {
                  const awaiting = g.status === 'closed_unverified'
                  const out = outcome[g.id]
                  return (
                    <div key={g.id} className="p-6 rounded-3xl panel shadow-3d-card space-y-4 flex flex-col justify-between hover-3d">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-indigo-600 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100">{g.id}</span>
                          <PriorityBadge p={g.priority} />
                        </div>
                        <p className="text-xs font-bold text-slate-800 leading-relaxed line-clamp-3">{g.text}</p>
                        <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-2">
                          <span>{g.wardName}</span> Ã¢â‚¬Â¢ <span>{g.categoryLabel}</span> Ã¢â‚¬Â¢ <span>{timeAgo(g.createdAt)}</span>
                        </div>
                      </div>

                      {awaiting && !out && (
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                          <p className="text-xs font-extrabold text-amber-800">Officer claimed "Resolved". Confirm fix?</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => handleReopen(g.id)} className="btn-danger py-2 text-xs">
                              Re-open (Trap)
                            </button>
                            <button onClick={() => handleConfirm(g.id || g._id)} className="btn-emerald py-2 text-xs">
                              Confirm Fix
                            </button>
                          </div>
                        </div>
                      )}

                      {out && (
                        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 space-y-1">
                          <div>Ghost Closure Penalized</div>
                          <div className="text-[10px] text-slate-600 font-semibold">Ticket re-opened with CRITICAL priority and escalated on Polygon.</div>
                        </div>
                      )}

                      <button onClick={() => { setSelectedTicket(g); setTab('track') }} className="btn-ghost w-full text-xs py-2 font-extrabold">
                        Track Details & Map
                      </button>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: TRACK COMPLAINT                                       */}
          {/* ============================================================ */}
          {tab === 'track' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="p-7 rounded-3xl panel shadow-3d-float space-y-4">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <MapPin size={20} className="text-indigo-600" /> Track Complaint Status
                </h2>
                <p className="text-xs text-slate-500 font-semibold">
                  Lookup any complaint ID or select a grievance to inspect officer assignment, SLA deadline countdown, and on-chain verification proof.
                </p>

                <div className="flex gap-3 max-w-md pt-2">
                  <input
                    type="text"
                    value={lookupId}
                    onChange={(e) => setLookupId(e.target.value)}
                    placeholder="Enter Ticket ID (e.g. GRV-100000)"
                    className="flex-1 rounded-2xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all shadow-glass-xs"
                  />
                  <button onClick={() => setSelectedTicket(mineList.find((g) => (g?.id || g?.ticketId || g?._id || '').toLowerCase() === lookupId.trim().toLowerCase()) || null)}
                    className="btn-primary text-xs px-4 py-2.5 font-extrabold shadow-3d-btn">
                    Search Ticket
                  </button>
                </div>
              </div>

              {activeTrackTarget ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 p-7 rounded-3xl panel shadow-3d-card space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                      <div>
                        <span className="font-mono text-sm font-black text-indigo-600 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-100">
                          {activeTrackTarget.id}
                        </span>
                        <div className="text-[10px] text-slate-400 font-bold mt-2">Created {timeAgo(activeTrackTarget.createdAt)}</div>
                      </div>
                      <PriorityBadge p={activeTrackTarget.priority} />
                    </div>

                    <div>
                      <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">Issue Description</div>
                      <p className="text-sm font-bold text-slate-800 leading-relaxed">{activeTrackTarget.text}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/60">
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase">Assigned Officer</div>
                        <div className="text-xs font-extrabold text-slate-800 mt-1">{activeTrackTarget.officerName || 'R. K. Sharma'}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">{activeTrackTarget.dept || 'Public Works'}</div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/60">
                        <div className="text-[10px] font-extrabold text-slate-400 uppercase">SLA Commitment</div>
                        <div className="text-xs font-extrabold text-indigo-600 mt-1">{activeTrackTarget.slaDays || 2} Days SLA</div>
                        <div className="text-[10px] text-slate-500 font-semibold">Priority: {activeTrackTarget.priority}</div>
                      </div>
                    </div>

                    {activeTrackTarget.status === 'closed_unverified' && (
                      <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                        <div className="text-xs font-extrabold text-amber-800 flex items-center gap-2">
                          <Clock size={16} /> Officer Claimed Fix Completed
                        </div>
                        <p className="text-xs font-semibold text-slate-600">
                          The ground officer has submitted resolution proof. Does this match actual work done?
                        </p>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <button onClick={() => handleReopen(activeTrackTarget.id)} className="btn-danger py-2.5 text-xs font-extrabold">
                            <RotateCcw size={14} /> Re-open (Trap)
                          </button>
                          <button onClick={() => handleConfirm(activeTrackTarget.id || activeTrackTarget._id)} className="btn-emerald py-2.5 text-xs font-extrabold">
                            <ThumbsUp size={14} /> Confirm Fix
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-5 p-7 rounded-3xl panel shadow-3d-card space-y-6">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-indigo-600" /> Resolution Progress Rail
                    </h3>

                    <div className="space-y-4 relative pl-4 border-l-2 border-indigo-100">
                      {[
                        { title: 'Grievance Registered', desc: 'Audio transcribed & department assigned', done: true },
                        { title: 'AI Classification & Geo Routing', desc: `Bound to Ward ${activeTrackTarget.wardId || 'W-12'}`, done: true },
                        { title: 'Officer Dispatched', desc: activeTrackTarget.officerName, done: ['in_progress', 'closed_unverified', 'verified_resolved'].includes(activeTrackTarget.status) },
                        { title: 'Officer Resolution Proof', desc: 'Photos anchored on IPFS', done: ['closed_unverified', 'verified_resolved'].includes(activeTrackTarget.status) },
                        { title: 'Citizen Verification', desc: 'Final confirmation & closing', done: activeTrackTarget.status === 'verified_resolved' },
                      ].map((step, idx) => (
                        <div key={idx} className="relative space-y-1">
                          <div className={cx('absolute -left-[23px] top-0 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center',
                            step.done ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300')}>
                            {step.done && <Check size={10} strokeWidth={3} />}
                          </div>
                          <div className="text-xs font-extrabold text-slate-800">{step.title}</div>
                          <div className="text-[11px] font-semibold text-slate-400">{step.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="panel p-12 text-center text-slate-400 font-bold">
                  No ticket selected. Enter a ticket ID or select from My Grievances.
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: NOTIFICATIONS                                         */}
          {/* ============================================================ */}
          {tab === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-3xl">
              <div className="p-6 rounded-3xl panel shadow-3d-card">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Bell size={18} className="text-indigo-600" /> Notifications & Alerts
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  { title: 'Officer uploaded resolution proof for GRV-100000', desc: 'Please verify if the water pipeline leak was fixed.', time: '10m ago', unread: true },
                  { title: 'SLA Priority Boosted for GRV-100001', desc: 'Classified near school zone. Priority updated to CRITICAL.', time: '2h ago', unread: true },
                  { title: 'Grievance Anchored on Polygon', desc: 'Tx hash 0x7f...8a registered on Polygon Amoy testnet.', time: '1d ago', unread: false },
                ].map((n, i) => (
                  <div key={i} className={cx('p-4 rounded-2xl panel flex items-center justify-between gap-4 shadow-glass-xs', n.unread ? 'border-indigo-200 bg-indigo-50/30' : '')}>
                    <div>
                      <div className="text-xs font-extrabold text-slate-800">{n.title}</div>
                      <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{n.desc}</div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{n.time}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB 6: PROFILE                                               */}
          {/* ============================================================ */}
          {tab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
              <div className="p-7 rounded-3xl panel shadow-3d-float space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 grid place-items-center font-black text-2xl text-indigo-600">
                    {citizenName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{citizenName}</h2>
                    <div className="text-xs font-bold text-slate-400 mt-0.5">{citizen?.email || 'astha.patel@indorecivic.gov.in'}</div>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">
                      DPDP Privacy Protected
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200/60">
                  <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/60">
                    <div className="text-[10px] uppercase font-extrabold text-slate-400">Aadhaar (Masked)</div>
                    <div className="text-xs font-mono font-bold text-slate-800 mt-1">{citizen?.aadhaarNumber || 'XXXX-XXXX-9876'}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/60">
                    <div className="text-[10px] uppercase font-extrabold text-slate-400">Mobile Number</div>
                    <div className="text-xs font-mono font-bold text-slate-800 mt-1">{citizen?.mobile || '9876543210'}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/60">
                    <div className="text-[10px] uppercase font-extrabold text-slate-400">Address</div>
                    <div className="text-xs font-bold text-slate-800 mt-1">{citizen?.address || '74 Vijay Nagar Main Road'}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/60">
                    <div className="text-[10px] uppercase font-extrabold text-slate-400">City / State</div>
                    <div className="text-xs font-bold text-slate-800 mt-1">{citizen?.city || 'Indore'}, {citizen?.state || 'Madhya Pradesh'}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB 7: SETTINGS (PROMPT REQS: 4 SECTIONS IN EXACT ORDER)     */}
          {/* ============================================================ */}
          {tab === 'settings' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 max-w-3xl">
              
              {/* Settings Page Header */}
              <div className="p-7 rounded-3xl panel shadow-3d-float flex items-center justify-between gap-4">
                <div>
                  <h2 className={cx("font-black text-slate-900 flex items-center gap-2.5", isAasaan ? "text-2xl" : "text-xl")}>
                    <Settings size={isAasaan ? 24 : 20} className="text-indigo-600" /> Citizen Settings
                  </h2>
                  <p className={cx("font-semibold text-slate-400 mt-1", isAasaan ? "text-sm" : "text-xs")}>
                    Bhasha, contact channel, privacy control, aur aasaan mode preferences.
                  </p>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                  DPDP Compliant
                </span>
              </div>

              {/* Aasaan Mode Active Banner */}
              {isAasaan && (
                <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 text-white shadow-3d-btn flex items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 grid place-items-center shrink-0">
                    <Volume2 size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase tracking-wider">ðŸ“¢ Aasaan Voice-Guided Mode Active</div>
                    <div className="text-xs font-semibold opacity-90">Typography scaled up & simplified high-contrast UI enabled for low-digital-access wards.</div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* SECTION 1: BHASHA AUR AWAAZ                             */}
              {/* -------------------------------------------------------- */}
              <div className="p-7 rounded-3xl panel shadow-3d-card space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                  <h3 className={cx("font-black text-slate-900 flex items-center gap-2", isAasaan ? "text-lg" : "text-base")}>
                    <Globe size={18} className="text-indigo-600" /> 1. Bhasha aur awaaz
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">Speech & Language</span>
                </div>

                {/* Language Radio */}
                <div>
                  <label className={cx("font-extrabold text-slate-700 mb-3 block", isAasaan ? "text-sm" : "text-xs")}>Language Preference</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'hindi', label: 'Hindi (à¤¹à¤¿à¤‚à¤¦à¥€)', desc: 'Pure Hindi voice & text' },
                      { id: 'hinglish', label: 'Hinglish (Hindi + English)', desc: 'Code-mixed natural audio' },
                      { id: 'english', label: 'English', desc: 'Standard English interface' },
                    ].map((lang) => {
                      const selected = (settings?.language || 'hinglish') === lang.id
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => updateCitizenSettings({ language: lang.id })}
                          className={cx(
                            'p-4 rounded-2xl text-left border transition-all duration-200 flex flex-col justify-between',
                            selected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-3d-btn'
                              : 'bg-white/70 border-slate-200/80 text-slate-700 hover:border-indigo-300'
                          )}>
                          <div className="flex items-center justify-between">
                            <span className={cx("font-extrabold", isAasaan ? "text-base" : "text-xs")}>{lang.label}</span>
                            <div className={cx("w-4 h-4 rounded-full border-2 grid place-items-center", selected ? "border-white bg-white text-indigo-600" : "border-slate-300")}>
                              {selected && <Check size={10} strokeWidth={3} />}
                            </div>
                          </div>
                          <span className={cx("mt-2 text-[10px] font-medium", selected ? "text-indigo-100" : "text-slate-400")}>{lang.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Toggle: Jawab bol kar sunao */}
                <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-between gap-4 shadow-glass-xs">
                  <div className="space-y-1">
                    <div className={cx("font-extrabold text-slate-800 flex items-center gap-2", isAasaan ? "text-base" : "text-xs")}>
                      <Volume2 size={16} className="text-indigo-600" /> Jawab bol kar sunao (Text-to-Speech)
                    </div>
                    <p className={cx("text-slate-500 font-semibold", isAasaan ? "text-xs" : "text-[11px]")}>
                      AI grievance updates aur officer replies audio me bol kar sunayega.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateCitizenSettings({ ttsEnabled: !settings?.ttsEnabled })}
                    className={cx(
                      "w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5",
                      settings?.ttsEnabled ? "bg-indigo-600" : "bg-slate-300"
                    )}>
                    <span className={cx("w-5 h-5 rounded-full bg-white block transition-transform shadow-md", settings?.ttsEnabled ? "translate-x-6" : "translate-x-0")} />
                  </button>
                </div>

                {/* Helper line explaining low literacy accessibility */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-slate-700 text-xs font-semibold flex items-start gap-2.5">
                  <HelpCircle size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Accessibility Note:</strong> Jo bol kar shikayat karte hain, aksar woh padh bhi nahi sakte â€” isliye AI jawab sunana zaroori hai.
                  </span>
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* SECTION 2: MUJHE KAISE CONTACT KAREIN                    */}
              {/* -------------------------------------------------------- */}
              <div className="p-7 rounded-3xl panel shadow-3d-card space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                  <h3 className={cx("font-black text-slate-900 flex items-center gap-2", isAasaan ? "text-lg" : "text-base")}>
                    <MessageSquare size={18} className="text-indigo-600" /> 2. Mujhe kaise contact karein
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">Contact Channels</span>
                </div>

                {/* Channel Picker */}
                <div>
                  <label className={cx("font-extrabold text-slate-700 mb-3 block", isAasaan ? "text-sm" : "text-xs")}>Primary Contact Channel</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, desc: 'Instant chat alerts' },
                      { id: 'sms', label: 'SMS', icon: Smartphone, desc: 'Text messages' },
                      { id: 'ivr', label: 'IVR call', icon: PhoneCall, desc: 'Automated voice call' },
                      { id: 'push', label: 'Push', icon: Bell, desc: 'App notifications' },
                    ].map((c) => {
                      const selected = (settings?.contactChannel || 'whatsapp') === c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => updateCitizenSettings({ contactChannel: c.id })}
                          className={cx(
                            'p-3.5 rounded-2xl text-center border transition-all duration-200 flex flex-col items-center justify-center space-y-2',
                            selected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-3d-btn'
                              : 'bg-white/70 border-slate-200/80 text-slate-700 hover:border-indigo-300'
                          )}>
                          <c.icon size={20} className={selected ? 'text-white' : 'text-slate-500'} />
                          <div className={cx("font-extrabold", isAasaan ? "text-sm" : "text-xs")}>{c.label}</div>
                          <span className={cx("text-[9px] font-medium", selected ? "text-indigo-100" : "text-slate-400")}>{c.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Toggle: Call verification */}
                <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-between gap-4 shadow-glass-xs">
                  <div className="space-y-1">
                    <div className={cx("font-extrabold text-slate-800 flex items-center gap-2", isAasaan ? "text-base" : "text-xs")}>
                      <PhoneCall size={16} className="text-indigo-600" /> Verification ke liye call karo, message nahi
                    </div>
                    <p className={cx("text-slate-500 font-semibold", isAasaan ? "text-xs" : "text-[11px]")}>
                      Resolution verification ke waqt officer ka automated IVR call aayega.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateCitizenSettings({ callVerification: !settings?.callVerification })}
                    className={cx(
                      "w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5",
                      settings?.callVerification ? "bg-indigo-600" : "bg-slate-300"
                    )}>
                    <span className={cx("w-5 h-5 rounded-full bg-white block transition-transform shadow-md", settings?.callVerification ? "translate-x-6" : "translate-x-0")} />
                  </button>
                </div>

                {/* Load-Bearing Style Note */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/90 via-indigo-50/40 to-amber-50/90 border-2 border-amber-300/80 text-amber-900 shadow-glass-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-amber-800">
                    <ShieldAlert size={16} className="text-amber-600" /> Load-Bearing Resolution Verification Note
                  </div>
                  <p className={cx("font-bold text-amber-900/90 leading-relaxed", isAasaan ? "text-xs" : "text-[11px]")}>
                    Shikayat sulajhne ki pushti (the resolution-verification loop) depends on this being reachable â€” agar ye reachable nahi hua toh aapka ticket pending ho sakta hai.
                  </p>
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* SECTION 3: PRIVACY AUR MERA DATA (THE CENTREPIECE)       */}
              {/* -------------------------------------------------------- */}
              <div className="p-7 rounded-3xl panel shadow-3d-card space-y-6 border-2 border-indigo-200/80 bg-gradient-to-br from-white/90 via-indigo-50/20 to-white/90">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                  <div>
                    <h3 className={cx("font-black text-slate-900 flex items-center gap-2", isAasaan ? "text-lg" : "text-base")}>
                      <Lock size={18} className="text-indigo-600" /> 3. Privacy aur mera data
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">DPDP Act (Digital Personal Data Protection) Right-to-Erasure Controls</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                    On-Chain Proof
                  </span>
                </div>

                {/* Toggle: Gumnaam shikayat */}
                <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-between gap-4 shadow-glass-xs">
                  <div className="space-y-1">
                    <div className={cx("font-extrabold text-slate-800 flex items-center gap-2", isAasaan ? "text-base" : "text-xs")}>
                      <EyeOff size={16} className="text-indigo-600" /> Gumnaam shikayat karein (File Anonymously)
                    </div>
                    <p className={cx("text-slate-500 font-semibold", isAasaan ? "text-xs" : "text-[11px]")}>
                      Aapka naam aur PII public officer board aur reports se chhipayi jayegi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateCitizenSettings({ anonymousFiling: !settings?.anonymousFiling })}
                    className={cx(
                      "w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5",
                      settings?.anonymousFiling ? "bg-indigo-600" : "bg-slate-300"
                    )}>
                    <span className={cx("w-5 h-5 rounded-full bg-white block transition-transform shadow-md", settings?.anonymousFiling ? "translate-x-6" : "translate-x-0")} />
                  </button>
                </div>

                {/* Toggle: Sirf ward-level location */}
                <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-between gap-4 shadow-glass-xs">
                  <div className="space-y-1">
                    <div className={cx("font-extrabold text-slate-800 flex items-center gap-2", isAasaan ? "text-base" : "text-xs")}>
                      <MapPin size={16} className="text-indigo-600" /> Sirf ward-level location bhejein (Instead of Exact GPS)
                    </div>
                    <p className={cx("text-slate-500 font-semibold", isAasaan ? "text-xs" : "text-[11px]")}>
                      Exact lat/long GPS coordinates ki jagah sirf ward/locality boundary bhejein.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateCitizenSettings({ wardOnlyLocation: !settings?.wardOnlyLocation })}
                    className={cx(
                      "w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5",
                      settings?.wardOnlyLocation ? "bg-indigo-600" : "bg-slate-300"
                    )}>
                    <span className={cx("w-5 h-5 rounded-full bg-white block transition-transform shadow-md", settings?.wardOnlyLocation ? "translate-x-6" : "translate-x-0")} />
                  </button>
                </div>

                {/* Centrepiece Delete Data Button */}
                <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-2">
                      <Trash2 size={16} className="text-rose-600" /> DPDP Right-to-Erasure Action
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 mt-1">
                      Wipe all off-chain PII records while preserving immutable audit hash on Polygon ledger.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDeleteModalOpen(true); setDeleteStage('confirm') }}
                    className="btn-danger text-xs px-5 py-3 font-black shadow-3d-btn shrink-0 flex items-center gap-2">
                    <Trash2 size={14} /> Mera data delete karein
                  </button>
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* SECTION 4: AASAAN MODE                                   */}
              {/* -------------------------------------------------------- */}
              <div className="p-7 rounded-3xl panel shadow-3d-card space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                  <h3 className={cx("font-black text-slate-900 flex items-center gap-2", isAasaan ? "text-lg" : "text-base")}>
                    <Zap size={18} className="text-indigo-600" /> 4. Aasaan mode
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">Accessibility UI</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 flex items-center justify-between gap-4 shadow-glass-xs">
                  <div className="space-y-1">
                    <div className={cx("font-extrabold text-slate-800 flex items-center gap-2", isAasaan ? "text-base" : "text-xs")}>
                      <Zap size={16} className="text-amber-500" /> Aasaan Mode (High Contrast & Scaled Type)
                    </div>
                    <p className={cx("text-slate-500 font-semibold", isAasaan ? "text-xs" : "text-[11px]")}>
                      Visibly scales up typography, icon labels, and audio guidance across the citizen portal.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateCitizenSettings({ aasaanMode: !settings?.aasaanMode })}
                    className={cx(
                      "w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5",
                      settings?.aasaanMode ? "bg-indigo-600" : "bg-slate-300"
                    )}>
                    <span className={cx("w-5 h-5 rounded-full bg-white block transition-transform shadow-md", settings?.aasaanMode ? "translate-x-6" : "translate-x-0")} />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2.5">
                  <Sparkles size={16} className="text-indigo-600 shrink-0" />
                  <span>Kam digital access wale wards aur buzurg nagrikon ke liye aasaan UI mode.</span>
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* SECTION 5: PASSWORD BADLEIN (CHANGE PASSWORD)            */}
              {/* -------------------------------------------------------- */}
              <div className="p-7 rounded-3xl panel shadow-3d-card space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                  <h3 className={cx("font-black text-slate-900 flex items-center gap-2", isAasaan ? "text-lg" : "text-base")}>
                    <KeyRound size={18} className="text-indigo-600" /> 5. Password aur Security
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">Security Settings</span>
                </div>

                <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                  {pwdMsg && (
                    <div className={cx("p-4 rounded-2xl text-xs font-bold flex items-center gap-2",
                      pwdMsg.tone === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200')}>
                      {pwdMsg.tone === 'ok' ? <Check size={16} /> : <AlertTriangle size={16} />}
                      <span>{pwdMsg.text}</span>
                    </div>
                  )}

                  {/* Current Password */}
                  <div>
                    <label className={cx("font-extrabold text-slate-700 mb-1.5 block", isAasaan ? "text-sm" : "text-xs")}>Purana Password (Current Password) *</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                        className={cx("w-full rounded-2xl bg-white/80 border border-slate-200 pl-10 pr-10 py-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-glass-xs", isAasaan ? "text-sm" : "text-xs")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={cx("font-extrabold text-slate-700 mb-1.5 block", isAasaan ? "text-sm" : "text-xs")}>Naya Password (New Password) *</label>
                      <div className="relative">
                        <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className={cx("w-full rounded-2xl bg-white/80 border border-slate-200 pl-10 pr-4 py-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-glass-xs", isAasaan ? "text-sm" : "text-xs")}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={cx("font-extrabold text-slate-700 mb-1.5 block", isAasaan ? "text-sm" : "text-xs")}>Confirm Naya Password *</label>
                      <div className="relative">
                        <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className={cx("w-full rounded-2xl bg-white/80 border border-slate-200 pl-10 pr-4 py-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-glass-xs", isAasaan ? "text-sm" : "text-xs")}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="btn-primary w-full py-3 text-xs font-black shadow-3d-btn flex items-center justify-center gap-2 disabled:opacity-40">
                    {changePasswordMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <><KeyRound size={15} /> Password Update Karein</>}
                  </button>
                </form>
              </div>

            </motion.div>
          )}

        </main>
      </div>

      {/* ============================================================ */}
      {/* CENTREPIECE DELETE DATA MODAL & DPDP REVEAL ANIMATION         */}
      {/* ============================================================ */}
      <AnimatePresence>
        {deleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 grid place-items-center p-4">
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-3d-float border border-white space-y-6 relative overflow-hidden text-left">
              
              {/* Close Button */}
              <button
                onClick={() => { setDeleteModalOpen(false); setDeleteStage('confirm') }}
                className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                <X size={16} />
              </button>

              {/* STAGE A: CONFIRMATION */}
              {deleteStage === 'confirm' && (
                <div className="space-y-5">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 grid place-items-center text-rose-600">
                    <Trash2 size={26} />
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-900">Mera PII Data Delete Karein?</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      DPDP Act Right-to-Erasure under Indian Law. This will purge your off-chain profile data (Name, Phone, Aadhaar).
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs font-semibold">
                    <div className="text-slate-700 font-extrabold uppercase text-[10px]">Off-Chain PII Records to be Wiped:</div>
                    <div className="flex justify-between text-slate-600"><span>Full Name:</span> <span className="font-bold text-slate-800">{citizenName}</span></div>
                    <div className="flex justify-between text-slate-600"><span>Mobile Number:</span> <span className="font-mono font-bold text-slate-800">+91 98765 43210</span></div>
                    <div className="flex justify-between text-slate-600"><span>Aadhaar ID:</span> <span className="font-mono font-bold text-slate-800">XXXX-XXXX-9876</span></div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setDeleteModalOpen(false)}
                      className="btn-ghost flex-1 py-3 text-xs font-extrabold">
                      Cancel
                    </button>
                    <button
                      onClick={startDeleteFlow}
                      className="btn-danger flex-1 py-3 text-xs font-extrabold shadow-3d-btn flex items-center justify-center gap-2">
                      <Trash2 size={15} /> Haa, Delete Karein
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE B: ERASING ANIMATION */}
              {deleteStage === 'erasing' && (
                <div className="py-8 text-center space-y-5">
                  <Loader2 size={42} className="mx-auto text-rose-600 animate-spin" />
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Off-Chain Records Wipe Progressâ€¦</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1">Purging PII database tables under DPDP compliance rules...</p>
                  </div>
                </div>
              )}

              {/* STAGE C: REVEAL ANIMATED RESULT (EXACT PROMPT REQUIREMENTS) */}
              {deleteStage === 'erased' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
                  
                  <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                    <div className="text-sm font-black flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" /> Aapka record delete ho gaya.
                    </div>
                    <p className="text-xs font-bold text-emerald-800/90">
                      Off-chain personal PII data completely erased from MongoDB database.
                    </p>
                  </div>

                  {/* On-Chain Hash Reveal */}
                  <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 shadow-3d-card border border-slate-800 relative overflow-hidden">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                      <Shield size={12} /> Polygon Blockchain Ledger
                    </div>

                    <div className="font-mono text-xs font-bold text-amber-400 bg-slate-800/90 p-3 rounded-xl border border-slate-700/80 break-all select-all">
                      0x8f3a8b417e290f10c663b98c5204c21b
                    </div>

                    <p className="text-xs font-extrabold text-slate-300 italic">
                      "Chain par ab sirf ye bacha hai: <span className="font-mono text-amber-300">0x8f3aâ€¦c21b</span>. 32 bytes, jinka ab koi matlab nahi."
                    </p>
                  </div>

                  {/* Off-Chain vs On-Chain Comparison Diagram */}
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                      <div className="text-[10px] font-extrabold uppercase text-rose-700">Off-Chain Database</div>
                      <div className="text-xs font-bold line-through text-rose-500">[REDACTED PII]</div>
                      <div className="text-[9px] font-semibold text-rose-600">Erased under DPDP</div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 space-y-1">
                      <div className="text-[10px] font-extrabold uppercase text-indigo-700">Polygon Ledger</div>
                      <div className="text-xs font-mono font-bold text-indigo-900">0x8f3aâ€¦c21b</div>
                      <div className="text-[9px] font-semibold text-indigo-600">Immutable 32 Bytes Hash</div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setDeleteModalOpen(false); setDeleteStage('confirm') }}
                    className="btn-primary w-full py-3.5 text-xs font-black shadow-3d-btn">
                    Close / Re-run Demo
                  </button>
                </motion.div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}












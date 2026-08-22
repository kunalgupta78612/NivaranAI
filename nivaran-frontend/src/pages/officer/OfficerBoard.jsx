import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ListTodo, Activity, Bell, User, Settings, LogOut, Search,
  Clock, AlertTriangle, Camera, X, Loader2, Check, PlayCircle, MapPin,
  Layers, Hammer, PackageCheck, RotateCcw, ShieldAlert, Link2, Zap, Building2,
  Lock, Eye, EyeOff, KeyRound, Shield, CheckCircle2, Award, TrendingUp, Sparkles, Filter, CheckCircle
} from 'lucide-react'
import { CATEGORIES } from '../../lib/mockData'
import { PriorityBadge, StatTile, Select, Empty } from '../../components/ui'
import { cx, timeAgo } from '../../lib/utils'
import {
  useCurrentDepartment,
  useDepartmentLogout,
  useDepartmentGrievances,
  useUpdateGrievanceStatusDept,
  useDepartmentChangePassword
} from '../../lib/departmentAuthApi'

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { value: 'assigned', label: 'Assigned', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  { value: 'closed_unverified', label: 'Awaiting Verification', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  { value: 'verified_resolved', label: 'Resolved', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  { value: 'reopened', label: 'Reopened', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  { value: 'rejected', label: 'Rejected', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
]

const COLUMNS = [
  {
    key: 'todo',
    label: 'Pending & Assigned',
    icon: ListTodo,
    gradient: 'from-slate-400 to-slate-500',
    match: (g) => ['pending', 'assigned', 'reopened', 'escalated'].includes(g.status)
  },
  {
    key: 'doing',
    label: 'In Progress',
    icon: Hammer,
    gradient: 'from-indigo-500 to-violet-600',
    match: (g) => g.status === 'in_progress'
  },
  {
    key: 'done',
    label: 'Resolved & Closed',
    icon: PackageCheck,
    gradient: 'from-emerald-500 to-teal-600',
    match: (g) => ['closed_unverified', 'verified_resolved', 'rejected'].includes(g.status)
  }
]

function sla(g) {
  const deadline = g.slaDeadline || (new Date(g.createdAt || Date.now()).getTime() + (g.slaDays || 5) * 86400000)
  const ms = deadline - Date.now()
  if (ms <= 0) return { text: 'SLA BREACHED', breached: true, urgent: true }
  const h = ms / 3600000
  if (h < 24) return { text: `Breaches in ${Math.max(1, Math.round(h))}h`, urgent: true }
  return { text: `${Math.round(h / 24)}d left`, urgent: false }
}

export default function OfficerBoard() {
  const nav = useNavigate()
  const { data: deptData } = useCurrentDepartment()
  const logoutMutation = useDepartmentLogout()

  // Real database grievances query using TanStack Query
  const { data: grievancesResponse, isLoading: grievancesLoading, isError: grievancesError, refetch } = useDepartmentGrievances()
  const updateStatusMutation = useUpdateGrievanceStatusDept()

  const departmentUser = deptData?.department || {}
  const officerName = departmentUser.name || 'Department Officer'
  const officerDept = departmentUser.department || 'Department'
  const officerCity = departmentUser.city || 'Indore'
  const officerState = departmentUser.state || 'Madhya Pradesh'

  const rawGrievances = useMemo(() => {
    return grievancesResponse?.grievances || []
  }, [grievancesResponse])

  const [tab, setTab] = useState('dashboard')
  const [deptFilter, setDeptFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [modal, setModal] = useState(null)
  const [proof, setProof] = useState(null)
  const [saving, setSaving] = useState(false)
  const [updatingStatusId, setUpdatingStatusId] = useState(null)

  // Password Change State for Officer
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pwdMsg, setPwdMsg] = useState(null)

  const changePasswordMutation = useDepartmentChangePassword()

  const pool = useMemo(() => rawGrievances
    .filter((g) =>
      searchQuery === '' ||
      (g.ticketId && g.ticketId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (g.text && g.text.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (g.wardName && g.wardName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (g.citizen?.fullName && g.citizen.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [rawGrievances, searchQuery])

  const cols = COLUMNS.map((c) => ({ ...c, items: pool.filter(c.match) }))
  const breaching = pool.filter((g) => sla(g).urgent && !['verified_resolved', 'closed_unverified', 'rejected'].includes(g.status)).length
  const reopened = pool.filter((g) => g.status === 'reopened').length
  const awaitingVerification = pool.filter((g) => g.status === 'closed_unverified').length

  function handleStatusChange(grievanceId, newStatus) {
    setUpdatingStatusId(grievanceId)
    updateStatusMutation.mutate(
      { id: grievanceId, status: newStatus },
      {
        onSettled: () => {
          setUpdatingStatusId(null)
        }
      }
    )
  }

  function onProof(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const rd = new FileReader()
    rd.onload = () => setProof(rd.result)
    rd.readAsDataURL(f)
  }

  async function commit() {
    if (!modal) return
    setSaving(true)
    updateStatusMutation.mutate(
      { id: modal._id || modal.ticketId, status: 'closed_unverified' },
      {
        onSettled: () => {
          setSaving(false)
          setModal(null)
          setProof(null)
        }
      }
    )
  }

  function handleChangePasswordSubmit(e) {
    e.preventDefault()
    setPwdMsg(null)

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPwdMsg({ text: 'Please fill in all password fields.', tone: 'bad' })
      return
    }

    if (newPassword !== confirmPassword) {
      setPwdMsg({ text: 'New password and confirm password do not match.', tone: 'bad' })
      return
    }

    if (newPassword.length < 6) {
      setPwdMsg({ text: 'New password must be at least 6 characters long.', tone: 'bad' })
      return
    }

    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: (data) => {
          setPwdMsg({ text: data.message || 'Password successfully updated!', tone: 'ok' })
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
        },
        onError: (err) => {
          const errmsg = err?.response?.data?.message || 'Password update failed. Please check current password.'
          setPwdMsg({ text: errmsg, tone: 'bad' })
        }
      }
    )
  }

  return (
    <div className="fixed inset-0 bg-[#FAFAFF] text-slate-900 flex overflow-hidden font-sans selection:bg-indigo-500/20 selection:text-indigo-900 z-50 text-xs">
      
      {/* Background Mesh Gradient — Matching Citizen Theme */}
      <div className="absolute inset-0 pointer-events-none z-0"
           style={{
             background: 'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(99, 102, 241, 0.14) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 80%, rgba(139, 92, 246, 0.12) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 50% 50%, rgba(6, 182, 212, 0.06) 0%, transparent 50%)'
           }} />

      {/* ============================================================ */}
      {/* LEFT SIDEBAR (Citizen Light-Violet Theme Match)              */}
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
              DEPARTMENT
            </span>
          </div>

          {/* User Info Card in Sidebar */}
          <div className="p-3.5 mx-3 my-4 rounded-2xl bg-white/80 border border-white/90 shadow-glass-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 grid place-items-center font-black text-indigo-600 text-sm">
              {officerName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-slate-800 truncate text-xs">{officerName}</div>
              <div className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">{officerDept}</div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="px-3 space-y-1">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { key: 'board', label: 'All Grievances', icon: ListTodo, badge: pool.length.toString() },
              { key: 'analytics', label: 'Analytics & SLA', icon: Activity },
              { key: 'notifications', label: 'Notifications', icon: Bell, badge: reopened > 0 ? reopened.toString() : null },
              { key: 'profile', label: 'Department Profile', icon: User },
              { key: 'settings', label: 'Settings', icon: Settings },
            ].map((item) => {
              const active = tab === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={cx(
                    'w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-extrabold transition-all duration-200 text-xs',
                    active
                      ? 'bg-indigo-600 text-white shadow-3d-btn'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                  )}>
                  <div className="flex items-center gap-3">
                    <item.icon size={16} className={active ? 'text-white' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={cx(
                      'px-1.5 py-0.5 text-[10px] font-black rounded-full',
                      active ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white'
                    )}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer Logout */}
        <div className="p-3 border-t border-slate-200/60">
          <button
            onClick={() => {
              logoutMutation.mutate()
              nav('/login')
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-extrabold text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 transition-all text-xs">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MAIN RIGHT CONTENT AREA                                      */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        
        {/* TOP HEADER BAR */}
        <header className="h-16 bg-white/60 backdrop-blur-md border-b border-white/80 px-6 flex items-center justify-between gap-4 shrink-0 shadow-glass-xs">
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {tab === 'dashboard' && `${officerDept} Dashboard`}
              {tab === 'board' && 'Department Grievances'}
              {tab === 'analytics' && 'SLA Compliance & Metrics'}
              {tab === 'notifications' && 'Alerts & Reopened Grievances'}
              {tab === 'profile' && 'Department Details'}
              {tab === 'settings' && 'Account & Security Settings'}
            </h1>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{officerCity}, {officerState} • Live MongoDB Data</div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative hidden sm:block w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search citizen or ticket..."
                className="w-full rounded-2xl bg-white/80 border border-slate-200/80 pl-9 pr-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-glass-xs"
              />
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setTab('notifications')}
              className="relative p-2 rounded-xl bg-white/80 border border-slate-200/80 text-slate-600 hover:text-slate-900 transition-all shadow-glass-xs">
              <Bell size={16} />
              {reopened > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
            </button>

            {/* Profile Avatar Pill */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200/80">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 grid place-items-center text-xs font-black text-indigo-600">
                {officerName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-extrabold text-slate-800 text-xs">{officerName}</div>
                <div className="text-[10px] text-indigo-600 font-bold">{officerDept}</div>
              </div>
            </div>
          </div>
        </header>

        {/* DYNAMIC MAIN SCROLL AREA */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">

          {grievancesLoading && (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="font-bold text-xs">Loading department grievances from MongoDB...</span>
            </div>
          )}

          {grievancesError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between">
              <span>Failed to fetch department grievances from database.</span>
              <button onClick={() => refetch()} className="btn-ghost text-xs px-3 py-1 bg-white border border-rose-200 text-rose-700">Retry</button>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 1: DASHBOARD OVERVIEW                                    */}
          {/* ============================================================ */}
          {!grievancesLoading && tab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* Welcome Hero Banner */}
              <div className="p-7 rounded-3xl panel shadow-3d-float flex items-center justify-between gap-6 flex-wrap relative overflow-hidden"
                   style={{
                     background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(238,242,255,0.8) 100%)'
                   }}>
                <div className="relative z-10 space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Building2 size={12} /> {officerDept}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                    Welcome, <span className="text-gradient">{officerName}</span>!
                  </h1>
                  <p className="text-xs md:text-sm text-slate-500 font-semibold max-w-xl leading-relaxed">
                    {officerCity}, {officerState} • Manage citizen grievances assigned to {officerDept}. Update status in real-time.
                  </p>
                </div>

                <button
                  onClick={() => setTab('board')}
                  className="btn-primary font-extrabold flex items-center gap-2 shadow-3d-btn shrink-0 px-5 py-3 text-xs">
                  <ListTodo size={16} /> View All Grievances ({pool.length})
                </button>
              </div>

              {/* 4 3D KPI Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatTile icon={ListTodo} label="Total Grievances" value={pool.length} tone="indigo" sub="Database records" />
                <StatTile icon={AlertTriangle} label="Pending / In Progress" value={pool.filter(g => ['pending', 'assigned', 'in_progress', 'reopened'].includes(g.status)).length} tone="rose" sub="Action required" />
                <StatTile icon={RotateCcw} label="Reopened Complaints" value={reopened} tone="rose" sub="Citizen rejected fix" />
                <StatTile icon={PackageCheck} label="Resolved Grievances" value={pool.filter(g => ['verified_resolved', 'closed_unverified'].includes(g.status)).length} tone="violet" sub="Completed" />
              </div>

              {/* All Department Grievances Table/List with Status Dropdown */}
              <div className="p-7 rounded-3xl panel shadow-3d-card space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                  <div>
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <Zap size={18} className="text-indigo-600" /> Recent Citizen Grievances
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold">Live grievance records assigned to {officerDept}.</p>
                  </div>
                  <button onClick={() => setTab('board')} className="text-xs font-extrabold text-indigo-600 hover:text-indigo-700">
                    View All ({pool.length}) →
                  </button>
                </div>

                {pool.length === 0 ? (
                  <Empty>No citizen grievances found for {officerDept}.</Empty>
                ) : (
                  <div className="space-y-3">
                    {pool.slice(0, 8).map((g) => {
                      const s = sla(g)
                      const isUpdating = updatingStatusId === (g._id || g.ticketId)
                      return (
                        <div key={g._id || g.ticketId} className="p-4 rounded-2xl bg-white/80 border border-slate-200/70 flex flex-wrap items-center justify-between gap-4 hover:bg-white transition-all shadow-glass-xs">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-extrabold text-indigo-600 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100">
                                {g.ticketId || g._id}
                              </span>
                              <PriorityBadge p={g.priority || 'medium'} />
                              <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                                {g.categoryLabel || g.category}
                              </span>
                              {g.status === 'reopened' && (
                                <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 flex items-center gap-1">
                                  <ShieldAlert size={11} /> Reopened
                                </span>
                              )}
                            </div>

                            <p className="font-extrabold text-slate-800 text-xs leading-snug">{g.text}</p>

                            <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-3 flex-wrap pt-1">
                              <span className="flex items-center gap-1 text-slate-600 font-bold">
                                <User size={12} className="text-indigo-500" /> {g.citizen?.fullName || 'Citizen'}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin size={12} className="text-indigo-500" /> {g.wardName || g.landmark || officerCity}
                              </span>
                              <span className="flex items-center gap-1 text-slate-400">
                                <Clock size={12} /> {timeAgo(g.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Status Dropdown */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="relative">
                              <select
                                value={g.status || 'assigned'}
                                disabled={isUpdating}
                                onChange={(e) => handleStatusChange(g._id || g.ticketId, e.target.value)}
                                className={cx(
                                  "rounded-xl px-3 py-1.5 text-xs font-black outline-none border transition-all cursor-pointer",
                                  STATUS_OPTIONS.find(o => o.value === g.status)?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                                )}
                              >
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value} className="bg-white text-slate-800 font-bold">
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {isUpdating && (
                                <Loader2 size={14} className="animate-spin text-indigo-600 absolute -top-1 -right-1" />
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: KANBAN / ALL GRIEVANCES BOARD                        */}
          {/* ============================================================ */}
          {!grievancesLoading && tab === 'board' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="panel p-5 shadow-glass-sm flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    Department Grievance Queue ({pool.length}) <Zap size={16} className="text-indigo-600" />
                  </h2>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    Real grievances from MongoDB database assigned to {officerDept}.
                  </p>
                </div>
              </div>

              {/* Kanban Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {cols.map((c) => (
                  <div key={c.key} className="panel flex flex-col overflow-hidden max-h-[750px] shadow-3d-card">
                    <div className="panel-hd">
                      <h3 className="text-sm font-extrabold flex items-center gap-2.5 text-slate-900 relative z-[2]">
                        <div className={cx('w-8 h-8 rounded-xl grid place-items-center text-white shadow-sm bg-gradient-to-br', c.gradient)}>
                          <c.icon size={15} />
                        </div>
                        {c.label}
                      </h3>
                      <span className="text-xs font-extrabold px-2.5 py-1 rounded-full relative z-[2]"
                            style={{ background: 'rgba(99,102,241,0.08)', color: '#4F46E5' }}>{c.items.length}</span>
                    </div>

                    <div className="overflow-y-auto p-4 space-y-3 relative z-[2]">
                      {c.items.length === 0 && <Empty>No grievances in this column.</Empty>}
                      <AnimatePresence initial={false}>
                        {c.items.map((g) => {
                          const s = sla(g)
                          const isUpdating = updatingStatusId === (g._id || g.ticketId)
                          return (
                            <motion.div key={g._id || g.ticketId} layout
                              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                              className={cx('rounded-2xl p-4 transition-all hover-3d space-y-2.5',
                                g.status === 'reopened' ? 'ring-1 ring-rose-300/50' : '')}
                              style={{
                                background: g.status === 'reopened' ? 'rgba(244,63,94,0.04)' : 'rgba(255,255,255,0.75)',
                                border: `1px solid ${g.status === 'reopened' ? 'rgba(244,63,94,0.15)' : 'rgba(148,163,184,0.18)'}`,
                                boxShadow: '0 2px 8px -2px rgba(99,102,241,0.04), inset 0 1px 0 rgba(255,255,255,0.8)'
                              }}>

                              {g.status === 'reopened' && (
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-600 uppercase tracking-wider px-2 py-0.5 rounded-lg w-fit"
                                     style={{ background: 'rgba(244,63,94,0.08)' }}>
                                  <ShieldAlert size={11} /> Reopened · Escalated
                                </div>
                              )}

                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[11px] font-bold text-indigo-600 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100">{g.ticketId || g._id}</span>
                                <PriorityBadge p={g.priority || 'medium'} />
                              </div>

                              <p className="text-xs font-extrabold text-slate-800 leading-snug line-clamp-2">{g.text}</p>

                              {/* Citizen info */}
                              <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/50 space-y-1 text-[11px]">
                                <div className="font-bold text-slate-700 flex items-center gap-1">
                                  <User size={12} className="text-indigo-500" /> Citizen: {g.citizen?.fullName || 'Anonymous'}
                                </div>
                                {g.citizen?.mobile && (
                                  <div className="text-slate-400 font-semibold">Mobile: {g.citizen.mobile}</div>
                                )}
                                <div className="text-slate-400 font-semibold flex items-center gap-1">
                                  <MapPin size={11} className="text-slate-400" /> {g.wardName || g.landmark || officerCity}
                                </div>
                              </div>

                              {/* Status Dropdown inside Card */}
                              <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100">
                                <span className="text-[10px] font-extrabold text-slate-400 uppercase">Update Status:</span>
                                <select
                                  value={g.status || 'assigned'}
                                  disabled={isUpdating}
                                  onChange={(e) => handleStatusChange(g._id || g.ticketId, e.target.value)}
                                  className={cx(
                                    "rounded-xl px-2.5 py-1 text-xs font-black outline-none border transition-all cursor-pointer",
                                    STATUS_OPTIONS.find(o => o.value === g.status)?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                                  )}
                                >
                                  {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-white text-slate-800 font-bold">
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>

            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: ANALYTICS & METRICS                                   */}
          {/* ============================================================ */}
          {!grievancesLoading && tab === 'analytics' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-7 rounded-3xl panel shadow-3d-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-slate-400">Total Department Complaints</span>
                    <Award size={20} className="text-indigo-600" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">{pool.length}</div>
                  <p className="text-xs text-slate-500 font-semibold">Assigned to {officerDept} in MongoDB.</p>
                </div>

                <div className="p-7 rounded-3xl panel shadow-3d-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-slate-400">Resolution Rate</span>
                    <TrendingUp size={20} className="text-emerald-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">
                    {pool.length > 0 ? Math.round((pool.filter(g => ['verified_resolved', 'closed_unverified'].includes(g.status)).length / pool.length) * 100) : 100}%
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">Complaints marked resolved.</p>
                </div>

                <div className="p-7 rounded-3xl panel shadow-3d-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-slate-400">Reopened Count</span>
                    <Clock size={20} className="text-rose-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900">{reopened}</div>
                  <p className="text-xs text-slate-500 font-semibold">Rejected by citizens requiring re-inspection.</p>
                </div>
              </div>

            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: NOTIFICATIONS & ALERTS                                */}
          {/* ============================================================ */}
          {!grievancesLoading && tab === 'notifications' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="p-7 rounded-3xl panel shadow-3d-card space-y-5">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Bell size={18} className="text-indigo-600" /> Department Alert Feed
                </h3>

                <div className="space-y-3">
                  {reopened > 0 ? (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1">
                      <div className="text-xs font-extrabold flex items-center gap-2">
                        <ShieldAlert size={16} className="text-rose-600" /> {reopened} Complaint(s) Reopened by Citizen
                      </div>
                      <p className="text-xs font-semibold text-rose-800/90">
                        Citizen rejected previous resolution proof. Please review and update status.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                      No reopened complaints at this time.
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB 5: DEPARTMENT PROFILE                                    */}
          {/* ============================================================ */}
          {!grievancesLoading && tab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="p-7 rounded-3xl panel shadow-3d-card space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-slate-200/60">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 grid place-items-center text-xl font-black text-indigo-600">
                    {officerName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{officerName}</h2>
                    <div className="text-xs text-indigo-600 font-extrabold">{officerDept}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/70 space-y-1">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase">Department Name</div>
                    <div className="text-xs font-bold text-slate-800">{officerDept}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/70 space-y-1">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase">City & State</div>
                    <div className="text-xs font-bold text-slate-800">{officerCity}, {officerState}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/70 space-y-1">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase">Email Address</div>
                    <div className="text-xs font-mono font-bold text-slate-800">{departmentUser.email || 'N/A'}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/70 space-y-1">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase">Account Created</div>
                    <div className="text-xs font-bold text-slate-800">{timeAgo(departmentUser.createdAt)}</div>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* ============================================================ */}
          {/* TAB 6: DEPARTMENT SETTINGS & PASSWORD CHANGE                 */}
          {/* ============================================================ */}
          {!grievancesLoading && tab === 'settings' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              {/* PASSWORD AND SECURITY */}
              <div className="p-7 rounded-3xl panel shadow-3d-card space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <KeyRound size={18} className="text-indigo-600" /> Password & Security
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
                    <label className="font-extrabold text-slate-700 text-xs mb-1.5 block">Current Password *</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-2xl bg-white/80 border border-slate-200 pl-10 pr-10 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-glass-xs"
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
                      <label className="font-extrabold text-slate-700 text-xs mb-1.5 block">New Password *</label>
                      <div className="relative">
                        <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full rounded-2xl bg-white/80 border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-glass-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-extrabold text-slate-700 text-xs mb-1.5 block">Confirm New Password *</label>
                      <div className="relative">
                        <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full rounded-2xl bg-white/80 border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-glass-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={changePasswordMutation.isPending}
                    className="btn-primary w-full py-3 text-xs font-black shadow-3d-btn flex items-center justify-center gap-2 disabled:opacity-40">
                    {changePasswordMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <><KeyRound size={15} /> Update Password</>}
                  </button>
                </form>
              </div>

            </motion.div>
          )}

        </main>
      </div>

    </div>
  )
}

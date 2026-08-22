import { useState } from 'react'
import { useRegister, useLogin } from '../lib/authApi'
import { useDepartmentRegister, useDepartmentLogin } from '../lib/departmentAuthApi'
import { useAdminLogin } from '../lib/adminAuthApi'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, HardHat, Building2, Lock, Mail, ArrowRight, ShieldCheck,
  Sparkles, KeyRound, LogIn, UserPlus, CheckCircle2, Phone, MapPin, Eye, EyeOff,
  Calendar, FileText, Hash, Wand2
} from 'lucide-react'
import CivicGlobe from '../components/CivicGlobe'
import { cx } from '../lib/utils'

export default function AuthPage() {
  const nav = useNavigate()
  const loc = useLocation()
  const isSignup = loc.pathname === '/signup'

  const [role, setRole] = useState('citizen')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Mongoose Citizen Schema Fields
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    gender: 'female',
    dateOfBirth: '',
    address: '',
    city: 'Indore',
    state: 'Madhya Pradesh',
    pincode: '',
    aadhaarNumber: ''
  })

  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)

  // TanStack Query mutations — Citizen
  const registerMutation = useRegister()
  const loginMutation = useLogin()

  // TanStack Query mutations — Department
  const deptRegisterMutation = useDepartmentRegister()
  const deptLoginMutation = useDepartmentLogin()
  const adminLoginMutation = useAdminLogin()
  const [successMsg, setSuccessMsg] = useState(null)

  // Department-specific form state
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Sanitation Department',
    city: 'Indore',
    state: 'Madhya Pradesh',
  })

  function handleDeptChange(field, value) {
    setDeptFormData((prev) => ({ ...prev, [field]: value }))
  }

  const personas = {
    citizen: { name: 'Astha P.', detail: 'Vijay Nagar, Ward 12', route: '/citizen', badge: 'Citizen Persona' },
    officer: { name: 'R. K. Sharma', detail: 'PWD Zone 3 Officer', route: '/officer', badge: 'Department Persona' },
    admin: { name: 'Astha Admin', detail: 'Built-in System Admin (astha@gmail.com / 12345678)', route: '/admin', badge: 'System Admin Persona' }
  }

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }))
    }
  }

  function fillDemoData() {
    setFormData({
      fullName: 'Astha Patel',
      email: 'astha.patel@indorecivic.gov.in',
      mobile: '9876543210',
      password: 'password123',
      gender: 'female',
      dateOfBirth: '1998-05-14',
      address: '74 Vijay Nagar Main Road, Sector B',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452010',
      aadhaarNumber: '987654321098'
    })
    setErrors({})
  }

  function calculateAge(dob) {
    if (!dob) return null
    const today = new Date()
    const birthDate = new Date(dob)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  function validate() {
    const newErrors = {}
    if (isSignup) {
      if (!formData.fullName.trim() || formData.fullName.length < 2) {
        newErrors.fullName = 'Name must be at least 2 characters'
      }
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
        newErrors.email = 'Please provide a valid email address'
      }
      if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
        newErrors.mobile = 'Please provide a valid 10-digit Indian mobile number'
      }
      if (!formData.password || formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      }
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required'
      }
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required'
      }
      if (!/^\d{6}$/.test(formData.pincode)) {
        newErrors.pincode = 'Pincode must be a valid 6-digit number'
      }
      if (!/^\d{12}$/.test(formData.aadhaarNumber)) {
        newErrors.aadhaarNumber = 'Aadhaar number must be a valid 12-digit number'
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setApiError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (role === 'admin') {
        // Built-in Admin Login
        await adminLoginMutation.mutateAsync({
          email: formData.email || 'astha@gmail.com',
          password: formData.password || '12345678',
        })
        nav('/admin')
      } else if (role === 'officer') {
        // Department Auth Flow
        if (isSignup) {
          await deptRegisterMutation.mutateAsync(deptFormData)
          setSuccessMsg('Department registration submitted! Your account is pending admin approval before you can sign in.')
          nav('/login')
        } else {
          await deptLoginMutation.mutateAsync({
            email: deptFormData.email,
            password: deptFormData.password,
          })
          nav('/officer')
        }
      } else {
        // Citizen Auth Flow
        if (isSignup && !validate()) { setLoading(false); return }
        if (isSignup) {
          await registerMutation.mutateAsync(formData)
          await loginMutation.mutateAsync({
            email: formData.email,
            password: formData.password,
          })
        } else {
          await loginMutation.mutateAsync({
            email: formData.email,
            password: formData.password,
          })
        }
        nav(personas[role].route)
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Something went wrong. Please try again."
      setApiError(msg)
    } finally {
      setLoading(false)
    }
  }

  function quickLogin(rKey) {
    setRole(rKey)
    if (rKey === 'admin') {
      setFormData((p) => ({ ...p, email: 'astha@gmail.com', password: '12345678' }))
    } else if (rKey === 'officer') {
      setDeptFormData((p) => ({ ...p, email: 'pwd.indore@civic.gov.in', password: '12345678' }))
    } else {
      setFormData((p) => ({ ...p, email: 'astha.patel@indorecivic.gov.in', password: '12345678' }))
    }
  }

  const computedAge = calculateAge(formData.dateOfBirth)

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-x-hidden bg-[#FAFAFF] text-slate-900 selection:bg-indigo-500/20">
      {/* Background radial gradient mesh */}
      <div className="absolute inset-0 pointer-events-none"
           style={{
             background: 'radial-gradient(ellipse 80% 60% at 20% 20%, rgba(99, 102, 241, 0.16) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 80% 80%, rgba(139, 92, 246, 0.14) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 50% 50%, rgba(6, 182, 212, 0.08) 0%, transparent 50%)'
           }} />

      {/* Header */}
      <header className="relative z-20 px-6 py-6 max-w-7xl w-full mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img src="/logo.png" alt="Nivaran AI Logo" className="w-12 h-12 object-contain transition-all group-hover:scale-105 drop-shadow-md" />
          <div>
            <div className="text-lg font-black tracking-tight text-gradient">NIVARAN AI</div>
            <div className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">Intelligent Civic Resolution</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link to={isSignup ? '/login' : '/signup'}
                className="btn-ghost text-xs px-4 py-2 font-extrabold shadow-glass-xs">
            {isSignup ? 'Already registered? Log in' : "New citizen? Register account"}
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left column: 3D Visual & Info */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <CivicGlobe className="pointer-events-none absolute inset-0 w-full h-[380px] opacity-75" />

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative z-10 space-y-5">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#4F46E5' }}>
              <Sparkles size={13} className="text-indigo-600 animate-pulse" /> Verified Citizen Identity
            </span>

            <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-slate-900 leading-[1.15]">
              {isSignup ? 'Citizen Registration' : 'Welcome Back'}
              <br />
              <span className="text-gradient">Nivaran AI Portal</span>
            </h1>

            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              Register your verified citizen profile to submit voice grievances, track SLA progress, and confirm resolution proof on Polygon.
            </p>

            <div className="p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 shadow-glass-xs space-y-2">
              <div className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" /> Aadhaar & PII Privacy Protected
              </div>
              <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                DPDP Act Compliant: Aadhaar numbers are automatically masked (XXXX-XXXX-1234) and stored off-chain. Only cryptographic hashes reach Polygon.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right column: 3D Glass Form Card */}
        <div className="lg:col-span-7 flex justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="w-full max-w-xl panel p-7 md:p-8 shadow-3d-float space-y-6"
            style={{
              background: 'rgba(255, 255, 255, 0.82)',
              backdropFilter: 'blur(28px) saturate(200%)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 16px 48px -12px rgba(99, 102, 241, 0.18), 0 6px 20px -4px rgba(30, 41, 59, 0.08)'
            }}>

            {/* Header / Role Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3" style={{ borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {isSignup ? 'Citizen Registration' : 'Account Sign In'}
                </h2>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  {isSignup ? 'Fill in your details matching official ID' : 'Select your dashboard role to log in'}
                </p>
              </div>

              {isSignup && (
                <button type="button" onClick={fillDemoData}
                  className="btn-ghost text-xs px-3 py-1.5 font-extrabold text-indigo-600 bg-indigo-50/80 border border-indigo-100 flex items-center gap-1.5 hover:bg-indigo-100 transition-colors">
                  <Wand2 size={13} /> Auto-fill Demo Data
                </button>
              )}
            </div>

            {/* Role Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-100/80 border border-slate-200/60">
              {[
                { key: 'citizen', label: 'Citizen', icon: User },
                { key: 'officer', label: 'Department', icon: HardHat },
                { key: 'admin', label: 'Admin', icon: Building2 }
              ].map((t) => (
                <button key={t.key} type="button" onClick={() => setRole(t.key)}
                  className={cx('py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all',
                    role === t.key
                      ? 'bg-white text-indigo-600 shadow-md scale-[1.02]'
                      : 'text-slate-500 hover:text-slate-800')}>
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
            </div>

            {/* Quick Demo Persona */}
            <div className="p-3.5 rounded-2xl flex items-center justify-between gap-3"
                 style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.12)' }}>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-black tracking-wider text-indigo-600">{personas[role].badge}</div>
                <div className="text-xs font-extrabold text-slate-800 truncate">{personas[role].name}</div>
                <div className="text-[10px] text-slate-400 font-semibold truncate">{personas[role].detail}</div>
              </div>
              <button type="button" onClick={() => quickLogin(role)}
                className="btn-primary text-xs px-3.5 py-1.5 font-extrabold shrink-0 shadow-sm">
                1-Click Sign In <ArrowRight size={13} />
              </button>
            </div>

            {/* Registration / Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {role === 'officer' ? (
                /* ===== DEPARTMENT REGISTRATION / LOGIN ===== */
                isSignup ? (
                  <>
                    <div className="space-y-3 pt-1">
                      <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">1. Department Information</div>

                      <div>
                        <label className="label mb-1 block">Officer / Representative Name *</label>
                        <div className="relative">
                          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" value={deptFormData.name} onChange={(e) => handleDeptChange('name', e.target.value)}
                            placeholder="R. K. Sharma"
                            className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                        </div>
                      </div>

                      <div>
                        <label className="label mb-1 block">Department *</label>
                        <select value={deptFormData.department} onChange={(e) => handleDeptChange('department', e.target.value)}
                          className="w-full rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70">
                          <option value="Sanitation Department">Sanitation Department</option>
                          <option value="Roads & Public Works">Roads & Public Works</option>
                          <option value="Street Lighting">Street Lighting</option>
                          <option value="Water Supply">Water Supply</option>
                          <option value="Drainage & Sewerage">Drainage & Sewerage</option>
                          <option value="Electricity & Power">Electricity & Power</option>
                          <option value="Animal Control">Animal Control</option>
                          <option value="Public Health">Public Health</option>
                          <option value="Traffic & Transport">Traffic & Transport</option>
                          <option value="Encroachment & Illegal Construction">Encroachment & Illegal Construction</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label mb-1 block">City</label>
                          <input type="text" value={deptFormData.city} onChange={(e) => handleDeptChange('city', e.target.value)}
                            className="w-full rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none border border-slate-200 bg-white/70" />
                        </div>
                        <div>
                          <label className="label mb-1 block">State</label>
                          <input type="text" value={deptFormData.state} onChange={(e) => handleDeptChange('state', e.target.value)}
                            className="w-full rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none border border-slate-200 bg-white/70" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">2. Credentials</div>

                      <div>
                        <label className="label mb-1 block">Official Email Address *</label>
                        <div className="relative">
                          <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="email" value={deptFormData.email} onChange={(e) => handleDeptChange('email', e.target.value)}
                            placeholder="officer.pwd@indore.gov.in"
                            className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                        </div>
                      </div>

                      <div>
                        <label className="label mb-1 block">Password (min 6 chars) *</label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type={showPassword ? 'text' : 'password'} value={deptFormData.password} onChange={(e) => handleDeptChange('password', e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full rounded-2xl pl-10 pr-10 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Department Login Fields */
                  <div className="space-y-3.5 pt-2">
                    <div>
                      <label className="label mb-1.5 block">Department Email *</label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" required value={deptFormData.email} onChange={(e) => handleDeptChange('email', e.target.value)}
                          placeholder="officer.pwd@indore.gov.in"
                          className="w-full rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                      </div>
                    </div>

                    <div>
                      <label className="label mb-1.5 block">Password *</label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type={showPassword ? 'text' : 'password'} required value={deptFormData.password} onChange={(e) => handleDeptChange('password', e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              ) : isSignup ? (
                /* ===== CITIZEN REGISTRATION ===== */
                <>
                  {/* Personal Information */}
                  <div className="space-y-3 pt-1">
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">1. Personal Information</div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="label mb-1 block">Full Name *</label>
                        <div className="relative">
                          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)}
                            placeholder="Astha Patel"
                            className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                        </div>
                        {errors.fullName && <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.fullName}</p>}
                      </div>

                      <div>
                        <label className="label mb-1 block">Gender *</label>
                        <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)}
                          className="w-full rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70">
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="label mb-1 block">Mobile Number (10 digits) *</label>
                        <div className="relative">
                          <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" value={formData.mobile} onChange={(e) => handleChange('mobile', e.target.value)}
                            placeholder="9876543210" maxLength={10}
                            className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                        </div>
                        {errors.mobile && <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.mobile}</p>}
                      </div>

                      <div>
                        <label className="label mb-1 block">Date of Birth * {computedAge !== null && <span className="text-indigo-600 font-extrabold">({computedAge} yrs)</span>}</label>
                        <div className="relative">
                          <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="date" value={formData.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                            className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-800 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                        </div>
                        {errors.dateOfBirth && <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.dateOfBirth}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Location & Aadhaar Identity */}
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">2. Address & Identity Verification</div>

                    <div>
                      <label className="label mb-1 block">Street Address *</label>
                      <div className="relative">
                        <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)}
                          placeholder="74 Vijay Nagar Main Road, Sector B"
                          className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                      </div>
                      {errors.address && <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.address}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="label mb-1 block">City</label>
                        <input type="text" value={formData.city} onChange={(e) => handleChange('city', e.target.value)}
                          className="w-full rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none border border-slate-200 bg-white/70" />
                      </div>
                      <div>
                        <label className="label mb-1 block">State</label>
                        <input type="text" value={formData.state} onChange={(e) => handleChange('state', e.target.value)}
                          className="w-full rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none border border-slate-200 bg-white/70" />
                      </div>
                      <div>
                        <label className="label mb-1 block">Pincode *</label>
                        <input type="text" value={formData.pincode} onChange={(e) => handleChange('pincode', e.target.value)}
                          placeholder="452010" maxLength={6}
                          className="w-full rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none border border-slate-200 focus:border-indigo-500 bg-white/70" />
                        {errors.pincode && <p className="text-[9px] font-bold text-rose-500 mt-1">{errors.pincode}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="label mb-1 block">Aadhaar Number (12 digits) *</label>
                      <div className="relative">
                        <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={formData.aadhaarNumber} onChange={(e) => handleChange('aadhaarNumber', e.target.value)}
                          placeholder="987654321098" maxLength={12}
                          className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70 font-mono" />
                      </div>
                      {formData.aadhaarNumber.length === 12 && (
                        <p className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Aadhaar Masked: XXXX-XXXX-{formData.aadhaarNumber.slice(-4)}
                        </p>
                      )}
                      {errors.aadhaarNumber && <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.aadhaarNumber}</p>}
                    </div>
                  </div>

                  {/* Account Security */}
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">3. Credentials</div>

                    <div>
                      <label className="label mb-1 block">Email Address *</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)}
                          placeholder="astha.patel@gmail.com"
                          className="w-full rounded-2xl pl-10 pr-3 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                      </div>
                      {errors.email && <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="label mb-1 block">Password (min 8 chars) *</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => handleChange('password', e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full rounded-2xl pl-10 pr-10 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      {errors.password && <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.password}</p>}
                    </div>
                  </div>
                </>
              ) : (
                /* ===== CITIZEN LOGIN ===== */
                <div className="space-y-3.5 pt-2">
                  <div>
                    <label className="label mb-1.5 block">Email Address *</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="email" required value={formData.email} onChange={(e) => handleChange('email', e.target.value)}
                        placeholder={role === 'citizen' ? 'astha.patel@indorecivic.gov.in' : 'commissioner@indore.gov.in'}
                        className="w-full rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                    </div>
                  </div>

                  <div>
                    <label className="label mb-1.5 block">Password *</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={(e) => handleChange('password', e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-2xl pl-10 pr-10 py-3 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all border border-slate-200 focus:border-indigo-500 bg-white/70" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Feedback Display */}
              {successMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* API Error Display */}
              {apiError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                  {apiError}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="btn-primary w-full py-3.5 text-sm font-extrabold shadow-lg flex items-center justify-center gap-2 mt-4">
                {loading
                  ? <span className="animate-pulse">{role === 'officer' ? 'Processing Department…' : 'Saving Citizen Record…'}</span>
                  : isSignup
                    ? (role === 'officer' ? <><UserPlus size={18} /> Register Department</> : <><UserPlus size={18} /> Register Verified Citizen</>)
                    : <><LogIn size={18} /> Sign In to {role === 'citizen' ? 'Citizen Portal' : role === 'officer' ? 'Department Dashboard' : 'God Mode'}</>}
              </button>
            </form>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 border-t border-indigo-100/60 bg-white/40 backdrop-blur-md mt-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <div>Indore Municipal Corporation Ã‚Â· Nivaran AI</div>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-indigo-600 transition-colors">Home</Link>
            <Link to="/citizen" className="hover:text-indigo-600 transition-colors">Citizen</Link>
            <Link to="/officer" className="hover:text-indigo-600 transition-colors">Officer</Link>
            <Link to="/admin" className="hover:text-indigo-600 transition-colors">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}




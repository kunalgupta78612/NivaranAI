import { Routes, Route, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import { StoreProvider, useStore } from './store/AppStore'

import Landing from './pages/Landing'
import AuthPage from './pages/AuthPage'
import CitizenPortal from './pages/citizen/CitizenPortal'
import CitizenTrack from './pages/citizen/CitizenTrack'
import OfficerBoard from './pages/officer/OfficerBoard'
import GodMode from './pages/admin/GodMode'
import SilenceDetector from './pages/admin/SilenceDetector'
import AssetIntelligence from './pages/admin/AssetIntelligence'
import ChainAudit from './pages/admin/ChainAudit'

function Shell() {
  const { ready } = useStore()

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center" style={{
        background: '#EEF2FF',
        backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(99, 102, 241, 0.15) 0%, transparent 70%)'
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-3xl animate-pulse"
                 style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #A855F7)', opacity: 0.3, filter: 'blur(12px)' }} />
            <div className="relative w-16 h-16 rounded-3xl grid place-items-center"
                 style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 8px 24px -4px rgba(99, 102, 241, 0.4)' }}>
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
          </div>
          <div className="text-xl font-black text-gradient tracking-tight">NIVARAN AI</div>
          <p className="text-xs text-slate-400 font-semibold mt-1.5">Initializing civic intelligence...</p>
          <div className="w-32 h-1 rounded-full overflow-hidden mx-auto mt-4 bg-indigo-100">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              className="w-1/2 h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #6366F1, #A855F7)' }}
            />
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/landing" element={<Landing />} />

      {/* Public Only Routes - Redirect to /citizen/dashboard if already logged in */}
      <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><AuthPage /></PublicRoute>} />

      {/* Protected Citizen Routes */}
      <Route
        path="/citizen/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<CitizenPortal />} />
                <Route path="/dashboard" element={<CitizenPortal />} />
                <Route path="/my-grievances" element={<CitizenPortal />} />
                <Route path="/new-grievance" element={<CitizenPortal />} />
                <Route path="/profile" element={<CitizenPortal />} />
                <Route path="/track" element={<CitizenTrack />} />
                <Route path="*" element={<Navigate to="/citizen" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Demo Layout Routes for Officer & Admin */}
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              <Route path="/officer" element={<OfficerBoard />} />
              <Route path="/admin" element={<GodMode />} />
              <Route path="/admin/silence" element={<SilenceDetector />} />
              <Route path="/admin/assets" element={<AssetIntelligence />} />
              <Route path="/admin/chain" element={<ChainAudit />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}

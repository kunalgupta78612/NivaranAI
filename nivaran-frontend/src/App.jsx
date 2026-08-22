import { Routes, Route, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import DepartmentProtectedRoute from './components/DepartmentProtectedRoute'
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
          <div className="relative w-20 h-20 mx-auto mb-5">
            <img src="/logo.png" alt="Nivaran AI Logo" className="w-20 h-20 object-contain drop-shadow-md animate-pulse" />
          </div>
          <div className="text-xl font-black text-gradient tracking-tight">NIVARAN AI</div>
          <p className="text-xs font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 mt-1.5">
            Intelligent Civic Resolution
          </p>
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

      {/* Public Only Routes */}
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
                <Route path="/my-grievances" element={<CitizenPortal defaultTab="my_grievances" />} />
                <Route path="/new-grievance" element={<CitizenPortal defaultTab="file" />} />
                <Route path="/profile" element={<CitizenPortal defaultTab="profile" />} />
                <Route path="/track" element={<CitizenPortal defaultTab="track" />} />
                <Route path="/settings" element={<CitizenPortal defaultTab="settings" />} />
                <Route path="*" element={<Navigate to="/citizen" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Protected Department Route */}
      <Route
        path="/officer"
        element={
          <DepartmentProtectedRoute>
            <Layout>
              <OfficerBoard />
            </Layout>
          </DepartmentProtectedRoute>
        }
      />

      {/* Demo Layout Routes for Admin */}
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
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


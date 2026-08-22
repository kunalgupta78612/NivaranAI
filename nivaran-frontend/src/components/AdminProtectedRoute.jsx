import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCurrentAdmin } from '../lib/adminAuthApi'

/**
 * AdminProtectedRoute component:
 * Protects all Admin routes using GET /api/admin/me
 * - Shows loading spinner while verifying admin session
 * - Renders children if authenticated as Admin
 * - Redirects to /login if unauthenticated or cookie missing/expired
 */
export default function AdminProtectedRoute({ children }) {
  const location = useLocation()
  const { data, isLoading, isError } = useCurrentAdmin()

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#EEF2FF]" style={{
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
          <p className="text-xs text-slate-400 font-semibold mt-1.5">Verifying admin authentication session...</p>
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

  const isAuthenticated = Boolean(data?.admin || data?.success)

  if (isError || !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

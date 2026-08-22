import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell, CheckCheck, Clock, ShieldCheck, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../lib/notificationApi'
import { timeAgo, cx } from '../lib/utils'

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, right: 0 })
  const buttonRef = useRef(null)

  const { data: res } = useNotifications()
  const markReadMutation = useMarkNotificationRead()
  const markAllReadMutation = useMarkAllNotificationsRead()

  const notifications = res?.notifications || []
  const unreadCount = res?.unreadCount || 0

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + 8,
        right: Math.max(16, window.innerWidth - rect.right),
      })
    }
  }

  const toggleDropdown = () => {
    if (!isOpen) {
      updatePosition()
    }
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
      return () => {
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    }
  }, [isOpen])

  return (
    <>
      {/* Bell Action Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className="relative p-2.5 rounded-2xl bg-white/90 border border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-all shadow-glass-xs"
        title="Notifications (Auto-updates every 1 min)"
      >
        <Bell size={18} className="text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Render Popover Dropdown via React Portal directly into document.body */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div className="fixed inset-0 z-[9999] pointer-events-auto">
                {/* Backdrop */}
                <div
                  className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px]"
                  onClick={() => setIsOpen(false)}
                />

                {/* Dropdown Menu (Light Mode & Topmost Portal Stack) */}
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  style={{
                    position: 'fixed',
                    top: `${coords.top}px`,
                    right: `${coords.right}px`,
                  }}
                  className="w-80 sm:w-96 rounded-3xl bg-white/95 backdrop-blur-2xl shadow-2xl border border-slate-200/90 z-[10000] overflow-hidden text-slate-900"
                >
                  {/* Light Mode Header */}
                  <div className="p-4 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 grid place-items-center text-indigo-600">
                        <Bell size={16} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black tracking-tight text-slate-900">Notifications</h3>
                        <p className="text-[10px] font-bold text-slate-400">1-minute live auto-sync</p>
                      </div>
                      {unreadCount > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllReadMutation.mutate()}
                          className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-xl border border-indigo-100"
                        >
                          <CheckCheck size={13} /> Mark all read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs font-bold text-slate-400 space-y-1">
                        <ShieldCheck size={28} className="mx-auto text-indigo-300" />
                        <p className="text-slate-800 font-extrabold">No notifications yet</p>
                        <p className="text-[10px] font-semibold text-slate-400">Updates arrive automatically every minute.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          className={cx(
                            'p-4 transition-colors relative flex items-start gap-3 hover:bg-slate-50/80',
                            n.read ? 'bg-white' : 'bg-indigo-50/30'
                          )}
                        >
                          <div
                            className={cx(
                              'w-2 h-2 rounded-full mt-1.5 shrink-0',
                              n.read ? 'bg-slate-300' : 'bg-indigo-600 shadow-sm shadow-indigo-400'
                            )}
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <h4 className={cx("text-xs tracking-tight", n.read ? "font-bold text-slate-800" : "font-black text-slate-900")}>
                                {n.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                <Clock size={10} /> {timeAgo(n.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-semibold">{n.message}</p>
                          </div>
                          {!n.read && (
                            <button
                              type="button"
                              onClick={() => markReadMutation.mutate(n._id)}
                              className="px-2 py-1 rounded-lg text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors shrink-0"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}

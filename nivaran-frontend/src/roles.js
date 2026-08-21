import { User, HardHat, Building2 } from 'lucide-react'

export const ROLES = {
  citizen: {
    key: 'citizen',
    label: 'Citizen',
    person: 'Astha P. · Vijay Nagar',
    icon: User,
    accent: '#10B981',
    gradient: 'from-emerald-500 to-teal-600',
    accentClass: 'text-emerald-600',
    home: '/citizen',
    blurb: 'Voice-first AI · Multi-lingual',
    nav: [
      { to: '/citizen', label: 'File Grievance' },
      { to: '/citizen/track', label: 'Track Status' }
    ]
  },
  officer: {
    key: 'officer',
    label: 'Ground Officer',
    person: 'R. K. Sharma · PWD',
    icon: HardHat,
    accent: '#F59E0B',
    gradient: 'from-amber-500 to-orange-600',
    accentClass: 'text-amber-600',
    home: '/officer',
    blurb: 'Kanban board · SLA timers',
    nav: [{ to: '/officer', label: 'Task Board' }]
  },
  admin: {
    key: 'admin',
    label: 'City Commissioner',
    person: 'Indore Municipal Corp.',
    icon: Building2,
    accent: '#6366F1',
    gradient: 'from-indigo-500 to-violet-600',
    accentClass: 'text-indigo-600',
    home: '/admin',
    blurb: 'God mode · city-wide intelligence',
    nav: [
      { to: '/admin', label: 'Command Centre' },
      { to: '/admin/silence', label: 'Silence Detector' },
      { to: '/admin/assets', label: 'Asset Intelligence' },
      { to: '/admin/chain', label: 'On-Chain Audit' }
    ]
  }
}

export const roleOfPath = (p) =>
  p.startsWith('/officer') ? 'officer' : p.startsWith('/admin') ? 'admin' : 'citizen'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Users, FileText, CheckCircle2, XCircle, LogOut, ShieldCheck,
  Search, Filter, Clock, MapPin, Tag, RefreshCw, AlertCircle
} from 'lucide-react'
import {
  useAdminLogout,
  useAdminStats,
  useAdminDepartments,
  useAdminCitizens,
  useAdminAllGrievances,
  useApproveDepartment,
  useRejectDepartment
} from '../../lib/adminAuthApi'
import { StatTile, PriorityBadge } from '../../components/ui'
import { timeAgo } from '../../lib/utils'

export default function GodMode() {
  const navigate = useNavigate()
  const logoutMutation = useAdminLogout()

  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'departments' | 'citizens' | 'grievances'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // TanStack Query Admin Hooks
  const { data: statsRes, isLoading: statsLoading } = useAdminStats()
  const { data: deptRes, isLoading: deptLoading } = useAdminDepartments()
  const { data: citizenRes, isLoading: citizenLoading } = useAdminCitizens()
  const { data: grievanceRes, isLoading: grievanceLoading } = useAdminAllGrievances()

  const approveDeptMutation = useApproveDepartment()
  const rejectDeptMutation = useRejectDepartment()

  const stats = statsRes?.stats || { totalDepartments: 0, totalCitizens: 0, totalGrievances: 0 }
  const departmentList = deptRes?.departments || []
  const citizenList = citizenRes?.citizens || []
  const grievanceList = grievanceRes?.grievances || []

  const handleLogout = () => {
    logoutMutation.mutate(null, {
      onSettled: () => {
        navigate('/login')
      }
    })
  }

  const handleApprove = async (id) => {
    try {
      await approveDeptMutation.mutateAsync(id)
    } catch (err) {
      console.error('Failed to approve department:', err)
    }
  }

  const handleReject = async (id) => {
    try {
      await rejectDeptMutation.mutateAsync(id)
    } catch (err) {
      console.error('Failed to reject department:', err)
    }
  }

  // Filtered lists for tables
  const filteredDepartments = departmentList.filter((d) =>
    (statusFilter === 'all' || d.status === statusFilter) &&
    (searchQuery === '' ||
      d.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.city.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredCitizens = citizenList.filter((c) =>
    searchQuery === '' ||
    c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.mobile.includes(searchQuery) ||
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredGrievances = grievanceList.filter((g) =>
    (statusFilter === 'all' || g.status === statusFilter) &&
    (searchQuery === '' ||
      (g.ticketId || g._id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.text || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.categoryLabel || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.wardName || '').toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6 animate-slideUp">
      {/* Header Bar */}
      <div className="panel p-6 rounded-3xl shadow-3d-card flex flex-col md:flex-row md:items-center justify-between gap-4"
           style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(99,102,241,0.05) 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 grid place-items-center text-white shadow-lg">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 mb-1">
              System Admin Control Center
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Master Dashboard</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 text-xs font-extrabold flex items-center gap-2 transition-all shadow-glass-xs disabled:opacity-50">
            <LogOut size={15} />
            <span>Admin Sign Out</span>
          </button>
        </div>
      </div>

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatTile
          icon={Building2}
          label="Total Departments"
          value={statsLoading ? '...' : stats.totalDepartments}
          tone="indigo"
          sub={`${departmentList.filter(d => d.status === 'pending').length} pending approval`}
        />
        <StatTile
          icon={Users}
          label="Total Registered Citizens"
          value={statsLoading ? '...' : stats.totalCitizens}
          tone="emerald"
          sub="Live MongoDB citizen accounts"
        />
        <StatTile
          icon={FileText}
          label="Total Grievances Ingested"
          value={statsLoading ? '...' : stats.totalGrievances}
          tone="rose"
          sub="Across all citizens & wards"
        />
      </div>

      {/* Navigation Tabs & Search Controls */}
      <div className="panel p-4 rounded-3xl shadow-3d-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 overflow-x-auto">
          {[
            { key: 'overview', label: 'Overview & Stats', icon: ShieldCheck },
            { key: 'departments', label: `Departments (${departmentList.length})`, icon: Building2 },
            { key: 'citizens', label: `Citizens (${citizenList.length})`, icon: Users },
            { key: 'grievances', label: `All Grievances (${grievanceList.length})`, icon: FileText },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === t.key
                  ? 'bg-white text-indigo-600 shadow-md scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}>
              <t.icon size={14} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {activeTab !== 'overview' && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full pl-10 pr-4 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-300 rounded-2xl border border-slate-200 bg-white outline-none focus:border-indigo-500"
              />
            </div>
            {activeTab === 'departments' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-bold text-slate-700 rounded-2xl border border-slate-200 bg-white outline-none">
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
          </div>
        )}
      </div>

      {/* TAB 1: OVERVIEW & QUICK ACTIONS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Department Approval Queue */}
          <div className="panel p-6 rounded-3xl shadow-3d-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="text-amber-500" size={18} /> Pending Department Approvals
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                {departmentList.filter((d) => d.status === 'pending').length} Pending
              </span>
            </div>

            {departmentList.filter((d) => d.status === 'pending').length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-slate-400">
                No department registrations currently pending approval.
              </div>
            ) : (
              <div className="space-y-3">
                {departmentList
                  .filter((d) => d.status === 'pending')
                  .slice(0, 4)
                  .map((d) => (
                    <div key={d._id} className="p-4 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between gap-3 shadow-glass-xs">
                      <div>
                        <div className="text-xs font-black text-slate-800">{d.department}</div>
                        <div className="text-[11px] text-slate-400 font-semibold">{d.name} • {d.email}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{d.city}, {d.state}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApprove(d._id)}
                          disabled={approveDeptMutation.isPending}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1 shadow-sm disabled:opacity-50">
                          <CheckCircle2 size={13} />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleReject(d._id)}
                          disabled={rejectDeptMutation.isPending}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-black flex items-center gap-1 disabled:opacity-50">
                          <XCircle size={13} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Recent Grievances Preview */}
          <div className="panel p-6 rounded-3xl shadow-3d-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <FileText className="text-indigo-600" size={18} /> Recent Ingested Grievances
              </h3>
              <button onClick={() => setActiveTab('grievances')} className="text-xs font-extrabold text-indigo-600 hover:underline">
                View All ({grievanceList.length}) →
              </button>
            </div>

            {grievanceList.length === 0 ? (
              <div className="p-6 text-center text-xs font-bold text-slate-400">
                No grievances registered in MongoDB.
              </div>
            ) : (
              <div className="space-y-3">
                {grievanceList.slice(0, 4).map((g) => (
                  <div key={g._id} className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-1.5 shadow-glass-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-indigo-600 px-2 py-0.5 rounded-md bg-indigo-50">{g.ticketId || g._id}</span>
                      <PriorityBadge p={g.priority} />
                    </div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-2">{g.text}</p>
                    <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-2">
                      <span>{g.categoryLabel || g.category}</span> • <span>{timeAgo(g.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENT MANAGEMENT */}
      {activeTab === 'departments' && (
        <div className="panel p-6 rounded-3xl shadow-3d-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Building2 className="text-indigo-600" size={22} /> Registered Municipal Departments
            </h2>
            <div className="text-xs font-bold text-slate-500">
              Showing {filteredDepartments.length} of {departmentList.length} departments
            </div>
          </div>

          {deptLoading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">Loading departments...</div>
          ) : filteredDepartments.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">No departments match your filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Department & Officer</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">City & State</th>
                    <th className="py-3 px-3">Registration Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDepartments.map((d) => {
                    const statusColors = {
                      pending: 'bg-amber-50 text-amber-700 border-amber-200',
                      approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      rejected: 'bg-rose-50 text-rose-700 border-rose-200',
                    }
                    return (
                      <tr key={d._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-extrabold text-slate-800">{d.department}</div>
                          <div className="text-[11px] text-slate-400">{d.name}</div>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-600">{d.email}</td>
                        <td className="py-3.5 px-3 text-slate-600">{d.city}, {d.state}</td>
                        <td className="py-3.5 px-3 text-slate-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                        <td className="py-3.5 px-3">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${statusColors[d.status] || statusColors.pending}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {d.status !== 'approved' && (
                              <button
                                onClick={() => handleApprove(d._id)}
                                disabled={approveDeptMutation.isPending}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold transition-all shadow-sm flex items-center gap-1 disabled:opacity-50">
                                <CheckCircle2 size={13} />
                                <span>Approve</span>
                              </button>
                            )}
                            {d.status !== 'rejected' && (
                              <button
                                onClick={() => handleReject(d._id)}
                                disabled={rejectDeptMutation.isPending}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-extrabold transition-all flex items-center gap-1 disabled:opacity-50">
                                <XCircle size={13} />
                                <span>Reject</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CITIZEN MANAGEMENT */}
      {activeTab === 'citizens' && (
        <div className="panel p-6 rounded-3xl shadow-3d-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Users className="text-emerald-600" size={22} /> Registered Citizen Directory
            </h2>
            <div className="text-xs font-bold text-slate-500">
              Showing {filteredCitizens.length} of {citizenList.length} citizens
            </div>
          </div>

          {citizenLoading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">Loading citizen directory...</div>
          ) : filteredCitizens.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">No citizens match your search query.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Citizen Name</th>
                    <th className="py-3 px-3">Email Address</th>
                    <th className="py-3 px-3">Mobile Number</th>
                    <th className="py-3 px-3">City & State</th>
                    <th className="py-3 px-3">Registration Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCitizens.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-3 font-extrabold text-slate-800">{c.fullName}</td>
                      <td className="py-3.5 px-3 font-mono text-slate-600">{c.email}</td>
                      <td className="py-3.5 px-3 font-mono text-slate-600">{c.mobile}</td>
                      <td className="py-3.5 px-3 text-slate-600">{c.city || 'Indore'}, {c.state || 'Madhya Pradesh'}</td>
                      <td className="py-3.5 px-3 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ALL GRIEVANCES MANAGEMENT */}
      {activeTab === 'grievances' && (
        <div className="panel p-6 rounded-3xl shadow-3d-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <FileText className="text-rose-600" size={22} /> Master Grievance Directory
            </h2>
            <div className="text-xs font-bold text-slate-500">
              Showing {filteredGrievances.length} of {grievanceList.length} grievances
            </div>
          </div>

          {grievanceLoading ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">Loading master grievances...</div>
          ) : filteredGrievances.length === 0 ? (
            <div className="p-8 text-center text-xs font-bold text-slate-400">No grievances match your search query.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Grievance ID</th>
                    <th className="py-3 px-3">Citizen</th>
                    <th className="py-3 px-3">Title / Text</th>
                    <th className="py-3 px-3">Category & Dept</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGrievances.map((g) => (
                    <tr key={g._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-indigo-600">{g.ticketId || g._id}</td>
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-slate-800">{g.citizen?.fullName || 'Citizen'}</div>
                        <div className="text-[11px] text-slate-400">{g.citizen?.email || ''}</div>
                      </td>
                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="font-bold text-slate-800 line-clamp-2">{g.subject ? `${g.subject}: ${g.text}` : g.text}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="text-slate-800">{g.categoryLabel || g.category}</div>
                        <div className="text-[11px] text-slate-400">{g.dept}</div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">{g.wardName || g.landmark || 'Indore'}</td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {g.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-400">{new Date(g.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

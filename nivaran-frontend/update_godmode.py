import re

with open('src/pages/admin/GodMode.jsx', 'r', encoding='utf-8') as f:
    god = f.read()

god = god.replace('Zap\n}', 'Zap, Building2, CheckCircle2, XCircle\n}')
god = god.replace("import { cx, timeAgo, PRIORITY_COLOR } from '../../lib/utils'", "import { cx, timeAgo, PRIORITY_COLOR } from '../../lib/utils'\nimport { useAdminDepartments, useApproveDepartment, useRejectDepartment } from '../../lib/adminAuthApi'")

hooks_code = """export default function GodMode() {
  const { grievances, officers, stats } = useStore()
  const { data: deptRes, isLoading: deptLoading } = useAdminDepartments()
  const approveDeptMutation = useApproveDepartment()
  const rejectDeptMutation = useRejectDepartment()

  const departmentList = deptRes?.departments || []

  async function handleApproveDept(id) {
    try {
      await approveDeptMutation.mutateAsync(id)
    } catch (err) {
      console.error('Failed to approve department:', err)
    }
  }

  async function handleRejectDept(id) {
    try {
      await rejectDeptMutation.mutateAsync(id)
    } catch (err) {
      console.error('Failed to reject department:', err)
    }
  }"""

god = god.replace('export default function GodMode() {\n  const { grievances, officers, stats } = useStore()', hooks_code)

table_ui = """      {/* Leaderboard */}"""

dept_table_ui = """      {/* ============================================================ */}
      {/* DEPARTMENT REGISTRATION APPROVALS TABLE                      */}
      {/* ============================================================ */}
      <div className="panel p-6 rounded-3xl shadow-3d-card space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Building2 className="text-indigo-600" size={22} /> Department Approvals & Profiles
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Review registered municipal departments, verify city authorization, and manage login status in real time.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200/80">
              {departmentList.filter(d => d.status === 'pending').length} Pending Approval
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              {departmentList.filter(d => d.status === 'approved').length} Approved
            </span>
          </div>
        </div>

        {deptLoading ? (
          <div className="p-8 text-center text-xs font-bold text-slate-400">
            Loading departments from MongoDB...
          </div>
        ) : departmentList.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Building2 className="mx-auto text-slate-300" size={32} />
            <p className="text-xs font-bold text-slate-500">No departments registered yet in MongoDB.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Department & Name</th>
                  <th className="py-3 px-3">Email Address</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Registration Date</th>
                  <th className="py-3 px-3">Approval Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentList.map((d) => {
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
                              onClick={() => handleApproveDept(d._id)}
                              disabled={approveDeptMutation.isPending}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold transition-all shadow-sm flex items-center gap-1 disabled:opacity-50">
                              <CheckCircle2 size={13} />
                              <span>Approve</span>
                            </button>
                          )}
                          {d.status !== 'rejected' && (
                            <button
                              onClick={() => handleRejectDept(d._id)}
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

      {/* Leaderboard */}"""

god = god.replace(table_ui, dept_table_ui)

with open('src/pages/admin/GodMode.jsx', 'w', encoding='utf-8') as f:
    f.write(god)
print('GodMode.jsx successfully updated with Department Approvals table!')

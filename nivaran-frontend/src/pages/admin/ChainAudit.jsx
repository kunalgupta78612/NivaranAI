import { useState } from 'react'
import { Link2, Boxes, Fuel, ShieldCheck, Copy, Check, Lock, Zap } from 'lucide-react'
import { useStore } from '../../store/AppStore'
import { StatTile, Empty } from '../../components/ui'
import { shortHash, timeAgo, cx } from '../../lib/utils'

const EVENT_STYLE = {
  GrievanceRegistered: 'bg-sky-500/10 text-sky-700 border-sky-200',
  StatusChanged: 'bg-slate-100 text-slate-600 border-slate-200',
  ProofAnchored: 'bg-teal-500/10 text-teal-700 border-teal-200',
  CitizenRejected: 'bg-rose-500/10 text-rose-700 border-rose-200',
  Reopened: 'bg-rose-500/10 text-rose-700 border-rose-200',
  Escalated: 'bg-purple-500/10 text-purple-700 border-purple-200',
  MerkleRootAnchored: 'bg-indigo-500/10 text-indigo-700 border-indigo-200'
}

const CONTRACT = `// GrievanceRegistry.sol — On-Chain Kernel
function escalate(bytes32 grievanceId) external {
    Grievance storage g = grievances[grievanceId];
    require(block.timestamp > g.slaDeadline, "SLA not breached");
    require(g.status != Status.VerifiedResolved, "Already resolved");
    g.escalationLevel += 1;
    emit Escalated(grievanceId, g.escalationLevel, msg.sender);
}
// Zero admin backdoor. Zero pause(). Zero overrides.
// SLA breaches emit immutable state on Polygon.`

export default function ChainAudit() {
  const { chain: log } = useStore()
  const [filter, setFilter] = useState('all')
  const [copied, setCopied] = useState(false)

  const events = [...new Set(log.map((l) => l.event))]
  const shown = log.filter((l) => filter === 'all' || l.event === filter)
  const gas = log.reduce((a, l) => a + l.gasUsed, 0)
  const anchors = log.filter((l) => l.event === 'MerkleRootAnchored')
  const leaves = anchors.reduce((a, l) => a + (l.leafCount || 0), 0)

  return (
    <div className="space-y-6 animate-slideUp">
      <div className="panel p-7 shadow-3d-card"
           style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(139,92,246,0.05) 50%, rgba(99,102,241,0.03) 100%)' }}>
        <div className="flex items-start gap-4 relative z-[2]">
          <div className="w-14 h-14 rounded-3xl grid place-items-center shrink-0 shadow-glass-sm"
               style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.08))', border: '1px solid rgba(139,92,246,0.15)' }}>
            <Lock size={26} className="text-violet-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              The Audited Party Cannot Own the Audit Log <Zap size={16} className="text-violet-500" />
            </h2>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1.5 leading-relaxed max-w-5xl">
              Nivaran AI anchors cryptographic hashes, status transitions, IPFS CIDs, and escalation triggers on Polygon Amoy testnet. Zero personal data on-chain — hashes only (DPDP Act compliant).
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={Link2} label="Anchored" value={log.length} tone="violet" sub="Polygon Amoy" />
        <StatTile icon={Boxes} label="Merkle Batches" value={anchors.length} tone="indigo" sub={`${leaves.toLocaleString()} leaves`} />
        <StatTile icon={Fuel} label="Gas Used" value={(gas / 1000).toFixed(0) + 'k'} tone="amber" sub="batched Merkle proofs" />
        <StatTile icon={ShieldCheck} label="Admin Backdoors" value="0" tone="emerald" sub="immutable contract" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-6">
        <div className="panel overflow-hidden shadow-3d-float">
          <div className="panel-hd flex-wrap gap-2 relative z-[2]">
            <h3 className="text-sm font-extrabold text-slate-900">Blockchain Event Log</h3>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setFilter('all')}
                className={cx('chip text-[10px] font-extrabold border transition-all', filter === 'all'
                  ? 'text-white border-violet-600' : 'text-slate-500 border-slate-200')}
                style={filter === 'all' ? { background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' } : { background: 'rgba(255,255,255,0.5)' }}>All</button>
              {events.map((e) => (
                <button key={e} onClick={() => setFilter(e)}
                  className={cx('chip text-[10px] font-extrabold border transition-all', filter === e
                    ? 'text-white border-violet-600' : 'text-slate-500 border-slate-200')}
                  style={filter === e ? { background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' } : { background: 'rgba(255,255,255,0.5)' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[580px] overflow-y-auto relative z-[2]">
            {shown.length === 0 && <Empty>No events.</Empty>}
            {shown.map((l) => (
              <div key={l.id} className={cx('p-4 hover:bg-white/40 transition-colors', l.live && '')}
                   style={{ borderBottom: '1px solid rgba(148,163,184,0.06)', background: l.live ? 'rgba(139,92,246,0.03)' : 'transparent' }}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cx('chip text-[9px] font-extrabold', EVENT_STYLE[l.event] || EVENT_STYLE.StatusChanged)}>{l.event}</span>
                    {l.live && <span className="chip text-white font-extrabold" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none' }}>Live</span>}
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">{timeAgo(l.ts)}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-600">
                  {l.grievanceId && <KV k="Grievance" v={l.grievanceId} mono />}
                  {l.merkleRoot && <KV k="Merkle Root" v={shortHash(l.merkleRoot, 10)} mono />}
                  {l.leafCount && <KV k="Leaves" v={l.leafCount.toLocaleString()} />}
                  <KV k="Tx" v={shortHash(l.txHash, 8)} mono />
                  <KV k="Block" v={l.block.toLocaleString()} />
                  <KV k="Gas" v={l.gasUsed.toLocaleString()} />
                  <KV k="Caller" v={l.caller.startsWith('0x') ? shortHash(l.caller, 6) : l.caller}
                      tone={l.caller.startsWith('0x') ? '' : 'text-violet-600 font-extrabold'} mono />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel p-6 shadow-3d-card overflow-hidden"
               style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="flex items-center justify-between mb-4 relative z-[2]">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" /> Smart Contract
              </h3>
              <button onClick={() => { navigator.clipboard?.writeText(CONTRACT); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="text-xs font-extrabold text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="p-4 rounded-2xl font-mono text-xs text-indigo-300 overflow-x-auto leading-relaxed relative z-[2]"
                 style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(99,102,241,0.15)' }}>
              {CONTRACT}
            </pre>
            <div className="p-4 rounded-2xl text-xs text-slate-300 leading-relaxed font-semibold mt-4 relative z-[2] flex items-center gap-2"
                 style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <Lock size={14} className="text-violet-400 shrink-0" />
              <span>Immutable on Polygon Amoy. No admin can alter timestamps, delete tickets, or mask SLA failures.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KV({ k, v, mono, tone = 'text-slate-800 font-bold' }) {
  return (
    <div>
      <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider">{k}: </span>
      <span className={cx(mono && 'font-mono', tone)}>{v}</span>
    </div>
  )
}

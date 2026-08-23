import React from 'react'
import { ShieldCheck, ExternalLink, Copy, Check, Link2, Box } from 'lucide-react'
import { useState } from 'react'

/**
 * AvalancheAuditCard component
 * Displays Avalanche Fuji C-Chain audit trail details:
 * - Ticket ID
 * - "Anchored on Avalanche Fuji" status badge
 * - IPFS CID (with gateway link and copy button)
 * - Shortened Transaction Hash
 * - Clickable Snowtrace Transaction Link
 */
export default function AvalancheAuditCard({ ticket, compact = false }) {
  const [copied, setCopied] = useState(false)

  if (!ticket) return null

  const ticketId = ticket.ticketId || ticket.id || 'N/A'
  const cid = ticket.ipfsCid || 'QmX7bNivaranFujiAuditTrail000000000000000000'
  const txHash = ticket.blockchainTxHash || null
  const status = ticket.blockchainStatus || (txHash ? 'CONFIRMED' : 'PENDING')
  const network = ticket.blockchainNetwork || 'Avalanche Fuji C-Chain (Chain 43113)'
  const contractAddress = '0xbAC4712b8a43c002F9c8c1e0bE0A650b6c098B76'
  
  const snowtraceUrl = txHash
    ? `https://testnet.snowtrace.io/tx/${txHash}`
    : `https://testnet.snowtrace.io/address/${contractAddress}`

  const ipfsGatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`

  function copyCid() {
    navigator.clipboard.writeText(cid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shortTxHash = txHash
    ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}`
    : 'Pending Block Inclusion'

  const statusColors = {
    CONFIRMED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    FAILED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    NOT_CONFIGURED: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  }

  return (
    <div className={`rounded-3xl p-5 border space-y-4 ${compact ? 'bg-white/70 shadow-glass-xs' : 'panel shadow-3d-card'}`}
         style={{ background: 'linear-gradient(135deg, rgba(238,242,255,0.8) 0%, rgba(245,243,255,0.9) 100%)', borderColor: 'rgba(99,102,241,0.2)' }}>
      
      {/* Header with Network & Status Badge */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-indigo-100/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white grid place-items-center shadow-md">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              Anchored on Avalanche Fuji
            </div>
            <div className="text-[10px] text-slate-500 font-bold">{network}</div>
          </div>
        </div>

        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wider ${statusColors[status] || statusColors.PENDING}`}>
          {status}
        </span>
      </div>

      {/* Grid Details */}
      <div className="space-y-3 text-xs">
        {/* Ticket ID */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Ticket ID</span>
          <span className="font-mono font-black text-indigo-600 px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100">
            {ticketId}
          </span>
        </div>

        {/* IPFS CID */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Box size={12} className="text-indigo-500" /> IPFS Immutable CID
            </span>
            <button onClick={copyCid} className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy CID</>}
            </button>
          </div>
          <div className="p-2.5 rounded-xl bg-white/90 border border-indigo-100 flex items-center justify-between gap-2 font-mono text-[11px] text-slate-700 shadow-glass-xs">
            <span className="truncate">{cid}</span>
            <a href={ipfsGatewayUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 shrink-0 font-sans font-bold flex items-center gap-0.5">
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Transaction Hash */}
        <div className="space-y-1">
          <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Link2 size={12} className="text-indigo-500" /> Transaction Hash
          </div>
          <div className="p-2.5 rounded-xl bg-white/90 border border-indigo-100 flex items-center justify-between gap-2 font-mono text-[11px] text-slate-700 shadow-glass-xs">
            <span className="truncate">{shortTxHash}</span>
            <a href={snowtraceUrl} target="_blank" rel="noopener noreferrer"
               className="btn-ghost text-[10px] px-2.5 py-1 font-extrabold text-indigo-600 border-indigo-200 shrink-0 flex items-center gap-1 bg-indigo-50/50">
              Snowtrace Explorer <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>

    </div>
  )
}

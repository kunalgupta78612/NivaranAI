import React from 'react'
import { MapPin } from 'lucide-react'

export function IncidentMap({ points = [], onSelect, className = '' }) {
  return (
    <div className={`relative min-h-[300px] bg-slate-900 rounded-3xl grid place-items-center text-slate-400 text-xs font-bold p-6 ${className}`}>
      <div className="text-center space-y-2">
        <MapPin size={32} className="mx-auto text-indigo-400 animate-pulse" />
        <p>Indore Civic Grid Incident Visualizer</p>
        <span className="text-[10px] text-slate-500 font-mono">{points.length} incidents registered on civic graph</span>
      </div>
    </div>
  )
}

export function WardMap({ wards = [], onSelect, className = '' }) {
  return (
    <div className={`relative min-h-[300px] bg-slate-900 rounded-3xl grid place-items-center text-slate-400 text-xs font-bold p-6 ${className}`}>
      <div className="text-center space-y-2">
        <MapPin size={32} className="mx-auto text-emerald-400 animate-pulse" />
        <p>Ward Silence & Coverage Analysis</p>
        <span className="text-[10px] text-slate-500 font-mono">{wards.length} wards monitored</span>
      </div>
    </div>
  )
}

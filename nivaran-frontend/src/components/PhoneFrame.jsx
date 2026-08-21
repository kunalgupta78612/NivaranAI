import { Signal, Wifi, BatteryFull } from 'lucide-react'

export default function PhoneFrame({ children, title = 'Nivaran AI' }) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] grid place-items-center p-4 md:p-8">
      <div className="w-full max-w-[440px]">
        <div className="relative rounded-[2.5rem] border-[8px] border-slate-900 bg-white shadow-3d-card overflow-hidden">
          {/* notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-20" />
          {/* status bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] font-bold text-slate-800 relative z-10">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <Signal size={11} /><Wifi size={11} /><BatteryFull size={13} />
            </div>
          </div>
          <div className="px-5 pb-2 pt-1">
            <div className="text-[16px] font-black text-slate-900">{title}</div>
            <div className="text-[10px] text-slate-500 font-semibold">Indore Municipal Corporation</div>
          </div>
          <div className="h-[600px] overflow-y-auto px-5 pb-6 bg-slate-50/60">{children}</div>
          <div className="h-1 w-28 bg-slate-400 rounded-full mx-auto my-2.5" />
        </div>
      </div>
    </div>
  )
}

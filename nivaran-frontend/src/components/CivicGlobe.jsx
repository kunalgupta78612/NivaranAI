import { useEffect, useRef } from 'react'

// ---------------------------------------------------------------------------
// Hand-written 3D. No three.js, no WebGL, no extra dependency to install.
// A sphere of grievance points is rotated in 3D and projected to 2D canvas,
// with great-circle arcs between clustered reports. Runs everywhere, and
// nothing here can fail an npm install at 4 AM.
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2

function makePoints(n) {
  const pts = []
  for (let i = 0; i < n; i++) {
    // Fibonacci sphere — even coverage, no polar clumping
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = i * 2.399963229728653
    const p = { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r }
    p.hot = Math.random() < 0.16      // live critical grievances
    p.blind = !p.hot && Math.random() < 0.1  // silent wards
    p.size = p.hot ? 2.4 : p.blind ? 2.1 : 1.35
    p.phase = Math.random() * TAU
    pts.push(p)
  }
  return pts
}

function makeArcs(pts, n) {
  const arcs = []
  for (let i = 0; i < n; i++) {
    const a = pts[Math.floor(Math.random() * pts.length)]
    const b = pts[Math.floor(Math.random() * pts.length)]
    if (a === b) continue
    arcs.push({ a, b, t: Math.random(), speed: 0.0022 + Math.random() * 0.0035 })
  }
  return arcs
}

// spherical linear interpolation between two unit vectors
function slerp(a, b, t) {
  let dot = a.x * b.x + a.y * b.y + a.z * b.z
  dot = Math.min(1, Math.max(-1, dot))
  const omega = Math.acos(dot)
  if (omega < 1e-6) return { ...a }
  const s = Math.sin(omega)
  const w1 = Math.sin((1 - t) * omega) / s
  const w2 = Math.sin(t * omega) / s
  return { x: a.x * w1 + b.x * w2, y: a.y * w1 + b.y * w2, z: a.z * w1 + b.z * w2 }
}

export default function CivicGlobe({ className = '' }) {
  const ref = useRef(null)
  const raf = useRef(0)
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let W = 0, H = 0, DPR = 1
    const pts = makePoints(620)
    const arcs = makeArcs(pts, 26)
    const R_BASE = 0.38
    const FOV = 2.6

    function resize() {
      const rect = canvas.getBoundingClientRect()
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      W = rect.width; H = rect.height
      canvas.width = Math.max(1, Math.floor(W * DPR))
      canvas.height = Math.max(1, Math.floor(H * DPR))
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }

    function onMove(e) {
      const rect = canvas.getBoundingClientRect()
      pointer.current.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 0.6
      pointer.current.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 0.5
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    window.addEventListener('pointermove', onMove)

    let t = 0
    function frame() {
      t += reduced ? 0 : 0.0028

      pointer.current.x += (pointer.current.tx - pointer.current.x) * 0.05
      pointer.current.y += (pointer.current.ty - pointer.current.y) * 0.05

      const cx = W / 2
      const cy = H / 2
      const R = Math.min(W, H) * R_BASE

      const yaw = t + pointer.current.x
      const pitch = -0.32 + pointer.current.y
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw)
      const cosP = Math.cos(pitch), sinP = Math.sin(pitch)

      const project = (p) => {
        const x = p.x * cosY - p.z * sinY
        const z = p.x * sinY + p.z * cosY
        const y = p.y
        const y2 = y * cosP - z * sinP
        const z2 = y * sinP + z * cosP
        const scale = FOV / (FOV + z2)
        return { sx: cx + x * R * scale, sy: cy - y2 * R * scale, z: z2, scale }
      }

      ctx.clearRect(0, 0, W, H)

      // soft halo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.75)
      halo.addColorStop(0, 'rgba(124,92,252,0.20)')
      halo.addColorStop(0.55, 'rgba(168,85,247,0.07)')
      halo.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = halo
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.75, 0, TAU); ctx.fill()

      // latitude rings
      ctx.lineWidth = 1
      for (let i = 1; i < 8; i++) {
        const lat = (i / 8) * Math.PI - Math.PI / 2
        ctx.beginPath()
        let started = false
        for (let j = 0; j <= 72; j++) {
          const lon = (j / 72) * TAU
          const q = project({ x: Math.cos(lat) * Math.cos(lon), y: Math.sin(lat), z: Math.cos(lat) * Math.sin(lon) })
          if (q.z > 0.05) { started = false; continue }
          if (!started) { ctx.moveTo(q.sx, q.sy); started = true } else ctx.lineTo(q.sx, q.sy)
        }
        ctx.strokeStyle = 'rgba(124,92,252,0.13)'
        ctx.stroke()
      }
      // longitude rings
      for (let i = 0; i < 12; i++) {
        const lon = (i / 12) * TAU
        ctx.beginPath()
        let started = false
        for (let j = 0; j <= 72; j++) {
          const lat = (j / 72) * Math.PI - Math.PI / 2
          const q = project({ x: Math.cos(lat) * Math.cos(lon), y: Math.sin(lat), z: Math.cos(lat) * Math.sin(lon) })
          if (q.z > 0.05) { started = false; continue }
          if (!started) { ctx.moveTo(q.sx, q.sy); started = true } else ctx.lineTo(q.sx, q.sy)
        }
        ctx.strokeStyle = 'rgba(124,92,252,0.09)'
        ctx.stroke()
      }

      // arcs — many reports converging into one incident
      for (const arc of arcs) {
        if (!reduced) arc.t += arc.speed
        if (arc.t > 1.4) arc.t = -0.2
        ctx.beginPath()
        let started = false
        for (let s = 0; s <= 28; s++) {
          const u = s / 28
          const m = slerp(arc.a, arc.b, u)
          const lift = 1 + Math.sin(u * Math.PI) * 0.22
          const q = project({ x: m.x * lift, y: m.y * lift, z: m.z * lift })
          if (q.z > 0.15) { started = false; continue }
          if (!started) { ctx.moveTo(q.sx, q.sy); started = true } else ctx.lineTo(q.sx, q.sy)
        }
        ctx.strokeStyle = 'rgba(217,70,239,0.22)'
        ctx.lineWidth = 1.1
        ctx.stroke()

        const u = Math.min(1, Math.max(0, arc.t))
        const m = slerp(arc.a, arc.b, u)
        const lift = 1 + Math.sin(u * Math.PI) * 0.22
        const q = project({ x: m.x * lift, y: m.y * lift, z: m.z * lift })
        if (q.z <= 0.15) {
          ctx.beginPath()
          ctx.arc(q.sx, q.sy, 2.2 * q.scale, 0, TAU)
          ctx.fillStyle = 'rgba(217,70,239,0.85)'
          ctx.fill()
        }
      }

      // points, depth sorted back-to-front
      const drawn = pts.map((p) => ({ p, q: project(p) })).sort((a, b) => b.q.z - a.q.z)
      for (const { p, q } of drawn) {
        const front = q.z < 0
        const depth = front ? 1 : 0.28
        const pulse = p.hot ? 0.65 + 0.35 * Math.sin(t * 9 + p.phase) : 1
        const r = p.size * q.scale * (p.hot ? pulse * 1.35 : 1)

        if (p.hot && front) {
          ctx.beginPath()
          ctx.arc(q.sx, q.sy, r * 3.4, 0, TAU)
          ctx.fillStyle = `rgba(236,72,153,${0.16 * pulse})`
          ctx.fill()
        }
        ctx.beginPath()
        ctx.arc(q.sx, q.sy, Math.max(0.4, r), 0, TAU)
        ctx.fillStyle = p.hot
          ? `rgba(236,72,153,${0.95 * depth})`
          : p.blind
            ? `rgba(148,163,184,${0.5 * depth})`
            : `rgba(109,93,246,${0.72 * depth})`
        ctx.fill()
      }

      raf.current = requestAnimationFrame(frame)
    }

    raf.current = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf.current)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return <canvas ref={ref} className={className} aria-hidden="true" />
}

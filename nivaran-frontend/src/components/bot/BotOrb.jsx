import { useEffect, useRef } from 'react'

/* ---------------------------------------------------------------------------
 * BotOrb — the agent's face.
 *
 * Hand-written 3D on a 2D canvas: a Fibonacci-distributed particle sphere,
 * rotated with real rotation matrices, perspective-projected, depth-sorted and
 * depth-shaded, with great-circle energy arcs travelling between nodes.
 *
 * No three.js, no WebGL, no extra dependency. It cannot fail an npm install at
 * 4 AM and it runs on every laptop in the room — including the projector one.
 *
 * Modes drive colour, rotation speed, particle breathing and arc density:
 *   idle      slow indigo drift
 *   listening cyan, particles bloom outward with live mic amplitude
 *   thinking  violet, fast spin, particles contract toward the core
 *   speaking  emerald ripple pulsing outward in waves
 *   alert     rose, urgent pulse (emergencies)
 * ------------------------------------------------------------------------- */

const TAU = Math.PI * 2
const GOLDEN = 2.399963229728653

const MODES = {
  idle:      { core: [99, 102, 241],  hot: [168, 85, 247],  spin: 0.0022, bloom: 1.00, arcs: 7,  pulse: 0.30 },
  listening: { core: [6, 182, 212],   hot: [14, 165, 233],  spin: 0.0034, bloom: 1.16, arcs: 12, pulse: 0.85 },
  thinking:  { core: [139, 92, 246],  hot: [236, 72, 153],  spin: 0.0092, bloom: 0.86, arcs: 18, pulse: 0.60 },
  speaking:  { core: [16, 185, 129],  hot: [45, 212, 191],  spin: 0.0030, bloom: 1.08, arcs: 10, pulse: 0.70 },
  alert:     { core: [244, 63, 94],   hot: [249, 115, 22],  spin: 0.0070, bloom: 1.12, arcs: 16, pulse: 1.00 },
}

function buildSphere(n) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = i * GOLDEN
    pts.push({
      x: Math.cos(theta) * r,
      y,
      z: Math.sin(theta) * r,
      phase: Math.random() * TAU,
      speed: 0.6 + Math.random() * 1.1,
      hot: Math.random() < 0.14,
    })
  }
  return pts
}

function buildArcs(pts, n) {
  const arcs = []
  for (let i = 0; i < n; i++) {
    const a = pts[(Math.random() * pts.length) | 0]
    const b = pts[(Math.random() * pts.length) | 0]
    if (a === b) continue
    arcs.push({ a, b, t: Math.random(), speed: 0.004 + Math.random() * 0.008 })
  }
  return arcs
}

function slerp(a, b, t) {
  let dot = a.x * b.x + a.y * b.y + a.z * b.z
  dot = Math.min(1, Math.max(-1, dot))
  const omega = Math.acos(dot)
  if (omega < 1e-6) return { x: a.x, y: a.y, z: a.z }
  const s = Math.sin(omega)
  const w1 = Math.sin((1 - t) * omega) / s
  const w2 = Math.sin(t * omega) / s
  return { x: a.x * w1 + b.x * w2, y: a.y * w1 + b.y * w2, z: a.z * w1 + b.z * w2 }
}

const mix = (c1, c2, t) => [
  Math.round(c1[0] + (c2[0] - c1[0]) * t),
  Math.round(c1[1] + (c2[1] - c1[1]) * t),
  Math.round(c1[2] + (c2[2] - c1[2]) * t),
]
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

export default function BotOrb({ size = 64, mode = 'idle', amplitude = 0, className = '', interactive = false }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const stateRef = useRef({ mode, amplitude })
  const pointerRef = useRef({ tx: 0, ty: 0, x: 0, y: 0 })

  // Feed live props into the animation loop without restarting it
  stateRef.current.mode = mode
  stateRef.current.amplitude = amplitude

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = size + 'px'
    canvas.style.height = size + 'px'
    ctx.scale(dpr, dpr)

    // Particle count scales with the rendered size — the launcher orb stays cheap,
    // the big header orb gets the detail.
    const count = size < 80 ? 150 : size < 160 ? 300 : 460
    const pts = buildSphere(count)
    let arcs = buildArcs(pts, 18)

    const cx = size / 2
    const cy = size / 2
    const R = size * 0.34
    const FOV = size * 1.9

    let rotY = 0
    let rotX = 0
    let frame = 0
    let smoothAmp = 0
    let cur = { ...MODES.idle }

    const onMove = (e) => {
      if (!interactive) return
      const rect = canvas.getBoundingClientRect()
      pointerRef.current.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 0.8
      pointerRef.current.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 0.8
    }
    const onLeave = () => {
      pointerRef.current.tx = 0
      pointerRef.current.ty = 0
    }
    if (interactive) {
      canvas.addEventListener('pointermove', onMove)
      canvas.addEventListener('pointerleave', onLeave)
    }

    const draw = () => {
      frame++
      const target = MODES[stateRef.current.mode] || MODES.idle

      // Ease every mode parameter so transitions glide instead of snapping
      const e = 0.06
      cur.spin += (target.spin - cur.spin) * e
      cur.bloom += (target.bloom - cur.bloom) * e
      cur.pulse += (target.pulse - cur.pulse) * e
      cur.arcs += (target.arcs - cur.arcs) * e
      cur.core = cur.core ? mix(cur.core, target.core, e) : target.core
      cur.hot = cur.hot ? mix(cur.hot, target.hot, e) : target.hot

      smoothAmp += (stateRef.current.amplitude - smoothAmp) * 0.18

      const p = pointerRef.current
      p.x += (p.tx - p.x) * 0.08
      p.y += (p.ty - p.y) * 0.08

      rotY += reduced ? 0.0006 : cur.spin
      rotX = Math.sin(frame * 0.004) * 0.22 + p.y
      const yaw = rotY + p.x

      const cosY = Math.cos(yaw), sinY = Math.sin(yaw)
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX)

      const project = (v, radius) => {
        // rotate Y then X
        const x1 = v.x * cosY - v.z * sinY
        const z1 = v.x * sinY + v.z * cosY
        const y2 = v.y * cosX - z1 * sinX
        const z2 = v.y * sinX + z1 * cosX
        const scale = FOV / (FOV + z2 * radius + radius * 1.6)
        return { sx: cx + x1 * radius * scale, sy: cy + y2 * radius * scale, z: z2, scale }
      }

      ctx.clearRect(0, 0, size, size)

      const breathe = 1 + Math.sin(frame * 0.02) * 0.035 * cur.pulse
      const ampBoost = 1 + smoothAmp * 0.30
      const radius = R * cur.bloom * breathe * ampBoost

      // ---- core glow ----
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2.5)
      glow.addColorStop(0, rgba(cur.hot, 0.42 + smoothAmp * 0.2))
      glow.addColorStop(0.35, rgba(cur.core, 0.16))
      glow.addColorStop(1, rgba(cur.core, 0))
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 2.5, 0, TAU)
      ctx.fill()

      // ---- solid inner core with a specular highlight ----
      const coreR = radius * (0.30 + smoothAmp * 0.06)
      const core = ctx.createRadialGradient(
        cx - coreR * 0.35, cy - coreR * 0.4, coreR * 0.05,
        cx, cy, coreR
      )
      core.addColorStop(0, rgba([255, 255, 255], 0.95))
      core.addColorStop(0.35, rgba(cur.hot, 0.85))
      core.addColorStop(1, rgba(cur.core, 0.35))
      ctx.fillStyle = core
      ctx.beginPath()
      ctx.arc(cx, cy, coreR, 0, TAU)
      ctx.fill()

      // ---- energy arcs (great circles) ----
      const arcCount = Math.round(cur.arcs)
      if (arcs.length < arcCount) arcs = arcs.concat(buildArcs(pts, arcCount - arcs.length))
      for (let i = 0; i < arcCount && i < arcs.length; i++) {
        const arc = arcs[i]
        arc.t += arc.speed * (reduced ? 0.3 : 1)
        if (arc.t > 1) arc.t = 0

        const head = slerp(arc.a, arc.b, arc.t)
        const tail = slerp(arc.a, arc.b, Math.max(0, arc.t - 0.16))
        const h = project(head, radius)
        const tl = project(tail, radius)
        if (h.z > 0.15) continue // behind the core — hidden

        const alpha = (1 - h.z) * 0.5
        const grad = ctx.createLinearGradient(tl.sx, tl.sy, h.sx, h.sy)
        grad.addColorStop(0, rgba(cur.hot, 0))
        grad.addColorStop(1, rgba(cur.hot, alpha))
        ctx.strokeStyle = grad
        ctx.lineWidth = Math.max(0.6, size / 90)
        ctx.beginPath()
        ctx.moveTo(tl.sx, tl.sy)
        ctx.lineTo(h.sx, h.sy)
        ctx.stroke()

        ctx.fillStyle = rgba([255, 255, 255], alpha * 0.9)
        ctx.beginPath()
        ctx.arc(h.sx, h.sy, Math.max(0.7, size / 110), 0, TAU)
        ctx.fill()
      }

      // ---- particles, painted back to front ----
      const projected = []
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i]
        const wobble = 1 + Math.sin(frame * 0.02 * pt.speed + pt.phase) * 0.05 * cur.pulse
        const pr = radius * wobble
        const q = project(pt, pr)
        q.pt = pt
        projected.push(q)
      }
      projected.sort((a, b) => b.z - a.z)

      for (const q of projected) {
        const depth = (1 - q.z) / 2 // 0 = far, 1 = near
        const alpha = 0.12 + depth * 0.8
        const rad = Math.max(0.4, (size / 130) * (0.5 + depth) * q.scale * (q.pt.hot ? 1.7 : 1))
        const col = q.pt.hot ? cur.hot : mix(cur.core, cur.hot, depth * 0.5)

        ctx.fillStyle = rgba(col, alpha)
        ctx.beginPath()
        ctx.arc(q.sx, q.sy, rad, 0, TAU)
        ctx.fill()

        if (q.pt.hot && depth > 0.6) {
          ctx.fillStyle = rgba(col, alpha * 0.22)
          ctx.beginPath()
          ctx.arc(q.sx, q.sy, rad * 3.2, 0, TAU)
          ctx.fill()
        }
      }

      // ---- outer ring, tilts with the sphere ----
      ctx.strokeStyle = rgba(cur.hot, 0.20 + smoothAmp * 0.25)
      ctx.lineWidth = Math.max(0.6, size / 120)
      ctx.beginPath()
      ctx.ellipse(cx, cy, radius * 1.5, radius * 1.5 * Math.abs(Math.cos(rotX)) + 1, 0, 0, TAU)
      ctx.stroke()

      rafRef.current = requestAnimationFrame(draw)
    }

    // Stop burning CPU when the tab is hidden
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(rafRef.current)
      else rafRef.current = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', onVisibility)
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
      if (interactive) {
        canvas.removeEventListener('pointermove', onMove)
        canvas.removeEventListener('pointerleave', onLeave)
      }
    }
  }, [size, interactive])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}

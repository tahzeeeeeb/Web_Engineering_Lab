import { useEffect, useRef } from 'react'
import { clang, whoosh } from '../sound'

/* Two chequered flags fly in from the sides, clash into an X, get waved hard
   like a finish-line marshal would, then swing away. The cloth is a small
   3D verlet simulation, so it trails, whips and folds like real fabric. */

const D = Math.PI / 180
const ENTER = 0.8 // seconds until the poles slam together
const WAVE_FOR = 12.8 // seconds of waving after the slam
const EXIT = 0.9
const REDUCED_FOR = 5

const C = 25 // cloth points along the flag's length
const R = 16 // cloth points along the pole
const CHECK = 3 // sim cells per chequer square → 8 × 5 squares
const SUB = 1 / 120 // physics step
const ITER = 10 // constraint passes per step

/* ------------------------------------------------------------------ */
/*  Layout + pole motion                                               */
/* ------------------------------------------------------------------ */

type Layout = {
  w: number
  h: number
  cx: number
  L: number // pole length
  th: number // resting lean (rad)
  amp: number // waving swing (rad)
  fw: number // flag length
  fh: number // flag height along the pole
  sep: number // half the distance between the two hands
  baseY: number
  s: number // scale vs a 520px pole
}

function getLayout(w: number, h: number): Layout {
  const portrait = w / h < 0.8
  const th = (portrait ? 17 : 30) * D
  const sepR = 0.5 * Math.sin(th) // poles cross half-way up
  const halfWidth = sepR + Math.sin(th) + 0.5
  const L = Math.max(140, Math.min((w * (portrait ? 0.56 : 0.48)) / halfWidth, (0.74 * h) / Math.cos(th), 600))
  return {
    w,
    h,
    cx: w / 2,
    L,
    th,
    amp: Math.min(0.36, th - 0.1),
    fw: 0.52 * L,
    fh: 0.34 * L,
    sep: sepR * L,
    baseY: Math.min(h * 0.98, h * 0.12 + L * Math.cos(th)),
    s: L / 520,
  }
}

type Pose = { x: number; y: number; th: number }

const smooth = (x: number) => {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

/** Pose of the left-hand flag (pole leaning right). The right flag is its mirror. */
function leftPose(t: number, lay: Layout, exitAt: number, phase: number, ampK: number, reduced: boolean): Pose {
  const restX = lay.cx - lay.sep
  const restY = lay.baseY
  if (reduced) return { x: restX, y: restY, th: lay.th }

  if (t < ENTER) {
    // fly in from off-screen, accelerating, then whip upright into the clash
    const u = t / ENTER
    const startX = -0.35 * lay.L
    return {
      x: startX + (restX - startX) * u * u,
      y: restY + 0.35 * lay.L * (1 - u) * (1 - u),
      th: -45 * D + (lay.th + 45 * D) * u * u * u,
    }
  }

  const tau = t - ENTER
  // recoil from the impact: a stiff, quickly damped spring
  const k = Math.exp(-6 * tau) * Math.sin(24 * tau)
  let x = restX - 0.035 * lay.L * k
  let y = restY
  let th = lay.th - 0.16 * k

  // marshal-style waving: big side-to-side sweeps with a figure-of-eight in the hands
  const tw = tau - 0.3
  if (tw > 0) {
    const a = smooth(tw / 0.9) * ampK
    const ph = Math.PI * 2 * 1.3 * tw + 0.5 * Math.sin(0.8 * tw) + phase
    th += a * lay.amp * Math.sin(ph)
    x += a * 0.06 * lay.L * Math.sin(ph)
    y += a * 0.04 * lay.L * Math.sin(2 * ph)
  }

  // swing back out and drop away
  if (t > exitAt) {
    const u = Math.min(1, (t - exitAt) / EXIT)
    const e = u * u
    th -= 1.25 * e
    x -= (lay.w * 0.5 + lay.L) * e
    y += 0.45 * lay.L * e
  }
  return { x, y, th }
}

function bothPoses(t: number, lay: Layout, exitAt: number, reduced: boolean): [Pose, Pose] {
  const l = leftPose(t, lay, exitAt, 0, 1, reduced)
  // +π flips the swing so both flags sweep the same way: the whole X sways as one,
  // with a small lag on the right so it doesn't look robotic
  const r = leftPose(t, lay, exitAt, 0.4 + Math.PI, 0.92, reduced)
  return [l, { x: 2 * lay.cx - r.x, y: r.y, th: -r.th }]
}

/** Where the cloth's pole edge sits for a given pose. */
function setPins(p: Pose, lay: Layout, out: Float32Array): void {
  const dx = Math.sin(p.th)
  const dy = -Math.cos(p.th)
  const top = lay.L * 0.97
  for (let j = 0; j < R; j++) {
    const s = top - (j / (R - 1)) * lay.fh
    out[j * 2] = p.x + dx * s
    out[j * 2 + 1] = p.y + dy * s
  }
}

/* ------------------------------------------------------------------ */
/*  Cloth                                                              */
/* ------------------------------------------------------------------ */

type Cloth = {
  pos: Float32Array
  prev: Float32Array
  a: Uint16Array
  b: Uint16Array
  rest: Float32Array
  wa: Float32Array
  wb: Float32Array
  side: 1 | -1
  seed: number
  grime: Float32Array
}

function rng(seed: number) {
  let a = Math.floor(seed * 1e6) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeCloth(lay: Layout, side: 1 | -1, seed: number, pins: Float32Array): Cloth {
  const n = C * R
  const pos = new Float32Array(n * 3)
  const prev = new Float32Array(n * 3)
  const dx = lay.fw / (C - 1)
  const dy = lay.fh / (R - 1)
  const id = (i: number, j: number) => j * C + i

  const A: number[] = []
  const B: number[] = []
  const rest: number[] = []
  const stiff: number[] = []
  const add = (p: number, q: number, len: number, k: number) => {
    A.push(p)
    B.push(q)
    rest.push(len)
    stiff.push(k)
  }
  for (let j = 0; j < R; j++) {
    for (let i = 0; i < C; i++) {
      if (i < C - 1) add(id(i, j), id(i + 1, j), dx, 1)
      if (j < R - 1) add(id(i, j), id(i, j + 1), dy, 1)
      if (i < C - 1 && j < R - 1) {
        const dd = Math.hypot(dx, dy)
        add(id(i, j), id(i + 1, j + 1), dd, 1)
        add(id(i + 1, j), id(i, j + 1), dd, 1)
      }
      // soft bending springs keep it from crumpling like paper
      if (i < C - 2) add(id(i, j), id(i + 2, j), dx * 2, 0.12)
      if (j < R - 2) add(id(i, j), id(i, j + 2), dy * 2, 0.12)
    }
  }

  const wa = new Float32Array(A.length)
  const wb = new Float32Array(A.length)
  A.forEach((p, m) => {
    const pinA = p % C === 0
    const pinB = B[m] % C === 0
    const k = stiff[m]
    wa[m] = pinA ? 0 : (pinB ? 1 : 0.5) * k
    wb[m] = pinB ? 0 : (pinA ? 1 : 0.5) * k
  })

  for (let j = 0; j < R; j++) {
    for (let i = 0; i < C; i++) {
      const o = id(i, j) * 3
      pos[o] = prev[o] = pins[j * 2] + side * i * dx
      pos[o + 1] = prev[o + 1] = pins[j * 2 + 1] + i * dx * 0.15
      pos[o + 2] = prev[o + 2] = 0
    }
  }

  // soft, low-frequency staining so it reads as a used flag, not a mosaic
  const rand = rng(seed)
  const p1 = rand() * 6
  const p2 = rand() * 6
  const grime = new Float32Array((C - 1) * (R - 1))
  for (let j = 0; j < R - 1; j++) {
    for (let i = 0; i < C - 1; i++) {
      const u = i / (C - 2)
      const v = j / (R - 2)
      const stain = 0.5 + 0.25 * Math.sin(u * 5.1 + p1) * Math.cos(v * 3.7 + p2) + 0.25 * Math.sin((u + v) * 3 + p2)
      grime[j * (C - 1) + i] = 0.9 + 0.1 * stain - 0.05 * u * u
    }
  }

  return {
    pos,
    prev,
    a: Uint16Array.from(A),
    b: Uint16Array.from(B),
    rest: Float32Array.from(rest),
    wa,
    wb,
    side,
    seed,
    grime,
  }
}

function stepCloth(c: Cloth, pins: Float32Array, time: number, lay: Layout, turb: number): void {
  const { pos, prev } = c
  const W = 6.4 * lay.s // wind speed, px per step
  const g = 0.055 * lay.s
  const k = 0.03 // air drag
  const wx = c.side * W
  const wy = -0.16 * W

  for (let j = 0; j < R; j++) {
    for (let i = 0; i < C; i++) {
      const o = (j * C + i) * 3
      if (i === 0) {
        pos[o] = prev[o] = pins[j * 2]
        pos[o + 1] = prev[o + 1] = pins[j * 2 + 1]
        pos[o + 2] = prev[o + 2] = 0
        continue
      }
      const u = i / (C - 1)
      let vx = (pos[o] - prev[o]) * 0.995
      let vy = (pos[o + 1] - prev[o + 1]) * 0.995
      let vz = (pos[o + 2] - prev[o + 2]) * 0.995
      // gusts that ripple from the pole to the free end
      const flap = Math.sin(u * 7 - time * 10.5 + j * 0.32 + c.seed)
      const tz = turb * W * (0.35 + 0.9 * u) * flap
      const ty = turb * W * 0.3 * u * Math.sin(u * 4.3 - time * 7.3 + c.seed * 1.7)
      vx += (wx - vx) * k
      vy += (wy + ty - vy) * k + g
      vz += (tz - vz) * k * 1.6
      prev[o] = pos[o]
      prev[o + 1] = pos[o + 1]
      prev[o + 2] = pos[o + 2]
      pos[o] += vx
      pos[o + 1] += vy
      pos[o + 2] += vz
    }
  }

  const { a, b, rest, wa, wb } = c
  const m = rest.length
  for (let it = 0; it < ITER; it++) {
    for (let q = 0; q < m; q++) {
      const ia = a[q] * 3
      const ib = b[q] * 3
      const dx = pos[ib] - pos[ia]
      const dy = pos[ib + 1] - pos[ia + 1]
      const dz = pos[ib + 2] - pos[ia + 2]
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (d < 1e-6) continue
      const diff = (d - rest[q]) / d
      const fa = diff * wa[q]
      const fb = diff * wb[q]
      pos[ia] += dx * fa
      pos[ia + 1] += dy * fa
      pos[ia + 2] += dz * fa
      pos[ib] -= dx * fb
      pos[ib + 1] -= dy * fb
      pos[ib + 2] -= dz * fb
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Drawing                                                            */
/* ------------------------------------------------------------------ */

const LIGHT = (() => {
  const v = [-0.35, -0.55, 0.76]
  const l = Math.hypot(v[0], v[1], v[2])
  return v.map((x) => x / l)
})()

const faceN = new Float32Array((C - 1) * (R - 1) * 3)
const vertL = new Float32Array(C * R)

function drawCloth(ctx: CanvasRenderingContext2D, c: Cloth): void {
  const p = c.pos

  // face normals
  for (let j = 0; j < R - 1; j++) {
    for (let i = 0; i < C - 1; i++) {
      const a = (j * C + i) * 3
      const b = a + 3
      const d = a + C * 3
      const e1x = p[b] - p[a]
      const e1y = p[b + 1] - p[a + 1]
      const e1z = p[b + 2] - p[a + 2]
      const e2x = p[d] - p[a]
      const e2y = p[d + 1] - p[a + 1]
      const e2z = p[d + 2] - p[a + 2]
      const f = (j * (C - 1) + i) * 3
      faceN[f] = e1y * e2z - e1z * e2y
      faceN[f + 1] = e1z * e2x - e1x * e2z
      faceN[f + 2] = e1x * e2y - e1y * e2x
    }
  }
  // smooth lighting: average the faces around each vertex
  for (let j = 0; j < R; j++) {
    for (let i = 0; i < C; i++) {
      let nx = 0
      let ny = 0
      let nz = 0
      for (let dj = -1; dj <= 0; dj++) {
        for (let di = -1; di <= 0; di++) {
          const fi = i + di
          const fj = j + dj
          if (fi < 0 || fj < 0 || fi >= C - 1 || fj >= R - 1) continue
          const f = (fj * (C - 1) + fi) * 3
          const l = Math.hypot(faceN[f], faceN[f + 1], faceN[f + 2]) || 1
          nx += faceN[f] / l
          ny += faceN[f + 1] / l
          nz += faceN[f + 2] / l
        }
      }
      const nl = Math.hypot(nx, ny, nz) || 1
      vertL[j * C + i] = Math.abs((nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / nl)
    }
  }

  ctx.lineWidth = 0.9
  ctx.lineJoin = 'round'
  let cell = 0
  for (let j = 0; j < R - 1; j++) {
    for (let i = 0; i < C - 1; i++) {
      const v = j * C + i
      const a = v * 3
      const b = a + 3
      const d = a + C * 3
      const e = d + 3
      const lam = (vertL[v] + vertL[v + 1] + vertL[v + C] + vertL[v + C + 1]) / 4
      const shade = (0.36 + 0.64 * lam) * c.grime[cell++]
      const sheen = lam ** 14 * 70
      const dark = (((i / CHECK) | 0) + ((j / CHECK) | 0)) & 1
      const r = dark ? 30 * shade + sheen * 0.6 : 240 * shade + sheen * 0.3
      const g = dark ? 24 * shade + sheen * 0.55 : 231 * shade + sheen * 0.3
      const bl = dark ? 20 * shade + sheen * 0.5 : 212 * shade + sheen * 0.25
      const col = `rgb(${r | 0},${g | 0},${bl | 0})`
      ctx.fillStyle = col
      ctx.strokeStyle = col
      ctx.beginPath()
      ctx.moveTo(p[a], p[a + 1])
      ctx.lineTo(p[b], p[b + 1])
      ctx.lineTo(p[e], p[e + 1])
      ctx.lineTo(p[d], p[d + 1])
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  }
}

function clothOutline(ctx: CanvasRenderingContext2D, c: Cloth): void {
  const p = c.pos
  const at = (i: number, j: number) => (j * C + i) * 3
  ctx.moveTo(p[at(0, 0)], p[at(0, 0) + 1])
  for (let i = 1; i < C; i++) ctx.lineTo(p[at(i, 0)], p[at(i, 0) + 1])
  for (let j = 1; j < R; j++) ctx.lineTo(p[at(C - 1, j)], p[at(C - 1, j) + 1])
  for (let i = C - 2; i >= 0; i--) ctx.lineTo(p[at(i, R - 1)], p[at(i, R - 1) + 1])
  for (let j = R - 2; j > 0; j--) ctx.lineTo(p[at(0, j)], p[at(0, j) + 1])
  ctx.closePath()
}

const RUST_SPOTS = [0.08, 0.19, 0.27, 0.41, 0.52, 0.66, 0.78]

function drawPole(ctx: CanvasRenderingContext2D, p: Pose, lay: Layout, shadow: boolean): void {
  const { L, s, fh } = lay
  const w = Math.max(5, 10 * s)
  const fade = 0.22 * L
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.th)

  if (shadow) {
    ctx.fillRect(-w / 2, -L - 14 * s, w, L + 14 * s - fade)
    ctx.restore()
    return
  }

  // shaft: rusted steel, fading out towards the (off-frame) hands
  const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0)
  grad.addColorStop(0, '#2a160c')
  grad.addColorStop(0.32, '#8a5636')
  grad.addColorStop(0.5, '#c58a5c')
  grad.addColorStop(0.72, '#7a4426')
  grad.addColorStop(1, '#24130a')
  ctx.fillStyle = grad
  ctx.fillRect(-w / 2, -L, w, L - fade)
  const slices = 10
  for (let k = 0; k < slices; k++) {
    ctx.globalAlpha = 1 - (k + 1) / (slices + 1)
    ctx.fillRect(-w / 2, -fade + (k * fade) / slices, w, fade / slices + 0.6)
  }
  ctx.globalAlpha = 1
  ctx.fillStyle = 'rgba(80, 30, 8, 0.6)'
  for (const f of RUST_SPOTS) {
    ctx.beginPath()
    ctx.ellipse((f * 7 - 3) * 0.12 * w, -L * (0.25 + f * 0.6), w * 0.28, w * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // leather sleeve the flag is sewn onto
  const sw = w + 7 * s
  const top = L * 0.97 + 3 * s
  const sg = ctx.createLinearGradient(-sw / 2, 0, sw / 2, 0)
  sg.addColorStop(0, '#2e140a')
  sg.addColorStop(0.45, '#7a3a1c')
  sg.addColorStop(1, '#2a1208')
  ctx.fillStyle = sg
  ctx.beginPath()
  ctx.roundRect(-sw / 2, -top, sw, fh + 6 * s, 3 * s)
  ctx.fill()
  ctx.strokeStyle = 'rgba(240, 220, 190, 0.55)'
  ctx.lineWidth = Math.max(1, 1.2 * s)
  ctx.setLineDash([4 * s, 3 * s])
  ctx.beginPath()
  ctx.moveTo(sw * 0.28, -top + 3 * s)
  ctx.lineTo(sw * 0.28, -top + fh + 3 * s)
  ctx.stroke()
  ctx.setLineDash([])

  // brass finial
  const r = 8.5 * s
  const fg = ctx.createRadialGradient(-r * 0.35, -L - 9 * s - r * 0.35, r * 0.1, 0, -L - 9 * s, r)
  fg.addColorStop(0, '#f2cf8a')
  fg.addColorStop(0.5, '#a8702e')
  fg.addColorStop(1, '#3a200c')
  ctx.fillStyle = fg
  ctx.beginPath()
  ctx.arc(0, -L - 9 * s, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/*  Impact FX                                                          */
/* ------------------------------------------------------------------ */

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  rot: number
  vr: number
  color: string
  spark: boolean
}

const FLAKES = ['#7a3416', '#a4441c', '#5a2c14', '#c2652c', '#3a1a0c']

function burst(x: number, y: number, s: number): Particle[] {
  const out: Particle[] = []
  for (let k = 0; k < 30; k++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5
    const v = (200 + Math.random() * 520) * s
    const life = 0.8 + Math.random() * 0.8
    out.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life,
      max: life,
      size: (2 + Math.random() * 4) * s,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 18,
      color: FLAKES[k % FLAKES.length],
      spark: false,
    })
  }
  for (let k = 0; k < 16; k++) {
    const a = Math.random() * Math.PI * 2
    const v = (500 + Math.random() * 700) * s
    const life = 0.22 + Math.random() * 0.3
    out.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: 2 * s, rot: 0, vr: 0, color: '#ffcf6a', spark: true })
  }
  return out
}

function crossing(a: Pose, b: Pose): [number, number] | null {
  const d1x = Math.sin(a.th)
  const d1y = -Math.cos(a.th)
  const d2x = Math.sin(b.th)
  const d2y = -Math.cos(b.th)
  const den = d1x * d2y - d1y * d2x
  if (Math.abs(den) < 1e-6) return null
  const t = ((b.x - a.x) * d2y - (b.y - a.y) * d2x) / den
  return [a.x + d1x * t, a.y + d1y * t]
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CheckeredFlag({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const doneRef = useRef(onDone)

  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const pinL = new Float32Array(R * 2)
    const pinR = new Float32Array(R * 2)
    const shakeEls = Array.from(document.querySelectorAll<HTMLElement>('.site-main, .site-foot'))
    let lay = getLayout(window.innerWidth, window.innerHeight)
    let left: Cloth
    let right: Cloth
    let dpr = 1
    let t = 0
    let simT = 0
    let exitAt = reduced ? REDUCED_FOR : ENTER + WAVE_FOR
    let impacted = false
    let particles: Particle[] = []
    let ring: { x: number; y: number; age: number } | null = null
    let shake = 0
    let raf = 0
    let last = performance.now()
    let finished = false

    const setup = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      lay = getLayout(window.innerWidth, window.innerHeight)
      canvas.width = Math.round(lay.w * dpr)
      canvas.height = Math.round(lay.h * dpr)
      const [pl, pr] = bothPoses(t, lay, exitAt, reduced)
      setPins(pl, lay, pinL)
      setPins(pr, lay, pinR)
      left = makeCloth(lay, 1, 1.3, pinL)
      right = makeCloth(lay, -1, 4.1, pinR)
      simT = t
    }
    setup()
    window.addEventListener('resize', setup)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && t < exitAt) exitAt = Math.max(t, reduced ? 0 : ENTER + 0.3)
    }
    window.addEventListener('keydown', onKey)

    if (!reduced) whoosh()

    const clearShake = () => shakeEls.forEach((el) => (el.style.transform = ''))

    const finish = () => {
      if (finished) return
      finished = true
      clearShake()
      doneRef.current()
    }

    const frame = (now: number) => {
      const dt = Math.min(1 / 30, (now - last) / 1000)
      last = now
      t += dt

      // physics, at a fixed step so it behaves the same at any frame rate
      const turb = reduced ? 0.2 : 0.72
      while (simT < t) {
        simT += SUB
        const [pl, pr] = bothPoses(simT, lay, exitAt, reduced)
        setPins(pl, lay, pinL)
        setPins(pr, lay, pinR)
        stepCloth(left, pinL, simT, lay, turb)
        stepCloth(right, pinR, simT, lay, turb)
      }

      // the clash
      if (!reduced && !impacted && t >= ENTER) {
        impacted = true
        const [pl, pr] = bothPoses(ENTER, lay, exitAt, false)
        const hit = crossing(pl, pr) ?? [lay.cx, lay.baseY - lay.L * 0.45]
        particles = burst(hit[0], hit[1], lay.s)
        ring = { x: hit[0], y: hit[1], age: 0 }
        shake = 0.42
        clang()
        window.dispatchEvent(new CustomEvent('tk-lcd', { detail: { big: 'P1', small: 'CHEQUERED FLAG' } }))
      }

      // shake the page a little on impact
      let ox = 0
      let oy = 0
      if (shake > 0) {
        shake = Math.max(0, shake - dt)
        const amp = 9 * lay.s * (shake / 0.42) ** 2
        ox = (Math.random() - 0.5) * 2 * amp
        oy = (Math.random() - 0.5) * 2 * amp
        shakeEls.forEach((el) => (el.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px)`))
        if (shake === 0) clearShake()
      }

      // draw
      const { w, h, s } = lay
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.translate(ox * 0.6, oy * 0.6)
      const fadeIn = reduced ? Math.min(1, t / 0.4) : 1
      const fadeOut = reduced ? 1 - Math.min(1, Math.max(0, (t - exitAt) / EXIT)) : 1
      ctx.globalAlpha = fadeIn * fadeOut

      const [pl, pr] = bothPoses(t, lay, exitAt, reduced)

      // soft shadow on the paper
      ctx.save()
      ctx.translate(10 * s, 18 * s)
      ctx.fillStyle = 'rgba(40, 18, 6, 0.15)'
      ctx.beginPath()
      clothOutline(ctx, left)
      clothOutline(ctx, right)
      ctx.fill()
      drawPole(ctx, pl, lay, true)
      drawPole(ctx, pr, lay, true)
      ctx.restore()

      drawCloth(ctx, left)
      drawPole(ctx, pl, lay, false)
      drawCloth(ctx, right)
      drawPole(ctx, pr, lay, false)

      // shockwave + rust flakes + sparks
      if (ring) {
        ring.age += dt
        const u = ring.age / 0.5
        if (u >= 1) ring = null
        else {
          ctx.strokeStyle = `rgba(164, 68, 28, ${(1 - u) * 0.7})`
          ctx.lineWidth = 4 * s * (1 - u) + 1
          ctx.beginPath()
          ctx.arc(ring.x, ring.y, 10 * s + 140 * s * (1 - (1 - u) ** 3), 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      if (particles.length) {
        const g = 1400 * s
        particles = particles.filter((pt) => (pt.life -= dt) > 0)
        for (const pt of particles) {
          pt.vy += g * dt
          pt.vx *= 0.985
          pt.x += pt.vx * dt
          pt.y += pt.vy * dt
          pt.rot += pt.vr * dt
          const a = pt.life / pt.max
          if (pt.spark) {
            ctx.globalAlpha = a
            ctx.strokeStyle = pt.color
            ctx.lineWidth = pt.size
            ctx.beginPath()
            ctx.moveTo(pt.x, pt.y)
            ctx.lineTo(pt.x - pt.vx * 0.025, pt.y - pt.vy * 0.025)
            ctx.stroke()
          } else {
            ctx.globalAlpha = Math.min(1, a * 1.6)
            ctx.fillStyle = pt.color
            ctx.save()
            ctx.translate(pt.x, pt.y)
            ctx.rotate(pt.rot)
            ctx.fillRect(-pt.size / 2, -pt.size / 3, pt.size, pt.size * 0.66)
            ctx.restore()
          }
        }
        ctx.globalAlpha = 1
      }

      if (t >= exitAt + EXIT) {
        finish()
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', setup)
      window.removeEventListener('keydown', onKey)
      clearShake()
    }
  }, [])

  return <canvas ref={canvasRef} className="finish-flags" aria-hidden="true" />
}

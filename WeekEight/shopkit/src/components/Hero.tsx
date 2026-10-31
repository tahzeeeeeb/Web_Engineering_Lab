import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import './Hero.css'

/* ------------------------------------------------------------------ */
/*  Synthetic lap (deterministic, no dependencies)                     */
/* ------------------------------------------------------------------ */

const N = 400
const LAP_M = 5300
const VW = 1000
const SPEED_VH = 200
const SPEED_MIN = 60
const SPEED_MAX = 340

// `ref` = how much deeper the reference lap dips into each corner
const CORNERS = [
  { c: 0.12, depth: 205, w: 0.035, ref: 1.06 },
  { c: 0.27, depth: 120, w: 0.03, ref: 0.95 },
  { c: 0.43, depth: 70, w: 0.025, ref: 1.05 },
  { c: 0.58, depth: 230, w: 0.03, ref: 1.04 },
  { c: 0.74, depth: 140, w: 0.04, ref: 0.96 },
  { c: 0.9, depth: 95, w: 0.03, ref: 0.97 },
]

const SECTOR_BOUNDS = [0, Math.round((N - 1) / 3), Math.round((2 * (N - 1)) / 3), N - 1]

type Lap = {
  speed: number[]
  ref: number[]
  throttle: number[]
  brake: number[]
  gear: number[]
  t: number[]
  tRef: number[]
}

function profile(reference: boolean): number[] {
  const out: number[] = []
  for (let i = 0; i < N; i++) {
    const x = i / (N - 1)
    let s = 322
    for (const k of CORNERS) {
      s -= k.depth * (reference ? k.ref : 1) * Math.exp(-(((x - k.c) / k.w) ** 2))
    }
    out.push(s)
  }
  return out
}

function cumulativeTime(speeds: number[]): number[] {
  const ds = LAP_M / (N - 1)
  const t = [0]
  for (let i = 1; i < N; i++) {
    const v = (speeds[i - 1] + speeds[i]) / 2 / 3.6
    t.push(t[i - 1] + ds / v)
  }
  return t
}

function gearFor(s: number): number {
  const steps = [100, 140, 180, 220, 260, 295]
  const g = steps.findIndex((limit) => s < limit)
  return g === -1 ? 8 : g + 2
}

function buildLap(): Lap {
  const speed = profile(false)
  const ref = profile(true)
  const throttle: number[] = []
  const brake: number[] = []
  speed.forEach((s, i) => {
    const d = (speed[Math.min(i + 1, N - 1)] - s) * (N / 240)
    const braking = d < -2
    brake.push(braking ? Math.min(100, -d * 6) : 0)
    throttle.push(braking ? 0 : s > 300 ? 100 : Math.max(20, Math.min(100, 55 + d * 12)))
  })
  return {
    speed,
    ref,
    throttle,
    brake,
    gear: speed.map(gearFor),
    t: cumulativeTime(speed),
    tRef: cumulativeTime(ref),
  }
}

const xOf = (i: number) => (i / (N - 1)) * VW
const ySpeed = (s: number) => (1 - (s - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * SPEED_VH

const linePath = (vals: number[], y: (v: number) => number) =>
  vals.map((v, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(1)} ${y(v).toFixed(2)}`).join(' ')

const areaPath = (vals: number[]) =>
  `M0 100 ${vals.map((v, i) => `L${xOf(i).toFixed(1)} ${(100 - v).toFixed(2)}`).join(' ')} L${VW} 100 Z`

function formatLap(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  return `${m}:${s.toFixed(3).padStart(6, '0')}`
}

/* ------------------------------------------------------------------ */
/*  Coffee                                                             */
/* ------------------------------------------------------------------ */

function CoffeeRing({ seed, className, double }: { seed: number; className: string; double?: boolean }) {
  const f = `rh-ring-f-${seed}`
  const g = `rh-ring-g-${seed}`
  return (
    <svg className={className} viewBox="0 0 240 240" aria-hidden="true">
      <defs>
        <filter id={f} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="12" />
        </filter>
        <radialGradient id={g}>
          <stop offset="0%" stopColor="#7a4a24" stopOpacity="0.05" />
          <stop offset="78%" stopColor="#7a4a24" stopOpacity="0.1" />
          <stop offset="92%" stopColor="#6b3b18" stopOpacity="0.3" />
          <stop offset="97%" stopColor="#5c3014" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#5c3014" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g filter={`url(#${f})`}>
        <circle cx="120" cy="120" r="92" fill={`url(#${g})`} />
        <circle cx="120" cy="120" r="93" fill="none" stroke="#5c3014" strokeOpacity="0.28" strokeWidth="1.5" />
        {double && (
          <path
            d="M 40 150 A 88 88 0 0 1 150 36"
            fill="none"
            stroke="#5c3014"
            strokeOpacity="0.32"
            strokeWidth="3"
            strokeLinecap="round"
            transform="translate(14 10)"
          />
        )}
      </g>
    </svg>
  )
}

type Drip = {
  id: number
  x: number
  y: number
  size: number
  rot: number
  dots: { dx: number; dy: number; r: number }[]
}

function CoffeeDrip({ drip }: { drip: Drip }) {
  const f = `rh-drip-f-${drip.id}`
  return (
    <svg
      className="rh-drip"
      viewBox="0 0 100 100"
      aria-hidden="true"
      style={{ left: drip.x, top: drip.y, width: drip.size, height: drip.size, rotate: `${drip.rot}deg` }}
    >
      <defs>
        <filter id={f} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed={drip.id * 7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="14" />
        </filter>
      </defs>
      <g filter={`url(#${f})`}>
        <circle cx="50" cy="50" r="24" fill="url(#rh-drop)" />
        {drip.dots.map((p, k) => (
          <circle key={k} cx={50 + p.dx} cy={50 + p.dy} r={p.r} className="rh-splat" />
        ))}
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

export default function Hero() {
  const lap = useMemo(buildLap, [])
  const paths = useMemo(
    () => ({
      speed: linePath(lap.speed, ySpeed),
      ref: linePath(lap.ref, ySpeed),
      throttle: areaPath(lap.throttle),
      brake: areaPath(lap.brake),
    }),
    [lap],
  )
  const sectors = useMemo(
    () =>
      [0, 1, 2].map((k) => {
        const a = SECTOR_BOUNDS[k]
        const b = SECTOR_BOUNDS[k + 1]
        const time = lap.t[b] - lap.t[a]
        const refTime = lap.tRef[b] - lap.tRef[a]
        return { start: a, end: b, time, delta: time - refTime }
      }),
    [lap],
  )
  const worstSector = sectors.reduce((w, s, k) => (s.delta > sectors[w].delta ? k : w), 0)

  const rootRef = useRef<HTMLElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const userTookOver = useRef(false)
  const dragging = useRef(false)
  const dripId = useRef(0)

  const [idx, setIdx] = useState(0)
  const [activeSector, setActiveSector] = useState<number | null>(null)
  const [drips, setDrips] = useState<Drip[]>([])

  // Entrance: the chart recorder pen draws the lap
  useEffect(() => {
    const plot = plotRef.current
    if (!plot) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      plot.style.clipPath = 'none'
      setIdx(N - 1)
      return
    }
    const DELAY = 700
    const DURATION = 2800
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2)
    let raf = 0
    let start = 0
    const tick = (now: number) => {
      if (userTookOver.current) {
        plot.style.clipPath = 'none'
        return
      }
      if (!start) start = now
      const p = Math.min(1, Math.max(0, (now - start - DELAY) / DURATION))
      const e = ease(p)
      plot.style.clipPath = `inset(-10px ${((1 - e) * 100).toFixed(2)}% -10px -10px)`
      setIdx(Math.round(e * (N - 1)))
      if (p < 1) raf = requestAnimationFrame(tick)
      else plot.style.clipPath = 'none'
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Off-register print: the rust plate drifts with the pointer
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onMove = (e: PointerEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const r = root.getBoundingClientRect()
        const nx = (e.clientX - r.left) / r.width - 0.5
        const ny = (e.clientY - r.top) / r.height - 0.5
        root.style.setProperty('--reg-x', `${(2 + nx * 5).toFixed(2)}px`)
        root.style.setProperty('--reg-y', `${(1.5 + ny * 4).toFixed(2)}px`)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  const takeOver = () => {
    if (userTookOver.current) return
    userTookOver.current = true
    if (plotRef.current) plotRef.current.style.clipPath = 'none'
  }

  const idxFromX = (clientX: number) => {
    const plot = plotRef.current
    if (!plot) return idx
    const r = plot.getBoundingClientRect()
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    return Math.round(f * (N - 1))
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    takeOver()
    dragging.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    setIdx(idxFromX(e.clientX))
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' && !dragging.current) return
    takeOver()
    setIdx(idxFromX(e.clientX))
  }
  const onPointerUp = () => {
    dragging.current = false
  }
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 20 : 2
    let next: number | null = null
    if (e.key === 'ArrowRight') next = idx + step
    if (e.key === 'ArrowLeft') next = idx - step
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = N - 1
    if (next === null) return
    e.preventDefault()
    takeOver()
    setIdx(Math.min(N - 1, Math.max(0, next)))
  }

  const jumpToSector = (k: number) => {
    takeOver()
    setIdx(sectors[k].start)
  }

  // Click empty paper to spill another drop
  const onPaperClick = (e: ReactMouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('a, button, .rh-area')) return
    const r = e.currentTarget.getBoundingClientRect()
    const id = ++dripId.current
    const dots = Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => {
      const a = Math.random() * Math.PI * 2
      const dist = 30 + Math.random() * 16
      return { dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, r: 1 + Math.random() * 2.6 }
    })
    const drip: Drip = {
      id,
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      size: 70 + Math.random() * 70,
      rot: Math.random() * 360,
      dots,
    }
    setDrips((d) => [...d.slice(-7), drip])
  }

  const i = Math.min(N - 1, Math.max(0, idx))
  const pct = (i / (N - 1)) * 100
  const gap = lap.t[i] - lap.tRef[i]
  const gapText =
    Math.abs(gap) < 0.0005 ? 'level' : `${Math.abs(gap).toFixed(3)} s ${gap < 0 ? 'ahead' : 'behind'}`
  const currentSector = i < SECTOR_BOUNDS[1] ? 0 : i < SECTOR_BOUNDS[2] ? 1 : 2

  return (
    <section className="rh" ref={rootRef} onClick={onPaperClick}>
      {/* Shared SVG defs */}
      <svg className="rh-defs" aria-hidden="true">
        <defs>
          <radialGradient id="rh-drop">
            <stop offset="0%" stopColor="#6b3b18" stopOpacity="0.22" />
            <stop offset="80%" stopColor="#6b3b18" stopOpacity="0.3" />
            <stop offset="94%" stopColor="#4f2a10" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#4f2a10" stopOpacity="0" />
          </radialGradient>
          <filter id="rh-stamp-ink" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="speck" />
            <feColorMatrix
              in="speck"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.1"
              result="mask"
            />
            <feComposite in="SourceGraphic" in2="mask" operator="in" result="eroded" />
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="wob" />
            <feDisplacementMap in="eroded" in2="wob" scale="3" />
          </filter>
          <filter id="rh-pen" x="-2%" y="-10%" width="104%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="1" seed="2" result="p" />
            <feDisplacementMap in="SourceGraphic" in2="p" scale="1.6" />
          </filter>
          <filter id="rh-redpen" x="-20%" y="-40%" width="140%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="11" result="r" />
            <feDisplacementMap in="SourceGraphic" in2="r" scale="6" />
          </filter>
        </defs>
      </svg>

      <CoffeeRing seed={3} className="rh-ring rh-ring--title" double />
      <CoffeeRing seed={8} className="rh-ring rh-ring--corner" />
      <svg className="rh-spill" viewBox="0 0 300 200" aria-hidden="true">
        <defs>
          <filter id="rh-spill-f" x="-20%" y="-30%" width="140%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="21" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="48" />
          </filter>
        </defs>
        <g filter="url(#rh-spill-f)">
          <ellipse cx="150" cy="100" rx="110" ry="58" fill="url(#rh-drop)" />
          <circle cx="262" cy="64" r="9" fill="url(#rh-drop)" />
          <circle cx="282" cy="52" r="4" fill="url(#rh-drop)" />
        </g>
      </svg>

      {drips.map((d) => (
        <CoffeeDrip key={d.id} drip={d} />
      ))}

      <header className="rh-nav">
        <a className="rh-name" href="#">
          M. Tahzeeb Khan
        </a>
        <nav className="rh-links" aria-label="Primary">
          <a href="#projects">Projects</a>
          <a href="#research">Research</a>
          <a href="https://github.com/tahzeeeeeb" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href="mailto:tahzeebkhan.bscsf24@iba-suk.edu.pk">Email</a>
        </nav>
      </header>

      <div className="rh-intro">
        <h1 className="rh-title">
          Models, backends,
          <br />
          and lap data.
        </h1>
        <div className="rh-intro-side">
          <p className="rh-lead">
            I'm a computer science student at Sukkur IBA, looking for machine learning and backend
            internships. I like problems where the data is messy and the answer has to arrive fast,
            which is why my spare time goes into Formula 1 telemetry.
          </p>
          <div className="rh-actions">
            <a className="rh-btn rh-btn--rust" href="#projects">
              See projects
            </a>
            <a className="rh-btn" href="https://github.com/tahzeeeeeb" target="_blank" rel="noopener noreferrer">
              View GitHub
            </a>
          </div>
          <p className="rh-stamp" aria-label="Open to internships">
            <span>Open to</span>
            <span>internships</span>
          </p>
        </div>
      </div>

      <figure className="rh-figure" id="telemetry">
        <div className="rh-sheet">
          <div className="rh-readout">
            <p className="rh-speed">
              <span className="rh-speed-value">{Math.round(lap.speed[i])}</span>
              <span className="rh-speed-unit">km/h</span>
            </p>
            <dl className="rh-values">
              <div>
                <dt>Gear</dt>
                <dd>{lap.gear[i]}</dd>
              </div>
              <div>
                <dt>Throttle</dt>
                <dd>{Math.round(lap.throttle[i])}%</dd>
              </div>
              <div>
                <dt>Brake</dt>
                <dd>{Math.round(lap.brake[i])}%</dd>
              </div>
              <div>
                <dt>Distance</dt>
                <dd>{(((i / (N - 1)) * LAP_M) / 1000).toFixed(2)} km</dd>
              </div>
              <div>
                <dt>Gap to ref.</dt>
                <dd className={gap < 0 ? 'is-ahead' : gap > 0 ? 'is-behind' : undefined}>{gapText}</dd>
              </div>
            </dl>
          </div>

          <div className="rh-chart">
            <div className="rh-labels" aria-hidden="true">
              <span className="rh-label rh-label--speed">Speed</span>
              <span className="rh-label">Throttle</span>
              <span className="rh-label">Brake</span>
            </div>
            <div
              className="rh-area"
              role="slider"
              tabIndex={0}
              aria-label="Lap position"
              aria-valuemin={0}
              aria-valuemax={LAP_M}
              aria-valuenow={Math.round((i / (N - 1)) * LAP_M)}
              aria-valuetext={`${Math.round(lap.speed[i])} km/h in sector ${currentSector + 1}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
            >
              <div className="rh-plot" ref={plotRef}>
                <div className="rh-ch rh-ch--speed">
                  <svg viewBox={`0 0 ${VW} ${SPEED_VH}`} preserveAspectRatio="none" aria-hidden="true">
                    <path className="rh-ref" d={paths.ref} vectorEffect="non-scaling-stroke" />
                    <path className="rh-trace" d={paths.speed} vectorEffect="non-scaling-stroke" filter="url(#rh-pen)" />
                  </svg>
                </div>
                <div className="rh-ch rh-ch--small">
                  <svg viewBox={`0 0 ${VW} 100`} preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <pattern id="rh-hatch-olive" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="8" height="8" fill="#5a6b3a" fillOpacity="0.18" />
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#4e5f30" strokeWidth="3.5" />
                      </pattern>
                    </defs>
                    <path className="rh-throttle" d={paths.throttle} fill="url(#rh-hatch-olive)" />
                  </svg>
                </div>
                <div className="rh-ch rh-ch--small">
                  <svg viewBox={`0 0 ${VW} 100`} preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <pattern id="rh-hatch-rust" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                        <rect width="8" height="8" fill="#a4441c" fillOpacity="0.18" />
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#a4441c" strokeWidth="3.5" />
                      </pattern>
                    </defs>
                    <path className="rh-brake" d={paths.brake} fill="url(#rh-hatch-rust)" />
                  </svg>
                </div>

                {activeSector !== null &&
                  sectors.map((sec, k) =>
                    k === activeSector ? null : (
                      <span
                        key={k}
                        className="rh-shade"
                        style={{
                          left: `${(sec.start / (N - 1)) * 100}%`,
                          width: `${((sec.end - sec.start) / (N - 1)) * 100}%`,
                        }}
                      />
                    ),
                  )}
                {[1, 2].map((k) => (
                  <span key={k} className="rh-boundary" style={{ left: `${(SECTOR_BOUNDS[k] / (N - 1)) * 100}%` }} />
                ))}
              </div>

              <span className="rh-cursor" style={{ left: `${pct}%` }} aria-hidden="true" />
              <div className="rh-nib-layer" aria-hidden="true">
                <span
                  className="rh-nib"
                  style={{ left: `${pct}%`, top: `${(ySpeed(lap.speed[i]) / SPEED_VH) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rh-sectors">
            {sectors.map((sec, k) => (
              <button
                key={k}
                type="button"
                className={`rh-sector${sec.delta < 0 ? ' is-faster' : ' is-slower'}${
                  k === currentSector ? ' is-current' : ''
                }`}
                onPointerEnter={() => setActiveSector(k)}
                onPointerLeave={() => setActiveSector(null)}
                onFocus={() => setActiveSector(k)}
                onBlur={() => setActiveSector(null)}
                onClick={() => jumpToSector(k)}
              >
                <span className="rh-sector-name">Sector {k + 1}</span>
                <span className="rh-sector-time">{sec.time.toFixed(3)}</span>
                <span className="rh-sector-delta">
                  {sec.delta < 0 ? '−' : '+'}
                  {Math.abs(sec.delta).toFixed(3)}
                  {k === worstSector && sec.delta > 0 && (
                    <svg className="rh-redcircle" viewBox="0 0 120 50" aria-hidden="true">
                      <path
                        d="M 98 10 C 70 0, 18 4, 8 24 C 0 42, 60 50, 100 40 C 118 34, 116 14, 84 8"
                        filter="url(#rh-redpen)"
                      />
                    </svg>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>

        <figcaption className="rh-caption">
          Printout of a synthetic 5.3 km lap, {formatLap(lap.t[N - 1])}, pen trace against a dashed
          reference lap. Drag along the trace to read it, or focus it and use the arrow keys. Click
          anywhere on the paper to spill more coffee.
        </figcaption>
      </figure>
    </section>
  )
}
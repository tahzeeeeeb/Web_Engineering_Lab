import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

/* ------------------------------------------------------------------ */
/*  Synthetic lap (deterministic)                                      */
/* ------------------------------------------------------------------ */

const N = 400
const LAP_M = 5300
const VW = 1000
const SPEED_VH = 200
const SPEED_MIN = 60
const SPEED_MAX = 340

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
    for (const k of CORNERS) s -= k.depth * (reference ? k.ref : 1) * Math.exp(-(((x - k.c) / k.w) ** 2))
    out.push(s)
  }
  return out
}

function cumulativeTime(speeds: number[]): number[] {
  const ds = LAP_M / (N - 1)
  const t = [0]
  for (let i = 1; i < N; i++) t.push(t[i - 1] + ds / ((speeds[i - 1] + speeds[i]) / 2 / 3.6))
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
  return { speed, ref, throttle, brake, gear: speed.map(gearFor), t: cumulativeTime(speed), tRef: cumulativeTime(ref) }
}

const xOf = (i: number) => (i / (N - 1)) * VW
const ySpeed = (s: number) => (1 - (s - SPEED_MIN) / (SPEED_MAX - SPEED_MIN)) * SPEED_VH
const linePath = (vals: number[], y: (v: number) => number) =>
  vals.map((v, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(1)} ${y(v).toFixed(2)}`).join(' ')
const areaPath = (vals: number[]) =>
  `M0 100 ${vals.map((v, i) => `L${xOf(i).toFixed(1)} ${(100 - v).toFixed(2)}`).join(' ')} L${VW} 100 Z`

function formatLap(sec: number): string {
  const m = Math.floor(sec / 60)
  return `${m}:${(sec - m * 60).toFixed(3).padStart(6, '0')}`
}

/* ------------------------------------------------------------------ */
/*  Printout                                                           */
/* ------------------------------------------------------------------ */

export function Printout() {
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
        return { start: a, end: b, time, delta: time - (lap.tRef[b] - lap.tRef[a]) }
      }),
    [lap],
  )
  const worstSector = sectors.reduce((w, s, k) => (s.delta > sectors[w].delta ? k : w), 0)

  const plotRef = useRef<HTMLDivElement>(null)
  const userTookOver = useRef(false)
  const dragging = useRef(false)
  const [idx, setIdx] = useState(0)
  const [activeSector, setActiveSector] = useState<number | null>(null)

  // Entrance: the chart-recorder pen draws the lap
  useEffect(() => {
    const plot = plotRef.current
    if (!plot) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      plot.style.clipPath = 'none'
      const t = window.setTimeout(() => setIdx(N - 1), 0)
      return () => window.clearTimeout(t)
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

  const takeOver = () => {
    if (userTookOver.current) return
    userTookOver.current = true
    if (plotRef.current) plotRef.current.style.clipPath = 'none'
  }
  const idxFromX = (clientX: number) => {
    const plot = plotRef.current
    if (!plot) return idx
    const r = plot.getBoundingClientRect()
    return Math.round(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * (N - 1))
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
    e.stopPropagation()
    takeOver()
    setIdx(Math.min(N - 1, Math.max(0, next)))
  }

  const i = Math.min(N - 1, Math.max(0, idx))
  const pct = (i / (N - 1)) * 100
  const gap = lap.t[i] - lap.tRef[i]
  const gapText = Math.abs(gap) < 0.0005 ? 'level' : `${Math.abs(gap).toFixed(3)} s ${gap < 0 ? 'ahead' : 'behind'}`
  const currentSector = i < SECTOR_BOUNDS[1] ? 0 : i < SECTOR_BOUNDS[2] ? 1 : 2

  return (
    <figure className="po" id="telemetry">
      <div className="po-sheet">
        <div className="po-readout">
          <p className="po-speed">
            <span className="po-speed-value">{Math.round(lap.speed[i])}</span>
            <span className="po-speed-unit">km/h</span>
          </p>
          <dl className="po-values">
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

        <div className="po-chart">
          <div className="po-labels" aria-hidden="true">
            <span className="po-label po-label--speed">Speed</span>
            <span className="po-label">Throttle</span>
            <span className="po-label">Brake</span>
          </div>
          <div
            className="po-area"
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
            <div className="po-plot" ref={plotRef}>
              <div className="po-ch po-ch--speed">
                <svg viewBox={`0 0 ${VW} ${SPEED_VH}`} preserveAspectRatio="none" aria-hidden="true">
                  <path className="po-ref" d={paths.ref} vectorEffect="non-scaling-stroke" />
                  <path className="po-trace" d={paths.speed} vectorEffect="non-scaling-stroke" filter="url(#tk-pen)" />
                </svg>
              </div>
              <div className="po-ch po-ch--small">
                <svg viewBox={`0 0 ${VW} 100`} preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <pattern id="po-hatch-olive" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect className="po-hatch-bg po-hatch-bg--olive" width="8" height="8" />
                      <line className="po-hatch-line po-hatch-line--olive" x1="0" y1="0" x2="0" y2="8" />
                    </pattern>
                  </defs>
                  <path className="po-throttle" d={paths.throttle} fill="url(#po-hatch-olive)" />
                </svg>
              </div>
              <div className="po-ch po-ch--small">
                <svg viewBox={`0 0 ${VW} 100`} preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <pattern id="po-hatch-rust" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                      <rect className="po-hatch-bg po-hatch-bg--rust" width="8" height="8" />
                      <line className="po-hatch-line po-hatch-line--rust" x1="0" y1="0" x2="0" y2="8" />
                    </pattern>
                  </defs>
                  <path className="po-brake" d={paths.brake} fill="url(#po-hatch-rust)" />
                </svg>
              </div>

              {activeSector !== null &&
                sectors.map((sec, k) =>
                  k === activeSector ? null : (
                    <span
                      key={k}
                      className="po-shade"
                      style={{
                        left: `${(sec.start / (N - 1)) * 100}%`,
                        width: `${((sec.end - sec.start) / (N - 1)) * 100}%`,
                      }}
                    />
                  ),
                )}
              {[1, 2].map((k) => (
                <span key={k} className="po-boundary" style={{ left: `${(SECTOR_BOUNDS[k] / (N - 1)) * 100}%` }} />
              ))}
            </div>

            <span className="po-cursor" style={{ left: `${pct}%` }} aria-hidden="true" />
            <div className="po-nib-layer" aria-hidden="true">
              <span className="po-nib" style={{ left: `${pct}%`, top: `${(ySpeed(lap.speed[i]) / SPEED_VH) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="po-sectors">
          {sectors.map((sec, k) => (
            <button
              key={k}
              type="button"
              className={`po-sector${sec.delta < 0 ? ' is-faster' : ' is-slower'}${k === currentSector ? ' is-current' : ''}`}
              onPointerEnter={() => setActiveSector(k)}
              onPointerLeave={() => setActiveSector(null)}
              onFocus={() => setActiveSector(k)}
              onBlur={() => setActiveSector(null)}
              onClick={() => {
                takeOver()
                setIdx(sec.start)
              }}
            >
              <span className="po-sector-name">Sector {k + 1}</span>
              <span className="po-sector-time">{sec.time.toFixed(3)}</span>
              <span className="po-sector-delta">
                {sec.delta < 0 ? '−' : '+'}
                {Math.abs(sec.delta).toFixed(3)}
                {k === worstSector && sec.delta > 0 && (
                  <svg className="po-redcircle" viewBox="0 0 120 50" aria-hidden="true">
                    <path d="M 98 10 C 70 0, 18 4, 8 24 C 0 42, 60 50, 100 40 C 118 34, 116 14, 84 8" filter="url(#tk-redpen)" />
                  </svg>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      <figcaption className="po-caption">
        Printout of a synthetic 5.3 km lap, {formatLap(lap.t[N - 1])}, pen trace against a dashed reference lap. Drag
        along the trace to read it, or focus it and use the arrow keys. Click any empty paper to spill more coffee.
      </figcaption>
    </figure>
  )
}

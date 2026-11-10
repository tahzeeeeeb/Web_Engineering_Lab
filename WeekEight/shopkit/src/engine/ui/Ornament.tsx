import { useId, useMemo } from 'react'

/* Decorative pieces: the ensō, the barbed-wire divider, sparkles and gothic corners. All aria-hidden. */

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A brushed ensō: one loaded stroke that thins and breaks up into dry bristle marks before it closes. */
export function Enso({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '')
  const { body, bristles } = useMemo(() => {
    const rand = rng(11)
    const C = 200
    const R = 158
    const start = -112
    const sweep = 334
    const N = 220
    const outer: string[] = []
    const inner: string[] = []
    const pt = (deg: number, r: number) => {
      const a = (deg * Math.PI) / 180
      return `${(C + r * Math.cos(a)).toFixed(1)} ${(C + r * Math.sin(a)).toFixed(1)}`
    }
    for (let i = 0; i <= N; i++) {
      const u = i / N
      const deg = start + sweep * u
      const load = Math.sin(Math.PI * Math.min(1, u * 2.4 + 0.12)) * 0.25 + 0.75
      const w = 30 * load * (1 - 0.82 * u ** 2.4) + 2
      const r = R + 5 * Math.sin(u * 7.1 + 0.6) + (rand() - 0.5) * 0.9
      outer.push(pt(deg, r + w / 2))
      inner.push(pt(deg, r - w / 2))
    }
    const body = `M${outer.join(' L')} L${inner.reverse().join(' L')} Z`
    // dry-brush streaks that trail off the tail
    const bristles: string[] = []
    for (let k = 0; k < 7; k++) {
      const off = (k - 3) * 4.2 + (rand() - 0.5) * 2
      const s0 = 0.62 + rand() * 0.12
      const s1 = 0.93 + rand() * 0.07
      const pts: string[] = []
      for (let i = 0; i <= 40; i++) {
        const u = s0 + ((s1 - s0) * i) / 40
        const deg = start + sweep * u
        pts.push(pt(deg, R + 5 * Math.sin(u * 7.1 + 0.6) + off * (1 - u * 0.6)))
      }
      bristles.push(`M${pts.join(' L')}`)
    }
    return { body, bristles }
  }, [])

  return (
    <svg className={`enso ${className ?? ''}`} viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <filter id={`rough-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="5" />
        </filter>
        <mask id={`draw-${uid}`}>
          <circle className="enso-draw" cx="200" cy="200" r="158" transform="rotate(-114 200 200)" pathLength={1} />
        </mask>
      </defs>
      <g mask={`url(#draw-${uid})`} filter={`url(#rough-${uid})`}>
        <path d={body} className="enso-ink" />
        {bristles.map((d, i) => (
          <path key={i} d={d} className="enso-dry" />
        ))}
      </g>
    </svg>
  )
}

/** Barbed wire with a chrome four-point star in the middle: the section divider. */
export function Barbed() {
  const uid = useId().replace(/:/g, '')
  const knots = Array.from({ length: 24 }, (_, i) => 20 + i * 40)
  return (
    <div className="barbed" aria-hidden="true">
      <svg viewBox="0 0 1000 40" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`wire-${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" className="chrome-a" />
            <stop offset=".5" className="chrome-b" />
            <stop offset="1" className="chrome-c" />
          </linearGradient>
        </defs>
        <path
          d={`M0 20 ${knots.map((x) => `C${x - 12} 15 ${x - 6} 25 ${x} 20`).join(' ')} L1000 20`}
          className="barbed-wire"
          stroke={`url(#wire-${uid})`}
        />
        <path
          d={`M0 20 ${knots.map((x) => `C${x - 12} 25 ${x - 6} 15 ${x} 20`).join(' ')} L1000 20`}
          className="barbed-wire barbed-wire--b"
          stroke={`url(#wire-${uid})`}
        />
        {knots
          .filter((x) => Math.abs(x - 500) > 60)
          .map((x) => (
            <path key={x} d={`M${x - 7} 12 L${x + 7} 28 M${x + 7} 12 L${x - 7} 28`} className="barbed-barb" />
          ))}
      </svg>
      <Sparkle className="barbed-star" />
    </div>
  )
}

/** Four-point star glint. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={`sparkle ${className ?? ''}`} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 0 C21.4 14 26 18.6 40 20 C26 21.4 21.4 26 20 40 C18.6 26 14 21.4 0 20 C14 18.6 18.6 14 20 0 Z" />
    </svg>
  )
}

/** Gothic corner tracery for framed panels: a pointed arch with a thorn. */
export function Corners() {
  const c = (
    <svg viewBox="0 0 48 48">
      <path d="M2 46 V20 C2 10 8 4 20 2 H46" className="corner-line" />
      <path d="M8 46 V24 C8 15 13 9 24 8 H46" className="corner-line corner-line--thin" />
      <path d="M2 2 L10 2 L2 10 Z" className="corner-fill" />
      <path d="M20 2 L23 -3 L26 2" className="corner-line corner-line--thin" />
    </svg>
  )
  return (
    <span className="corners" aria-hidden="true">
      <span className="corner corner--tl">{c}</span>
      <span className="corner corner--tr">{c}</span>
      <span className="corner corner--bl">{c}</span>
      <span className="corner corner--br">{c}</span>
    </span>
  )
}

export function CoffeeRing({ seed, className, double }: { seed: number; className: string; double?: boolean }) {
  const f = `tk-ring-f-${seed}`
  const g = `tk-ring-g-${seed}`
  return (
    <svg className={`coffee ${className}`} viewBox="0 0 240 240" aria-hidden="true">
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

export function CoffeeSpill({ className }: { className: string }) {
  return (
    <svg className={`coffee ${className}`} viewBox="0 0 300 200" aria-hidden="true">
      <defs>
        <filter id="tk-spill-f" x="-20%" y="-30%" width="140%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="21" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="48" />
        </filter>
      </defs>
      <g filter="url(#tk-spill-f)">
        <ellipse cx="150" cy="100" rx="110" ry="58" fill="url(#tk-drop)" />
        <circle cx="262" cy="64" r="9" fill="url(#tk-drop)" />
        <circle cx="282" cy="52" r="4" fill="url(#tk-drop)" />
      </g>
    </svg>
  )
}

export type Drip = {
  id: number
  x: number
  y: number
  size: number
  rot: number
  dots: { dx: number; dy: number; r: number }[]
}

export function makeDrip(id: number, x: number, y: number): Drip {
  const dots = Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => {
    const a = Math.random() * Math.PI * 2
    const dist = 30 + Math.random() * 16
    return { dx: Math.cos(a) * dist, dy: Math.sin(a) * dist, r: 1 + Math.random() * 2.6 }
  })
  return { id, x, y, size: 70 + Math.random() * 70, rot: Math.random() * 360, dots }
}

export function CoffeeDrip({ drip }: { drip: Drip }) {
  const f = `tk-drip-f-${drip.id}`
  return (
    <svg
      className="coffee coffee-drip"
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
        <circle cx="50" cy="50" r="24" fill="url(#tk-drop)" />
        {drip.dots.map((p, k) => (
          <circle key={k} cx={50 + p.dx} cy={50 + p.dy} r={p.r} className="coffee-splat" />
        ))}
      </g>
    </svg>
  )
}

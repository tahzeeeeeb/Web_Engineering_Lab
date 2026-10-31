/* Rusted spur gears that mesh properly and turn with page scroll.
   Each gear is its own <svg> layer rotated by var(--turn) × its ratio,
   so the rust texture is rendered once and scrolling only moves layers. */

type GearSpec = {
  teeth: number
  /** Direction (degrees) from the previous gear's centre; ignored for the first gear. */
  at?: number
}

const TAU = Math.PI * 2

function gearPath(teeth: number, pitchR: number, module: number): string {
  const outer = pitchR + module
  const root = pitchR - module * 1.25
  const step = TAU / teeth
  const pt = (r: number, a: number) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`
  let d = ''
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2
    d += `${i ? 'L' : 'M'}${pt(root, a - step * 0.32)} L${pt(outer, a - step * 0.14)} L${pt(outer, a + step * 0.14)} L${pt(root, a + step * 0.32)} `
  }
  d += 'Z '
  const circle = (cx: number, cy: number, r: number) =>
    `M${(cx - r).toFixed(2)} ${cy.toFixed(2)} a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(r * 2).toFixed(2)} 0 a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-r * 2).toFixed(2)} 0 Z `
  d += circle(0, 0, Math.max(module * 1.6, pitchR * 0.16))
  if (teeth >= 18) {
    const holes = teeth >= 30 ? 6 : 5
    for (let k = 0; k < holes; k++) {
      const a = (k / holes) * TAU
      d += circle(Math.cos(a) * pitchR * 0.55, Math.sin(a) * pitchR * 0.55, pitchR * 0.17)
    }
  }
  return d
}

type Placed = { x: number; y: number; r: number; teeth: number; base: number; ratio: number; d: string }

function layout(specs: GearSpec[], module: number): Placed[] {
  const out: Placed[] = []
  specs.forEach((s, k) => {
    const r = (module * s.teeth) / 2
    const step = 360 / s.teeth
    if (k === 0) {
      out.push({ x: 0, y: 0, r, teeth: s.teeth, base: 0, ratio: 1, d: gearPath(s.teeth, r, module) })
      return
    }
    const prev = out[k - 1]
    const theta = s.at ?? 0
    const rad = (theta * Math.PI) / 180
    const x = prev.x + Math.cos(rad) * (prev.r + r)
    const y = prev.y + Math.sin(rad) * (prev.r + r)
    // Tooth angles are measured clockwise from "up"; the contact direction θ is from +x, so convert.
    const contactPrev = theta + 90
    const prevStep = 360 / prev.teeth
    const f = ((((contactPrev - prev.base) / prevStep) % 1) + 1) % 1
    // the meshing gear must present a gap at the contact point
    const fk = ((-(f + 0.5) % 1) + 1) % 1
    const base = contactPrev + 180 - fk * step
    out.push({ x, y, r, teeth: s.teeth, base, ratio: -prev.ratio * (prev.teeth / s.teeth), d: gearPath(s.teeth, r, module) })
  })
  return out
}

type TrainProps = {
  gears: GearSpec[]
  module?: number
  className?: string
}

export function GearTrain({ gears, module = 6, className = '' }: TrainProps) {
  const placed = layout(gears, module)
  const pad = module * 1.5
  const minX = Math.min(...placed.map((g) => g.x - g.r - module)) - pad
  const minY = Math.min(...placed.map((g) => g.y - g.r - module)) - pad
  const W = Math.max(...placed.map((g) => g.x + g.r + module)) + pad - minX
  const H = Math.max(...placed.map((g) => g.y + g.r + module)) + pad - minY

  return (
    <div className={`gears ${className}`} style={{ aspectRatio: `${W.toFixed(1)} / ${H.toFixed(1)}` }} aria-hidden="true">
      {placed.map((g, k) => {
        const size = (g.r + module) * 2
        return (
          <svg
            key={k}
            className="gear"
            viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
            style={{
              left: `${(((g.x - size / 2 - minX) / W) * 100).toFixed(3)}%`,
              top: `${(((g.y - size / 2 - minY) / H) * 100).toFixed(3)}%`,
              width: `${((size / W) * 100).toFixed(3)}%`,
              rotate: `calc(${g.base.toFixed(2)}deg + var(--turn, 0deg) * ${g.ratio.toFixed(4)})`,
            }}
          >
            <path className="gear-body" d={g.d} fillRule="evenodd" />
            <circle className="gear-axle" r={Math.max(module * 0.9, g.r * 0.08)} />
          </svg>
        )
      })}
    </div>
  )
}

import { useId, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type Props = {
  value: number
  onChange: (rpm: number) => void
  redline: number
  max?: number
  min?: number
  step?: number
  label: string
  /** Shown under the number, e.g. "50× slower on screen". */
  note?: string
  disabled?: boolean
}

const A0 = 135 // degrees, screen coordinates (clockwise from 3 o'clock): 0 rpm at bottom left
const SWEEP = 270
const C = 100
const R = 84

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const
}

/** A race tachometer. Drag the needle, or focus it and use the arrow keys. */
export function Tach({ value, onChange, redline, max = 9000, min = 0, step = 100, label, note, disabled }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const id = useId()
  const toDeg = (v: number) => A0 + (SWEEP * (v - min)) / (max - min)
  const dragging = useRef(false)

  const fromPointer = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 200 - C
    const y = ((e.clientY - r.top) / r.height) * 200 - C
    let a = (Math.atan2(y, x) * 180) / Math.PI
    if (a < 90) a += 360 // 135..405 is the dial
    if (a > A0 + SWEEP) a = a - (A0 + SWEEP) < 45 ? A0 + SWEEP : A0
    const v = min + ((a - A0) / SWEEP) * (max - min)
    const lo = Math.max(min, step * 8)
    onChange(Math.min(max, Math.max(lo, Math.round(v / step) * step)))
  }

  const arc = (from: number, to: number, r: number) => {
    const [x0, y0] = polar(toDeg(from), r)
    const [x1, y1] = polar(toDeg(to), r)
    const large = toDeg(to) - toDeg(from) > 180 ? 1 : 0
    return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
  }

  const ticks = []
  for (let v = min; v <= max; v += 500) {
    const major = v % 1000 === 0
    const [x0, y0] = polar(toDeg(v), major ? R - 13 : R - 8)
    const [x1, y1] = polar(toDeg(v), R)
    ticks.push(
      <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} className={`tach-tick${major ? ' is-major' : ''}${v >= redline ? ' is-red' : ''}`} />,
    )
    if (major && v > min) {
      const [tx, ty] = polar(toDeg(v), R - 25)
      ticks.push(
        <text key={`t${v}`} x={tx} y={ty} className={`tach-num${v >= redline ? ' is-red' : ''}`}>
          {v / 1000}
        </text>,
      )
    }
  }
  const needle = toDeg(value)

  return (
    <div className={`tach${disabled ? ' is-off' : ''}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 200 200"
        aria-hidden="true"
        onPointerDown={(e) => {
          if (disabled) return
          dragging.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          fromPointer(e)
        }}
        onPointerMove={(e) => dragging.current && fromPointer(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <circle cx={C} cy={C} r={R + 10} className="tach-bezel" />
        <circle cx={C} cy={C} r={R + 4} className="tach-face" />
        <path d={arc(redline, max, R - 4)} className="tach-red" />
        {ticks}
        <text x={C} y={C - 30} className="tach-unit">
          ×1000 r/min
        </text>
        <g transform={`rotate(${needle} ${C} ${C})`} className="tach-needle">
          <path d={`M${C - 16} ${C - 2.2} L${C + R - 6} ${C - 0.6} L${C + R - 6} ${C + 0.6} L${C - 16} ${C + 2.2} Z`} />
        </g>
        <circle cx={C} cy={C} r={8} className="tach-hub" />
        <text x={C} y={C + 50} className="tach-read">
          {value.toLocaleString('en')}
        </text>
        {note && (
          <text x={C} y={C + 66} className="tach-note">
            {note}
          </text>
        )}
      </svg>
      <label className="vh" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="tach-input"
        type="range"
        min={Math.max(min, step * 8)}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={`${value} rpm`}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

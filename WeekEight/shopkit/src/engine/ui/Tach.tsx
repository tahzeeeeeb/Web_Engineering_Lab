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
  /** Caption shown under the dial, e.g. "Picture runs 50× slower". */
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

  const chrome = `tach-chrome-${id.replace(/:/g, '')}`

  // each rpm drawn once, styled by the largest step it falls on
  const ticks = []
  const nums = []
  for (let v = min; v <= max; v += 250) {
    const level = v % 1000 === 0 ? 'major' : v % 500 === 0 ? 'mid' : 'minor'
    const len = level === 'major' ? 11 : level === 'mid' ? 7 : 4
    const [x0, y0] = polar(toDeg(v), R - len)
    const [x1, y1] = polar(toDeg(v), R)
    ticks.push(
      <line key={v} x1={x0} y1={y0} x2={x1} y2={y1} className={`tach-tick is-${level}${v >= redline ? ' is-red' : ''}`} />,
    )
    if (level === 'major' && v > 0) {
      const [tx, ty] = polar(toDeg(v), 62)
      nums.push(
        <text key={v} x={tx} y={ty} className={`tach-num${v >= redline ? ' is-red' : ''}`}>
          {v / 1000}
        </text>,
      )
    }
  }

  // shift lights: three gold, three red, one white, lighting up over the last 1,750 rpm before the redline
  const flash = value >= redline
  const lights = Array.from({ length: 7 }, (_, i) => {
    const tone = i < 3 ? 'gold' : i < 6 ? 'red' : 'ink'
    const on = value >= redline - 1750 + 250 * i
    return (
      <circle
        key={i}
        cx={77.5 + 7.5 * i}
        cy={114}
        r={2.2}
        className={`tach-led tach-led--${tone}${on ? ' is-on' : ''}${flash ? ' is-flash' : ''}`}
      />
    )
  })

  const needle = toDeg(value)
  const tip = C + R - 10

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
        <defs>
          <linearGradient id={chrome} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" className="chrome-a" />
            <stop offset=".5" className="chrome-b" />
            <stop offset="1" className="chrome-c" />
          </linearGradient>
        </defs>
        <circle cx={C} cy={C} r={94} className="tach-bezel" fill={`url(#${chrome})`} />
        <circle cx={C} cy={C} r={88} className="tach-face" />
        <circle cx={C} cy={C} r={86} className="tach-hair" />
        <path d={arc(redline, max, R + 1.5)} className="tach-red" />
        {ticks}
        {nums}
        <text x={C} y={64} className="tach-kanji" lang="ja">
          回転計
        </text>
        <text x={C} y={76} className="tach-unit">
          ×1000 r/min
        </text>
        {lights}
        <rect x={70} y={123} width={60} height={20} rx={3} className="tach-win" />
        <text x={75} y={136.5} className="tach-rpm">
          rpm
        </text>
        <text x={125} y={137.5} className="tach-val">
          {value.toLocaleString('en')}
        </text>
        <g transform={`rotate(${needle} ${C} ${C})`} className="tach-needle">
          <polygon
            points={`${C - 18},${C - 2.2} ${C},${C - 2.2} ${tip},${C - 0.5} ${tip},${C + 0.5} ${C},${C + 2.2} ${C - 18},${C + 2.2}`}
          />
          <circle cx={C - 13} cy={C} r={4.5} />
        </g>
        <circle cx={C} cy={C} r={7} className="tach-hub" />
        <circle cx={C} cy={C} r={2.4} className="tach-hub-dot" />
      </svg>
      {note && <p className="tach-cap">{note}</p>}
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

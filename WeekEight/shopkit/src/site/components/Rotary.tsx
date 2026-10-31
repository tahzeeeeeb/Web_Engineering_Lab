import { useEffect, useRef } from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'

type Props = {
  positions: number
  value: number
  onChange: (v: number) => void
  label: string
  ariaLabel: string
  valueText: (v: number) => string
  /** Total travel in degrees, spread evenly across the detents. */
  sweep?: number
  className?: string
}

/** A detented rotary switch like the ones on an F1 wheel.
 *  Drag it round, scroll over it, or focus it and use the arrow keys.
 *  It only ever rests on a detent and snaps with a little overshoot. */
export function Rotary({ positions, value, onChange, label, ariaLabel, valueText, sweep = 300, className = '' }: Props) {
  const start = -sweep / 2
  const step = sweep / (positions - 1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ last: number; acc: number } | null>(null)
  const valueRef = useRef(value)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    valueRef.current = value
    onChangeRef.current = onChange
  }, [value, onChange])

  const commit = (v: number) => {
    const c = Math.max(0, Math.min(positions - 1, v))
    if (c !== valueRef.current) {
      valueRef.current = c
      onChangeRef.current(c)
    }
  }

  const angleAt = (x: number, y: number) => {
    const r = knobRef.current?.getBoundingClientRect()
    if (!r) return 0
    return (Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2)) * 180) / Math.PI
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { last: angleAt(e.clientX, e.clientY), acc: start + valueRef.current * step }
    knobRef.current?.focus({ preventScroll: true })
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const a = angleAt(e.clientX, e.clientY)
    let delta = a - d.last
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    d.last = a
    d.acc = Math.max(start - step / 2, Math.min(start + sweep + step / 2, d.acc + delta))
    commit(Math.round((d.acc - start) / step))
  }
  const endDrag = () => {
    drag.current = null
  }

  // Scroll wheel over the knob turns it one detent at a time
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    let lastAt = 0
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const now = performance.now()
      if (now - lastAt < 70 || Math.abs(e.deltaY) < 1) return
      lastAt = now
      const v = valueRef.current + (e.deltaY < 0 ? 1 : -1)
      const c = Math.max(0, Math.min(positions - 1, v))
      if (c !== valueRef.current) {
        valueRef.current = c
        onChangeRef.current(c)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [positions])

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    let v: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v = value + 1
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v = value - 1
    if (e.key === 'Home') v = 0
    if (e.key === 'End') v = positions - 1
    if (v === null) return
    e.preventDefault()
    e.stopPropagation()
    commit(v)
  }

  return (
    <div className={`rot ${className}`}>
      <div
        className="rot-dial"
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {Array.from({ length: positions }, (_, i) => (
          <span
            key={i}
            className={`rot-mark${i === value ? ' is-on' : ''}`}
            style={{ '--a': `${start + i * step}deg` } as CSSProperties}
            aria-hidden="true"
          >
            <i />
            <b>{i + 1}</b>
          </span>
        ))}
        <div
          ref={knobRef}
          className="rot-knob"
          role="slider"
          tabIndex={0}
          aria-label={ariaLabel}
          aria-valuemin={1}
          aria-valuemax={positions}
          aria-valuenow={value + 1}
          aria-valuetext={valueText(value)}
          onKeyDown={onKeyDown}
          style={{ rotate: `${start + value * step}deg` }}
        >
          <span className="rot-pointer" />
        </div>
      </div>
      <span className="rot-label">{label}</span>
    </div>
  )
}

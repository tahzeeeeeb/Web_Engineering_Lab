import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { watchVisibility } from './visibility'

type Props = {
  text: string
  className?: string
  /** Angle of the cut through the letters, degrees. */
  angle?: number
  /** Where the cut crosses, as a fraction of the height. */
  at?: number
  delay?: number
}

/**
 * Chrome lettering cut clean through by one stroke. When it scrolls into view the two
 * halves slide together along the cut and stop a hair apart, leaving the seam visible.
 * The real text stays in the DOM for screen readers; the halves are decoration.
 */
export function Sliced({ text, className, angle = -7, at = 0.52, delay = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return watchVisibility(el, 0.4, (on) => {
      if (on) el.classList.add('is-cut')
    })
  }, [])

  const tan = Math.tan((angle * Math.PI) / 180)
  // the em box is roughly 3× wider than tall for a short word; good enough for the polygon
  const k = tan * 150
  const yl = (at * 100 - k).toFixed(1)
  const yr = (at * 100 + k).toFixed(1)
  const style = {
    '--yl': `${yl}%`,
    '--yr': `${yr}%`,
    '--sa': `${angle}deg`,
    '--sd': `${delay}ms`,
  } as CSSProperties

  return (
    <span ref={ref} className={`sliced${className ? ` ${className}` : ''}`} style={style}>
      <span className="sliced-base">{text}</span>
      <span className="sliced-half sliced-a" aria-hidden="true">
        {text}
      </span>
      <span className="sliced-half sliced-b" aria-hidden="true">
        {text}
      </span>
      <span className="sliced-line" aria-hidden="true" />
    </span>
  )
}

import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { reducedMotion } from './prefs'

type Props = {
  text: string
  className?: string
  /** Angle of the cut through the letters, degrees. */
  angle?: number
  /** Where the cut crosses, as a fraction of the height. */
  at?: number
  delay?: number
}

const D2R = Math.PI / 180
/** Length of one cut (blade, split and rejoin), ms; matches the half animations in engine.css. */
const CUT_MS = 900
const MIN_VISIBLE = 0.4

/**
 * Chrome lettering that a blade cuts through each time it scrolls into view from below:
 * the edge crosses, the word splits along it, and the halves glide back into one whole word.
 * At rest only the real text is shown (and read by screen readers); the halves are decoration.
 */
export function Sliced({ text, className, angle = -7, at = 0.52, delay = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null)

  // Fit the clip edge to the real box, so it follows the blade's angle on any word length.
  // Same line as edges() in cut.ts, extended to the polygon's overhang at −10% and 110%.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (!w || !h) return
      const k = (w / h) * Math.tan(angle * D2R) * 50
      el.style.setProperty('--yl', `${(at * 100 - 1.2 * k).toFixed(2)}%`)
      el.style.setProperty('--yr', `${(at * 100 + 1.2 * k).toFixed(2)}%`)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [angle, at])

  // Cut each time the heading scrolls in from below; whole and still when it comes in from above
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const lower = el.querySelector<HTMLElement>('.sliced-b')
    let cutting = false
    let armed = true
    let initial = true // the first measurement after mount plays the cut, wherever the heading sits
    let timer = 0

    const finish = () => {
      if (!cutting) return
      cutting = false
      window.clearTimeout(timer)
      el.classList.remove('is-cutting')
    }
    const cut = () => {
      if (cutting || reducedMotion()) return
      cutting = true
      el.classList.add('is-cutting')
      timer = window.setTimeout(finish, CUT_MS + delay + 100)
    }
    lower?.addEventListener('animationend', finish)

    const io = new IntersectionObserver(
      ([e]) => {
        const first = initial
        initial = false
        if (!e.isIntersecting) {
          armed = true
          return
        }
        if (e.intersectionRatio < MIN_VISIBLE || !armed) return
        armed = false
        const fromBelow = e.boundingClientRect.top > (e.rootBounds?.height ?? window.innerHeight) * 0.5
        if (first || fromBelow) cut()
      },
      { threshold: [0, MIN_VISIBLE] },
    )
    io.observe(el)

    // An observer created during StrictMode's double mount can miss its first notification,
    // so measure once on the next frame as well (as watchVisibility does).
    const raf = requestAnimationFrame(() => {
      initial = false
      if (!armed) return
      const r = el.getBoundingClientRect()
      const area = r.width * r.height
      const w = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0))
      const h = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0))
      if (area > 0 && w * h > 0 && (w * h) / area >= MIN_VISIBLE) {
        armed = false
        cut()
      }
    })

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      lower?.removeEventListener('animationend', finish)
      window.clearTimeout(timer)
      el.classList.remove('is-cutting')
    }
  }, [delay])

  const style = {
    '--at': at,
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

import { flushSync } from 'react-dom'
import { prefs, reducedMotion } from './prefs'
import type { Theme } from './prefs'
import { playSlash } from '../audio/sound'

const D2R = Math.PI / 180

/** Where a line through the centre at `angle` meets the left and right edges, in % of the height. */
function edges(w: number, h: number, angle: number) {
  const k = (w / h) * Math.tan(angle * D2R) * 50
  return { yl: 50 - k, yr: 50 + k }
}

/**
 * Katana cut across a 3D stage: a steel edge sweeps along the blade line, then the
 * frozen frame splits in two along it and the halves fall away, revealing the live
 * view (already changing underneath).
 */
export function cutStage(container: HTMLElement, image: string | null, angle = -12, strength = 1) {
  playSlash(strength)
  if (reducedMotion()) return
  const w = container.clientWidth
  const h = container.clientHeight
  const { yl, yr } = edges(w, h, angle)
  const layer = document.createElement('div')
  layer.className = 'kcut'
  layer.setAttribute('aria-hidden', 'true')
  const half = (poly: string) => {
    const d = document.createElement('div')
    d.className = 'kcut-half'
    if (image) d.style.backgroundImage = `url(${image})`
    d.style.clipPath = `polygon(${poly})`
    layer.appendChild(d)
    return d
  }
  const a = image ? half(`0 0, 100% 0, 100% ${yr}%, 0 ${yl}%`) : null
  const b = image ? half(`0 ${yl}%, 100% ${yr}%, 100% 100%, 0 100%`) : null
  const blade = document.createElement('div')
  blade.className = 'kcut-blade'
  blade.style.setProperty('--a', `${angle}deg`)
  layer.appendChild(blade)
  container.appendChild(layer)

  const rad = angle * D2R
  const nx = Math.sin(rad) // normal to the cut, pointing up
  const ny = -Math.cos(rad)
  const dx = Math.cos(rad) // along the cut
  const dy = Math.sin(rad)
  blade.animate(
    [
      { clipPath: 'inset(0 100% 0 0)', opacity: 1 },
      { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.35 },
      { clipPath: 'inset(0 0 0 0)', opacity: 0 },
    ],
    { duration: 560, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' },
  )
  const D = 820
  const fly = (el: HTMLElement | null, s: number) =>
    el?.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: 'none', opacity: 1, offset: 0.16 },
        {
          transform: `translate(${(nx * 34 - dx * 46) * s}px, ${(ny * 34 - dy * 46) * s}px) rotate(${-1.4 * s}deg)`,
          opacity: 0,
        },
      ],
      { duration: D, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' },
    )
  fly(a, 1)
  fly(b, -1)
  window.setTimeout(() => layer.remove(), D + 60)
}

type VTDoc = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }

/** Switch theme with a cut through the whole page: the blade crosses, then the old page opens along it. */
export function themeCut(next: Theme) {
  const apply = () => flushSync(() => prefs.set({ theme: next }))
  playSlash(1)
  const doc = document as VTDoc
  if (reducedMotion() || typeof doc.startViewTransition !== 'function') {
    apply()
    return
  }
  const angle = -8
  const root = document.documentElement
  const { yl, yr } = edges(window.innerWidth, window.innerHeight, angle)
  root.style.setProperty('--cut-yl', `${yl}%`)
  root.style.setProperty('--cut-yr', `${yr}%`)
  const blade = document.createElement('div')
  blade.className = 'theme-blade'
  blade.style.setProperty('--a', `${angle}deg`)
  blade.setAttribute('aria-hidden', 'true')
  document.body.appendChild(blade)
  window.setTimeout(() => {
    root.dataset.cut = ''
    const vt = doc.startViewTransition!(apply)
    vt.finished.finally(() => {
      delete root.dataset.cut
      blade.remove()
    })
  }, 190)
}

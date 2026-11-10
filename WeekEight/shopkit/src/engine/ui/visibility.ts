/**
 * Calls `cb(true/false)` as `el` comes into or leaves view, with at least `min` of it visible.
 * Also measures once on the next frame: an IntersectionObserver created during React's
 * StrictMode double-mount can miss its first notification until the page scrolls.
 */
export function watchVisibility(el: Element, min: number, cb: (visible: boolean) => void): () => void {
  let last: boolean | null = null
  const emit = (on: boolean) => {
    if (on === last) return
    last = on
    cb(on)
  }
  const io = new IntersectionObserver(([e]) => emit(e.isIntersecting && e.intersectionRatio >= min), {
    threshold: [0, min, Math.min(1, min + 0.25)],
  })
  io.observe(el)
  const raf = requestAnimationFrame(() => {
    const r = el.getBoundingClientRect()
    const area = r.width * r.height
    const w = Math.max(0, Math.min(r.right, window.innerWidth) - Math.max(r.left, 0))
    const h = Math.max(0, Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0))
    emit(area > 0 && (w * h) / area >= min && w * h > 0)
  })
  return () => {
    cancelAnimationFrame(raf)
    io.disconnect()
  }
}

import { useSyncExternalStore } from 'react'
import { playTick } from '../audio/sound'

/*
 * Slow motion for the engine pictures, shared by the hero and the layouts. It only slows what you see:
 * the rpm, the tachometer and the engine sound stay real. Kept in memory, so every page load starts at Real.
 */

const FACTORS = [1, 10, 50, 200, 1000] as const
export type SlowFactor = (typeof FACTORS)[number]

let factor: SlowFactor = 1
const subs = new Set<() => void>()

const store = {
  get: (): SlowFactor => factor,
  set(next: SlowFactor) {
    if (next === factor) return
    factor = next
    subs.forEach((f) => f())
  },
  subscribe(f: () => void) {
    subs.add(f)
    return () => {
      subs.delete(f)
    }
  },
}

/** Current factor, for frame loops: the picture turns this many times slower than the real rpm. */
export const slowFactor = store.get

/** Current factor, for rendering. */
export function useSlowFactor(): SlowFactor {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

/** Segmented Real / 10× / 50× / 200× / 1000× control. */
export function SlowMo() {
  const current = useSlowFactor()
  return (
    <div className="toggle toggle--sm" role="group" aria-label="Slow motion">
      {FACTORS.map((f) => (
        <button
          key={f}
          type="button"
          className={f === current ? 'is-on' : undefined}
          aria-pressed={f === current}
          onClick={() => {
            if (f === current) return
            playTick()
            store.set(f)
          }}
        >
          {f === 1 ? 'Real' : `${f}×`}
        </button>
      ))}
    </div>
  )
}

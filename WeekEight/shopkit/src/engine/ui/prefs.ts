import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'
export type Prefs = { theme: Theme; sound: boolean }

const KEY = 'kikan-prefs'
const DEFAULTS: Prefs = { theme: 'dark', sound: true }

function load(): Prefs {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const p = JSON.parse(raw) as Partial<Prefs>
    return { theme: p.theme === 'light' ? 'light' : 'dark', sound: p.sound !== false }
  } catch {
    return DEFAULTS
  }
}

let state: Prefs = typeof window === 'undefined' ? DEFAULTS : load()
const subs = new Set<() => void>()

export const prefs = {
  get: (): Prefs => state,
  set(patch: Partial<Prefs>) {
    state = { ...state, ...patch }
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage can be unavailable; the choice still applies for this visit */
    }
    subs.forEach((f) => f())
  },
  subscribe(f: () => void) {
    subs.add(f)
    return () => {
      subs.delete(f)
    }
  },
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(prefs.subscribe, prefs.get, prefs.get)
}

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ComponentType, MouseEvent as ReactMouseEvent } from 'react'
import { PAGES, pageHref, GITHUB, EMAIL } from './data'
import type { PageProps } from './data'
import { applyTheme, BB_POSITIONS } from './theme'
import { SiteDefs } from './components/SiteDefs'
import { CoffeeDrip, makeDrip } from './components/Coffee'
import type { Drip } from './components/Coffee'
import { F1Button } from './components/F1Button'
import { CheckeredFlag } from './components/CheckeredFlag'
import { SteeringWheel } from './components/SteeringWheel'
import { GearTrain } from './components/Gears'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Research from './pages/Research'
import About from './pages/About'
import Contact from './pages/Contact'
import './site.css'
import './wheel.css'

const PAGE_VIEWS: ComponentType<PageProps>[] = [Home, Projects, Research, About, Contact]

function pageFromHash(): number {
  const id = window.location.hash.replace(/^#\/?/, '')
  const i = PAGES.findIndex((p) => p.id === id)
  return i === -1 ? 0 : i
}

function initialBb(): number {
  try {
    const saved = window.localStorage.getItem('tk-bb')
    if (saved !== null) {
      const n = Number(saved)
      if (Number.isInteger(n) && n >= 0 && n < BB_POSITIONS) return n
    }
  } catch {
    // storage blocked: fall back to the system preference
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? BB_POSITIONS - 1 : 0
}

type Nav = { page: number; dir: 1 | -1; shifts: number }

export default function Site() {
  const [nav, setNav] = useState<Nav>(() => ({ page: pageFromHash(), dir: 1, shifts: 0 }))
  const [bb, setBb] = useState(initialBb)
  const [flag, setFlag] = useState({ run: 0, live: false })
  const atFinishRef = useRef(false)
  const [drips, setDrips] = useState<Drip[]>([])
  const siteRef = useRef<HTMLDivElement>(null)
  const themeT = useRef(bb / (BB_POSITIONS - 1))
  const dripSeq = useRef(0)

  /* Theme: apply before paint, then ease between detents */
  useLayoutEffect(() => {
    applyTheme(themeT.current)
  }, [])

  useEffect(() => {
    const target = bb / (BB_POSITIONS - 1)
    const from = themeT.current
    const startAt = performance.now()
    const DURATION = 320
    let raf = 0
    const step = (now: number) => {
      const p = Math.min(1, (now - startAt) / DURATION)
      const t = from + (target - from) * (1 - (1 - p) ** 3)
      themeT.current = t
      applyTheme(t)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    try {
      window.localStorage.setItem('tk-bb', String(bb))
    } catch {
      // storage blocked: the setting just won't persist
    }
    return () => cancelAnimationFrame(raf)
  }, [bb])

  /* Routing via the URL hash, remembering which way we shifted */
  useEffect(() => {
    const onHash = () => {
      setDrips([])
      setFlag((f) => (f.live ? { ...f, live: false } : f))
      setNav((prev) => {
        const next = pageFromHash()
        if (next === prev.page) return prev
        return { page: next, dir: next > prev.page ? 1 : -1, shifts: prev.shifts + 1 }
      })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const endFlag = useCallback(() => setFlag((f) => ({ ...f, live: false })), [])

  const go = useCallback((i: number) => {
    const target = Math.max(0, Math.min(PAGES.length - 1, i))
    const href = pageHref(target)
    if (window.location.hash === href || (target === 0 && window.location.hash === '')) return
    window.location.hash = href.slice(1)
  }, [])

  /* Scroll: turn the gears, and wave the flags when the bottom is reached */
  useEffect(() => {
    const root = document.documentElement
    let raf = 0
    atFinishRef.current = false
    const check = () => {
      raf = 0
      const y = window.scrollY
      root.style.setProperty('--turn', `${(y * 0.22).toFixed(2)}deg`)
      const maxY = root.scrollHeight - window.innerHeight
      const at = maxY > 40 && y >= maxY - 6
      if (at && !atFinishRef.current) {
        setFlag((f) => (f.live ? f : { run: f.run + 1, live: true }))
      }
      atFinishRef.current = at
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    window.scrollTo({ top: 0 })
    raf = requestAnimationFrame(check)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [nav.page])

  /* Off-register print: the rust plate under headlines drifts with the pointer */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = document.documentElement
    let raf = 0
    const onMove = (e: PointerEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const nx = e.clientX / window.innerWidth - 0.5
        const ny = e.clientY / window.innerHeight - 0.5
        root.style.setProperty('--reg-x', `${(2 + nx * 5).toFixed(2)}px`)
        root.style.setProperty('--reg-y', `${(1.5 + ny * 4).toFixed(2)}px`)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  /* Click empty paper anywhere to spill a drop of coffee */
  const onPaperClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('a, button, input, textarea, select, label, [role="slider"], .dock')) return
    const r = e.currentTarget.getBoundingClientRect()
    dripSeq.current += 1
    const drip = makeDrip(dripSeq.current, e.clientX - r.left, e.clientY - r.top)
    setDrips((d) => [...d.slice(-7), drip])
  }

  const View = PAGE_VIEWS[nav.page]

  return (
    <div className="site" ref={siteRef} onClick={onPaperClick}>
      <SiteDefs />
      {drips.map((d) => (
        <CoffeeDrip key={d.id} drip={d} />
      ))}

      <header className="site-head">
        <a className="site-name" href="#/">
          M. Tahzeeb Khan
        </a>
        <nav className="site-nav" aria-label="Pages">
          {PAGES.map((p, i) => (
            <F1Button
              key={p.id}
              size="sm"
              tone={i === nav.page ? 'rust' : 'ink'}
              href={pageHref(i)}
              active={i === nav.page}
              current={i === nav.page}
            >
              {p.label}
            </F1Button>
          ))}
        </nav>
      </header>

      {nav.shifts > 0 && (
        <div key={nav.shifts} className={`gearflash gearflash--${nav.dir > 0 ? 'up' : 'down'}`} aria-hidden="true">
          <span>{nav.page + 1}</span>
        </div>
      )}

      <main
        key={nav.page}
        className={`site-main${nav.shifts > 0 ? ` shift-${nav.dir > 0 ? 'up' : 'down'}` : ''}`}
      >
        <View onGo={go} />
      </main>

      <footer className="site-foot">
        <div className="finish-line" aria-hidden="true" />
        <div className="site-foot-row">
          <GearTrain className="gears--foot" module={4} gears={[{ teeth: 14 }, { teeth: 9, at: -25 }]} />
          <p>
            Paddles or <kbd>Q</kbd> / <kbd>E</kbd> change pages. Hold the throttle to scroll down and the brake to
            scroll up. Turn BB to dim the lights.
          </p>
          <p className="site-foot-links">
            <a href={`mailto:${EMAIL}`}>Email</a>
            <a href={GITHUB} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </p>
        </div>
      </footer>

      {flag.live && <CheckeredFlag key={flag.run} onDone={endFlag} />}
      <SteeringWheel page={nav.page} onGo={go} bb={bb} onBb={setBb} />
    </div>
  )
}

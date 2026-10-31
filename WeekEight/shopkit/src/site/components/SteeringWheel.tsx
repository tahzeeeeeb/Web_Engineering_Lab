import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import { PAGES, pageIndex } from '../data'
import { BB_POSITIONS } from '../theme'
import { click, setMuted } from '../sound'
import { F1Button } from './F1Button'
import { Rotary } from './Rotary'

type Pedal = 'throttle' | 'brake'
type Props = {
  page: number
  onGo: (i: number) => void
  bb: number
  onBb: (v: number) => void
}

const LEDS = 15
const MAXV = 44 // px per frame at full throttle
const ACCEL = 0.8
const BRAKE = 1.6

export function SteeringWheel({ page, onGo, bb, onBb }: Props) {
  const lightsRef = useRef<HTMLDivElement>(null)
  const speedRef = useRef<HTMLSpanElement>(null)
  const lapRef = useRef<HTMLSpanElement>(null)
  const pedals = useRef<Record<Pedal, boolean>>({ throttle: false, brake: false })
  const boostUntil = useRef(0)
  const kickRef = useRef<() => void>(() => {})
  const popupTimer = useRef(0)
  const popupSeq = useRef(0)
  const pullTimer = useRef(0)
  const prevPage = useRef(page)

  const [down, setDown] = useState<Record<Pedal, boolean>>({ throttle: false, brake: false })
  const [popup, setPopup] = useState<{ big: string; small: string; id: number } | null>(null)
  const [tone, setTone] = useState(true)
  const [pulled, setPulled] = useState<0 | 1 | -1>(0)

  const showPopup = useCallback((big: string, small: string) => {
    window.clearTimeout(popupTimer.current)
    popupSeq.current += 1
    setPopup({ big, small, id: popupSeq.current })
    popupTimer.current = window.setTimeout(() => setPopup(null), 1300)
  }, [])

  /* ---------------- scroll engine: pedals + live speed / shift lights ---------------- */
  useEffect(() => {
    const leds = lightsRef.current ? (Array.from(lightsRef.current.children) as HTMLElement[]) : []
    let frame = 0
    let vel = 0
    let spd = 0
    let lit = -1
    let lastY = window.scrollY
    let lastT = performance.now()

    const paint = (y: number, maxY: number) => {
      const kmh = Math.min(350, Math.round(spd * 8))
      if (speedRef.current) speedRef.current.textContent = String(kmh)
      if (lapRef.current) lapRef.current.textContent = `${maxY > 0 ? Math.min(100, Math.round((y / maxY) * 100)) : 100}%`
      const n = Math.round(Math.min(1, spd / 34) * LEDS)
      if (n !== lit) {
        lit = n
        leds.forEach((el, k) => el.classList.toggle('is-on', k < n))
        lightsRef.current?.classList.toggle('is-limit', n >= LEDS)
      }
    }

    const loop = (now: number) => {
      // dt in 60 fps frames, so the car feels the same on 60, 120 or 30 Hz screens
      const dt = Math.min(4, Math.max(0.25, (now - lastT) / 16.667))
      lastT = now
      const p = pedals.current
      const boosting = now < boostUntil.current
      if (p.throttle || boosting) {
        const cap = boosting ? MAXV * 2.4 : MAXV
        vel = Math.min(cap, vel + ACCEL * (boosting ? 3 : 1) * dt)
      }
      if (p.brake) vel = Math.max(-MAXV, vel - BRAKE * dt)
      if (!p.throttle && !p.brake && !boosting) {
        vel *= 0.9 ** dt
        if (Math.abs(vel) < 0.2) vel = 0
      }

      const maxY = document.documentElement.scrollHeight - window.innerHeight
      const y0 = window.scrollY
      if ((vel > 0 && y0 >= maxY - 1) || (vel < 0 && y0 <= 0)) {
        vel = 0
        boostUntil.current = 0
      }
      if (vel) window.scrollBy(0, vel * dt)

      const y = window.scrollY
      spd = spd * 0.82 + (Math.abs(y - lastY) / dt) * 0.18
      lastY = y
      paint(y, maxY)

      const idle = !p.throttle && !p.brake && !boosting && vel === 0 && spd < 0.08
      if (idle) {
        spd = 0
        paint(y, maxY)
        frame = 0
        return
      }
      frame = requestAnimationFrame(loop)
    }

    const kick = () => {
      if (frame) return
      lastY = window.scrollY
      lastT = performance.now()
      frame = requestAnimationFrame(loop)
    }
    kickRef.current = kick

    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', kick, { passive: true })
    kick()
    return () => {
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', kick)
      cancelAnimationFrame(frame)
    }
  }, [])

  // Re-measure the lap counter when the page (and its height) changes; flash the lights on a shift
  useEffect(() => {
    kickRef.current()
    if (prevPage.current === page) return
    prevPage.current = page
    const lights = lightsRef.current
    if (!lights) return
    lights.classList.remove('is-shift')
    void lights.offsetWidth
    lights.classList.add('is-shift')
    const t = window.setTimeout(() => lights.classList.remove('is-shift'), 520)
    return () => window.clearTimeout(t)
  }, [page])

  // Other parts of the site can flash a message on the LCD (e.g. the chequered flag)
  useEffect(() => {
    const onLcd = (e: Event) => {
      const d = (e as CustomEvent<{ big: string; small: string }>).detail
      if (d) showPopup(d.big, d.small)
    }
    window.addEventListener('tk-lcd', onLcd)
    return () => window.removeEventListener('tk-lcd', onLcd)
  }, [showPopup])

  /* ---------------- paddles ---------------- */
  const shift = useCallback(
    (dir: 1 | -1) => {
      window.clearTimeout(pullTimer.current)
      setPulled(dir)
      pullTimer.current = window.setTimeout(() => setPulled(0), 160)
      const next = page + dir
      if (next < 0 || next >= PAGES.length) {
        click(320, 0.05, 0.05)
        showPopup(dir > 0 ? 'TOP' : '1ST', dir > 0 ? 'NO HIGHER GEAR' : 'NO LOWER GEAR')
        return
      }
      click(dir > 0 ? 950 : 700, 0.03, 0.05)
      onGo(next)
    },
    [page, onGo, showPopup],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'e' || k === ']') shift(1)
      if (k === 'q' || k === '[') shift(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shift])

  /* ---------------- pedals ---------------- */
  const press = (which: Pedal) => {
    if (pedals.current[which]) return
    pedals.current[which] = true
    setDown((d) => ({ ...d, [which]: true }))
    click(which === 'throttle' ? 600 : 420, 0.03, 0.035)
    kickRef.current()
  }
  const release = (which: Pedal) => {
    if (!pedals.current[which]) return
    pedals.current[which] = false
    setDown((d) => ({ ...d, [which]: false }))
  }
  const pedalHandlers = (which: Pedal) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      press(which)
    },
    onPointerUp: () => release(which),
    onPointerCancel: () => release(which),
    onLostPointerCapture: () => release(which),
    onKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault()
        press(which)
      }
    },
    onKeyUp: (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (e.key === ' ' || e.key === 'Enter') release(which)
    },
    onContextMenu: (e: ReactMouseEvent<HTMLButtonElement>) => e.preventDefault(),
  })

  /* ---------------- wheel buttons + rotaries ---------------- */
  const overtake = () => {
    boostUntil.current = performance.now() + 1100
    showPopup('OT', 'PUSH TO PASS')
    kickRef.current()
  }
  const toggleTone = () => {
    const next = !tone
    setTone(next)
    setMuted(!next)
    showPopup('TONE', next ? 'CLICKS ON' : 'CLICKS OFF')
  }
  const changeBb = (v: number) => {
    click(2400, 0.012, 0.045)
    onBb(v)
    showPopup(`BB ${String(v + 1).padStart(2, '0')}`, `${Math.round((v / (BB_POSITIONS - 1)) * 100)}% DARK`)
  }
  const changeMap = (v: number) => {
    click(1900, 0.012, 0.045)
    onGo(v)
  }

  return (
    <div className="dock" role="region" aria-label="Steering wheel controls">
      <button
        type="button"
        className={`pedal pedal--brake${down.brake ? ' is-down' : ''}`}
        aria-label="Brake: hold to scroll up"
        {...pedalHandlers('brake')}
      >
        <span className="pedal-plate">
          <span className="pedal-name">BRAKE</span>
        </span>
        <span className="pedal-arm" />
      </button>

      <div className="wheel-wrap">
        <button
          type="button"
          className={`paddle paddle--down${pulled === -1 ? ' is-pulled' : ''}`}
          onClick={() => shift(-1)}
          aria-label="Downshift: previous page (Q)"
        >
          <span>−</span>
        </button>
        <button
          type="button"
          className={`paddle paddle--up${pulled === 1 ? ' is-pulled' : ''}`}
          onClick={() => shift(1)}
          aria-label="Upshift: next page (E)"
        >
          <span>+</span>
        </button>

        <span className="grip grip--l" aria-hidden="true" />
        <span className="grip grip--r" aria-hidden="true" />

        <div className="wheel">
          <div className="lights" ref={lightsRef} aria-hidden="true">
            {Array.from({ length: LEDS }, (_, i) => (
              <span key={i} className={`led led--${i < 5 ? 'g' : i < 10 ? 'r' : 'b'}`} />
            ))}
          </div>

          <div className="wheel-face">
            <div className="wheel-side">
              <div className="wheel-btns">
                <F1Button size="round" tone="rust" onClick={() => onGo(0)} label="Pit: go to home page">
                  PIT
                </F1Button>
                <F1Button size="round" tone="amber" onClick={overtake} label="Overtake: sprint to the bottom">
                  OT
                </F1Button>
              </div>
              <Rotary
                positions={BB_POSITIONS}
                value={bb}
                onChange={changeBb}
                label="BB"
                ariaLabel="Brake balance: page darkness"
                valueText={(v) => `${Math.round((v / (BB_POSITIONS - 1)) * 100)}% dark`}
                className="rot--bb"
              />
            </div>

            <div className="lcd">
              <div className="lcd-row">
                <div className="lcd-cell">
                  <span className="lcd-k">KPH</span>
                  <span className="lcd-v" ref={speedRef}>
                    0
                  </span>
                </div>
                <div className="lcd-gear">{page + 1}</div>
                <div className="lcd-cell lcd-cell--r">
                  <span className="lcd-k">LAP</span>
                  <span className="lcd-v" ref={lapRef}>
                    0%
                  </span>
                </div>
              </div>
              <div className="lcd-foot">
                <span>{PAGES[page].code}</span>
                <span>BB {String(bb + 1).padStart(2, '0')}</span>
              </div>
              <div className="lcd-popup-slot" aria-live="polite">
                {popup && (
                  <div key={popup.id} className="lcd-popup">
                    <b>{popup.big}</b>
                    <span>{popup.small}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="wheel-side wheel-side--r">
              <div className="wheel-btns">
                <F1Button size="round" tone="olive" onClick={() => onGo(pageIndex('contact'))} label="Radio: contact page">
                  RADIO
                </F1Button>
                <F1Button size="round" tone="teal" onClick={toggleTone} active={tone} label="Toggle click sounds">
                  TONE
                </F1Button>
              </div>
              <Rotary
                positions={PAGES.length}
                value={page}
                onChange={changeMap}
                label="MAP"
                ariaLabel="Page selector"
                valueText={(v) => PAGES[v].label}
                sweep={150}
                className="rot--map"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`pedal pedal--throttle${down.throttle ? ' is-down' : ''}`}
        aria-label="Throttle: hold to scroll down"
        {...pedalHandlers('throttle')}
      >
        <span className="pedal-plate">
          <span className="pedal-name">THROTTLE</span>
        </span>
        <span className="pedal-arm" />
      </button>
    </div>
  )
}

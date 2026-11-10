import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createStage, disposeTree } from '../three/stage'
import type { Stage } from '../three/stage'
import { buildEngine, strokeAt } from '../three/engineRig'
import type { EngineRig } from '../three/engineRig'
import { PARTS, PART_BY_ID } from '../data/parts'
import type { PartId } from '../data/parts'
import { PartPanel } from '../ui/PartPanel'
import { Sliced } from '../ui/Sliced'
import { Tach } from '../ui/Tach'
import { Enso, Sparkle } from '../ui/Ornament'
import { cutStage } from '../ui/cut'
import { createEngineVoice } from '../audio/sound'
import type { EngineVoice } from '../audio/sound'
import { playTick } from '../audio/sound'
import { reducedMotion } from '../ui/prefs'
import { watchVisibility } from '../ui/visibility'

const SLOWER = 50
const STROKE_EN = ['Power', 'Exhaust', 'Intake', 'Compress']
const STROKE_JP = ['燃焼', '排気', '吸入', '圧縮']
const CLOSED = { target: new THREE.Vector3(0, 1.05, 0), dist: 14.2 }
const OPENED = { target: new THREE.Vector3(0, 2.7, 0), dist: 17.5 }

export function HeroEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageElRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const angleRef = useRef<HTMLSpanElement>(null)
  const cylRefs = useRef<(HTMLLIElement | null)[]>([])
  const stageRef = useRef<Stage | null>(null)
  const rigRef = useRef<EngineRig | null>(null)
  const voiceRef = useRef<EngineVoice | null>(null)
  const [inView, setInView] = useState(false)

  const [selected, setSelected] = useState<PartId | null>(null)
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(true)
  const [rpm, setRpm] = useState(1800)
  const [manual, setManual] = useState(0)
  const [touched, setTouched] = useState(false)

  const live = useRef({
    selected: null as PartId | null,
    open: false,
    running: true,
    rpm: 1800,
    theta: 0.6,
    explode: 0,
    camUntil: 0,
    hover: null as { x: number; y: number } | null,
    hoverId: null as PartId | null,
    lastStroke: [-1, -1, -1, -1],
    shiftX: 0,
    shiftY: 0,
  })

  useEffect(() => {
    const L = live.current
    L.selected = selected
    L.open = open
    L.camUntil = performance.now() + 1500
  }, [selected, open])

  useEffect(() => {
    live.current.running = running
    live.current.rpm = rpm
    voiceRef.current?.setRpm(rpm)
    voiceRef.current?.setActive(running && inView)
  }, [running, rpm, inView])

  /* ---------- engine note: real time, even though the picture runs 50× slower ---------- */
  useEffect(() => {
    const voice = createEngineVoice(1)
    voiceRef.current = voice
    const el = stageElRef.current
    const unwatch = el ? watchVisibility(el, 0.35, setInView) : () => {}
    return () => {
      unwatch()
      voice.dispose()
      voiceRef.current = null
    }
  }, [])

  /* ---------- three.js set-up ---------- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const stage = createStage(canvas, {
      position: [-8.9, 5.1, 10.35],
      target: [0, 1.05, 0],
      fov: 28,
      ground: -1.32,
      minDistance: 6,
      maxDistance: 26,
      autoRotate: !reduced,
      shadowExtent: 7.5,
      fitAspect: 1.3,
    })
    const rig = buildEngine({ cylinders: 4 })
    stage.scene.add(rig.root)
    stageRef.current = stage
    rigRef.current = rig
    voiceRef.current?.setPattern({ angles: rig.fireAt, pans: rig.fireAt.map(() => 0) })
    voiceRef.current?.setRpm(live.current.rpm)
    const L = live.current
    const box = new THREE.Box3()
    const center = new THREE.Vector3()
    const desired = new THREE.Vector3()
    const offset = new THREE.Vector3()
    const tip = tipRef.current

    stage.setFrame((dt) => {
      // crank
      if (L.running) L.theta += dt * (L.rpm / 60 / SLOWER) * Math.PI * 2
      rig.update(L.theta)

      // explode / close
      const goal = L.open ? 1 : 0
      L.explode += (goal - L.explode) * (1 - Math.exp(-dt * 3.2))
      if (Math.abs(goal - L.explode) < 0.0005) L.explode = goal
      rig.setExplode(L.explode)
      const e = L.explode
      rig.root.position.y = 0.8 * e * e * (3 - 2 * e)

      // ghosting and focus
      const k = 1 - Math.exp(-dt * 7)
      rig.parts.forEach((h) => {
        let o = 1
        if (L.selected) o = h.id === L.selected ? 1 : h.housing ? 0.07 : 0.15
        else if (L.open) o = h.housing ? 0.12 : 1
        rig.setOpacity(h.id, h.opacity + (o - h.opacity) * k)
      })

      // camera glides to the open view or the selected part, then hands control back
      if (performance.now() < L.camUntil) {
        const base = L.open ? OPENED : CLOSED
        desired.copy(base.target)
        let dist = base.dist * stage.distScale()
        if (L.selected) {
          const part = rig.parts.get(L.selected)
          if (part) {
            box.setFromObject(part.group)
            box.getCenter(center)
            desired.lerp(center, 0.65)
            dist = Math.min(base.dist, 9.5 + box.getSize(center).length() * 0.55) * stage.distScale()
          }
        }
        const c = 1 - Math.exp(-dt * 3)
        stage.controls.target.lerp(desired, c)
        offset.copy(stage.camera.position).sub(stage.controls.target)
        const len = offset.length()
        offset.setLength(len + (dist - len) * c)
        stage.camera.position.copy(stage.controls.target).add(offset)
      }

      // keep the subject clear of the part panel: to the left on wide screens, upwards on phones
      const wide = canvas.clientWidth > 760
      const sx = L.selected && wide ? Math.min(220, canvas.clientWidth * 0.17) : 0
      const sy = L.selected && !wide ? canvas.clientHeight * 0.27 : 0
      L.shiftX += (sx - L.shiftX) * k
      L.shiftY += (sy - L.shiftY) * k
      stage.setViewShift(L.shiftX, L.shiftY)

      // hover label
      if (L.hover && tip) {
        const hits = stage.pick(L.hover.x, L.hover.y, rig.root)
        const hit = L.open || L.selected ? (hits.find((h) => !rig.parts.get(h.object.userData.part)?.housing) ?? hits[0]) : hits[0]
        const id = (hit?.object.userData.part as PartId | undefined) ?? null
        if (id !== L.hoverId) {
          L.hoverId = id
          tip.textContent = id ? PART_BY_ID[id].name : ''
          tip.classList.toggle('is-on', !!id)
          canvas.style.cursor = id ? 'pointer' : 'grab'
        }
        const r = canvas.getBoundingClientRect()
        tip.style.transform = `translate(${L.hover.x - r.left + 14}px, ${L.hover.y - r.top - 14}px)`
        L.hover = null
      }

      // telemetry
      const deg = L.theta / (Math.PI / 180)
      if (angleRef.current) angleRef.current.textContent = String(Math.floor(((deg % 720) + 720) % 720)).padStart(3, '0')
      rig.fireAt.forEach((f, i) => {
        const s = strokeAt(deg - f)
        if (s !== L.lastStroke[i]) {
          L.lastStroke[i] = s
          const li = cylRefs.current[i]
          if (li) {
            li.dataset.stroke = String(s)
            const b = li.querySelector('b')
            const sm = li.querySelector('small')
            if (b) b.textContent = STROKE_JP[s]
            if (sm) sm.textContent = STROKE_EN[s]
          }
        }
      })
    })

    return () => {
      stage.scene.remove(rig.root)
      disposeTree(rig.root)
      stage.dispose()
      stageRef.current = null
      rigRef.current = null
    }
  }, [])

  /* ---------- interactions ---------- */

  const cut = useCallback((angle: number, strength = 1) => {
    const el = stageElRef.current
    const stage = stageRef.current
    if (!el || !stage) return
    cutStage(el, reducedMotion() ? null : stage.snapshot(), angle, strength)
  }, [])

  const openEngine = useCallback(
    (then?: PartId) => {
      if (!live.current.open) {
        cut(-11)
        setOpen(true)
      } else if (then && then !== live.current.selected) {
        playTick()
      }
      if (then) setSelected(then)
    },
    [cut],
  )

  const closeEngine = () => {
    cut(9)
    setSelected(null)
    setOpen(false)
  }

  const stopAuto = () => {
    if (stageRef.current) stageRef.current.controls.autoRotate = false
    if (!touched) setTouched(true)
  }

  const down = useRef<{ x: number; y: number; t: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    down.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    stopAuto()
  }
  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = down.current
    down.current = null
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 600) return
    const stage = stageRef.current
    const rig = rigRef.current
    if (!stage || !rig) return
    const hits = stage.pick(e.clientX, e.clientY, rig.root)
    const L = live.current
    const hit = L.open || L.selected ? (hits.find((h) => !rig.parts.get(h.object.userData.part)?.housing) ?? hits[0]) : hits[0]
    const id = (hit?.object.userData.part as PartId | undefined) ?? null
    if (id) openEngine(id)
    else setSelected(null)
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'mouse') return
    live.current.hover = { x: e.clientX, y: e.clientY }
  }
  const onPointerLeave = () => {
    const tip = tipRef.current
    if (tip) tip.classList.remove('is-on')
    live.current.hoverId = null
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const step = (dir: 1 | -1) => {
    const i = PARTS.findIndex((p) => p.id === selected)
    const next = PARTS[(i + dir + PARTS.length) % PARTS.length]
    playTick()
    setSelected(next.id)
  }

  const togglePause = () => {
    if (running) {
      const deg = (live.current.theta / (Math.PI / 180)) % 720
      setManual(Math.round((deg + 720) % 720))
    }
    setRunning((r) => !r)
  }

  const turnByHand = (v: number) => {
    setManual(v)
    live.current.theta = v * (Math.PI / 180)
  }

  return (
    <section className="hero" id="anatomy" aria-labelledby="hero-title">
      <div className="hero-top">
        <p className="vert" lang="ja" aria-hidden="true">
          エンジンの解剖
        </p>
        <h1 className="hero-title" id="hero-title">
          <span className="hero-the">The</span>
          <Sliced text="Engine" className="hero-word" angle={-9} at={0.55} />
          <span className="hero-sub">opened, part by part.</span>
          <Sparkle className="hero-spark hero-spark--a" />
          <Sparkle className="hero-spark hero-spark--b" />
        </h1>
        <div className="hero-side">
          <p className="hero-lead">
            A working 2.0-litre four-cylinder, modelled part for part and turning fifty times slower than life. Click
            anything and the engine is cut open: first what that part is, then everything about it.
          </p>
          <p className="hero-spec">
            <span>DOHC</span>
            <span>16 valves</span>
            <span>86 × 86 mm</span>
            <span>1,998 cc</span>
            <span>10.5 : 1</span>
          </p>
        </div>
      </div>

      <div className={`stage${open ? ' is-open' : ''}${selected ? ' has-panel' : ''}`} ref={stageElRef}>
        <Enso className="stage-enso" />
        <canvas
          ref={canvasRef}
          className="stage-canvas"
          role="img"
          aria-label="A running four-cylinder engine. Use the parts list below the engine to explore it with a keyboard."
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        />
        <div className="tip" ref={tipRef} aria-hidden="true" />

        <div className="tele" aria-hidden="true">
          <div className="tele-row">
            <span className="tele-k">Crank</span>
            <span className="tele-v">
              <span ref={angleRef}>000</span>°<small>/720</small>
            </span>
          </div>
          <ol className="tele-cyl">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} ref={(el) => void (cylRefs.current[i] = el)} data-stroke="0">
                <span className="tele-n">{i + 1}</span>
                <b lang="ja">燃焼</b>
                <small>Power</small>
              </li>
            ))}
          </ol>
          <p className="tele-fo">
            Firing order <b>1 · 3 · 4 · 2</b>
          </p>
        </div>

        {!touched && !selected && <p className="stage-hint">Drag to turn · Scroll to zoom · Click a part</p>}

        <div className="dock">
          <Tach
            value={rpm}
            onChange={(v) => {
              setRpm(v)
              if (!running) setRunning(true)
            }}
            redline={7000}
            label="Engine speed"
            note={running ? `on screen ${SLOWER}× slower` : 'paused'}
          />
          <div className="dock-btns">
            <button type="button" className="btn btn--red" onClick={() => (open ? closeEngine() : openEngine())}>
              <span className="btn-cut" aria-hidden="true" />
              {open ? 'Close the engine' : 'Open the engine'}
            </button>
            <button type="button" className="btn" onClick={togglePause} aria-pressed={!running}>
              {running ? 'Pause' : 'Run'}
            </button>
            {!running && (
              <label className="ctrl-range">
                <span>Turn by hand</span>
                <input type="range" min={0} max={719} step={1} value={manual} onChange={(e) => turnByHand(Number(e.target.value))} />
              </label>
            )}
          </div>
        </div>

        {selected && <PartPanel part={PART_BY_ID[selected]} onClose={() => setSelected(null)} onStep={step} />}
      </div>

      <nav className="index" aria-label="Engine parts">
        <h2 className="index-title">
          <span className="index-k">Parts</span> <span lang="ja">部品</span>
          <span className="index-n">{PARTS.length} components · click to cut to them</span>
        </h2>
        <ul>
          {PARTS.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                className={`index-item${selected === p.id ? ' is-on' : ''}`}
                aria-pressed={selected === p.id}
                onClick={() => {
                  stopAuto()
                  if (selected === p.id) {
                    setSelected(null)
                    return
                  }
                  openEngine(p.id)
                  const r = stageElRef.current?.getBoundingClientRect()
                  if (r && (r.top < -r.height * 0.25 || r.bottom > window.innerHeight + r.height * 0.25)) {
                    stageElRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                }}
              >
                <span className="roundel roundel--sm">{String(i + 1).padStart(2, '0')}</span>
                <span>{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  )
}

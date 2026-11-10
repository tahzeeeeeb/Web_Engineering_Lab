import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { FAMILIES, LAYOUTS } from '../data/layouts'
import type { Family, Layout } from '../data/layouts'
import { createStage, disposeTree } from '../three/stage'
import type { Stage } from '../three/stage'
import { buildLayout } from '../three/layoutRig'
import type { FirePattern, LayoutRig } from '../three/layoutRig'
import { SectionHead } from '../ui/SectionHead'
import { Tach } from '../ui/Tach'
import { cutStage } from '../ui/cut'
import { reducedMotion } from '../ui/prefs'
import { watchVisibility } from '../ui/visibility'
import { createEngineVoice, playTick } from '../audio/sound'
import type { EngineVoice } from '../audio/sound'

const GROUND = -1.25
const SLOW = 45 // the picture turns this many times slower than the sound
const IDLE = 1100

/** Firing order and spacing, read straight off the model's own firing angles. */
function firing(fire: FirePattern, rotary: boolean) {
  if (rotary) return { order: [] as number[], text: 'Each rotor fires once per turn of the shaft: with two rotors, every 180°.' }
  const sorted = fire.angles.map((a, i) => ({ a, i })).sort((p, q) => p.a - q.a)
  // read the order starting from cylinder 1, as firing orders are always written
  const start = sorted.findIndex((p) => p.i === 0)
  const idx = [...sorted.slice(start), ...sorted.slice(0, start)].map((p, k) => ({ ...p, a: k < sorted.length - start ? p.a : p.a + 720 }))
  const gaps = idx.map((p, k) => {
    const next = k === idx.length - 1 ? idx[0].a + 720 : idx[k + 1].a
    return Math.round(next - p.a)
  })
  const even = gaps.every((g) => Math.abs(g - gaps[0]) <= 1)
  return {
    order: idx.map((p) => p.i + 1),
    text: even ? `A power stroke every ${gaps[0]}° of crank rotation.` : `Uneven: gaps of ${[...new Set(gaps)].join('°, ')}°.`,
  }
}

export function LayoutSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageElRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const rigRef = useRef<LayoutRig | null>(null)
  const voiceRef = useRef<EngineVoice | null>(null)
  const live = useRef({ rpm: IDLE })
  const [id, setId] = useState('v8')
  const [fire, setFire] = useState<FirePattern | null>(null)
  const layout = LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0]
  const family = layout.family

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const stage = createStage(canvas, {
      position: [-7, 3.2, 3.2],
      target: [0, 0.4, 0],
      fov: 30,
      ground: GROUND,
      minDistance: 3,
      autoRotate: !reducedMotion(),
      shadowExtent: 5,
      maxDistance: 22,
    })
    stage.controls.autoRotateSpeed = 0.35
    stageRef.current = stage
    const voice = createEngineVoice(1)
    voiceRef.current = voice
    let theta = 0
    stage.setFrame((dt) => {
      theta += dt * ((live.current.rpm / 60) * Math.PI * 2) / SLOW
      rigRef.current?.update(theta)
    })
    const stop = () => (stage.controls.autoRotate = false)
    canvas.addEventListener('pointerdown', stop)
    const unwatch = stageElRef.current ? watchVisibility(stageElRef.current, 0.35, voice.setActive) : () => {}
    return () => {
      unwatch()
      voice.dispose()
      canvas.removeEventListener('pointerdown', stop)
      if (rigRef.current) {
        stage.scene.remove(rigRef.current.root)
        disposeTree(rigRef.current.root)
      }
      stage.dispose()
      stageRef.current = null
      rigRef.current = null
      voiceRef.current = null
    }
  }, [])

  // Rebuild the 3D layout whenever the selection changes, sitting it on the gravel and framing it
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    if (rigRef.current) {
      stage.scene.remove(rigRef.current.root)
      disposeTree(rigRef.current.root)
    }
    const rig = buildLayout(layout.geometry)
    rig.update(0)
    const box = new THREE.Box3().setFromObject(rig.root)
    rig.root.position.y = GROUND + 0.12 - box.min.y
    stage.scene.add(rig.root)
    rigRef.current = rig
    box.setFromObject(rig.root)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3()).length()
    const vHalf = (stage.camera.fov * Math.PI) / 360
    const hHalf = Math.atan(Math.tan(vHalf) * stage.camera.aspect)
    const dist = (size / 2 / Math.tan(Math.min(vHalf, hHalf))) * 1.05
    const dir =
      layout.family === 'W'
        ? new THREE.Vector3(-1, 0.42, 0.3).normalize()
        : stage.camera.position.clone().sub(stage.controls.target).normalize()
    stage.controls.target.copy(center)
    stage.camera.position.copy(center).addScaledVector(dir, Math.max(4.5, dist))
    voiceRef.current?.setPattern(rig.fire)
    setFire(rig.fire)
  }, [layout])

  const pick = (next: string) => {
    if (next === id) return
    const el = stageElRef.current
    const stage = stageRef.current
    if (el && stage) cutStage(el, reducedMotion() ? null : stage.snapshot(), Math.random() < 0.5 ? -13 : 11, 0.85)
    setId(next)
  }

  const pickFamily = (f: Family) => {
    const first = LAYOUTS.find((l) => l.family === f)
    if (first) pick(first.id)
  }

  const fo = useMemo(() => (fire ? firing(fire, layout.geometry.kind === 'rotary') : null), [fire, layout])

  return (
    <section className="sec" aria-labelledby="layout-title" id="layouts">
      <SectionHead num="III" sector="Sector 3 · Configuration" jp="配列" title="Engine layouts" id="layout-title">
        <p>
          The same four strokes, arranged in very different ways. How the cylinders sit around the crankshaft decides an
          engine’s size, its balance and its sound. Cylinders glow warm on their power stroke, and with sound on you hear
          each one’s real firing order: hold the throttle and listen to a cross-plane V8 burble, then a flat-plane one
          scream.
        </p>
      </SectionHead>

      <div className="tabs" role="tablist" aria-label="Layout family">
        {FAMILIES.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={family === f}
            className={family === f ? 'is-on' : undefined}
            onClick={() => pickFamily(f)}
          >
            {f}
            <small>{LAYOUTS.filter((l) => l.family === f).length}</small>
          </button>
        ))}
      </div>
      <div className="variants" role="group" aria-label={`${family} engines`}>
        {LAYOUTS.filter((l) => l.family === family).map((l) => (
          <button
            key={l.id}
            type="button"
            className={l.id === id ? 'chip is-on' : 'chip'}
            aria-pressed={l.id === id}
            onClick={() => pick(l.id)}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="layout">
        <div className="layout-stage" ref={stageElRef}>
          <canvas ref={canvasRef} className="stage-canvas" role="img" aria-label={`${layout.name} engine, animated`} />
          <Throttle key={layout.id} layout={layout} voice={voiceRef} live={live} />
        </div>
        <article className="layout-info" key={layout.id}>
          <p className="layout-jp" lang="ja">
            {layout.jp}
          </p>
          <h3 className="layout-name">{layout.name}</h3>
          <p className="layout-sum">{layout.summary}</p>
          <p className="layout-how">{layout.how}</p>
          {fo && (
            <div className="fo">
              <h4>Firing order</h4>
              {fo.order.length > 0 && (
                <ol className="fo-list" aria-label={`Firing order ${fo.order.join(', ')}`}>
                  {fo.order.map((n, k) => (
                    <li key={k} style={{ animationDelay: `${k * 40}ms` }}>
                      {n}
                    </li>
                  ))}
                </ol>
              )}
              <p>{fo.text}</p>
              {fo.order.length > 0 && <p className="fo-note">Cylinders numbered as modelled here, front to back.</p>}
            </div>
          )}
          <div className="pc">
            <div>
              <h4>Strengths</h4>
              <ul>
                {layout.pros.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Weaknesses</h4>
              <ul>
                {layout.cons.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
          <h4 className="cars-h">Where you’ll find it</h4>
          <ul className="cars">
            {layout.cars.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}

type ThrottleProps = {
  layout: Layout
  voice: RefObject<EngineVoice | null>
  live: RefObject<{ rpm: number }>
}

/** Tachometer plus a hold-to-rev throttle. Owns the rpm animation so only this re-renders while revving. */
function Throttle({ layout, voice, live }: ThrottleProps) {
  const [rpm, setRpm] = useState(IDLE)
  const [base, setBase] = useState(IDLE)
  const held = useRef(false)
  const target = useRef(IDLE)
  const raf = useRef(0)
  const cur = useRef(IDLE)
  const top = Math.round(layout.redline * 0.96)

  const run = () => {
    if (raf.current) return
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const goal = held.current ? top : target.current
      const rate = goal > cur.current ? 7000 : 4200 // rpm per second, up then down
      const step = rate * dt
      cur.current = Math.abs(goal - cur.current) <= step ? goal : cur.current + Math.sign(goal - cur.current) * step
      live.current.rpm = cur.current
      voice.current?.setRpm(cur.current)
      setRpm(Math.round(cur.current / 50) * 50)
      if (cur.current === goal && !held.current) {
        raf.current = 0
        return
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    live.current.rpm = cur.current
    voice.current?.setRpm(cur.current)
    return () => cancelAnimationFrame(raf.current)
  }, [live, voice])

  const press = () => {
    if (held.current) return
    held.current = true
    playTick(0.6)
    run()
  }
  const release = () => {
    held.current = false
    run()
  }

  return (
    <div className="throttle">
      <Tach
        value={rpm}
        onChange={(v) => {
          setBase(v)
          target.current = v
          run()
        }}
        redline={layout.redline}
        max={Math.max(9000, Math.ceil((layout.redline + 1000) / 1000) * 1000)}
        label={`${layout.name} engine speed`}
        note={base > IDLE ? 'set speed' : 'idle'}
      />
      <button
        type="button"
        className="btn btn--red throttle-btn"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          press()
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault()
            press()
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') release()
        }}
        onBlur={release}
      >
        Hold to rev
      </button>
    </div>
  )
}

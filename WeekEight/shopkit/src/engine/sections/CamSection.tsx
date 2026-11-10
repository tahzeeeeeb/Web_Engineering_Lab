import { useEffect, useMemo, useRef, useState } from 'react'
import { createStage, disposeTree } from '../three/stage'
import { RACE_CAM, STREET_CAM, buildEngine, valveLift } from '../three/engineRig'
import type { CamProfile, EngineRig } from '../three/engineRig'
import type { PartId } from '../data/parts'
import { SectionHead } from '../ui/SectionHead'
import { cutStage } from '../ui/cut'
import type { Stage } from '../three/stage'

const D2R = Math.PI / 180
const GW = 720
const GH = 190
const TOP = 26
const MAX_LIFT = 0.125
const SHOW: PartId[] = ['camshafts', 'intake-valves', 'exhaust-valves', 'valve-springs']

/** Lift at display angle δ (0 = start of the intake stroke) for cylinder 1. */
const liftAt = (delta: number, p: CamProfile, intake: boolean) => {
  const a = (delta + 360) % 720
  return intake ? valveLift(a, p.inOpen, p.inClose, p.lift) : valveLift(a, p.exOpen, p.exClose, p.lift)
}

function curve(p: CamProfile, intake: boolean): string {
  const y = (L: number) => GH - (L / MAX_LIFT) * (GH - TOP)
  let d = ''
  for (let x = 0; x <= 720; x += 2) d += `${x ? 'L' : 'M'}${x} ${y(liftAt(x, p, intake)).toFixed(1)} `
  return d
}

function overlaps(p: CamProfile): [number, number][] {
  const out: [number, number][] = []
  let start = -1
  for (let x = 0; x <= 720; x++) {
    const both = liftAt(x, p, true) > 0 && liftAt(x, p, false) > 0
    if (both && start < 0) start = x
    if ((!both || x === 720) && start >= 0) {
      out.push([start, x])
      start = -1
    }
  }
  return out
}

export function CamSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const markRef = useRef<SVGGElement>(null)
  const rigRef = useRef<EngineRig | null>(null)
  const stageRef = useRef<Stage | null>(null)
  const stageElRef = useRef<HTMLDivElement>(null)
  const [race, setRace] = useState(false)
  const profile = race ? RACE_CAM : STREET_CAM

  const paths = useMemo(
    () => ({ intake: curve(profile, true), exhaust: curve(profile, false), overlap: overlaps(profile) }),
    [profile],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const stage = createStage(canvas, {
      position: [-5.2, 5.4, 4.1],
      target: [-0.55, 2.95, 0],
      fov: 30,
      ground: null,
      minDistance: 3,
      maxDistance: 11,
      shadowExtent: 4,
      fitAspect: 1.2,
    })
    const rig = buildEngine({ cylinders: 4 })
    rig.parts.forEach((h) => (h.group.visible = SHOW.includes(h.id)))
    stage.scene.add(rig.root)
    rigRef.current = rig
    stageRef.current = stage
    let delta = 0
    stage.setFrame((dt) => {
      delta = (delta + dt * 60) % 720
      rig.update(((delta + 360) % 720) * D2R)
      if (markRef.current) markRef.current.setAttribute('transform', `translate(${delta.toFixed(1)} 0)`)
    })
    return () => {
      stage.scene.remove(rig.root)
      disposeTree(rig.root)
      stage.dispose()
      rigRef.current = null
      stageRef.current = null
    }
  }, [])

  useEffect(() => {
    rigRef.current?.setProfile(profile)
  }, [profile])

  const choose = (r: boolean) => {
    if (r === race) return
    const el = stageElRef.current
    const st = stageRef.current
    if (el && st) cutStage(el, st.snapshot(), r ? -14 : 12, 0.8)
    setRace(r)
  }

  const duration = profile.inClose - profile.inOpen
  const overlapDeg = profile.exClose - profile.inOpen

  return (
    <section className="sec" aria-labelledby="cam-title" id="camshaft">
      <SectionHead num="II" sector="Sector 2 · Breathing" jp="カム" title="The camshaft, up close" id="cam-title">
        <p>
          A camshaft is a shaft with lobes on it. Each lobe is a precise profile that decides when a valve opens, how far,
          and for how long. Change the lobes and you change the whole character of the engine.
        </p>
      </SectionHead>

      <div className="cam">
        <div className="cam-stage" ref={stageElRef}>
          <canvas ref={canvasRef} className="stage-canvas" role="img" aria-label="Both camshafts opening sixteen valves" />
        </div>

        <div className="cam-text">
          <h3 className="cam-h">Anatomy of a lobe</h3>
          <dl className="anatomy">
            <div>
              <dt>Base circle</dt>
              <dd>The round part. While it faces the valve, the valve stays shut.</dd>
            </div>
            <div>
              <dt>Ramps</dt>
              <dd>Gentle slopes that take up the clearance so the valve isn’t hammered open or shut.</dd>
            </div>
            <div>
              <dt>Flanks</dt>
              <dd>The steep sides that accelerate the valve open and let it back down.</dd>
            </div>
            <div>
              <dt>Nose</dt>
              <dd>The tip. It sets maximum lift, the furthest the valve opens.</dd>
            </div>
          </dl>

          <div className="toggle" role="group" aria-label="Cam profile">
            <button type="button" className={!race ? 'is-on' : undefined} aria-pressed={!race} onClick={() => choose(false)}>
              Street cam
            </button>
            <button type="button" className={race ? 'is-on' : undefined} aria-pressed={race} onClick={() => choose(true)}>
              Race cam
            </button>
          </div>
          <div className="cam-stats">
            <div>
              <span className="stat-v">{duration}°</span>
              <span className="stat-k">Duration</span>
            </div>
            <div>
              <span className="stat-v">{(profile.lift * 100).toFixed(1)} mm</span>
              <span className="stat-k">Lift</span>
            </div>
            <div>
              <span className="stat-v">{overlapDeg}°</span>
              <span className="stat-k">Overlap</span>
            </div>
          </div>
          <p className="cam-note">
            {race
              ? 'More lift and longer duration let far more air in at high rpm. The price is a long overlap: at idle, exhaust leaks back into the intake, so the engine lopes and pulls weakly low down.'
              : 'Moderate lift and duration give a smooth idle, strong low-down pull and clean emissions. Most road cars use something close to this.'}
          </p>
        </div>
      </div>

      <figure className="graph">
        <svg viewBox={`-26 0 ${GW + 52} ${GH + 34}`} role="img" aria-label="Valve lift through the four-stroke cycle">
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <rect x={i * 180} y={0} width={180} height={GH} className={i % 2 ? 'g-band g-band--alt' : 'g-band'} />
              <text x={i * 180 + 90} y={16} className="g-stroke">
                {['Intake', 'Compression', 'Power', 'Exhaust'][i]}
              </text>
            </g>
          ))}
          {paths.overlap.map(([a, b]) => (
            <rect key={a} x={a} y={TOP} width={Math.max(1, b - a)} height={GH - TOP} className="g-overlap" />
          ))}
          <path d={paths.exhaust} className="g-ex" />
          <path d={paths.intake} className="g-in" />
          <line x1={0} x2={720} y1={GH} y2={GH} className="g-axis" />
          {[0, 180, 360, 540, 720].map((x, i) => (
            <text key={x} x={x} y={GH + 18} className="g-tick">
              {i % 2 ? 'BDC' : 'TDC'}
            </text>
          ))}
          <g ref={markRef}>
            <line x1={0} x2={0} y1={TOP - 4} y2={GH} className="g-mark" />
          </g>
        </svg>
        <figcaption>
          <span className="key key--in">Intake valve lift</span>
          <span className="key key--ex">Exhaust valve lift</span>
          <span className="key key--ov">Overlap: both valves open</span>
        </figcaption>
      </figure>

      <div className="where">
        <h3 className="cam-h">Where the camshaft lives</h3>
        <div className="where-grid">
          <div>
            <h4>Pushrod (OHV)</h4>
            <p>
              One cam low in the block, opening the valves through long pushrods and rocker arms. Compact and torquey; the
              Chevrolet small-block V8 still uses it.
            </p>
          </div>
          <div>
            <h4>Single overhead cam (SOHC)</h4>
            <p>One cam in each head works both the intake and exhaust valves, usually through rocker arms.</p>
          </div>
          <div>
            <h4>Double overhead cam (DOHC)</h4>
            <p>
              Separate intake and exhaust cams in each head, like this engine. Room for four valves per cylinder and
              independent timing for each side.
            </p>
          </div>
        </div>
        <p className="aside">
          <strong>Variable valve timing</strong> turns each cam slightly against its sprocket while the engine runs, as
          Toyota’s VVT-i and BMW’s VANOS do, shifting when the valves open to suit speed and load. Honda’s VTEC goes
          further and switches to a different lobe altogether.
        </p>
      </div>
    </section>
  )
}

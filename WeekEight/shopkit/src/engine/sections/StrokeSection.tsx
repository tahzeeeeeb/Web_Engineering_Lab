import { useEffect, useRef, useState } from 'react'
import { createStage, disposeTree } from '../three/stage'
import { buildEngine, pistonDrop } from '../three/engineRig'
import { SectionHead } from '../ui/SectionHead'
import { playThump, playTick } from '../audio/sound'
import { watchVisibility } from '../ui/visibility'

const D2R = Math.PI / 180

/* ---------- a simple but physical p–V model of this cylinder ---------- */
const CR = 10.5
const VS = 1 // swept volume, normalised
const VC = VS / (CR - 1)
const N_POLY = 1.32
const P_IN = 0.95
const P_EX = 1.1
const SPARK = 340 // display angle δ: 20° before compression TDC at 360
const volAt = (delta: number) => VC + VS * (pistonDrop(((delta + 360) % 720) * D2R) / 86)
const burned = (d: number) => (d < 345 ? 0 : 1 - Math.exp(-5 * ((d - 345) / 60) ** 3))
function pressureAt(delta: number): number {
  const d = ((delta % 720) + 720) % 720
  const motored = P_IN * ((VC + VS) / volAt(d)) ** N_POLY
  if (d < 180) return P_IN
  if (d < 500) return motored * (1 + 3 * burned(d))
  if (d < 540) return P_EX + (motored * 4 - P_EX) * Math.exp(-(d - 500) / 12)
  if (d < 690) return P_EX
  return P_EX + (P_IN - P_EX) * ((d - 690) / 30)
}
const PV = { w: 380, h: 250, l: 40, r: 14, t: 14, b: 34, vmax: 1.16, pmax: 50 }
const px = (v: number) => PV.l + (v / PV.vmax) * (PV.w - PV.l - PV.r)
const py = (p: number) => PV.h - PV.b - (Math.min(p, PV.pmax) / PV.pmax) * (PV.h - PV.t - PV.b)
const LOOP = (() => {
  let d = ''
  for (let a = 0; a <= 720; a += 1.5) d += `${a ? 'L' : 'M'}${px(volAt(a)).toFixed(1)} ${py(pressureAt(a)).toFixed(1)} `
  return d + 'Z'
})()
const PEAK = (() => {
  let best = 0
  for (let a = 340; a < 440; a++) best = Math.max(best, pressureAt(a))
  return best
})()
const WORK = `<math display="inline"><mrow><mi>W</mi><mo>=</mo><mo>∮</mo><mi>p</mi><mspace width="0.1em"/><mi>d</mi><mi>V</mi></mrow></math>`

const STROKES = [
  {
    en: 'Intake',
    jp: '吸入',
    text: 'The piston moves down with the intake valves open. The falling pressure draws air and fuel into the cylinder.',
  },
  {
    en: 'Compression',
    jp: '圧縮',
    text: 'Both valves are shut. The piston rises and squeezes the mixture into about a tenth of the space, heating it ready to burn.',
  },
  {
    en: 'Power',
    jp: '燃焼',
    text: 'Just before the top, the spark plug fires. The burning gas expands and drives the piston down: the only stroke that makes power.',
  },
  {
    en: 'Exhaust',
    jp: '排気',
    text: 'The exhaust valves open and the rising piston pushes the burnt gas out. Then the cycle starts again with intake.',
  },
]

const FORMULA = `<math display="block"><mrow><msub><mi>V</mi><mi>d</mi></msub><mo>=</mo><mfrac><mi>π</mi><mn>4</mn></mfrac><mo>·</mo><msup><mi>B</mi><mn>2</mn></msup><mo>·</mo><mi>S</mi><mo>·</mo><mi>N</mi></mrow></math>`
const EXAMPLE = `<math display="block"><mrow><mfrac><mi>π</mi><mn>4</mn></mfrac><mo>·</mo><msup><mn>8.6</mn><mn>2</mn></msup><mo>·</mo><mn>8.6</mn><mo>·</mo><mn>4</mn><mo>≈</mo><mn>1,998</mn><mtext>&nbsp;cm³</mtext></mrow></math>`
const RATIO = `<math display="inline"><mrow><mtext>CR</mtext><mo>=</mo><mfrac><mrow><msub><mi>V</mi><mi>s</mi></msub><mo>+</mo><msub><mi>V</mi><mi>c</mi></msub></mrow><msub><mi>V</mi><mi>c</mi></msub></mfrac></mrow></math>`

export function StrokeSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rangeRef = useRef<HTMLInputElement>(null)
  const angleRef = useRef<HTMLSpanElement>(null)
  const dropRef = useRef<HTMLSpanElement>(null)
  const inRef = useRef<HTMLSpanElement>(null)
  const exRef = useRef<HTMLSpanElement>(null)
  const presRef = useRef<HTMLElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const secRef = useRef<HTMLElement>(null)
  const [stroke, setStroke] = useState(0)
  const [playing, setPlaying] = useState(true)
  const live = useRef({ delta: 0, playing: true, stroke: 0, inView: false })

  useEffect(() => {
    live.current.playing = playing
  }, [playing])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      live.current.playing = false
      setPlaying(false)
    }
    const stage = createStage(canvas, {
      position: [-9.3, 2.75, 2.15],
      target: [0, 1.5, 0.05],
      fov: 30,
      ground: null,
      clipping: true,
      minDistance: 4,
      maxDistance: 14,
      shadowExtent: 4,
      fitAspect: 1.05,
    })
    stage.controls.minAzimuthAngle = -Math.PI * 0.85
    stage.controls.maxAzimuthAngle = -Math.PI * 0.15
    const rig = buildEngine({ cylinders: 1, cutaway: true })
    rig.parts.get('flywheel')!.group.visible = false
    stage.scene.add(rig.root)
    const L = live.current
    const unwatch = secRef.current ? watchVisibility(secRef.current, 0.12, (on) => (L.inView = on)) : () => {}

    stage.setFrame((dt) => {
      const before = L.delta
      if (L.playing) L.delta = (L.delta + dt * 75) % 720
      // a soft thump each time the plug fires, while the section is on screen
      if (L.playing && L.inView && before < SPARK && L.delta >= SPARK) playThump(0.9)
      const p = pressureAt(L.delta)
      if (presRef.current) presRef.current.textContent = `${p.toFixed(1)} bar`
      if (dotRef.current) {
        dotRef.current.setAttribute('cx', px(volAt(L.delta)).toFixed(1))
        dotRef.current.setAttribute('cy', py(p).toFixed(1))
      }
      const alpha = (L.delta + 360) % 720
      const theta = alpha * D2R
      rig.update(theta)
      const s = Math.min(3, Math.floor(L.delta / 180))
      if (s !== L.stroke) {
        L.stroke = s
        setStroke(s)
      }
      if (rangeRef.current && L.playing) rangeRef.current.value = String(Math.round(L.delta))
      if (angleRef.current) angleRef.current.textContent = String(Math.round(L.delta)).padStart(3, '0')
      if (dropRef.current) {
        const d = pistonDrop(theta)
        dropRef.current.textContent = d < 0.5 ? 'at the top' : d > 85.5 ? 'at the bottom' : `${d.toFixed(0)} mm down`
      }
      const { intake, exhaust } = rig.lifts()
      if (inRef.current) inRef.current.textContent = intake > 0.001 ? `${(intake * 100).toFixed(1)} mm open` : 'shut'
      if (exRef.current) exRef.current.textContent = exhaust > 0.001 ? `${(exhaust * 100).toFixed(1)} mm open` : 'shut'
    })

    return () => {
      unwatch()
      stage.scene.remove(rig.root)
      disposeTree(rig.root)
      stage.dispose()
    }
  }, [])

  const scrub = (v: number) => {
    live.current.delta = v
    if (playing) setPlaying(false)
  }

  return (
    <section className="sec" aria-labelledby="strokes-title" id="strokes" ref={secRef}>
      <SectionHead num="I" sector="Sector 1 · The cycle" jp="行程" title="What is a stroke?" id="strokes-title">
        <p>
          A stroke is one trip of the piston from one end of the cylinder to the other: from top dead centre (TDC), its
          highest point, to bottom dead centre (BDC), its lowest. A four-stroke engine needs four of them, two full turns
          of the crank, to complete one cycle.
        </p>
      </SectionHead>

      <div className="strokes">
        <div className="strokes-stage">
          <canvas ref={canvasRef} className="stage-canvas" role="img" aria-label="Cutaway of one cylinder going through the four strokes" />
          <dl className="readout" aria-live="off">
            <div>
              <dt>Cycle angle</dt>
              <dd>
                <span ref={angleRef}>000</span>°
              </dd>
            </div>
            <div>
              <dt>Piston</dt>
              <dd ref={dropRef}>at the top</dd>
            </div>
            <div>
              <dt>Intake valves</dt>
              <dd ref={inRef}>shut</dd>
            </div>
            <div>
              <dt>Exhaust valves</dt>
              <dd ref={exRef}>shut</dd>
            </div>
            <div>
              <dt>Cylinder pressure</dt>
              <dd ref={presRef}>0.9 bar</dd>
            </div>
          </dl>
          <p className="cut-label">Cut faces in kintsugi gold</p>
        </div>

        <div className="strokes-text">
          <p>
            <strong>Bore</strong> is the cylinder’s diameter and <strong>stroke</strong> is how far the piston travels. The
            stroke is set by the crankshaft: it is exactly twice the crank’s throw. An engine with a bigger bore than
            stroke is called oversquare and likes to rev; a longer stroke favours low-down pull.
          </p>
          <p>Multiply the area of the bore by the stroke and the number of cylinders, and you get displacement:</p>
          <div className="formula" dangerouslySetInnerHTML={{ __html: FORMULA }} />
          <p>For this engine, with an 8.6 cm bore, an 8.6 cm stroke and four cylinders:</p>
          <div className="formula" dangerouslySetInnerHTML={{ __html: EXAMPLE }} />
          <p>
            That is the 2.0 litres on the badge. The same 86 × 86 mm dimensions belonged to the flat-four in the first
            Toyota GT86 and Subaru BRZ. How hard the mixture is squeezed is the compression ratio,{' '}
            <span dangerouslySetInnerHTML={{ __html: RATIO }} />, where V<sub>s</sub> is the swept volume and V<sub>c</sub>{' '}
            the space left at TDC. This engine runs 10.5 : 1. There is a calculator for it in{' '}
            <a href="#theory-cr">the theory section</a>.
          </p>
        </div>
      </div>

      <div className="scrub">
        <button
          type="button"
          className="btn btn--red"
          onClick={() => {
            playTick()
            setPlaying((p) => !p)
          }}
          aria-pressed={!playing}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <div className="scrub-track">
          <div className="scrub-bands" aria-hidden="true">
            {STROKES.map((s, i) => (
              <span key={s.en} className={i === stroke ? 'is-on' : undefined}>
                {s.en}
              </span>
            ))}
          </div>
          <input
            ref={rangeRef}
            type="range"
            min={0}
            max={719}
            step={1}
            defaultValue={0}
            aria-label="Crank angle through the four-stroke cycle"
            onChange={(e) => scrub(Number(e.target.value))}
          />
          <div className="scrub-ticks" aria-hidden="true">
            <span>TDC</span>
            <span>BDC</span>
            <span>TDC</span>
            <span>BDC</span>
            <span>TDC</span>
          </div>
        </div>
      </div>

      <ol className="cards">
        {STROKES.map((s, i) => (
          <li key={s.en} className={`card${i === stroke ? ' is-on' : ''}`}>
            <span className="card-num" aria-hidden="true">
              {i + 1}
            </span>
            <h3>
              {s.en} <span lang="ja">{s.jp}</span>
            </h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="pv">
        <figure className="pv-fig">
          <svg viewBox={`0 0 ${PV.w} ${PV.h}`} role="img" aria-label="Pressure against volume for one cycle of this cylinder">
            {[10, 20, 30, 40, 50].map((p) => (
              <g key={p}>
                <line x1={PV.l} x2={PV.w - PV.r} y1={py(p)} y2={py(p)} className="pv-grid" />
                <text x={PV.l - 6} y={py(p) + 3.5} className="pv-tick pv-tick--y">
                  {p}
                </text>
              </g>
            ))}
            <line x1={px(VC)} x2={px(VC)} y1={PV.t} y2={PV.h - PV.b} className="pv-dead" />
            <line x1={px(VC + VS)} x2={px(VC + VS)} y1={PV.t} y2={PV.h - PV.b} className="pv-dead" />
            <text x={px(VC)} y={PV.h - PV.b + 14} className="pv-tick">
              TDC
            </text>
            <text x={px(VC + VS)} y={PV.h - PV.b + 14} className="pv-tick">
              BDC
            </text>
            <path d={LOOP} className="pv-loop" />
            <line x1={PV.l} x2={PV.w - PV.r} y1={PV.h - PV.b} y2={PV.h - PV.b} className="pv-axis" />
            <line x1={PV.l} x2={PV.l} y1={PV.t} y2={PV.h - PV.b} className="pv-axis" />
            <text x={PV.w - PV.r} y={PV.h - 4} className="pv-label pv-label--end">
              Volume →
            </text>
            <text x={PV.l + 6} y={PV.t + 4} className="pv-label">
              Pressure, bar
            </text>
            <text x={px(volAt(SPARK)) + 8} y={py(pressureAt(SPARK)) + 4} className="pv-note">
              spark
            </text>
            <text x={px(volAt(500)) + 4} y={py(pressureAt(500)) - 16} className="pv-note pv-note--end">
              exhaust opens
            </text>
            <text x={px(0.45)} y={py(PEAK) + 2} className="pv-note">
              peak ≈ {Math.round(PEAK)} bar
            </text>
            <circle ref={dotRef} r={5} className="pv-dot" cx={px(VC + VS)} cy={py(P_IN)} />
          </svg>
        </figure>
        <div className="pv-text">
          <h3 className="sub-h">The cycle as a graph</h3>
          <p>
            This is the pressure inside the cylinder plotted against its volume, worked out live for the cutaway above. The
            dot follows the piston. Compression climbs the curve on the left as the volume shrinks; the spark just
            before TDC sends the pressure shooting up; then the burning gas pushes the piston down as the curve falls
            away.
          </p>
          <p>
            The area enclosed by the loop is the work the gas does on the piston each cycle,{' '}
            <span dangerouslySetInnerHTML={{ __html: WORK }} />. The thin sliver along the bottom, where the piston
            pushes exhaust out and sucks fresh charge in, is work the engine spends just breathing: pumping loss. A
            throttle that is barely open makes it bigger, which is one reason engines waste fuel at light load.
          </p>
        </div>
      </div>

      <p className="aside">
        A <strong>two-stroke</strong> engine fits the same four jobs into two strokes, firing on every turn of the crank,
        and uses ports in the cylinder wall instead of valves. It makes more power for its size but runs dirtier, so today
        it is mostly found in small motorcycles and tools.
      </p>
    </section>
  )
}

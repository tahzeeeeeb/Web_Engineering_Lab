import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { SectionHead } from '../ui/SectionHead'

/* ---------------- small building blocks ---------------- */

const M = (html: string, block = true) => (
  <div className={block ? 'formula' : 'formula formula--inline'} dangerouslySetInnerHTML={{ __html: html }} />
)

type SliderProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  fmt?: (v: number) => string
  onChange: (v: number) => void
}

function Slider({ label, value, min, max, step, unit, fmt, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className="sl">
      <span className="sl-k">{label}</span>
      <span className="sl-v">
        {fmt ? fmt(value) : value}
        {unit && <small> {unit}</small>}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--p': `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function Out({ k, v, unit, big }: { k: string; v: string; unit?: string; big?: boolean }) {
  return (
    <div className={`out${big ? ' out--big' : ''}`}>
      <span className="out-k">{k}</span>
      <span className="out-v">
        {v}
        {unit && <small> {unit}</small>}
      </span>
    </div>
  )
}

function Topic({ id, n, title, jp, children }: { id: string; n: number; title: string; jp: string; children: ReactNode }) {
  return (
    <article className="th" id={id} aria-labelledby={`${id}-h`}>
      <header className="th-head">
        <span className="roundel">{String(n).padStart(2, '0')}</span>
        <h3 id={`${id}-h`}>{title}</h3>
        <span className="th-jp" lang="ja" aria-hidden="true">
          {jp}
        </span>
      </header>
      {children}
    </article>
  )
}

const f1 = (v: number) => v.toLocaleString('en', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const f0 = (v: number) => Math.round(v).toLocaleString('en')

/* ---------------- 1 · compression ratio ---------------- */

const CR_F = `<math display="block"><mrow><mtext>CR</mtext><mo>=</mo><mfrac><mrow><msub><mi>V</mi><mi>s</mi></msub><mo>+</mo><msub><mi>V</mi><mi>c</mi></msub></mrow><msub><mi>V</mi><mi>c</mi></msub></mfrac><mspace width="1.2em"/><msub><mi>V</mi><mi>s</mi></msub><mo>=</mo><mfrac><mi>π</mi><mn>4</mn></mfrac><msup><mi>B</mi><mn>2</mn></msup><mi>S</mi></mrow></math>`
const OTTO_F = `<math display="block"><mrow><msub><mi>η</mi><mtext>Otto</mtext></msub><mo>=</mo><mn>1</mn><mo>−</mo><mfrac><mn>1</mn><msup><mtext>CR</mtext><mrow><mi>γ</mi><mo>−</mo><mn>1</mn></mrow></msup></mfrac><mspace width="1em"/><mi>γ</mi><mo>≈</mo><mn>1.4</mn></mrow></math>`

function CompressionCalc() {
  const [bore, setBore] = useState(86)
  const [stroke, setStroke] = useState(86)
  const [vc, setVc] = useState(53)
  const vs = (Math.PI / 4) * (bore / 10) ** 2 * (stroke / 10)
  const cr = (vs + vc) / vc
  const eta = 1 - 1 / cr ** 0.4
  const note =
    cr < 8.5
      ? 'Low, typical of an old engine or a heavily boosted one.'
      : cr <= 13
        ? 'Normal petrol territory. Higher means more efficiency, until knock sets the limit.'
        : cr <= 15
          ? 'Very high for petrol: Mazda’s Skyactiv-G runs 14 : 1 with careful exhaust and injection design.'
          : 'Diesel territory: no spark, the heat of compression alone ignites the fuel.'
  // drawing of the cylinder at BDC: swept part and clearance part, to scale
  const H = 150
  const total = vs + vc
  const hc = Math.max(4, (vc / total) * H)
  return (
    <div className="calc">
      <div className="calc-in">
        <Slider label="Bore" value={bore} min={60} max={110} step={1} unit="mm" onChange={setBore} />
        <Slider label="Stroke" value={stroke} min={40} max={110} step={1} unit="mm" onChange={setStroke} />
        <Slider label="Combustion chamber" value={vc} min={20} max={120} step={1} unit="cm³" onChange={setVc} />
      </div>
      <div className="calc-out">
        <svg className="cr-pic" viewBox="0 0 120 190" aria-hidden="true">
          <rect x="30" y="10" width="60" height={H + 4} className="cr-wall" />
          <rect x="32" y="12" width="56" height={hc} className="cr-vc" />
          <rect x="32" y={12 + hc} width="56" height={H - hc} className="cr-vs" />
          <rect x="32" y={12 + H} width="56" height="22" className="cr-piston" />
          <text x="60" y={12 + hc / 2 + 3} className="cr-t">
            {hc > 14 ? 'Vc' : ''}
          </text>
          <text x="60" y={12 + hc + (H - hc) / 2 + 3} className="cr-t">
            Vs
          </text>
        </svg>
        <div className="outs">
          <Out k="Compression ratio" v={`${f1(cr)} : 1`} big />
          <Out k="Swept volume, one cylinder" v={f0(vs)} unit="cm³" />
          <Out k="Ideal Otto efficiency" v={`${Math.round(eta * 100)}`} unit="%" />
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${eta * 100}%` }} />
          </div>
          <p className="calc-note">{note}</p>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 2 · torque and power ---------------- */

const CURVE: [number, number][] = [
  [1000, 150],
  [1500, 165],
  [2000, 178],
  [2500, 188],
  [3000, 196],
  [3500, 202],
  [4000, 206],
  [4500, 208],
  [5000, 207],
  [5500, 204],
  [6000, 198],
  [6500, 190],
  [7000, 180],
  [7500, 168],
]
function torqueAt(rpm: number) {
  const i = Math.max(0, Math.min(CURVE.length - 2, Math.floor((rpm - 1000) / 500)))
  const p0 = CURVE[Math.max(0, i - 1)][1]
  const p1 = CURVE[i][1]
  const p2 = CURVE[i + 1][1]
  const p3 = CURVE[Math.min(CURVE.length - 1, i + 2)][1]
  const t = (rpm - CURVE[i][0]) / 500
  // Catmull-Rom through the dyno points
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
}
const POWER_F = `<math display="block"><mrow><mi>P</mi><mo>=</mo><mi>τ</mi><mi>ω</mi><mo>=</mo><mfrac><mrow><mn>2</mn><mi>π</mi><mi>N</mi><mi>τ</mi></mrow><mn>60</mn></mfrac><mspace width="1.2em"/><mi>P</mi><mtext>[kW]</mtext><mo>=</mo><mfrac><mrow><mi>τ</mi><mtext>[N·m]</mtext><mo>×</mo><mi>N</mi><mtext>[rpm]</mtext></mrow><mn>9549</mn></mfrac></mrow></math>`
const BMEP_F = `<math display="block"><mrow><mtext>BMEP</mtext><mo>=</mo><mfrac><mrow><mn>4</mn><mi>π</mi><mi>τ</mi></mrow><msub><mi>V</mi><mi>d</mi></msub></mfrac></mrow></math>`

const W = 640
const Hh = 260
const L = 44
const Rm = 44
const T = 16
const B = 34
const x = (r: number) => L + ((r - 1000) / 6500) * (W - L - Rm)
const yT = (t: number) => Hh - B - (t / 250) * (Hh - T - B)
const yP = (p: number) => Hh - B - (p / 150) * (Hh - T - B)
const PATHS = (() => {
  let t = ''
  let p = ''
  for (let r = 1000; r <= 7500; r += 50) {
    const tq = torqueAt(r)
    t += `${r === 1000 ? 'M' : 'L'}${x(r).toFixed(1)} ${yT(tq).toFixed(1)} `
    p += `${r === 1000 ? 'M' : 'L'}${x(r).toFixed(1)} ${yP((tq * r) / 9549).toFixed(1)} `
  }
  return { t, p }
})()

function PowerChart() {
  const [rpm, setRpm] = useState(5000)
  const paths = PATHS
  const tq = torqueAt(rpm)
  const kw = (tq * rpm) / 9549
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef(false)
  const fromPointer = (clientX: number) => {
    const r = svgRef.current?.getBoundingClientRect()
    if (!r) return
    const sx = ((clientX - r.left) / r.width) * W
    const v = 1000 + ((sx - L) / (W - L - Rm)) * 6500
    setRpm(Math.max(1000, Math.min(7500, Math.round(v / 50) * 50)))
  }
  return (
    <div className="calc calc--wide">
      <svg
        ref={svgRef}
        className="chart"
        viewBox={`0 0 ${W} ${Hh}`}
        role="img"
        aria-label="Torque and power curves of a 2.0-litre engine"
        onPointerDown={(e) => {
          drag.current = true
          e.currentTarget.setPointerCapture(e.pointerId)
          fromPointer(e.clientX)
        }}
        onPointerMove={(e) => drag.current && fromPointer(e.clientX)}
        onPointerUp={() => (drag.current = false)}
      >
        {[50, 100, 150, 200, 250].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - Rm} y1={yT(t)} y2={yT(t)} className="ch-grid" />
            <text x={L - 6} y={yT(t) + 4} className="ch-tick ch-tick--l">
              {t}
            </text>
            <text x={W - Rm + 6} y={yT(t) + 4} className="ch-tick ch-tick--r">
              {(t / 250) * 150}
            </text>
          </g>
        ))}
        {[1000, 2000, 3000, 4000, 5000, 6000, 7000].map((r) => (
          <text key={r} x={x(r)} y={Hh - B + 18} className="ch-tick">
            {r / 1000}k
          </text>
        ))}
        <text x={L} y={T - 4} className="ch-axis ch-axis--l">
          Torque, N·m
        </text>
        <text x={W - Rm} y={T - 4} className="ch-axis ch-axis--r">
          Power, kW
        </text>
        <path d={paths.t} className="ch-torque" />
        <path d={paths.p} className="ch-power" />
        <line x1={x(rpm)} x2={x(rpm)} y1={T} y2={Hh - B} className="ch-cursor" />
        <circle cx={x(rpm)} cy={yT(tq)} r={5} className="ch-dot-t" />
        <circle cx={x(rpm)} cy={yP(kw)} r={5} className="ch-dot-p" />
      </svg>
      <div className="calc-row">
        <Slider label="Engine speed" value={rpm} min={1000} max={7500} step={50} unit="rpm" fmt={f0} onChange={setRpm} />
        <div className="outs outs--row">
          <Out k="Torque" v={f0(tq)} unit={`N·m · ${f0(tq * 0.7376)} lb·ft`} />
          <Out k="Power" v={f0(kw)} unit={`kW · ${f0(kw * 1.341)} hp`} big />
          <Out k="BMEP" v={f1((4 * Math.PI * tq) / 0.002 / 1e5)} unit="bar" />
        </div>
      </div>
    </div>
  )
}

/* ---------------- 3 · piston speed ---------------- */

const SPEED_F = `<math display="block"><mrow><msub><mover><mi>v</mi><mo>¯</mo></mover><mi>p</mi></msub><mo>=</mo><mfrac><mrow><mn>2</mn><mi>S</mi><mi>N</mi></mrow><mn>60</mn></mfrac></mrow></math>`

function PistonSpeed() {
  const [stroke, setStroke] = useState(86)
  const [rpm, setRpm] = useState(7000)
  const v = (2 * (stroke / 1000) * rpm) / 60
  const pct = Math.min(100, (v / 30) * 100)
  const verdict =
    v < 16
      ? 'Relaxed. Everyday engines cruise well below this.'
      : v < 21
        ? 'Hard-working road engine territory.'
        : v < 25
          ? 'Race engine territory: special rods, pistons and valve springs.'
          : 'Formula 1 territory. The V10s of 2005 averaged about 25 m/s.'
  return (
    <div className="calc">
      <div className="calc-in">
        <Slider label="Stroke" value={stroke} min={39} max={110} step={1} unit="mm" onChange={setStroke} />
        <Slider label="Engine speed" value={rpm} min={1000} max={20000} step={100} unit="rpm" fmt={f0} onChange={setRpm} />
      </div>
      <div className="calc-out calc-out--col">
        <Out k="Mean piston speed" v={f1(v)} unit="m/s" big />
        <div className="gauge" aria-hidden="true">
          <span className="gauge-fill" style={{ width: `${pct}%` }} />
          <span className="gauge-mark" style={{ left: `${(20 / 30) * 100}%` }}>
            road
          </span>
          <span className="gauge-mark gauge-mark--red" style={{ left: `${(25 / 30) * 100}%` }}>
            F1
          </span>
        </div>
        <p className="calc-note">{verdict}</p>
        <p className="calc-note">
          At its fastest, around 75° after top dead centre for an engine like the one above, the piston moves roughly 1.6 times faster than the
          average.
        </p>
      </div>
    </div>
  )
}

/* ---------------- 4 · air–fuel ratio ---------------- */

const LAMBDA_F = `<math display="block"><mrow><mi>λ</mi><mo>=</mo><mfrac><mtext>AFR</mtext><msub><mtext>AFR</mtext><mtext>stoich</mtext></msub></mfrac></mrow></math>`

function Lambda() {
  const [lam, setLam] = useState(1)
  const zone =
    lam < 0.8
      ? ['Too rich', 'Unburned fuel: black smoke, fouled plugs, wasted fuel.']
      : lam < 0.93
        ? ['Rich: best power', 'Full throttle runs here. The spare fuel cools the charge and holds off knock.']
        : lam <= 1.02
          ? ['Stoichiometric', 'Exactly enough air to burn all the fuel. The only window where a three-way catalyst cleans all three pollutants.']
          : lam <= 1.15
            ? ['Lean: best economy', 'Slightly lean burns the fuel most completely, but runs hotter and makes more NOx.']
            : ['Too lean', 'Slow, unstable burning: misfires, overheating and burnt valves.']
  const fuels: [string, number][] = [
    ['Petrol', 14.7],
    ['Diesel', 14.5],
    ['E85', 9.8],
    ['Methanol', 6.4],
  ]
  return (
    <div className="calc">
      <div className="calc-in">
        <Slider label="Lambda, λ" value={lam} min={0.7} max={1.4} step={0.01} fmt={(v) => v.toFixed(2)} onChange={setLam} />
        <div className="lam-scale" aria-hidden="true">
          <span className="lam-z lam-z--rich" />
          <span className="lam-z lam-z--power" />
          <span className="lam-z lam-z--stoich" />
          <span className="lam-z lam-z--eco" />
          <span className="lam-z lam-z--lean" />
          <span className="lam-pin" style={{ left: `${((lam - 0.7) / 0.7) * 100}%` }} />
        </div>
      </div>
      <div className="calc-out calc-out--col">
        <Out k={zone[0]} v={`${f1(14.7 * lam)} : 1`} unit="petrol" big />
        <p className="calc-note">{zone[1]}</p>
        <ul className="fuels">
          {fuels.map(([n, a]) => (
            <li key={n}>
              <span>{n}</span>
              <b>{f1(a * lam)}</b>
            </li>
          ))}
        </ul>
        <p className="calc-note">
          Same λ, different ratios: alcohols carry their own oxygen, so they need far less air per kilogram, and the
          engine must inject much more of them.
        </p>
      </div>
    </div>
  )
}

/* ---------------- 5 · airflow and boost ---------------- */

const AIR_F = `<math display="block"><mrow><mover><mi>m</mi><mo>˙</mo></mover><mo>=</mo><msub><mi>η</mi><mi>v</mi></msub><mspace width="0.15em"/><mi>ρ</mi><mspace width="0.15em"/><msub><mi>V</mi><mi>d</mi></msub><mspace width="0.15em"/><mfrac><mi>N</mi><mn>120</mn></mfrac><mspace width="1.2em"/><mi>ρ</mi><mo>=</mo><mfrac><mi>p</mi><mrow><mi>R</mi><mi>T</mi></mrow></mfrac></mrow></math>`

function Airflow() {
  const [disp, setDisp] = useState(2.0)
  const [rpm, setRpm] = useState(6500)
  const [ve, setVe] = useState(92)
  const [boost, setBoost] = useState(0)
  const T = boost > 0 ? 318 : 303 // intercooled charge vs ambient intake, kelvin
  const rho = ((1.013 + boost) * 1e5) / (287 * T)
  const mdot = (ve / 100) * rho * (disp / 1000) * (rpm / 120) * 1000 // g/s
  const kw = mdot * 1.0
  return (
    <div className="calc">
      <div className="calc-in">
        <Slider label="Displacement" value={disp} min={0.6} max={8} step={0.1} unit="L" fmt={(v) => v.toFixed(1)} onChange={setDisp} />
        <Slider label="Engine speed" value={rpm} min={1000} max={9000} step={100} unit="rpm" fmt={f0} onChange={setRpm} />
        <Slider label="Volumetric efficiency" value={ve} min={60} max={115} step={1} unit="%" onChange={setVe} />
        <Slider label="Boost" value={boost} min={0} max={3} step={0.05} unit="bar" fmt={(v) => v.toFixed(2)} onChange={setBoost} />
      </div>
      <div className="calc-out calc-out--col">
        <Out k="Air density in the manifold" v={rho.toFixed(2)} unit="kg/m³" />
        <Out k="Air through the engine" v={f0(mdot)} unit="g/s" />
        <Out k="Rough power" v={f0(kw)} unit={`kW · ${f0(kw * 1.341)} hp`} big />
        <p className="calc-note">
          Rule of thumb: each gram of air per second supports about 1 kW. Fuel follows the air, so to make more power you
          must get more air through. Boost does it by raising the density, revs by pumping more often.
        </p>
      </div>
    </div>
  )
}

/* ---------------- 6 · ignition timing ---------------- */

const TIMING_F = `<math display="block"><mrow><mi>Δ</mi><mi>θ</mi><mo>=</mo><mn>6</mn><mi>N</mi><mspace width="0.1em"/><mi>Δ</mi><mi>t</mi></mrow></math>`

function Timing() {
  const [rpm, setRpm] = useState(3000)
  const perMs = (6 * rpm) / 1000
  const burn = 2 * perMs
  return (
    <div className="calc">
      <div className="calc-in">
        <Slider label="Engine speed" value={rpm} min={800} max={9000} step={100} unit="rpm" fmt={f0} onChange={setRpm} />
        <svg className="timing" viewBox="0 0 200 120" aria-hidden="true">
          <path d="M20 110 A80 80 0 0 1 180 110" className="tm-arc" />
          <line x1="100" y1="110" x2="100" y2="24" className="tm-tdc" />
          <text x="100" y="18" className="tm-t">
            TDC
          </text>
          <path
            d={`M100 110 L${100 - 80 * Math.sin((Math.min(burn, 90) * Math.PI) / 360)} ${110 - 80 * Math.cos((Math.min(burn, 90) * Math.PI) / 360)} A80 80 0 0 1 ${100 + 80 * Math.sin((Math.min(burn, 90) * Math.PI) / 360)} ${110 - 80 * Math.cos((Math.min(burn, 90) * Math.PI) / 360)} Z`}
            className="tm-burn"
          />
        </svg>
      </div>
      <div className="calc-out calc-out--col">
        <Out k="Crank travel per millisecond" v={f1(perMs)} unit="°" />
        <Out k="During a 2 ms burn" v={f0(burn)} unit="° of crank" big />
        <p className="calc-note">
          The flame needs time to cross the chamber, and the crank does not wait. The faster the engine spins, the earlier
          the spark has to come for peak pressure to arrive just after TDC. In reality turbulence speeds the flame up with
          revs, so the burn takes about 40 to 60° at any speed, but the spark still moves from around 10° to 35° or more
          before TDC.
        </p>
      </div>
    </div>
  )
}

/* ---------------- 7 · balance ---------------- */

const BAL_F = `<math display="block"><mrow><mi>a</mi><mo>≈</mo><mi>r</mi><msup><mi>ω</mi><mn>2</mn></msup><mrow><mo>(</mo><mi>cos</mi><mi>θ</mi><mo>+</mo><mfrac><mi>r</mi><mi>l</mi></mfrac><mi>cos</mi><mn>2</mn><mi>θ</mi><mo>)</mo></mrow></mrow></math>`

function Balance() {
  const [ratio, setRatio] = useState(0.3)
  const W = 360
  const H = 170
  const x = (deg: number) => 20 + (deg / 360) * (W - 30)
  const y = (v: number) => H / 2 - v * 52
  const path = (fn: (t: number) => number) => {
    let d = ''
    for (let a = 0; a <= 360; a += 3) d += `${a ? 'L' : 'M'}${x(a).toFixed(1)} ${y(fn((a * Math.PI) / 180)).toFixed(1)} `
    return d
  }
  return (
    <div className="calc">
      <div className="calc-in">
        <svg className="bal" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Piston acceleration over one crank turn">
          <line x1={x(0)} x2={x(360)} y1={y(0)} y2={y(0)} className="ch-grid" />
          {[0, 90, 180, 270, 360].map((a) => (
            <text key={a} x={x(a)} y={H - 4} className="ch-tick">
              {a}°
            </text>
          ))}
          <path d={path((t) => Math.cos(t))} className="bal-p" />
          <path d={path((t) => ratio * Math.cos(2 * t))} className="bal-s" />
          <path d={path((t) => Math.cos(t) + ratio * Math.cos(2 * t))} className="bal-sum" />
        </svg>
        <p className="keys">
          <span className="key key--a">Primary, at crank speed</span>
          <span className="key key--b">Secondary, at twice crank speed</span>
          <span className="key key--c">Total</span>
        </p>
        <Slider label="Crank throw ÷ rod length, r/l" value={ratio} min={0.2} max={0.45} step={0.01} fmt={(v) => v.toFixed(2)} onChange={setRatio} />
      </div>
      <div className="calc-out calc-out--col">
        <Out k="Pull at TDC vs BDC" v={`${f1(((1 + ratio) / (1 - ratio)) * 100 - 100)}`} unit="% harder at the top" big />
        <p className="calc-note">
          Because the rod swings sideways, the piston covers more distance in the top half of the turn than the bottom
          half, so it is jerked harder at TDC. In an inline-four the primary forces of the outer and inner pistons cancel,
          but all four secondaries add up, which is why big fours shake at twice engine speed and get balance shafts.
        </p>
      </div>
    </div>
  )
}

/* ---------------- the section ---------------- */

const TOPICS = [
  ['theory-cr', 'Compression ratio'],
  ['theory-power', 'Torque and power'],
  ['theory-speed', 'Piston speed and rpm'],
  ['theory-afr', 'Air–fuel ratio'],
  ['theory-boost', 'Breathing and boost'],
  ['theory-spark', 'Ignition timing and knock'],
  ['theory-balance', 'Balance and vibration'],
  ['theory-cool', 'Cooling'],
  ['theory-oil', 'Lubrication'],
  ['theory-fuel', 'Fuel delivery'],
  ['theory-emis', 'Emissions'],
  ['theory-types', 'Engine types and hybrids'],
] as const

export function TheorySection() {
  const [active, setActive] = useState<string>(TOPICS[0][0])

  useEffect(() => {
    const els = TOPICS.map(([id]) => document.getElementById(id)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActive(vis[0].target.id)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])

  return (
    <section className="sec" aria-labelledby="theory-title" id="theory">
      <SectionHead num="IV" sector="Sector 4 · Theory" jp="理論" title="The theory, all of it" id="theory-title">
        <p>
          The numbers that decide what an engine can do, from compression ratio to knock to the Formula 1 power unit. Every
          calculator runs on the real formula, shown beside it.
        </p>
      </SectionHead>

      <div className="theory">
        <nav className="th-nav" aria-label="Theory topics">
          <ol>
            {TOPICS.map(([id, name], i) => (
              <li key={id}>
                <a href={`#${id}`} className={active === id ? 'is-on' : undefined} aria-current={active === id ? 'true' : undefined}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {name}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="th-body">
          <Topic id="theory-cr" n={1} title="Compression ratio" jp="圧縮比">
            <p>
              The compression ratio compares the space in the cylinder with the piston at the bottom to the space left when
              it reaches the top. Squeezing the charge harder before it burns lets the gas expand further afterwards, so
              more of the fuel’s heat becomes work.
            </p>
            {M(CR_F)}
            <p>
              The ideal Otto cycle shows why, and also why the gains shrink: going from 8 to 10 : 1 is worth more than going
              from 12 to 14. Real engines reach well under these ideal figures because of heat lost to the walls, friction and
              pumping.
            </p>
            {M(OTTO_F)}
            <CompressionCalc />
            <p>
              The limit in a petrol engine is <strong>knock</strong>: compress too much and the unburned mixture ahead of the
              flame ignites by itself. Turbocharged engines already get squeezed by the boost, so they use lower ratios,
              around 9 to 10.5 : 1. Diesels need 15 to 20 : 1 because they rely on that heat to light the fuel at all.
            </p>
          </Topic>

          <Topic id="theory-power" n={2} title="Torque and power" jp="トルクと出力">
            <p>
              <strong>Torque</strong> is the twisting force on the crankshaft, from the gas pushing on the pistons.{' '}
              <strong>Power</strong> is how fast that force does work: torque multiplied by how fast the crank spins. That is
              why an engine can keep making more power as it revs even while its torque is falling.
            </p>
            {M(POWER_F)}
            <PowerChart />
            <p>
              Torque peaks where the engine breathes best, when the intake and exhaust pulses are tuned to that speed. To
              compare engines of different sizes, engineers divide torque by displacement and get brake mean effective
              pressure, the average push on the piston. Good naturally aspirated petrol engines manage 12 to 14 bar; modern
              turbo engines exceed 20.
            </p>
            {M(BMEP_F)}
          </Topic>

          <Topic id="theory-speed" n={3} title="Piston speed and rpm" jp="ピストン速度">
            <p>
              Every revolution the piston stops twice and accelerates back to speed. Its average speed depends only on the
              stroke and the rpm, and it sets the practical rev limit: past roughly 25 m/s, the loads on rods and the friction
              of the rings rise steeply.
            </p>
            {M(SPEED_F)}
            <PistonSpeed />
            <p>
              That is why high-revving engines are <strong>oversquare</strong>: a big bore with a short stroke keeps piston
              speed down while leaving room for large valves. Today’s Formula 1 engines are fixed by the rules at an 80 mm
              bore and 53 mm stroke, with a 15,000 rpm limit.
            </p>
          </Topic>

          <Topic id="theory-afr" n={4} title="Air–fuel ratio" jp="空燃比">
            <p>
              Petrol needs about 14.7 kilograms of air to burn one kilogram of fuel completely. That chemically perfect mix is
              called stoichiometric, and lambda, λ, says how far you are from it: below 1 is rich, above 1 is lean.
            </p>
            {M(LAMBDA_F)}
            <Lambda />
            <p>
              A lambda sensor in the exhaust measures the leftover oxygen, and the engine computer trims the injectors many
              times a second to stay on target.
            </p>
          </Topic>

          <Topic id="theory-boost" n={5} title="Breathing and boost" jp="過給">
            <p>
              An engine is an air pump first. <strong>Volumetric efficiency</strong> is how completely each cylinder fills
              compared with the air at the intake: around 85 to 95% for a good road engine, and above 100% when tuned intake
              and exhaust pulses ram extra air in at the right speed.
            </p>
            {M(AIR_F)}
            <Airflow />
            <p>
              A <strong>turbocharger</strong> uses exhaust energy to spin a turbine that drives a compressor; it is nearly
              free power but needs time to spool up, which is turbo lag. A <strong>supercharger</strong> is driven by the
              crank, so it responds instantly but costs some power to turn. Compressing air heats it, so an{' '}
              <strong>intercooler</strong> cools it again to make it denser. A wastegate bleeds exhaust past the turbine to
              cap the boost. In rallying, anti-lag systems burn fuel in the exhaust manifold to keep the turbo spinning off
              throttle, which is where the bangs and flames come from.
            </p>
          </Topic>

          <Topic id="theory-spark" n={6} title="Ignition timing and knock" jp="点火時期とノッキング">
            <p>
              The spark fires before top dead centre so that the flame has time to spread and the pressure peaks about 10 to
              15° after it, when the piston can use it best. How many degrees the crank turns in a given time depends only on
              the revs:
            </p>
            {M(TIMING_F)}
            <Timing />
            <p>
              Fire too early and the pressure rises while the piston is still coming up, and the end gas can ignite by
              itself: <strong>knock</strong>, a sharp metallic ping that can crack pistons. A fuel’s <strong>octane</strong>{' '}
              rating is its resistance to knock. Knock sensors, small microphones bolted to the block, listen for it and
              retard the timing within a few cycles.
            </p>
          </Topic>

          <Topic id="theory-balance" n={7} title="Balance and vibration" jp="バランス">
            <p>
              A piston stopping and starting thousands of times a minute creates forces that try to shake the engine. They come
              in two main orders: <strong>primary</strong>, once per turn, and <strong>secondary</strong>, twice per turn,
              caused by the connecting rod’s angle.
            </p>
            {M(BAL_F)}
            <Balance />
            <p>
              Some layouts cancel everything by their geometry. An inline-six and a V12 are perfectly balanced; a flat-six
              nearly so. A cross-plane V8 cancels its forces with heavy crank counterweights, while a flat-plane V8 keeps an
              inline-four’s secondary shake in exchange for a lighter crank. Inline-threes and fives have no net force but a
              rocking couple, end to end.
            </p>
          </Topic>

          <Topic id="theory-cool" n={8} title="Cooling" jp="冷却">
            <p>
              Only about a third of the fuel’s energy turns the crank. Roughly another third leaves with the exhaust, and most
              of the rest soaks into the metal and has to be carried away by the coolant. The water pump circulates it through
              the block and head, and the radiator sheds the heat to the air.
            </p>
            <ul className="facts">
              <li>
                <b>Thermostat</b> stays shut until the engine reaches about 82 to 95 °C, so it warms up fast and runs at an
                efficient, steady temperature.
              </li>
              <li>
                <b>Pressure cap</b> holds the system at about 1 bar above atmosphere, raising the boiling point to around 120
                °C.
              </li>
              <li>
                <b>Coolant</b> is water mixed with glycol to stop it freezing and boiling, with additives against corrosion.
              </li>
              <li>
                <b>Air-cooled</b> engines, like older Porsche 911s and every radial aero engine, use fins and airflow instead.
              </li>
            </ul>
          </Topic>

          <Topic id="theory-oil" n={9} title="Lubrication" jp="潤滑">
            <p>
              Oil does not just make metal slippery. In the crank and rod bearings it forms a pressurised wedge as the shaft
              spins, so the shaft floats on a film a few thousandths of a millimetre thick and metal never touches metal. This
              is hydrodynamic lubrication. The oil also carries heat away from the pistons and cleans as it flows.
            </p>
            <ul className="facts">
              <li>
                <b>Wet sump</b>: the oil lives in the pan under the crank, and a pump picks it up from there. Simple and cheap.
              </li>
              <li>
                <b>Dry sump</b>: scavenge pumps empty the pan into a separate tank. Hard cornering can’t starve the pickup,
                and the engine can sit lower in the car. Standard in racing.
              </li>
              <li>
                <b>Grades</b>: in 0W-20, the 0W is how easily it flows cold, and 20 is its thickness at 100 °C.
              </li>
            </ul>
          </Topic>

          <Topic id="theory-fuel" n={10} title="Fuel delivery" jp="燃料供給">
            <ul className="facts">
              <li>
                <b>Carburettor</b>: air rushing through a narrow venturi draws fuel out of a jet. Mechanical and simple, but
                imprecise. Gone from new cars since the early 1990s.
              </li>
              <li>
                <b>Port injection</b>: an injector sprays into each intake port at about 3 to 5 bar, timed by the engine
                computer.
              </li>
              <li>
                <b>Direct injection</b>: fuel is sprayed straight into the cylinder at 200 to 350 bar. The evaporating fuel
                cools the charge, allowing more compression or boost. Formula 1 has run it at up to 500 bar.
              </li>
              <li>
                <b>Diesel common rail</b>: a shared rail at up to around 2,500 bar feeds injectors that fire several times per
                stroke, for quieter, cleaner combustion.
              </li>
            </ul>
          </Topic>

          <Topic id="theory-emis" n={11} title="Emissions" jp="排出ガス">
            <p>
              Burning petrol in air leaves three main pollutants: carbon monoxide (CO) and unburned hydrocarbons (HC) from
              incomplete burning, and nitrogen oxides (NOx) formed by the heat itself.
            </p>
            <ul className="facts">
              <li>
                <b>Three-way catalyst</b>: platinum, palladium and rhodium oxidise CO and HC and reduce NOx at the same time,
                but only in a narrow window right at λ = 1.
              </li>
              <li>
                <b>Particulate filters</b> trap soot: standard on diesels and now on direct-injection petrol engines.
              </li>
              <li>
                <b>SCR</b> on diesels sprays a urea solution, AdBlue, into the exhaust to turn NOx into nitrogen and water.
              </li>
            </ul>
          </Topic>

          <Topic id="theory-types" n={12} title="Engine types and hybrids" jp="種類とハイブリッド">
            <ul className="facts">
              <li>
                <b>Petrol (spark ignition)</b>: a premixed charge lit by a spark, power controlled by a throttle.
              </li>
              <li>
                <b>Diesel (compression ignition)</b>: air alone is compressed until it is hot enough to ignite fuel injected
                into it. No throttle; power is set by how much fuel is injected. More efficient, heavier.
              </li>
              <li>
                <b>Atkinson and Miller cycles</b>: the intake valve closes late, so the effective compression is shorter than
                the expansion. Less power per litre, more efficiency; hybrid engines such as the Toyota Prius’s reach about 40%
                thermal efficiency this way.
              </li>
              <li>
                <b>Two-stroke</b>: a power stroke every turn, using ports instead of valves. Light and punchy, but dirty.
              </li>
              <li>
                <b>Formula 1 power unit</b>: a 1.6-litre turbocharged V6 with energy recovery. From 2014 to 2025 an MGU-K on
                the crank gave 120 kW and an MGU-H on the turbo recovered exhaust energy; those engines passed 50% thermal
                efficiency. The 2026 rules remove the MGU-H, raise the MGU-K to 350 kW for roughly a 50 : 50 split between
                combustion and electric power, and require fully sustainable fuel.
              </li>
            </ul>
          </Topic>
        </div>
      </div>
    </section>
  )
}

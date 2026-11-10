/* Engine layouts. Each piston layout is described cylinder by cylinder:
   x      position along the crankshaft
   angle  lean of the cylinder from vertical, degrees (+ leans to the right in the front view)
   pin    angle of its crankpin on the crank, degrees
   t      which crank throw it belongs to (cylinders on one throw share webs)
   fire   optional crank angle (0–720) of its power stroke; otherwise worked out from the TDC angles
   A piston is at top dead centre when (crank angle + pin) equals its own angle. */

export type CylSpec = { x: number; angle: number; pin: number; t: number; fire?: number }

export type LayoutGeometry =
  | { kind: 'piston'; cyls: CylSpec[]; bore: number; crankcase?: number }
  | { kind: 'rotary'; rotors: number }

export type Family = 'Inline' | 'V' | 'W' | 'Boxer' | 'Others'

export type Layout = {
  id: string
  family: Family
  name: string
  jp: string
  summary: string
  how: string
  pros: string[]
  cons: string[]
  cars: string[]
  /** where the sound's blip tops out, rpm */
  redline: number
  geometry: LayoutGeometry
}

export const FAMILIES: Family[] = ['Inline', 'V', 'W', 'Boxer', 'Others']

/* ---------------- geometry builders ---------------- */

const P = 0.86

function inline(pins: number[], fire?: number[]): CylSpec[] {
  return pins.map((pin, i) => ({ x: (i - (pins.length - 1) / 2) * P, angle: 0, pin, t: i, fire: fire?.[i] }))
}

/** Single-row radial: every cylinder on one crankpin, firing every other cylinder. */
function radial(n: number): CylSpec[] {
  return Array.from({ length: n }, (_, k) => {
    const angle = (k * 360) / n
    return { x: 0, angle, pin: 0, t: 0, fire: angle + (k % 2 ? 360 : 0) }
  })
}

/** Shared-pin V: each throw carries one cylinder from each bank. */
function vee(bank: number, pins: number[]): CylSpec[] {
  return pins.flatMap((pin, i) => {
    const x = (i - (pins.length - 1) / 2) * P
    return [
      { x: x - 0.14, angle: -bank / 2, pin, t: i },
      { x: x + 0.14, angle: bank / 2, pin, t: i },
    ]
  })
}

/** Split-pin V: each cylinder gets its own pin, from its top-dead-centre angle. */
function veeSplit(bank: number, tdcL: number[], tdcR: number[]): CylSpec[] {
  return tdcL.flatMap((tl, i) => {
    const x = (i - (tdcL.length - 1) / 2) * P
    return [
      { x: x - 0.14, angle: -bank / 2, pin: -bank / 2 - tl, t: i },
      { x: x + 0.14, angle: bank / 2, pin: bank / 2 - tdcR[i], t: i },
    ]
  })
}

function boxer(pairTdc: number[]): CylSpec[] {
  return pairTdc.flatMap((t0, i) => {
    const x = (i - (pairTdc.length - 1) / 2) * P
    return [
      { x: x - 0.17, angle: 90, pin: 90 - t0, t: i },
      { x: x + 0.17, angle: -90, pin: -90 - t0, t: i },
    ]
  })
}

/** W engines: two narrow-angle VR banks on one crank, four staggered rows. */
function wEngine(rowAngles: number[], perRow: number): CylSpec[] {
  const n = rowAngles.length * perRow
  const pitch = 1.08
  const offsets = [-0.39, -0.13, 0.13, 0.39]
  const out: CylSpec[] = []
  let j = 0
  for (let i = 0; i < perRow; i++) {
    const x = (i - (perRow - 1) / 2) * pitch
    rowAngles.forEach((angle, k) => {
      const tdc = (j % (n / 2)) * (720 / n)
      out.push({ x: x + offsets[k], angle, pin: angle - tdc, t: i })
      j++
    })
  }
  return out
}

function vr6(): CylSpec[] {
  // Firing order 1-5-3-6-2-4, one firing every 120°
  const tdc = [0, 120, 240, 240, 120, 0]
  return tdc.map((t, j) => {
    const angle = j % 2 === 0 ? -7.5 : 7.5
    return { x: (j - 2.5) * 0.52, angle, pin: angle - t, t: j }
  })
}

/* ---------------- the layouts ---------------- */

const I6_PINS = [0, 240, 120, 120, 240, 0]

export const LAYOUTS: Layout[] = [
  {
    id: 'i3',
    family: 'Inline',
    name: 'Inline-three',
    jp: '直列3気筒',
    summary:
      'Three cylinders in a row, firing every 240°. Small, light and efficient, with a distinctive off-beat thrum that sounds like half a six.',
    how: 'Crankpins 120° apart. With only three cylinders the pistons never balance each other perfectly, so the engine rocks end to end unless a balance shaft is added.',
    pros: ['Fewer parts and less internal friction than a four', 'Short and light', 'Characterful sound'],
    cons: ['A rocking couple that needs a balance shaft', 'Long gaps between power strokes at low revs'],
    cars: ['Toyota GR Yaris (G16E-GTS, 1.6 L turbo)', 'Ford Fiesta ST (1.5 EcoBoost)', 'BMW i8 (1.5 L, with hybrid drive)'],
    redline: 7000,
    geometry: { kind: 'piston', cyls: inline([0, 120, 240], [0, 240, 480]), bore: 1 },
  },
  {
    id: 'i4',
    family: 'Inline',
    name: 'Inline-four',
    jp: '直列4気筒',
    summary:
      'Four cylinders in one straight row over a single crankshaft. Cheap, compact and simple, it is the engine in most cars on the road.',
    how: 'One cylinder head, crankpins at 0° and 180°, and a power stroke every 180° of crank rotation in the order 1-3-4-2.',
    pros: ['Simple and cheap to build', 'Compact enough to mount sideways in a small front-wheel-drive car', 'One head, so fewer parts'],
    cons: [
      'Shakes at twice crank speed; larger ones need balance shafts',
      'Gaps between power strokes make it less smooth than six or more cylinders',
    ],
    cars: ['Honda Civic Type R (K20C)', 'Mitsubishi Lancer Evolution (4G63T)', 'Toyota Celica GT-Four (3S-GTE)'],
    redline: 7500,
    geometry: { kind: 'piston', cyls: inline([0, 180, 180, 0], [0, 540, 180, 360]), bore: 1 },
  },
  {
    id: 'i5',
    family: 'Inline',
    name: 'Inline-five',
    jp: '直列5気筒',
    summary:
      'Five in a row, firing every 144°. The odd number gives the warble that made the Audi quattro the sound of 1980s rallying.',
    how: 'Crankpins 72° apart and the firing order 1-2-4-5-3. The power strokes overlap slightly, so it pulls more smoothly than a four.',
    pros: ['Smoother than a four, shorter than a six', 'Overlapping power strokes', 'An instantly recognisable sound'],
    cons: ['A rocking couple that needs balancing', 'Long for a transverse engine bay'],
    cars: ['Audi Sport quattro (Group B rally)', 'Audi RS 3 and TT RS (2.5 TFSI)', 'Volvo 850 T-5R'],
    redline: 7000,
    geometry: { kind: 'piston', cyls: inline([0, 216, 144, 72, 288], [0, 144, 576, 288, 432]), bore: 1 },
  },
  {
    id: 'i6',
    family: 'Inline',
    name: 'Inline-six',
    jp: '直列6気筒',
    summary:
      'Six cylinders in a row. Its forces cancel out completely without balance shafts, which makes it the smoothest of the common layouts.',
    how: 'Crankpins every 120°, firing 1-5-3-6-2-4, so a new power stroke starts every 120°. The front and rear halves mirror each other.',
    pros: ['Perfect primary and secondary balance', 'Very smooth and sweet-revving', 'One head, simple to service'],
    cons: ['Long, so hard to fit in many engine bays', 'The long crankshaft can twist under load'],
    cars: ['Toyota Supra A80 (2JZ-GTE)', 'Nissan Skyline GT-R R32–R34 (RB26DETT)', 'BMW M3 / M4 (S58)'],
    redline: 7500,
    geometry: { kind: 'piston', cyls: inline(I6_PINS, [0, 480, 240, 600, 120, 360]), bore: 1 },
  },
  {
    id: 'v6',
    family: 'V',
    name: 'V6',
    jp: 'V型6気筒',
    summary:
      'Two banks of three cylinders on one crankshaft, set at an angle to form a V. About half the length of an inline-six.',
    how: 'This one has a 60° bank angle and a split-pin crank so it still fires evenly, every 120°.',
    pros: ['Short enough to fit almost anywhere, including sideways', 'Smooth at 60°', 'Lots of displacement in a small package'],
    cons: ['Two heads and two sets of camshafts', 'Not as naturally balanced as an inline-six'],
    cars: ['Nissan GT-R R35 (VR38DETT)', 'Honda NSX (C30A)', 'Formula 1 since 2014 (1.6 L turbo-hybrid, 90°)'],
    redline: 7000,
    geometry: { kind: 'piston', cyls: veeSplit(60, [120, 0, 240], [0, 240, 120]), bore: 1 },
  },
  {
    id: 'v8',
    family: 'V',
    name: 'V8, cross-plane',
    jp: 'V型8気筒 クロスプレーン',
    summary:
      'Two banks of four at 90°, with crankpins at 90° steps so the crank looks like a cross from the end. Each bank fires unevenly, which is where the deep burble comes from.',
    how: 'Each crankpin carries two rods, one from each bank. The engine fires every 90°, but within one bank the gaps go 90°, 180°, 270°, 180°. Turn the sound on and you can hear it.',
    pros: ['Big displacement in a compact block', 'Very smooth: heavy counterweights cancel the shaking', 'Strong torque everywhere'],
    cons: ['Heavy crank that is slow to rev', 'Uneven exhaust pulses per bank make tuning the exhaust harder'],
    cars: ['Chevrolet Corvette (LS / LT family)', 'Ford Mustang GT (Coyote)', 'Lexus LC 500 (2UR-GSE)'],
    redline: 6600,
    geometry: { kind: 'piston', cyls: vee(90, [0, 90, 270, 180]), bore: 1 },
  },
  {
    id: 'v8flat',
    family: 'V',
    name: 'V8, flat-plane',
    jp: 'V型8気筒 フラットプレーン',
    summary:
      'The same 90° V, but with all four crankpins in one plane, like two inline-fours sharing a crank. Lighter, faster revving, and it screams instead of burbles.',
    how: 'Pins at 0°, 180°, 180°, 0°. Each bank now fires evenly every 180°, so the exhaust pulses are perfectly spaced, which suits high revs and tuned headers.',
    pros: ['Light crankshaft that revs quickly', 'Even firing per bank, ideal for exhaust tuning', 'A high, hard-edged sound'],
    cons: ['Shakes like an inline-four, at twice crank speed', 'Less low-down refinement'],
    cars: ['Ferrari 458 Italia (F136)', 'McLaren 720S (M840T)', 'Chevrolet Corvette Z06 C8 (LT6)'],
    redline: 8500,
    geometry: { kind: 'piston', cyls: vee(90, [0, 180, 180, 0]), bore: 1 },
  },
  {
    id: 'v10',
    family: 'V',
    name: 'V10',
    jp: 'V型10気筒',
    summary:
      'Two banks of five. Shown at 72°, the angle that makes ten cylinders fire perfectly evenly, every 72° of crank rotation. The sound of Formula 1 from 1989 to 2005.',
    how: 'Five crankpins spaced 72° apart, each shared by one cylinder from each bank. Light, fast-spinning internals let it rev past 9,000 rpm in road cars.',
    pros: ['Even firing and a soaring, rasping note', 'More power than a V8 without the length of a V12', 'Revs extremely high'],
    cons: ['A rocking couple that needs balancing', 'Expensive and thirsty', 'Long for a transverse layout'],
    cars: [
      'Lexus LFA (1LR-GUE, 72°, 9,000 rpm)',
      'Porsche Carrera GT (68°) and Lamborghini Huracán',
      'Formula 1, 1995–2005: 3.0 L V10s past 19,000 rpm',
    ],
    redline: 9000,
    geometry: { kind: 'piston', cyls: vee(72, [0, 144, 288, 72, 216]), bore: 0.94 },
  },
  {
    id: 'v12',
    family: 'V',
    name: 'V12',
    jp: 'V型12気筒',
    summary:
      'Two inline-sixes sharing one crankshaft at 60°. Perfectly balanced and firing every 60°, so there is always a piston on its power stroke.',
    how: 'Six crankpins at 120° steps, each shared by one cylinder from each bank.',
    pros: ['Perfect balance and overlapping power strokes', 'Huge power from small, fast-revving cylinders', 'An unmistakable sound'],
    cons: ['Long, heavy and expensive', 'Two heads, four camshafts, many parts'],
    cars: ['Lamborghini Aventador', 'Ferrari 812 Superfast', 'McLaren F1 (BMW S70/2)'],
    redline: 8500,
    geometry: { kind: 'piston', cyls: vee(60, I6_PINS), bore: 0.88 },
  },
  {
    id: 'v16',
    family: 'V',
    name: 'V16',
    jp: 'V型16気筒',
    summary:
      'Two straight-eights on one crank. Sixteen cylinders fire every 45°, so the power strokes overlap so heavily that the torque is almost perfectly smooth.',
    how: 'Shown at 90° with eight crankpins spaced 45° apart. Very long, which is why so few have ever been built.',
    pros: ['Silky, continuous torque', 'Huge displacement from small cylinders', 'Rare and spectacular'],
    cons: ['Extremely long engine and crankshaft', 'Heavy, complex and costly'],
    cars: [
      'Bugatti Tourbillon (8.3 L, with hybrid drive)',
      'Cizeta-Moroder V16T',
      'BRM Type 15, a 1950s supercharged 1.5 L Grand Prix V16',
    ],
    redline: 7000,
    geometry: { kind: 'piston', cyls: vee(90, [0, 135, 270, 45, 180, 315, 90, 225]), bore: 0.84 },
  },
  {
    id: 'w12',
    family: 'W',
    name: 'W12',
    jp: 'W型12気筒',
    summary:
      'Two narrow VR6 engines joined on one crankshaft. Twelve cylinders in a block not much longer than a V6.',
    how: 'Each bank is a VR6 with its cylinders staggered 15° apart; the two banks sit 72° apart. Seen from the front, the four rows make a W.',
    pros: ['Twelve cylinders in a very short package', 'Smooth and quiet'],
    cons: ['Complicated to build and service', 'Heavy and wide'],
    cars: ['Bentley Continental GT (until 2024)', 'Volkswagen Phaeton W12', 'Audi A8 W12'],
    redline: 6200,
    geometry: { kind: 'piston', cyls: wEngine([-43.5, -28.5, 28.5, 43.5], 3), bore: 0.78 },
  },
  {
    id: 'w16',
    family: 'W',
    name: 'W16',
    jp: 'W型16気筒',
    summary:
      'Two narrow-angle V8 banks on one crank: four rows of four cylinders. Built for one job, more than 1,000 horsepower in a road car.',
    how: 'Each bank is a VR8 with rows 15° apart, and the banks sit 90° apart. Bugatti’s version displaces 8.0 litres with four turbochargers.',
    pros: ['Enormous power from a package that fits behind two seats', 'Smooth at any speed'],
    cons: ['Extremely complex and costly', 'Needs vast cooling: the Veyron carries ten radiators'],
    cars: ['Bugatti Veyron (1,001 PS)', 'Bugatti Chiron'],
    redline: 6700,
    geometry: { kind: 'piston', cyls: wEngine([-52.5, -37.5, 37.5, 52.5], 4), bore: 0.74 },
  },
  {
    id: 'flat4',
    family: 'Boxer',
    name: 'Flat-four',
    jp: '水平対向4気筒',
    summary:
      'Two pairs of cylinders lying flat on opposite sides of the crank. Each opposing pair moves out and in together, which gives the boxer its name.',
    how: 'Every cylinder has its own crankpin, and opposed pistons sit 180° apart on the crank so their forces cancel.',
    pros: ['Very low centre of gravity', 'Good natural balance', 'Short engine'],
    cons: ['Wide, which limits steering lock and packaging', 'Two heads and long intake and exhaust plumbing'],
    cars: ['Subaru Impreza WRX (EJ20)', 'Toyota GR86 / Subaru BRZ', 'Porsche 718 Cayman (4-cylinder)'],
    redline: 7000,
    geometry: { kind: 'piston', cyls: boxer([0, 180]), bore: 1 },
  },
  {
    id: 'flat6',
    family: 'Boxer',
    name: 'Flat-six',
    jp: '水平対向6気筒',
    summary:
      'Three opposed pairs. As smooth as an inline-six, but short and low enough to hang behind the rear axle of a Porsche 911.',
    how: 'Opposed pistons on pins 180° apart, with the three pairs spaced 120° around the crank.',
    pros: ['Perfect balance', 'Low centre of gravity', 'Compact length'],
    cons: ['Wide', 'Two heads; expensive to build'],
    cars: ['Porsche 911 (every generation)', 'Porsche 718 Cayman GT4 (4.0 L)', 'Subaru Outback 3.6R (EZ36)'],
    redline: 9000,
    geometry: { kind: 'piston', cyls: boxer([0, 120, 240]), bore: 1 },
  },
  {
    id: 'flat12',
    family: 'Boxer',
    name: 'Flat-twelve',
    jp: '180度V型12気筒',
    summary:
      'Twelve cylinders lying flat. Strictly most are 180° V12s: opposite pistons share a crankpin and move the same way, rather than mirroring each other as a true boxer’s do.',
    how: 'Two inline-sixes opened out to 180°, firing every 60°. Very low and flat, so air can flow over the engine to a rear wing.',
    pros: ['V12 smoothness with a very low centre of gravity', 'Leaves room above for airflow'],
    cons: ['Extremely wide', 'Long and complex'],
    cars: ['Ferrari Testarossa and 512 BB', 'Ferrari 312B and 312T, 1970s Formula 1', 'Porsche 917, Le Mans winner 1970 and 1971'],
    redline: 7000,
    geometry: { kind: 'piston', cyls: vee(180, I6_PINS), bore: 0.9 },
  },
  {
    id: 'vr6',
    family: 'Others',
    name: 'VR6',
    jp: '狭角V型6気筒',
    summary:
      'A V6 with its banks only 15° apart, so close that both share one cylinder head. The cylinders zig-zag in a block barely longer than an inline-four.',
    how: 'Each cylinder has its own crankpin. Firing order 1-5-3-6-2-4, one power stroke every 120°.',
    pros: ['Six cylinders in an inline-four-sized space', 'One head keeps it simple'],
    cons: ['Uneven port lengths between the two rows', 'Not as smooth as a true inline-six'],
    cars: ['Volkswagen Golf R32', 'Volkswagen Corrado VR6', 'Volkswagen Passat VR6'],
    redline: 6500,
    geometry: { kind: 'piston', cyls: vr6(), bore: 0.86 },
  },
  {
    id: 'rotary',
    family: 'Others',
    name: 'Wankel rotary',
    jp: 'ロータリー',
    summary:
      'No pistons at all. A triangular rotor orbits inside an oval-like housing, and each of its three faces runs through intake, compression, power and exhaust once per rotor turn.',
    how: 'The rotor turns once for every three turns of the eccentric shaft, so each rotor delivers one power stroke per shaft turn. Shown here with two rotors.',
    pros: ['Very compact and light for its power', 'Extremely smooth and loves to rev', 'Few moving parts'],
    cons: ['Apex seals wear', 'Uses more fuel and burns oil by design', 'Hard to make clean enough for emissions rules'],
    cars: ['Mazda RX-7 (13B-REW)', 'Mazda RX-8 (Renesis)', 'Mazda 787B, 1991 Le Mans winner (R26B four-rotor)'],
    redline: 9000,
    geometry: { kind: 'rotary', rotors: 2 },
  },
  {
    id: 'radial',
    family: 'Others',
    name: 'Radial-nine',
    jp: '星型9気筒',
    summary:
      'Cylinders arranged like the spokes of a wheel around a single crankpin. The classic aircraft engine: short, air-cooled and very reliable.',
    how: 'All nine connecting rods work on one crankpin (real ones use a master rod with eight articulated rods). An odd number of cylinders lets it fire every other cylinder, 1-3-5-7-9-2-4-6-8, every 80°.',
    pros: ['Very short, and every cylinder faces the cooling air', 'Excellent balance', 'Simple, rugged and reliable'],
    cons: ['Huge frontal area and drag', 'Oil pools in the lower cylinders when stopped'],
    cars: [
      'Wright R-1820 Cyclone, which powered the B-17',
      'Pratt & Whitney R-985 Wasp Junior',
      'Monaco-Trossi, a 1935 Grand Prix car with a 16-cylinder radial',
    ],
    redline: 2700,
    geometry: { kind: 'piston', cyls: radial(9), bore: 0.72, crankcase: 0.72 },
  },
]

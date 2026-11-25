/* Engine layouts. Each piston layout is described cylinder by cylinder:
   x      position along the crankshaft
   angle  lean of the cylinder from vertical, degrees (+ leans to the right in the front view)
   pin    angle of its crankpin on the crank, degrees
   t      which crank throw it belongs to (cylinders on one throw share webs)
   fire   optional crank angle (0–720) of its power stroke; otherwise worked out from the TDC angles
   n      optional real cylinder number, as the manufacturer numbers it
   A piston is at top dead centre when (crank angle + pin) equals its own angle.

   Conventions: x runs front (−) to back (+); the crank turns clockwise seen from the front, as real engines do;
   a negative angle is the right-hand bank (in the direction of travel), a positive angle the left-hand bank. */

export type CylSpec = { x: number; angle: number; pin: number; t: number; fire?: number; n?: number }

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
  /** whose firing order and cylinder numbering the model uses */
  numbering?: string
}

export const FAMILIES: Family[] = ['Inline', 'V', 'W', 'Boxer', 'Others']

/* ---------------- geometry builders ---------------- */

const P = 0.86

type Slot = { n: number; x: number; angle: number; t: number }

/**
 * Every layout is built from a real engine's firing order. Each cylinder's power stroke is placed evenly
 * through the 720° cycle in that order, and its crankpin is the one that order needs: the piston is at top
 * dead centre when crank angle + pin = cylinder angle, so pin = angle − firing angle. Where two cylinders
 * share a crankpin on the real engine, this gives them the same pin, which checks the order fits the crank.
 */
function build(slots: Slot[], order: number[]): CylSpec[] {
  const gap = 720 / order.length
  const at = new Map(order.map((n, k) => [n, k * gap]))
  return slots.map(({ n, x, angle, t }) => {
    const fire = at.get(n)
    if (fire === undefined) throw new Error(`Cylinder ${n} is missing from the firing order ${order.join('-')}`)
    return { n, x, angle, t, fire, pin: (((angle - fire) % 360) + 360) % 360 }
  })
}

/** Inline engine, cylinders numbered front to back. */
function inline(order: number[]): CylSpec[] {
  const k = order.length
  return build(
    Array.from({ length: k }, (_, i) => ({ n: i + 1, x: (i - (k - 1) / 2) * P, angle: 0, t: i })),
    order,
  )
}

/** Single-row radial: every cylinder on one crankpin, numbered clockwise from the top seen from the front. */
function radial(k: number, order: number[]): CylSpec[] {
  return build(
    Array.from({ length: k }, (_, i) => ({ n: i + 1, x: 0, angle: (i * 360) / k, t: 0 })),
    order,
  )
}

/**
 * Two banks, one throw per pair of cylinders (V and flat engines). `throws` lists the cylinder numbers on each
 * throw, front to back, as [right bank, left bank]; `ahead` is the bank whose cylinder sits further forward.
 * Shared or split crankpins follow from the firing order (see build).
 */
function vee(bank: number, throws: [number, number][], ahead: 'right' | 'left', order: number[], off = 0.14): CylSpec[] {
  const d = ahead === 'right' ? off : -off
  return build(
    throws.flatMap(([right, left], i) => {
      const x = (i - (throws.length - 1) / 2) * P
      return [
        { n: right, x: x - d, angle: -bank / 2, t: i },
        { n: left, x: x + d, angle: bank / 2, t: i },
      ]
    }),
    order,
  )
}

/** Throws [1, k+1], [2, k+2] … for engines numbered 1…k down one bank and k+1…2k down the other. */
const banked = (k: number) => Array.from({ length: k }, (_, i) => [i + 1, k + i + 1] as [number, number])

/**
 * W engines (Volkswagen layout, SSP 248): two narrow-angle VR banks on one crank, the right bank numbered
 * 1…k and the left k+1…2k, front to back. Each bank has two rows 15° apart and its cylinders zig-zag between
 * them, starting in the outer row. Both banks are the same VR module, so the two cylinders on a throw sit in
 * matching rows, exactly one bank angle apart: on the W12 that is what makes VW's +12° split pin.
 */
function wEngine(bankAngle: number, perBank: number, order: number[]): CylSpec[] {
  const pitch = 0.58
  const slots: Slot[] = []
  for (let j = 0; j < perBank; j++) {
    const x = (j - (perBank - 1) / 2) * pitch
    const row = j % 2 === 0 ? -7.5 : 7.5
    slots.push({ n: j + 1, x: x - 0.07, angle: -bankAngle / 2 + row, t: j })
    slots.push({ n: perBank + j + 1, x: x + 0.07, angle: bankAngle / 2 + row, t: j })
  }
  return build(slots, order)
}

/** VR6: one 15° block, cylinders numbered front to back, zig-zagging between the two rows. */
function vr6(order: number[]): CylSpec[] {
  return build(
    Array.from({ length: 6 }, (_, j) => ({ n: j + 1, x: (j - 2.5) * 0.52, angle: j % 2 === 0 ? -7.5 : 7.5, t: j })),
    order,
  )
}

/* ---------------- the layouts ---------------- */

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
    geometry: { kind: 'piston', cyls: inline([1, 2, 3]), bore: 1 },
    numbering: 'Numbered front to back. Every inline-three fires 1-2-3, the G16E-GTS included.',
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
    geometry: { kind: 'piston', cyls: inline([1, 3, 4, 2]), bore: 1 },
    numbering: 'Numbered front to back, as on the Honda K20C.',
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
    geometry: { kind: 'piston', cyls: inline([1, 2, 4, 5, 3]), bore: 1 },
    numbering: 'Numbered front to back, as on Audi’s five-cylinders.',
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
    geometry: { kind: 'piston', cyls: inline([1, 5, 3, 6, 2, 4]), bore: 1 },
    numbering: 'Numbered front to back, as on the 2JZ, RB26 and S58.',
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
    geometry: { kind: 'piston', cyls: vee(60, [[1, 2], [3, 4], [5, 6]], 'right', [1, 2, 3, 4, 5, 6]), bore: 1 },
    numbering: 'Nissan numbering (VQ and VR38DETT): odd cylinders on the right bank, even on the left, 1 at the front.',
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
    geometry: {
      kind: 'piston',
      cyls: vee(90, [[2, 1], [4, 3], [6, 5], [8, 7]], 'left', [1, 8, 7, 2, 6, 5, 4, 3]),
      bore: 1,
    },
    numbering: 'GM numbering (LS and LT): odd cylinders on the left bank, even on the right, 1 at the front left.',
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
    geometry: {
      kind: 'piston',
      cyls: vee(90, [[1, 8], [2, 7], [3, 6], [4, 5]], 'right', [1, 8, 3, 6, 4, 5, 2, 7]),
      bore: 1,
    },
    numbering: 'Ferrari 458 (F136) numbering: 1–4 down the right bank from the front, 5–8 back up the left.',
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
    geometry: { kind: 'piston', cyls: vee(72, banked(5), 'right', [1, 6, 5, 10, 2, 7, 3, 8, 4, 9]), bore: 0.94 },
    numbering:
      'The standard even-firing V10 order, with 1–5 on the right bank and 6–10 on the left. Toyota has not published the LFA’s own.',
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
    geometry: { kind: 'piston', cyls: vee(60, banked(6), 'right', [1, 7, 5, 11, 3, 9, 6, 12, 2, 8, 4, 10]), bore: 0.88 },
    numbering: 'BMW numbering, as on the McLaren F1’s V12: 1–6 on the right bank, 7–12 on the left, front to back.',
  },
  {
    id: 'v16',
    family: 'V',
    name: 'V16',
    jp: 'V型16気筒',
    summary:
      'Two straight-eights on one crank. Sixteen cylinders fire every 45°, so the power strokes overlap so heavily that the torque is almost perfectly smooth.',
    how: 'Shown as Cadillac’s 1938–40 Series 90 engine: banks 135° apart on eight crankpins, each shared by one cylinder from each bank, so all sixteen fire evenly. Very long, which is why so few have ever been built.',
    pros: ['Silky, continuous torque', 'Huge displacement from small cylinders', 'Rare and spectacular'],
    cons: ['Extremely long engine and crankshaft', 'Heavy, complex and costly'],
    cars: [
      'Cadillac Series 90 (1938–40, 135°), the engine shown',
      'Bugatti Tourbillon (8.3 L, with hybrid drive)',
      'Cizeta-Moroder V16T',
      'BRM Type 15, a 1950s supercharged 1.5 L Grand Prix V16',
    ],
    redline: 7000,
    geometry: {
      kind: 'piston',
      cyls: vee(
        135,
        [[2, 1], [4, 3], [6, 5], [8, 7], [10, 9], [12, 11], [14, 13], [16, 15]],
        'left',
        [1, 4, 9, 12, 3, 16, 11, 8, 15, 14, 7, 6, 13, 2, 5, 10],
      ),
      bore: 0.84,
    },
    numbering: 'Cadillac numbering (1938–40): odd cylinders on the left bank, even on the right, 1 at the front.',
  },
  {
    id: 'w12',
    family: 'W',
    name: 'W12',
    jp: 'W型12気筒',
    summary:
      'Two narrow VR6 engines joined on one crankshaft. Twelve cylinders in a block not much longer than a V6.',
    how: 'Each bank is a VR6: two rows of cylinders 15° apart that zig-zag under one shared head. The banks sit 72° apart, giving four rows: the W. Each crankpin is split by 12° so it still fires every 60°.',
    pros: ['Twelve cylinders in a very short package', 'Smooth and quiet'],
    cons: ['Complicated to build and service', 'Heavy and wide'],
    cars: ['Bentley Continental GT (until 2024)', 'Volkswagen Phaeton W12', 'Audi A8 W12'],
    redline: 6200,
    geometry: { kind: 'piston', cyls: wEngine(72, 6, [1, 12, 5, 8, 3, 10, 6, 7, 2, 11, 4, 9]), bore: 0.78 },
    numbering: 'Volkswagen numbering: 1–6 on the right bank, 7–12 on the left, each zig-zagging front to back.',
  },
  {
    id: 'w16',
    family: 'W',
    name: 'W16',
    jp: 'W型16気筒',
    summary:
      'Two narrow-angle V8 banks on one crank: four rows of four cylinders. Built for one job, more than 1,000 horsepower in a road car.',
    how: 'Each bank is a VR8: two rows 15° apart under one head, with the banks 90° apart. Bugatti’s version displaces 8.0 litres with four turbochargers.',
    pros: ['Enormous power from a package that fits behind two seats', 'Smooth at any speed'],
    cons: ['Extremely complex and costly', 'Needs vast cooling: the Veyron carries ten radiators'],
    cars: ['Bugatti Veyron (1,001 PS)', 'Bugatti Chiron'],
    redline: 6700,
    geometry: {
      kind: 'piston',
      cyls: wEngine(90, 8, [1, 14, 9, 4, 7, 12, 15, 6, 13, 8, 3, 16, 11, 2, 5, 10]),
      bore: 0.74,
    },
    numbering: 'Bugatti’s firing order, numbered as on Volkswagen’s W12: 1–8 on the right bank, 9–16 on the left.',
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
    geometry: { kind: 'piston', cyls: vee(180, [[1, 2], [3, 4]], 'right', [1, 3, 2, 4], 0.17), bore: 1 },
    numbering: 'Subaru numbering (EJ20): 1 and 3 on the right bank, 2 and 4 on the left, 1 at the front.',
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
    geometry: { kind: 'piston', cyls: vee(180, banked(3), 'right', [1, 6, 2, 4, 3, 5], 0.17), bore: 1 },
    numbering: 'Porsche numbering: 1–3 on one bank, 4–6 on the other, each cylinder opposite the one numbered three higher.',
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
    geometry: { kind: 'piston', cyls: vee(180, banked(6), 'right', [1, 9, 5, 12, 3, 8, 6, 10, 2, 7, 4, 11]), bore: 0.9 },
    numbering: 'Ferrari numbering (Testarossa): 1–6 on the right bank, 7–12 on the left.',
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
    geometry: { kind: 'piston', cyls: vr6([1, 5, 3, 6, 2, 4]), bore: 0.86 },
    numbering: 'Volkswagen numbering: front to back, zig-zagging between the two rows.',
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
    geometry: { kind: 'piston', cyls: radial(9, [1, 3, 5, 7, 9, 2, 4, 6, 8]), bore: 0.72, crankcase: 0.72 },
    numbering: 'Numbered clockwise from the top cylinder, seen from the front.',
  },
]

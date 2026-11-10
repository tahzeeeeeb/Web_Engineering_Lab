import * as THREE from 'three'
import type { CylSpec, LayoutGeometry } from '../data/layouts'
import { createMaterials } from './materials'
import type { Materials } from './materials'
import {
  SHAPE_YZ_TO_X,
  SHAPE_ZY_TO_X,
  circle,
  extrude,
  gearShape,
  internalGearPath,
  lathe,
  rod,
  rodShape,
  roundedRectShape,
  webShape,
  yToX,
} from './geometry'

/** Firing events for the sound engine: crank angle of each power stroke (0–720) and its stereo position. */
export type FirePattern = { angles: number[]; pans: number[]; sharp?: boolean }

export type LayoutRig = { root: THREE.Group; update(theta: number): void; fire: FirePattern; cylinders: number }

const D2R = Math.PI / 180

const mesh = (g: THREE.BufferGeometry, m: THREE.Material, at: [number, number, number] = [0, 0, 0]) => {
  const o = new THREE.Mesh(g, m)
  o.position.set(...at)
  o.castShadow = true
  o.receiveShadow = true
  return o
}

export function buildLayout(g: LayoutGeometry): LayoutRig {
  const mats = createMaterials()
  return g.kind === 'rotary' ? rotary(g.rotors, mats) : pistons(g.cyls, g.bore, mats, g.crankcase)
}

/* ---------------- piston layouts ---------------- */

function pistons(cyls: CylSpec[], boreScale: number, mats: Materials, crankcase?: number): LayoutRig {
  const r = 0.3
  const l = 0.95
  const pr = 0.33 * boreScale
  const deck = r + l + 0.2 + 0.06
  const root = new THREE.Group()
  const crankSpin = new THREE.Group()
  root.add(crankSpin)

  // crank: shaft, pins, webs
  const xs = cyls.map((c) => c.x)
  const minX = Math.min(...xs) - 0.5
  const maxX = Math.max(...xs) + 0.5
  crankSpin.add(mesh(rod(0.13, maxX - minX, 32), mats.machined, [(minX + maxX) / 2, 0, 0]))
  crankSpin.add(mesh(rod(0.32, 0.07, 48), mats.steel, [maxX, 0, 0]))
  const throws = new Map<number, CylSpec[]>()
  cyls.forEach((c) => throws.set(c.t, [...(throws.get(c.t) ?? []), c]))
  const web = extrude(webShape(r, 0.2, 0.42), 0.07, SHAPE_ZY_TO_X, 20)
  throws.forEach((list) => {
    const sorted = [...list].sort((a, b) => a.x - b.x)
    let x0 = sorted[0].x - 0.15
    let x1 = sorted[sorted.length - 1].x + 0.15
    const shared = sorted.every((c) => c.pin === sorted[0].pin)
    if (shared) {
      const p = sorted[0].pin * D2R
      crankSpin.add(mesh(rod(0.15, x1 - x0, 28), mats.polished, [(x0 + x1) / 2, r * Math.cos(p), r * Math.sin(p)]))
    } else {
      // split pins: as long as the closest neighbour allows, with the end webs flush on the outer pin ends
      let gap = Infinity
      for (let i = 1; i < sorted.length; i++) gap = Math.min(gap, sorted[i].x - sorted[i - 1].x)
      const pinLen = sorted.length > 1 ? Math.min(0.27, gap - 0.02) : 0.27
      x0 = sorted[0].x - pinLen / 2
      x1 = sorted[sorted.length - 1].x + pinLen / 2
      sorted.forEach((c) => {
        const p = c.pin * D2R
        crankSpin.add(mesh(rod(0.15, pinLen, 28), mats.polished, [c.x, r * Math.cos(p), r * Math.sin(p)]))
      })
    }
    for (const [x, c] of [
      [x0 - 0.035, sorted[0]],
      [x1 + 0.035, sorted[sorted.length - 1]],
    ] as const) {
      const w = mesh(web, mats.steel, [x, 0, 0])
      w.rotation.x = c.pin * D2R
      crankSpin.add(w)
    }
  })

  // firing offsets: compression TDCs alternate within each group of cylinders sharing a TDC angle
  const seen = new Map<number, number>()
  const fireAt = cyls.map((c) => {
    if (c.fire !== undefined) return c.fire
    const tdc = (((c.angle - c.pin) % 360) + 360) % 360
    const key = Math.round(tdc * 10)
    const k = seen.get(key) ?? 0
    seen.set(key, k + 1)
    return tdc + (k % 2) * 360
  })

  // cylinders, pistons, rods
  const s = pr / 0.424
  const pistonGeo = lathe(
    (
      [
        [0, 0.17],
        [0.36, 0.15],
        [0.36, -0.25],
        [0.424, -0.25],
        [0.424, 0.2],
        [0.418, 0.205],
        [0.418, 0.225],
        [0.424, 0.23],
        [0.424, 0.29],
        [0.41, 0.3],
        [0, 0.31],
      ] as [number, number][]
    ).map(([a, b]) => [a * s, b * 0.75] as [number, number]),
    40,
  )
  const sleeveGeo = new THREE.CylinderGeometry(pr + 0.02, pr + 0.02, deck - 0.6, 40, 1, true)
  const ringGeo = new THREE.CylinderGeometry(pr + 0.06, pr + 0.06, 0.03, 40)
  const rodGeo = extrude(rodShape(l, 0.21, 0.1, 0.152, 0.06), 0.11, SHAPE_ZY_TO_X, 28)
  const pistonObjs: THREE.Object3D[] = []
  const rodObjs: THREE.Object3D[] = []
  const sleeveMats: THREE.MeshStandardMaterial[] = []
  cyls.forEach((c) => {
    const axis = new THREE.Group()
    axis.position.x = c.x
    axis.rotation.x = c.angle * D2R
    root.add(axis)
    const sm = mats.sleeve.clone()
    sleeveMats.push(sm)
    const sleeve = mesh(sleeveGeo, sm, [0, (deck + 0.6) / 2, 0])
    sleeve.castShadow = false
    sleeve.renderOrder = 2
    axis.add(sleeve)
    axis.add(mesh(ringGeo, mats.machined, [0, deck, 0]))
    const p = new THREE.Group()
    p.add(mesh(pistonGeo, mats.piston))
    axis.add(p)
    pistonObjs.push(p)
    const rg = new THREE.Group()
    rg.position.x = c.x
    rg.add(mesh(rodGeo, mats.darkSteel))
    root.add(rg)
    rodObjs.push(rg)
  })

  // one head per bank (rows within 20° share a head, as on a VR engine)
  const banks: { angle: number; xs: number[]; angles: number[] }[] = []
  cyls.forEach((c) => {
    const b = banks.find((k) => Math.abs(k.angle - c.angle) < 20)
    if (b) {
      b.xs.push(c.x)
      b.angles.push(c.angle)
      b.angle = (b.angle * (b.xs.length - 1) + c.angle) / b.xs.length
    } else banks.push({ angle: c.angle, xs: [c.x], angles: [c.angle] })
  })
  const coverMat = mats.crinkleRed.clone()
  coverMat.color.setHex(0x2a2a2d)
  banks.forEach((b) => {
    const g = new THREE.Group()
    g.rotation.x = b.angle * D2R
    const lo = Math.min(...b.angles)
    const hi = Math.max(...b.angles)
    if (hi - lo > 1) {
      // two rows (VR / W bank): the head's underside runs through both rows' deck rings
      const delta = ((hi - lo) / 2) * D2R
      const s = deck * Math.sin(delta)
      const h0 = deck * Math.cos(delta)
      const x0 = Math.min(...b.xs) - (pr + 0.1)
      const x1 = Math.max(...b.xs) + (pr + 0.1)
      const head = new THREE.Shape()
      head.moveTo(-(s + pr + 0.1), h0)
      head.lineTo(s + pr + 0.1, h0)
      head.lineTo(s + pr - 0.02, h0 + 0.3)
      head.lineTo(-(s + pr - 0.02), h0 + 0.3)
      head.closePath()
      g.add(mesh(extrude(head, x1 - x0, SHAPE_ZY_TO_X, 1), mats.castAlu, [(x0 + x1) / 2, 0, 0]))
      g.add(mesh(new THREE.BoxGeometry(x1 - x0 - 0.1, 0.16, 2 * (s + pr - 0.1)), coverMat, [(x0 + x1) / 2, h0 + 0.38, 0]))
    } else {
      const x0 = Math.min(...b.xs) - pr - 0.12
      const x1 = Math.max(...b.xs) + pr + 0.12
      const spread = cyls.filter((c) => b.xs.includes(c.x)).some((c) => Math.abs(c.angle - b.angle) > 1) ? 0.42 : 0
      const w = 2 * pr + 0.3 + spread
      g.add(mesh(new THREE.BoxGeometry(x1 - x0, 0.32, w), mats.castAlu, [(x0 + x1) / 2, deck + 0.18, 0]))
      g.add(mesh(new THREE.BoxGeometry(x1 - x0 - 0.06, 0.2, w - 0.12), coverMat, [(x0 + x1) / 2, deck + 0.44, 0]))
    }
    root.add(g)
  })

  if (crankcase) {
    // radial: a round, semi-transparent crankcase that the cylinders bolt to
    const cc = mesh(rod(crankcase, 0.5, 9), mats.sleeve.clone(), [0, 0, 0])
    cc.castShadow = false
    cc.renderOrder = 1
    root.add(cc)
    crankSpin.add(mesh(rod(0.42, 0.05, 40), mats.darkSteel, [-0.33, 0, 0]))
  }

  const warm = new THREE.Color(0xc98648)
  const cool = new THREE.Color(0xc9ccd0)
  return {
    root,
    cylinders: cyls.length,
    fire: {
      angles: fireAt.map((f) => ((f % 720) + 720) % 720),
      pans: cyls.map((c) => Math.max(-0.6, Math.min(0.6, Math.sin(c.angle * D2R) * 0.65))),
    },
    update(theta) {
      crankSpin.rotation.x = theta
      const deg = theta / D2R
      cyls.forEach((c, i) => {
        const pa = theta + c.pin * D2R
        const yc = r * Math.cos(pa)
        const zc = r * Math.sin(pa)
        const a = c.angle * D2R
        const g = pa - a
        const sAx = r * Math.cos(g) + Math.sqrt(l * l - (r * Math.sin(g)) ** 2)
        pistonObjs[i].position.y = sAx
        const py = sAx * Math.cos(a)
        const pz = sAx * Math.sin(a)
        rodObjs[i].position.y = yc
        rodObjs[i].position.z = zc
        rodObjs[i].rotation.x = Math.atan2(pz - zc, py - yc)
        const alpha = (((deg - fireAt[i]) % 720) + 720) % 720
        const heat = alpha < 180 ? (1 - alpha / 180) ** 1.5 : 0
        sleeveMats[i].color.copy(cool).lerp(warm, heat)
        sleeveMats[i].opacity = 0.22 + heat * 0.3
      })
    },
  }
}

/* ---------------- Wankel rotary ---------------- */

function rotary(rotors: number, mats: Materials): LayoutRig {
  const RR = 1
  const E = 0.15
  const W = 0.36
  const root = new THREE.Group()
  const xs = rotors === 2 ? [-0.27, 0.27] : [0]

  const housing = roundedRectShape(-1.5, -1.26, 1.5, 1.26, 0.38)
  const hole = new THREE.Path()
  for (let k = 0; k <= 180; k++) {
    const t = (k / 180) * Math.PI * 2
    const y = E * Math.cos(3 * t) + (RR + 0.015) * Math.cos(t)
    const z = E * Math.sin(3 * t) + (RR + 0.015) * Math.sin(t)
    if (k === 0) hole.moveTo(y, z)
    else hole.lineTo(y, z)
  }
  housing.holes.push(hole)
  const housingGeo = extrude(housing, W, SHAPE_YZ_TO_X, 24)

  const rotorShape = new THREE.Shape()
  for (let k = 0; k < 3; k++) {
    const a = (k * 120) * D2R
    const m = (k * 120 + 60) * D2R
    const n = ((k + 1) * 120) * D2R
    const ar = RR * 0.985
    if (k === 0) rotorShape.moveTo(ar * Math.cos(a), ar * Math.sin(a))
    rotorShape.quadraticCurveTo(0.7 * RR * Math.cos(m), 0.7 * RR * Math.sin(m), ar * Math.cos(n), ar * Math.sin(n))
  }
  rotorShape.holes.push(internalGearPath(0.45, 30, 0.035))
  const rotorGeo = extrude(rotorShape, W - 0.05, SHAPE_YZ_TO_X, 24)

  const plate = roundedRectShape(-1.5, -1.26, 1.5, 1.26, 0.38)
  plate.holes.push(circle(0, 0, 0.16))
  const plateGeo = extrude(plate, 0.1, SHAPE_YZ_TO_X, 24)
  const plateMat = mats.sleeve.clone()
  plateMat.opacity = 0.32

  const gear = gearShape(0.3, 20, 0.035)
  gear.holes.push(circle(0, 0, 0.13))
  const gearGeo = extrude(gear, W * 0.45, SHAPE_YZ_TO_X, 12)
  const lobe = new THREE.Shape()
  lobe.absarc(0, 0, 0.27, 0, Math.PI * 2, false)
  const lobeGeo = extrude(lobe, 0.06, SHAPE_YZ_TO_X, 40)

  const rotorObjs: THREE.Group[] = []
  const lobeObjs: THREE.Object3D[] = []
  xs.forEach((x, k) => {
    root.add(mesh(housingGeo, mats.housing, [x, 0, 0]))
    // rear plate behind each housing; the front of the first rotor is left open to see inside
    const back = mesh(plateGeo, plateMat, [x + W / 2 + 0.05, 0, 0])
    back.castShadow = false
    back.renderOrder = 2
    root.add(back)
    root.add(mesh(gearGeo, mats.machined, [x + W * 0.1, 0, 0]))
    const rg = new THREE.Group()
    rg.position.x = x
    rg.add(mesh(rotorGeo, mats.steel))
    for (let a = 0; a < 3; a++) {
      const ang = a * 120 * D2R
      rg.add(mesh(new THREE.BoxGeometry(W - 0.04, 0.035, 0.035), mats.darkSteel, [0, 0.985 * Math.cos(ang), 0.985 * Math.sin(ang)]))
    }
    root.add(rg)
    rotorObjs.push(rg)
    const lb = mesh(lobeGeo, mats.polished, [x - W / 2 + 0.06, 0, 0])
    root.add(lb)
    lobeObjs.push(lb)
    if (k === 0) {
      // two spark plugs on the combustion side of the housing
      for (const y of [-0.17, 0.17]) {
        const plug = new THREE.Group()
        plug.position.set(x, y, -1.26)
        plug.rotation.x = -Math.PI / 2
        plug.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 6), mats.nickel, [0, 0.06, 0]))
        plug.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 20), mats.ceramic, [0, 0.27, 0]))
        root.add(plug)
      }
    }
  })
  const shaftSpin = new THREE.Group()
  root.add(shaftSpin)
  const span = xs.length * 0.7 + 1.4
  shaftSpin.add(mesh(rod(0.12, span, 32), mats.polished))
  const pulley = yToX(
    lathe(
      [
        [0.12, -0.08],
        [0.5, -0.08],
        [0.52, -0.05],
        [0.5, -0.02],
        [0.52, 0.02],
        [0.5, 0.05],
        [0.5, 0.08],
        [0.12, 0.08],
      ],
      56,
    ),
  )
  shaftSpin.add(mesh(pulley, mats.darkSteel, [span / 2 - 0.1, 0, 0]))
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2
    shaftSpin.add(mesh(rod(0.07, 0.02, 20), mats.machined, [span / 2 - 0.01, Math.cos(a) * 0.3, Math.sin(a) * 0.3]))
  }

  return {
    root,
    cylinders: 0,
    fire: { angles: xs.flatMap((_, k) => [k * 180, k * 180 + 360]), pans: xs.flatMap(() => [0, 0]), sharp: true },
    update(theta) {
      shaftSpin.rotation.x = theta
      xs.forEach((_, k) => {
        const t = theta + Math.PI * k
        rotorObjs[k].position.y = E * Math.cos(t)
        rotorObjs[k].position.z = E * Math.sin(t)
        rotorObjs[k].rotation.x = t / 3
        lobeObjs[k].position.y = E * Math.cos(t)
        lobeObjs[k].position.z = E * Math.sin(t)
      })
    },
  }
}

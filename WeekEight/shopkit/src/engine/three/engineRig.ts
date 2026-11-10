import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { PartId } from '../data/parts'
import { createMaterials } from './materials'
import {
  SHAPE_XZ_TO_Y,
  roundedRectShape,
  SHAPE_YZ_TO_X,
  SHAPE_ZY_TO_X,
  beltLoop,
  circle,
  extrude,
  gearShape,
  helixGeometry,
  lathe,
  rectPath,
  rectShape,
  ribbonGeometry,
  rod,
  rodShape,
  tube,
  webShape,
  yToX,
} from './geometry'

/* A 2.0-litre DOHC 16-valve inline-four, 86 mm bore × 86 mm stroke.
   1 scene unit = 100 mm. X runs front (timing belt, −X) to back (flywheel, +X),
   Y is up, intake side is −Z and exhaust side is +Z.
   Crank angle θ: cylinder 1 fires at θ = 0. Each cylinder's cycle angle
   α = θ − firing offset, 0–180 power, 180–360 exhaust, 360–540 intake, 540–720 compression. */

export type CamProfile = { inOpen: number; inClose: number; exOpen: number; exClose: number; lift: number }
export const STREET_CAM: CamProfile = { inOpen: 350, inClose: 580, exOpen: 140, exClose: 370, lift: 0.09 }
export const RACE_CAM: CamProfile = { inOpen: 325, inClose: 605, exOpen: 115, exClose: 395, lift: 0.115 }

export function valveLift(alpha: number, open: number, close: number, lift: number): number {
  const a = ((alpha % 720) + 720) % 720
  const u = (a - open) / (close - open)
  return u > 0 && u < 1 ? lift * Math.sin(Math.PI * u) ** 2 : 0
}

export const STROKES = ['Power', 'Exhaust', 'Intake', 'Compression'] as const
/** Index into STROKES for a cycle angle α (degrees). */
export const strokeAt = (alpha: number) => Math.floor((((alpha % 720) + 720) % 720) / 180)

const D2R = Math.PI / 180
export const R = 0.43 // crank throw (stroke / 2)
const ROD = 1.45
const PITCH = 0.96
export const DECK = 2.2
const BORE_R = 0.432
const ROOF = 0.16
const TAU = Math.atan2(ROOF, 0.43) // valve tilt = pent-roof slope
const CT = Math.cos(TAU)
const ST = Math.sin(TAU)
const VALVE_Z = 0.215
const VALVE_Y = DECK + ROOF * (1 - VALVE_Z / 0.43)
const VALVE_DX = 0.17
const SEAT_D = 0.55
const RET_D = 0.93
const BUCKET_D = 0.96
const BUCKET_H = 0.12
const CAM_BASE = 0.16
const CAM_D = BUCKET_D + BUCKET_H + CAM_BASE
export const CAM_Y = VALVE_Y + CAM_D * CT
const CAM_Z = VALVE_Z + CAM_D * ST
const HEAD_TOP = 3.2
const HW_BLOCK = 0.86 // half-width of the upper block
const HW_HEAD = 0.95 // half-width of the head: wide enough to enclose the cam lobes
const HW_COVER = 0.97
export const PLUG_Y = DECK + ROOF - 0.03

/** Distance of the piston below top dead centre, in mm, for crank angle θ (radians). */
export function pistonDrop(theta: number): number {
  const z = R * Math.sin(theta)
  const y = R * Math.cos(theta) + Math.sqrt(ROD * ROD - z * z)
  return (R + ROD - y) * 100
}

export type PartHandle = {
  id: PartId
  group: THREE.Group
  explode: THREE.Vector3
  housing: boolean
  mats: THREE.Material[]
  meshes: THREE.Mesh[]
  opacity: number
}

export type EngineOptions = { cylinders?: 1 | 4; cutaway?: boolean; profile?: CamProfile }

export type EngineRig = {
  root: THREE.Group
  parts: Map<PartId, PartHandle>
  fireAt: number[]
  profile: CamProfile
  update(theta: number): void
  setExplode(t: number): void
  setOpacity(id: PartId, o: number): void
  setProfile(p: CamProfile): void
  lifts(): { intake: number; exhaust: number }
}

export function buildEngine(opts: EngineOptions = {}): EngineRig {
  const n = opts.cylinders ?? 4
  const cutaway = !!opts.cutaway
  let profile = opts.profile ?? STREET_CAM
  const mats = createMaterials()
  const root = new THREE.Group()
  const parts = new Map<PartId, PartHandle>()
  const clipPlanes = cutaway ? [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)] : null
  // cut faces are shown in kintsugi gold
  const capMat = new THREE.MeshBasicMaterial({ color: 0x7d6532, side: THREE.BackSide, clippingPlanes: clipPlanes })
  const xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * PITCH)
  const half = (n * PITCH) / 2 + 0.12
  const pinPhase = n === 4 ? [0, Math.PI, Math.PI, 0] : [0]
  const fireAt = n === 4 ? [0, 540, 180, 360] : [0]

  /* ---------- part + mesh helpers ---------- */

  const part = (id: PartId, explode: [number, number, number], housing = false): PartHandle => {
    const group = new THREE.Group()
    group.name = id
    root.add(group)
    const h: PartHandle = { id, group, explode: new THREE.Vector3(...explode), housing, mats: [], meshes: [], opacity: 1 }
    parts.set(id, h)
    return h
  }
  const matCache = new Map<string, THREE.Material>()
  const matFor = (h: PartHandle, base: THREE.Material, clip: boolean, cap: boolean) => {
    const key = `${h.id}:${base.uuid}:${clip}:${cap}`
    let m = matCache.get(key)
    if (!m) {
      m = base.clone()
      m.userData.baseTransparent = base.transparent
      m.userData.baseOpacity = base.opacity
      if (clip && clipPlanes) {
        m.clippingPlanes = clipPlanes
        m.clipShadows = true
        m.side = cap ? THREE.FrontSide : THREE.DoubleSide
      }
      matCache.set(key, m)
      h.mats.push(m)
    }
    return m
  }
  type AddOpts = { parent?: THREE.Object3D; clip?: boolean; cap?: boolean; at?: [number, number, number] }
  const add = (h: PartHandle, geo: THREE.BufferGeometry, base: THREE.Material, o: AddOpts = {}) => {
    const clip = cutaway && !!o.clip
    const mesh = new THREE.Mesh(geo, matFor(h, base, clip, clip && !!o.cap))
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.part = h.id
    if (o.at) mesh.position.set(...o.at)
    ;(o.parent ?? h.group).add(mesh)
    h.meshes.push(mesh)
    if (clip && o.cap) {
      const cap = new THREE.Mesh(geo, capMat)
      cap.userData.part = h.id
      cap.position.copy(mesh.position)
      mesh.parent?.add(cap)
    }
    return mesh
  }

  /* ---------- engine block ---------- */

  const block = part('engine-block', [0, 0, 0], true)
  {
    const s = rectShape(-half, -HW_BLOCK, half, HW_BLOCK)
    xs.forEach((x) => s.holes.push(circle(x, 0, BORE_R)))
    const g = extrude(s, DECK - 0.95, SHAPE_XZ_TO_Y, 56)
    g.translate(0, (DECK + 0.95) / 2, 0)
    add(block, g, mats.castAlu, { clip: true, cap: true })

    const low = rectShape(-half, -0.95, half, 0.95)
    low.holes.push(rectPath(-half + 0.1, -0.82, half - 0.1, 0.82))
    const gl = extrude(low, 1.4, SHAPE_XZ_TO_Y)
    gl.translate(0, 0.25, 0)
    add(block, gl, mats.castAlu, { clip: true, cap: true })

    for (let j = 0; j <= n; j++) {
      const sh = rectShape(-0.82, -0.45, 0.82, 0.95)
      sh.holes.push(circle(0, 0, 0.27))
      const gb = extrude(sh, 0.12, SHAPE_ZY_TO_X)
      gb.translate((j - n / 2) * PITCH, 0, 0)
      add(block, gb, mats.castAlu, { clip: true, cap: true })
    }
    // spin-on oil filter on the intake side
    if (n === 4) {
      const filter = yToX(
        lathe(
          [
            [0, -0.3],
            [0.2, -0.3],
            [0.24, -0.26],
            [0.24, 0.26],
            [0.2, 0.3],
            [0, 0.3],
          ],
          48,
        ),
      )
      filter.rotateY(Math.PI / 2)
      add(block, filter, mats.filter, { at: [0.55, 0.55, -1.3] })
      add(block, rod(0.18, 0.1, 32), mats.castAlu, { at: [0.55, 0.55, -1.0] }).rotation.y = Math.PI / 2
    }
    // cast ribs along the skirt
    for (const z of [-0.96, 0.96]) {
      for (let k = 0; k < n + 1; k++) {
        const rib = new THREE.BoxGeometry(0.07, 1.1, 0.06)
        add(block, rib, mats.castAlu, { at: [(k - n / 2) * PITCH, 0.35, z], clip: true })
      }
    }
  }

  /* ---------- oil pan ---------- */

  const pan = part('oil-pan', [0, -0.8, 0], true)
  {
    const g1 = new RoundedBoxGeometry(2 * half, 0.42, 1.9, 3, 0.08)
    add(pan, g1, mats.panPaint, { at: [0, -0.66, 0], clip: true, cap: true })
    const g2 = new RoundedBoxGeometry(Math.max(0.9, half), 0.5, 1.5, 3, 0.1)
    add(pan, g2, mats.panPaint, { at: [half * 0.42, -0.95, 0], clip: true, cap: true })
    add(pan, new THREE.BoxGeometry(2 * half + 0.06, 0.04, 1.98), mats.panPaint, { at: [0, -0.47, 0], clip: true })
    add(pan, new THREE.CylinderGeometry(0.07, 0.07, 0.06, 6), mats.steel, { at: [half * 0.42, -1.22, 0.35] })
  }

  /* ---------- crankshaft (rotates) ---------- */

  const crank = part('crankshaft', [0, 0, 0])
  const crankSpin = new THREE.Group()
  crank.group.add(crankSpin)
  {
    for (let j = 0; j <= n; j++) {
      add(crank, rod(0.25, 0.48, 40), mats.machined, { parent: crankSpin, at: [(j - n / 2) * PITCH, 0, 0] })
    }
    const web = webShape(R, 0.28, 0.6)
    xs.forEach((x, i) => {
      const a = -pinPhase[i]
      add(crank, rod(0.22, 0.24, 40), mats.polished, {
        parent: crankSpin,
        at: [x, R * Math.cos(a), R * Math.sin(a)],
      })
      for (const side of [-1, 1]) {
        const w = add(crank, extrude(web, 0.12, SHAPE_ZY_TO_X, 24), mats.steel, {
          parent: crankSpin,
          at: [x + side * 0.19, 0, 0],
        })
        w.rotation.x = a
      }
    })
    add(crank, rod(0.17, 0.66, 32), mats.machined, { parent: crankSpin, at: [-half - 0.3, 0, 0] })
    add(crank, rod(0.32, 0.08, 40), mats.steel, { parent: crankSpin, at: [half + 0.08, 0, 0] })
    // ribbed accessory pulley / harmonic damper on the nose
    const ribs: [number, number][] = [[0.12, -0.1]]
    for (let k = 0; k <= 6; k++) ribs.push([k % 2 ? 0.4 : 0.43, -0.09 + k * 0.03])
    ribs.push([0.12, 0.1])
    add(crank, yToX(lathe(ribs, 64)), mats.darkSteel, { parent: crankSpin, at: [-half - 0.56, 0, 0] })
  }

  /* ---------- flywheel (rotates) ---------- */

  const fly = part('flywheel', [1.0, 0, 0])
  const flySpin = new THREE.Group()
  fly.group.add(flySpin)
  {
    const s = gearShape(1.05, 110, 0.045)
    s.holes.push(circle(0, 0, 0.18))
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      s.holes.push(circle(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.11))
    }
    add(fly, extrude(s, 0.12, SHAPE_YZ_TO_X, 24), mats.steel, { parent: flySpin, at: [half + 0.22, 0, 0] })
    const face = new THREE.Shape()
    face.absarc(0, 0, 0.9, 0, Math.PI * 2, false)
    face.holes.push(circle(0, 0, 0.42))
    add(fly, extrude(face, 0.012, SHAPE_YZ_TO_X, 64), mats.polished, { parent: flySpin, at: [half + 0.287, 0, 0] })
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.5
      add(fly, rod(0.04, 0.06, 6), mats.darkSteel, {
        parent: flySpin,
        at: [half + 0.15, Math.cos(a) * 0.26, Math.sin(a) * 0.26],
      })
    }
  }

  /* ---------- pistons ---------- */

  const pistons = part('pistons', [0, 0, 0])
  const pistonGeo = lathe(
    [
      [0, 0.17],
      [0.36, 0.15],
      [0.36, -0.25],
      [0.424, -0.25],
      [0.424, 0.135],
      [0.418, 0.14],
      [0.418, 0.165],
      [0.424, 0.17],
      [0.424, 0.2],
      [0.418, 0.205],
      [0.418, 0.225],
      [0.424, 0.23],
      [0.424, 0.255],
      [0.418, 0.26],
      [0.418, 0.28],
      [0.424, 0.285],
      [0.424, 0.292],
      [0.41, 0.3],
      [0.25, 0.306],
      [0, 0.31],
    ],
    64,
  )
  const pistonObjs = xs.map((x) => {
    const g = new THREE.Group()
    g.position.x = x
    pistons.group.add(g)
    add(pistons, pistonGeo, mats.piston, { parent: g })
    for (const [y, h] of [
      [0.1525, 0.024],
      [0.215, 0.018],
      [0.27, 0.018],
    ]) {
      add(pistons, new THREE.CylinderGeometry(0.4232, 0.4232, h, 64, 1, true), mats.darkSteel, { parent: g, at: [0, y, 0] })
    }
    add(pistons, rod(0.095, 0.62, 24), mats.polished, { parent: g })
    return g
  })

  /* ---------- connecting rods ---------- */

  const rods = part('connecting-rods', [0, 0, 0])
  const rodGeo = extrude(rodShape(ROD, 0.33, 0.15, 0.225, 0.098), 0.2, SHAPE_ZY_TO_X, 40)
  const rodObjs = xs.map((x) => {
    const g = new THREE.Group()
    g.position.x = x
    rods.group.add(g)
    add(rods, rodGeo, mats.darkSteel, { parent: g })
    for (const z of [-0.255, 0.255]) {
      add(rods, new THREE.CylinderGeometry(0.045, 0.045, 0.07, 6), mats.steel, { parent: g, at: [0, -0.215, z] })
    }
    return g
  })

  /* ---------- cylinder head ---------- */

  const HEAD_UP = 0.75
  const head = part('cylinder-head', [0, HEAD_UP, 0], true)
  {
    const s = new THREE.Shape()
    s.moveTo(-HW_BLOCK, DECK)
    s.lineTo(-0.43, DECK)
    s.lineTo(0, DECK + ROOF)
    s.lineTo(0.43, DECK)
    s.lineTo(HW_BLOCK, DECK)
    s.lineTo(HW_HEAD, DECK + 0.1)
    s.lineTo(HW_HEAD, HEAD_TOP)
    s.lineTo(-HW_HEAD, HEAD_TOP)
    s.lineTo(-HW_HEAD, DECK + 0.1)
    s.closePath()
    add(head, extrude(s, 2 * half, SHAPE_ZY_TO_X, 1), mats.castAlu, { clip: true, cap: true })
    // front cam carrier: closes the timing end of the head around both cam snouts
    const carrier = roundedRectShape(-HW_HEAD, HEAD_TOP - 0.06, HW_HEAD, CAM_Y + 0.3, 0.22)
    add(head, extrude(carrier, 0.1, SHAPE_ZY_TO_X, 12), mats.castAlu, { at: [-half + 0.05, 0, 0], clip: true, cap: true })
    for (const side of [-1, 1]) {
      // cam oil seals where the snouts leave the head
      const seal = new THREE.TorusGeometry(0.125, 0.03, 10, 36)
      seal.rotateY(Math.PI / 2)
      add(head, seal, mats.rubber, { at: [-half - 0.005, CAM_Y, side * CAM_Z] })
    }
    // cam bearing caps
    for (let j = 0; j <= n; j++) {
      const hgt = CAM_Y + 0.13 - HEAD_TOP
      for (const side of [-1, 1]) {
        add(head, new THREE.BoxGeometry(0.13, hgt, 0.3), mats.castAlu, {
          at: [(j - n / 2) * PITCH, HEAD_TOP + hgt / 2, side * CAM_Z],
          clip: true,
          cap: true,
        })
      }
    }
    if (cutaway) {
      // ports, visible only in the cutaway
      const aI = new THREE.Vector3(0, CT, -ST)
      const aE = new THREE.Vector3(0, CT, ST)
      const pI = new THREE.Vector3(0, VALVE_Y, -VALVE_Z).addScaledVector(aI, 0.1)
      const pE = new THREE.Vector3(0, VALVE_Y, VALVE_Z).addScaledVector(aE, 0.1)
      add(
        head,
        tube(
          [
            [0, pI.y, pI.z],
            [0, pI.y + 0.16, pI.z - 0.1],
            [0, 2.72, -0.6],
            [0, 2.77, -0.82],
            [0, 2.78, -1.0],
          ],
          0.13,
        ),
        mats.port,
        { clip: true },
      )
      add(
        head,
        tube(
          [
            [0, pE.y, pE.z],
            [0, pE.y + 0.15, pE.z + 0.1],
            [0, 2.66, 0.6],
            [0, 2.69, 0.82],
            [0, 2.7, 1.0],
          ],
          0.115,
        ),
        mats.port,
        { clip: true },
      )
    }
  }

  /* ---------- valves, springs, buckets ---------- */

  const inValves = part('intake-valves', [0, HEAD_UP, 0])
  const exValves = part('exhaust-valves', [0, HEAD_UP, 0])
  const springs = part('valve-springs', [0, HEAD_UP, 0])
  const Y = new THREE.Vector3(0, 1, 0)
  const axisI = new THREE.Vector3(0, CT, -ST)
  const axisE = new THREE.Vector3(0, CT, ST)
  const qI = new THREE.Quaternion().setFromUnitVectors(Y, axisI)
  const qE = new THREE.Quaternion().setFromUnitVectors(Y, axisE)
  const valveGeo = (r: number) =>
    lathe(
      [
        [0, 0],
        [r, 0],
        [r, 0.018],
        [r * 0.62, 0.05],
        [0.07, 0.11],
        [0.034, 0.2],
        [0.034, 0.985],
        [0.028, 1],
        [0, 1],
      ],
      40,
    )
  const springGeo = helixGeometry(0.085, 0.016, 6.5)
  const retainerGeo = new THREE.CylinderGeometry(0.095, 0.06, 0.04, 28)
  const bucketGeo = new THREE.CylinderGeometry(0.14, 0.14, BUCKET_H, 36)
  type ValveObj = {
    cyl: number
    intake: boolean
    base: THREE.Vector3
    axis: THREE.Vector3
    valve: THREE.Object3D
    spring: THREE.Object3D
    retainer: THREE.Object3D
    bucket: THREE.Object3D
  }
  const valves: ValveObj[] = []
  xs.forEach((x, i) => {
    for (const intake of [true, false]) {
      for (const dx of [-VALVE_DX, VALVE_DX]) {
        const axis = intake ? axisI : axisE
        const q = intake ? qI : qE
        const base = new THREE.Vector3(x + dx, VALVE_Y, intake ? -VALVE_Z : VALVE_Z)
        const valve = add(intake ? inValves : exValves, valveGeo(intake ? 0.15 : 0.128), intake ? mats.polished : mats.burnt, {
          clip: true,
        })
        valve.quaternion.copy(q)
        const spring = add(springs, springGeo, mats.spring, { clip: true })
        spring.quaternion.copy(q)
        const retainer = add(springs, retainerGeo, mats.steel, { clip: true })
        retainer.quaternion.copy(q)
        const bucket = add(springs, bucketGeo, mats.machined, { clip: true })
        bucket.quaternion.copy(q)
        valves.push({ cyl: i, intake, base, axis, valve, spring, retainer, bucket })
      }
    }
  })

  /* ---------- camshafts (rotate at half crank speed) ---------- */

  const cams = part('camshafts', [0, 1.25, 0])
  const camSpins: THREE.Group[] = []
  const lobeMeshes: { mesh: THREE.Mesh; cyl: number; intake: boolean }[] = []
  for (const intake of [true, false]) {
    const spin = new THREE.Group()
    spin.position.set(0, CAM_Y, intake ? -CAM_Z : CAM_Z)
    cams.group.add(spin)
    camSpins.push(spin)
    add(cams, rod(0.1, 2 * half + 0.12, 28), mats.machined, { parent: spin, at: [-0.06, 0, 0], clip: true })
    for (let j = 0; j <= n; j++) {
      add(cams, rod(0.135, 0.1, 32), mats.polished, { parent: spin, at: [(j - n / 2) * PITCH, 0, 0], clip: true })
    }
    xs.forEach((x, i) => {
      for (const dx of [-VALVE_DX, VALVE_DX]) {
        const mesh = add(cams, new THREE.BufferGeometry(), mats.polished, { parent: spin, at: [x + dx, 0, 0], clip: true })
        lobeMeshes.push({ mesh, cyl: i, intake })
      }
    })
  }
  const lobeGeometry = (lambda: number, lift: number, durationCrank: number) => {
    const H = durationCrank / 2
    const s = new THREE.Shape()
    const N = 144
    for (let k = 0; k < N; k++) {
      const psi = (k / N) * Math.PI * 2
      let d = psi - lambda
      d = Math.atan2(Math.sin(d), Math.cos(d))
      const x = (2 * d) / D2R
      const h = Math.abs(x) < H ? lift * Math.cos((Math.PI * x) / (2 * H)) ** 2 : 0
      const r = CAM_BASE + h
      if (k === 0) s.moveTo(r * Math.cos(psi), r * Math.sin(psi))
      else s.lineTo(r * Math.cos(psi), r * Math.sin(psi))
    }
    s.closePath()
    return extrude(s, 0.13, SHAPE_YZ_TO_X, 1)
  }
  const buildLobes = () => {
    const omegaI = Math.PI - TAU
    const omegaE = -(Math.PI - TAU)
    lobeMeshes.forEach(({ mesh, cyl, intake }) => {
      const open = intake ? profile.inOpen : profile.exOpen
      const close = intake ? profile.inClose : profile.exClose
      const peak = (fireAt[cyl] + (open + close) / 2) * D2R
      const lambda = (intake ? omegaI : omegaE) - peak / 2
      mesh.geometry.dispose()
      mesh.geometry = lobeGeometry(lambda, profile.lift, close - open)
    })
  }
  buildLobes()

  /* ---------- timing belt + sprockets ---------- */

  const timing = part('timing-belt', [-1.05, 0, 0])
  const xT = -half - 0.15
  const sprockets: { spin: THREE.Group; ratio: number }[] = []
  let beltTex: THREE.Texture | null = null
  if (n === 4) {
    const crankS = gearShape(0.24, 20, 0.035)
    crankS.holes.push(circle(0, 0, 0.1))
    const camS = gearShape(0.48, 40, 0.035)
    camS.holes.push(circle(0, 0, 0.12))
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2
      camS.holes.push(circle(Math.cos(a) * 0.29, Math.sin(a) * 0.29, 0.085))
    }
    const mk = (shape: THREE.Shape, y: number, z: number, ratio: number) => {
      const spin = new THREE.Group()
      spin.position.set(xT, y, z)
      timing.group.add(spin)
      add(timing, extrude(shape, 0.18, SHAPE_YZ_TO_X, 16), mats.steel, { parent: spin })
      add(timing, rod(ratio === 1 ? 0.12 : 0.16, 0.06, 32), mats.machined, { parent: spin, at: [-0.11, 0, 0] })
      add(timing, rod(0.055, 0.05, 6), mats.darkSteel, { parent: spin, at: [-0.16, 0, 0] })
      sprockets.push({ spin, ratio })
    }
    mk(crankS, 0, 0, 1)
    mk(camS, CAM_Y, CAM_Z, 0.5)
    mk(camS, CAM_Y, -CAM_Z, 0.5)
    const { pts, nrm } = beltLoop([
      { c: new THREE.Vector2(0, 0), r: 0.245 },
      { c: new THREE.Vector2(CAM_Z, CAM_Y), r: 0.485 },
      { c: new THREE.Vector2(-CAM_Z, CAM_Y), r: 0.485 },
    ])
    const { geometry, length } = ribbonGeometry(pts, nrm, 0.15, 0.035)
    geometry.translate(xT, 0, 0)
    const beltMesh = add(timing, geometry, mats.belt)
    const bm = beltMesh.material as THREE.MeshStandardMaterial
    if (bm.map) {
      beltTex = bm.map.clone()
      beltTex.wrapS = THREE.RepeatWrapping
      beltTex.repeat.set(length / 0.075, 1)
      beltTex.needsUpdate = true
      bm.map = beltTex
    }
  }

  /* ---------- accessory drive: serpentine belt, water pump, alternator ---------- */

  const xA = -half - 0.56 // plane of the crank pulley
  const accSpins: { spin: THREE.Group; ratio: number }[] = []
  const ribbed = (r: number, w: number) => {
    const p: [number, number][] = [[0.06, -w / 2]]
    const k = 7
    for (let i = 0; i <= k; i++) p.push([i % 2 ? r - 0.025 : r, -w / 2 + (i * w) / k])
    p.push([0.06, w / 2])
    return yToX(lathe(p, 56))
  }
  const accPulley = (h: PartHandle, geo: THREE.BufferGeometry, z: number, y: number, ratio: number, mat = mats.darkSteel) => {
    const spin = new THREE.Group()
    spin.position.set(xA, y, z)
    h.group.add(spin)
    add(h, geo, mat, { parent: spin })
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2
      add(h, rod(0.022, 0.03, 6), mats.machined, { parent: spin, at: [-0.1, Math.cos(a) * 0.07, Math.sin(a) * 0.07] })
    }
    accSpins.push({ spin, ratio })
    return spin
  }
  const CRANK_P = 0.43
  const WP = { z: 0.15, y: 1.45, r: 0.26 }
  const ALT = { z: -1.18, y: 1.95, r: 0.17 }
  const TEN = { z: 0.62, y: 0.85, r: 0.13 }
  const pump = part('water-pump', [-1.6, 0, 0.3])
  const alt = part('alternator', [-1.3, 0.25, -1.1])
  const accBelt = part('accessory-belt', [-2.2, 0, 0])
  if (n === 4) {
    // water pump: housing bolted to the block face, inside the timing-belt loop
    const housing = yToX(
      lathe(
        [
          [0, -0.44],
          [0.09, -0.44],
          [0.15, -0.32],
          [0.19, -0.14],
          [0.3, -0.06],
          [0.31, 0],
          [0, 0],
        ],
        48,
      ),
    )
    add(pump, housing, mats.castAlu, { at: [-half, WP.y, WP.z] })
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4
      add(pump, rod(0.03, 0.05, 6), mats.darkSteel, {
        at: [-half - 0.08, WP.y + Math.cos(a) * 0.25, WP.z + Math.sin(a) * 0.25],
      })
    }
    add(pump, rod(0.11, 0.06, 32), mats.machined, { at: [xA + 0.12, WP.y, WP.z] })
    accPulley(pump, ribbed(WP.r, 0.16), WP.z, WP.y, CRANK_P / WP.r)

    // alternator: finned case, cooling fan and a small pulley that spins fastest of all
    const caseGeo = yToX(
      lathe(
        [
          [0, -0.24],
          [0.22, -0.24],
          [0.28, -0.19],
          [0.3, -0.1],
          [0.3, 0.14],
          [0.26, 0.21],
          [0.12, 0.24],
          [0, 0.24],
        ],
        48,
      ),
    )
    add(alt, caseGeo, mats.castAlu, { at: [-half - 0.2, ALT.y, ALT.z] })
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2
      add(alt, new THREE.BoxGeometry(0.3, 0.03, 0.03), mats.castAlu, {
        at: [-half - 0.22, ALT.y + Math.cos(a) * 0.305, ALT.z + Math.sin(a) * 0.305],
      }).rotation.x = -a
    }
    add(alt, new THREE.CylinderGeometry(0.035, 0.035, 0.1, 10), mats.brass, { at: [-half + 0.06, ALT.y + 0.24, ALT.z] })
    // mounting lugs and the bracket bar that ties them to the side of the block
    for (const dx of [-0.02, -0.36]) {
      add(alt, new THREE.BoxGeometry(0.1, 0.12, 0.3), mats.castAlu, { at: [-half + dx, ALT.y - 0.2, ALT.z + 0.18] })
    }
    add(alt, new THREE.BoxGeometry(0.46, 0.1, 0.1), mats.castAlu, { at: [-half - 0.19, ALT.y - 0.2, -HW_BLOCK - 0.05] })
    const fanSpin = new THREE.Group()
    fanSpin.position.set(-half - 0.48, ALT.y, ALT.z)
    alt.group.add(fanSpin)
    const fan = gearShape(0.25, 12, 0.07)
    fan.holes.push(circle(0, 0, 0.07))
    add(alt, extrude(fan, 0.035, SHAPE_YZ_TO_X, 8), mats.darkSteel, { parent: fanSpin })
    accSpins.push({ spin: fanSpin, ratio: CRANK_P / ALT.r })
    accPulley(alt, ribbed(ALT.r, 0.16), ALT.z, ALT.y, CRANK_P / ALT.r)

    // automatic tensioner keeps the belt tight
    const pivot = { z: 0.78, y: 0.36 }
    add(accBelt, rod(0.12, 0.2, 32), mats.castAlu, { at: [-half - 0.1, pivot.y, pivot.z] })
    add(accBelt, rod(0.05, 0.42, 16), mats.darkSteel, { at: [-half - 0.22, pivot.y, pivot.z] })
    add(
      accBelt,
      tube(
        [
          [xA + 0.12, pivot.y, pivot.z],
          [xA + 0.12, (pivot.y + TEN.y) / 2, (pivot.z + TEN.z) / 2 + 0.03],
          [xA + 0.12, TEN.y, TEN.z],
        ],
        0.05,
        12,
        12,
      ),
      mats.castAlu,
    )
    accPulley(
      accBelt,
      yToX(
        lathe(
          [
            [0.05, -0.085],
            [TEN.r - 0.01, -0.085],
            [TEN.r, -0.07],
            [TEN.r, 0.07],
            [TEN.r - 0.01, 0.085],
            [0.05, 0.085],
          ],
          40,
        ),
      ),
      TEN.z,
      TEN.y,
      CRANK_P / TEN.r,
      mats.machined,
    )
    const loop = beltLoop([
      { c: new THREE.Vector2(0, 0), r: CRANK_P },
      { c: new THREE.Vector2(TEN.z, TEN.y), r: TEN.r },
      { c: new THREE.Vector2(WP.z, WP.y), r: WP.r },
      { c: new THREE.Vector2(ALT.z, ALT.y), r: ALT.r },
    ])
    const rib = ribbonGeometry(loop.pts, loop.nrm, 0.15, 0.04)
    rib.geometry.translate(xA, 0, 0)
    add(accBelt, rib.geometry, mats.rubber)
  }

  /* ---------- spark plugs ---------- */

  const plugs = part('spark-plugs', [0, HEAD_UP, 0])
  {
    const insulator: [number, number][] = [
      [0, 0.3],
      [0.052, 0.3],
    ]
    for (let k = 0; k < 6; k++) {
      insulator.push([0.062, 0.33 + k * 0.05], [0.052, 0.355 + k * 0.05])
    }
    insulator.push([0.045, 0.66], [0.034, 0.74], [0, 0.74])
    const insGeo = lathe(insulator, 32)
    xs.forEach((x) => {
      const g = new THREE.Group()
      g.position.set(x, PLUG_Y, 0)
      plugs.group.add(g)
      add(plugs, new THREE.CylinderGeometry(0.06, 0.06, 0.2, 24), mats.nickel, { parent: g, at: [0, 0.12, 0], clip: true })
      add(plugs, new THREE.CylinderGeometry(0.088, 0.088, 0.08, 6), mats.nickel, { parent: g, at: [0, 0.26, 0], clip: true })
      add(plugs, insGeo, mats.ceramic, { parent: g, clip: true })
      add(plugs, new THREE.CylinderGeometry(0.03, 0.03, 0.07, 12), mats.nickel, { parent: g, at: [0, 0.775, 0], clip: true })
      add(plugs, new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), mats.nickel, { parent: g, at: [0, 0.0, 0], clip: true })
      add(plugs, new THREE.BoxGeometry(0.03, 0.06, 0.028), mats.nickel, { parent: g, at: [0.045, 0.01, 0], clip: true })
    })
  }

  /* ---------- ignition coils ---------- */

  const coils = part('ignition-coils', [0, 2.6, 0])
  if (!cutaway) {
    xs.forEach((x) => {
      add(coils, new RoundedBoxGeometry(0.26, 0.3, 0.46, 3, 0.04), mats.plastic, { at: [x, 4.15, 0] })
      add(coils, new THREE.BoxGeometry(0.1, 0.09, 0.13), mats.plastic, { at: [x, 4.19, -0.29] })
      add(coils, new THREE.CylinderGeometry(0.075, 0.075, 0.5, 20), mats.rubber, { at: [x, 3.78, 0] })
      add(coils, new THREE.BoxGeometry(0.2, 0.03, 0.12), mats.plastic, { at: [x + 0.03, 4.02, 0.3] })
    })
  }

  /* ---------- valve cover ---------- */

  const cover = part('valve-cover', [0, 2.0, 0], true)
  {
    add(cover, new RoundedBoxGeometry(2 * half - 0.13, 0.8, 2 * HW_COVER, 4, 0.14), mats.crinkleRed, {
      at: [0.035, HEAD_TOP + 0.4, 0],
      clip: true,
      cap: true,
    })
    if (n === 4) {
      const plate = new THREE.PlaneGeometry(1.9, 0.29)
      plate.rotateX(-Math.PI / 2)
      const m = add(cover, plate, mats.logo, { at: [0.15, HEAD_TOP + 0.802, 0.52] })
      m.castShadow = false
      add(cover, new THREE.CylinderGeometry(0.15, 0.15, 0.08, 32), mats.plastic, { at: [-half + 0.5, HEAD_TOP + 0.84, -0.52] })
      for (let k = 0; k < 8; k++) {
        const x = -half + 0.4 + (k * (2 * half - 0.7)) / 7
        for (const z of [-0.85, 0.85]) {
          add(cover, new THREE.CylinderGeometry(0.035, 0.035, 0.05, 6), mats.machined, { at: [x, HEAD_TOP + 0.81, z] })
        }
      }
    }
  }

  /* ---------- intake manifold + throttle body ---------- */

  const inMan = part('intake-manifold', [0, HEAD_UP, -1.1])
  const plenumY = 3.55
  const plenumZ = -1.88
  {
    add(inMan, new THREE.BoxGeometry(2 * half - 0.2, 0.38, 0.08), mats.castAlu, { at: [0, 2.78, -HW_HEAD - 0.04], clip: true, cap: true })
    xs.forEach((x) => {
      add(
        inMan,
        tube(
          [
            [x, 2.78, -1.0],
            [x, 2.86, -1.36],
            [x, 3.18, -1.72],
            [x, plenumY - 0.08, plenumZ + 0.04],
          ],
          0.15,
        ),
        mats.castAlu,
        { clip: true },
      )
      // fuel injector into each runner
      add(inMan, new THREE.CylinderGeometry(0.045, 0.045, 0.3, 16), mats.plastic, { at: [x, 3.05, -1.18], clip: true })
    })
    const L = 2 * half - 0.1
    add(
      inMan,
      yToX(
        lathe(
          [
            [0, -L / 2],
            [0.18, -L / 2],
            [0.3, -L / 2 + 0.1],
            [0.34, -L / 2 + 0.28],
            [0.34, L / 2 - 0.2],
            [0.27, L / 2 - 0.05],
            [0.12, L / 2],
            [0, L / 2],
          ],
          48,
        ),
      ),
      mats.castAlu,
      { at: [0.05, plenumY, plenumZ], clip: true, cap: true },
    )
    add(inMan, rod(0.06, 2 * half - 0.3, 16), mats.machined, { at: [0, 3.22, -1.18], clip: true })
  }
  const tb = part('throttle-body', [0, HEAD_UP, -1.1])
  const butterfly = new THREE.Group()
  {
    const x0 = -half - 0.22
    add(tb, rod(0.27, 0.32, 48, true), mats.castAlu, { at: [x0, plenumY, plenumZ], clip: true })
    for (const dx of [-0.16, 0.16]) {
      add(tb, rod(0.32, 0.04, 48), mats.castAlu, { at: [x0 + dx, plenumY, plenumZ], clip: true })
    }
    butterfly.position.set(x0, plenumY, plenumZ)
    tb.group.add(butterfly)
    add(tb, rod(0.255, 0.014, 40), mats.machined, { parent: butterfly, clip: true })
    butterfly.rotation.z = 0.28
    add(tb, new THREE.CylinderGeometry(0.022, 0.022, 0.62, 12), mats.steel, {
      parent: butterfly,
      at: [0, 0, 0],
      clip: true,
    }).rotation.x = Math.PI / 2
    add(tb, new RoundedBoxGeometry(0.2, 0.34, 0.2, 3, 0.04), mats.plastic, { at: [x0, plenumY, plenumZ - 0.4], clip: true })
  }

  /* ---------- exhaust manifold ---------- */

  const exMan = part('exhaust-manifold', [0, HEAD_UP, 1.2])
  {
    add(exMan, new THREE.BoxGeometry(2 * half - 0.2, 0.34, 0.08), mats.steel, { at: [0, 2.7, HW_HEAD + 0.04], clip: true, cap: true })
    const cx = n === 4 ? 0.45 : 0
    xs.forEach((x, i) => {
      const k = n === 4 ? (i - 1.5) * 0.13 : 0
      add(
        exMan,
        tube(
          [
            [x, 2.7, 1.0],
            [x, 2.66, 1.36],
            [x * 0.55 + cx * 0.45, 2.05, 1.68],
            [cx + k, 1.35, 1.76],
            [cx + k * 0.4, 1.02, 1.76],
          ],
          0.12,
          56,
          18,
        ),
        mats.exhaust,
        { clip: true },
      )
    })
    add(
      exMan,
      lathe(
        [
          [0.2, -0.42],
          [0.21, -0.22],
          [0.29, 0.02],
          [0.33, 0.2],
        ],
        40,
      ),
      mats.collector,
      { at: [cx, 0.86, 1.76], clip: true },
    )
    add(
      exMan,
      tube(
        [
          [cx, 0.46, 1.76],
          [cx, -0.3, 1.76],
          [cx + 0.35, -0.82, 1.76],
          [cx + 1.3, -0.98, 1.76],
        ],
        0.2,
        40,
        24,
      ),
      mats.collector,
      { clip: true },
    )
    add(exMan, new THREE.CylinderGeometry(0.05, 0.05, 0.22, 12), mats.nickel, { at: [cx + 0.26, 0.7, 1.76] }).rotation.z = Math.PI / 2
  }

  /* ---------- cutaway extras: gas, flame, spark light ---------- */

  let gas: THREE.Mesh | null = null
  let flame: THREE.Mesh | null = null
  let sparkLight: THREE.PointLight | null = null
  if (cutaway) {
    const gasGeo = new THREE.CylinderGeometry(0.426, 0.426, 1, 48, 1, false)
    gasGeo.translate(0, 0.5, 0)
    gas = new THREE.Mesh(
      gasGeo,
      new THREE.MeshBasicMaterial({ color: 0xaab7c2, transparent: true, opacity: 0.2, depthWrite: false, clippingPlanes: clipPlanes }),
    )
    root.add(gas)
    flame = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 16),
      new THREE.MeshBasicMaterial({ color: 0xf2b46b, transparent: true, opacity: 0, depthWrite: false, clippingPlanes: clipPlanes }),
    )
    flame.position.set(0, PLUG_Y + 0.02, 0)
    root.add(flame)
    sparkLight = new THREE.PointLight(0xffb36a, 0, 3, 2)
    sparkLight.position.set(0.2, PLUG_Y - 0.05, 0)
    root.add(sparkLight)
  }

  /* ---------- motion ---------- */

  let lastIn = 0
  let lastEx = 0
  const tmp = new THREE.Vector3()
  const gasColor = new THREE.Color()
  const cIntake = new THREE.Color(0xaab7c2)
  const cBurn = new THREE.Color(0xd98a3e)
  const cSmoke = new THREE.Color(0x6f6a64)

  const update = (theta: number) => {
    crankSpin.rotation.x = theta
    flySpin.rotation.x = theta
    const deg = theta / D2R
    xs.forEach((_, i) => {
      const b = theta - pinPhase[i]
      const yc = R * Math.cos(b)
      const zc = R * Math.sin(b)
      const yp = yc + Math.sqrt(ROD * ROD - zc * zc)
      pistonObjs[i].position.y = yp
      rodObjs[i].position.y = yc
      rodObjs[i].position.z = zc
      rodObjs[i].rotation.x = Math.atan2(-zc, yp - yc)
    })
    camSpins.forEach((s) => (s.rotation.x = theta / 2))
    sprockets.forEach((s) => (s.spin.rotation.x = theta * s.ratio))
    accSpins.forEach((s) => (s.spin.rotation.x = theta * s.ratio))
    if (beltTex) beltTex.offset.x = ((theta * 0.245) / 0.075) % 1

    valves.forEach((v) => {
      const a = deg - fireAt[v.cyl]
      const L = v.intake
        ? valveLift(a, profile.inOpen, profile.inClose, profile.lift)
        : valveLift(a, profile.exOpen, profile.exClose, profile.lift)
      if (v.cyl === 0) {
        if (v.intake) lastIn = L
        else lastEx = L
      }
      tmp.copy(v.base).addScaledVector(v.axis, -L)
      v.valve.position.copy(tmp)
      v.spring.position.copy(v.base).addScaledVector(v.axis, SEAT_D)
      v.spring.scale.y = RET_D - L - SEAT_D
      v.retainer.position.copy(v.base).addScaledVector(v.axis, RET_D - L + 0.02)
      v.bucket.position.copy(v.base).addScaledVector(v.axis, BUCKET_D - L + BUCKET_H / 2)
    })

    if (gas && flame && sparkLight) {
      const alpha = (((deg - fireAt[0]) % 720) + 720) % 720
      const crown = pistonObjs[0].position.y + 0.31
      gas.position.y = crown
      gas.scale.y = Math.max(0.01, DECK + 0.02 - crown)
      const gm = gas.material as THREE.MeshBasicMaterial
      if (alpha < 180) {
        const u = alpha / 180
        gasColor.copy(cBurn).lerp(cSmoke, Math.min(1, u * 1.3))
        gm.opacity = 0.42 - u * 0.12
      } else if (alpha < 360) {
        gasColor.copy(cSmoke)
        gm.opacity = 0.3 - ((alpha - 180) / 180) * 0.18
      } else if (alpha < 540) {
        gasColor.copy(cIntake)
        gm.opacity = 0.1 + ((alpha - 360) / 180) * 0.1
      } else {
        gasColor.copy(cIntake)
        gm.opacity = 0.2 + ((alpha - 540) / 180) * 0.16
      }
      gm.color.copy(gasColor)
      // spark 20° before top dead centre, flame front grows through the first 40° of the power stroke
      const f = alpha >= 700 ? alpha - 720 : alpha
      const fm = flame.material as THREE.MeshBasicMaterial
      if (f >= -20 && f < 45) {
        const u = (f + 20) / 65
        flame.scale.setScalar(0.04 + u * 0.36)
        fm.opacity = 0.85 * (1 - u) ** 1.4
        fm.color.setHex(f < -12 ? 0xfff1d6 : 0xf2b46b)
        sparkLight.intensity = 3.2 * (1 - u)
      } else {
        fm.opacity = 0
        sparkLight.intensity = 0
      }
    }
  }

  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
  const setExplode = (t: number) => {
    const e = ease(Math.min(1, Math.max(0, t)))
    parts.forEach((h) => h.group.position.copy(h.explode).multiplyScalar(e))
  }

  const setOpacity = (id: PartId, o: number) => {
    const h = parts.get(id)
    if (!h || Math.abs(h.opacity - o) < 0.002) return
    h.opacity = o
    const solid = o > 0.995
    h.mats.forEach((m) => {
      const transparent = !solid || m.userData.baseTransparent === true
      if (m.transparent !== transparent) {
        m.transparent = transparent
        m.needsUpdate = true
      }
      m.opacity = o * (m.userData.baseOpacity ?? 1)
      m.depthWrite = solid && m.userData.baseTransparent !== true ? true : o > 0.6 && m.userData.baseTransparent !== true
    })
    h.meshes.forEach((mesh) => (mesh.castShadow = o > 0.5))
  }

  update(0)

  return {
    root,
    parts,
    fireAt,
    get profile() {
      return profile
    },
    update,
    setExplode,
    setOpacity,
    setProfile(p) {
      profile = p
      buildLobes()
    },
    lifts: () => ({ intake: lastIn, exhaust: lastEx }),
  }
}

import * as THREE from 'three'

/* Matrices that place an extruded 2D shape into the engine's axes.
   X runs along the crankshaft, Y is up, Z runs across the engine. */

/** shape x → Y, shape y → Z, extrusion → X */
export const SHAPE_YZ_TO_X = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1)
/** shape x → −Z, shape y → Y, extrusion → X */
export const SHAPE_ZY_TO_X = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1)
/** shape x → X, shape y → −Z, extrusion → Y */
export const SHAPE_XZ_TO_Y = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1)

export function extrude(
  shape: THREE.Shape,
  depth: number,
  m: THREE.Matrix4,
  curveSegments = 32,
  bevel = 0,
): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    curveSegments,
    steps: 1,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  })
  g.translate(0, 0, -depth / 2)
  g.applyMatrix4(m)
  return g
}

/** Profile points are [radius, y], listed bottom to top. */
export function lathe(profile: [number, number][], segments = 48): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  )
}

/** Turn a geometry built along +Y so it runs along +X. */
export function yToX<T extends THREE.BufferGeometry>(g: T): T {
  g.rotateZ(-Math.PI / 2)
  return g
}

export function rod(r: number, len: number, segs = 32, open = false): THREE.BufferGeometry {
  return yToX(new THREE.CylinderGeometry(r, r, len, segs, 1, open))
}

export function circle(cx: number, cy: number, r: number): THREE.Path {
  const p = new THREE.Path()
  p.absarc(cx, cy, r, 0, Math.PI * 2, false)
  return p
}

export function rectShape(x0: number, y0: number, x1: number, y1: number): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(x0, y0)
  s.lineTo(x1, y0)
  s.lineTo(x1, y1)
  s.lineTo(x0, y1)
  s.closePath()
  return s
}

export function rectPath(x0: number, y0: number, x1: number, y1: number): THREE.Path {
  const s = new THREE.Path()
  s.moveTo(x0, y0)
  s.lineTo(x1, y0)
  s.lineTo(x1, y1)
  s.lineTo(x0, y1)
  s.closePath()
  return s
}

export function roundedRectShape(x0: number, y0: number, x1: number, y1: number, r: number): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(x0 + r, y0)
  s.lineTo(x1 - r, y0)
  s.quadraticCurveTo(x1, y0, x1, y0 + r)
  s.lineTo(x1, y1 - r)
  s.quadraticCurveTo(x1, y1, x1 - r, y1)
  s.lineTo(x0 + r, y1)
  s.quadraticCurveTo(x0, y1, x0, y1 - r)
  s.lineTo(x0, y0 + r)
  s.quadraticCurveTo(x0, y0, x0 + r, y0)
  return s
}

/** Spur gear / sprocket outline. */
export function gearShape(radius: number, teeth: number, depth: number): THREE.Shape {
  const s = new THREE.Shape()
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const pts: [number, number][] = [
      [radius - depth, a - step * 0.5],
      [radius - depth, a - step * 0.3],
      [radius, a - step * 0.15],
      [radius, a + step * 0.15],
      [radius - depth, a + step * 0.3],
    ]
    pts.forEach(([r, ang], k) => {
      const x = r * Math.cos(ang)
      const y = r * Math.sin(ang)
      if (i === 0 && k === 0) s.moveTo(x, y)
      else s.lineTo(x, y)
    })
  }
  s.closePath()
  return s
}

/** Internal gear teeth as a hole path (teeth point inwards). */
export function internalGearPath(radius: number, teeth: number, depth: number): THREE.Path {
  const p = new THREE.Path()
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const pts: [number, number][] = [
      [radius, a - step * 0.5],
      [radius, a - step * 0.3],
      [radius - depth, a - step * 0.15],
      [radius - depth, a + step * 0.15],
      [radius, a + step * 0.3],
    ]
    pts.forEach(([r, ang], k) => {
      const x = r * Math.cos(ang)
      const y = r * Math.sin(ang)
      if (i === 0 && k === 0) p.moveTo(x, y)
      else p.lineTo(x, y)
    })
  }
  p.closePath()
  return p
}

/** A coil spring of unit length along +Y. */
export function helixGeometry(radius: number, wire: number, coils: number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = []
  const n = Math.round(coils * 28)
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = t * coils * Math.PI * 2
    pts.push(new THREE.Vector3(Math.cos(a) * radius, t, Math.sin(a) * radius))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, wire, 8, false)
}

export function tube(points: [number, number, number][], radius: number, segments = 48, radial = 20): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
  return new THREE.TubeGeometry(curve, segments, radius, radial, false)
}

/* ---------------- timing belt ---------------- */

export type Pulley = { c: THREE.Vector2; r: number }

/** Closed path around pulleys listed counter-clockwise (2D: u = z, v = y). */
export function beltLoop(pulleys: Pulley[], step = 0.03): { pts: THREE.Vector2[]; nrm: THREE.Vector2[] } {
  const n = pulleys.length
  const outA: number[] = []
  const inA: number[] = []
  for (let i = 0; i < n; i++) {
    const A = pulleys[i]
    const B = pulleys[(i + 1) % n]
    const d = B.c.clone().sub(A.c)
    const D = d.length()
    d.divideScalar(D)
    const right = new THREE.Vector2(d.y, -d.x)
    const s = (A.r - B.r) / D
    const c = Math.sqrt(1 - s * s)
    const m = right.multiplyScalar(c).add(d.clone().multiplyScalar(s))
    const ang = Math.atan2(m.y, m.x)
    outA[i] = ang
    inA[(i + 1) % n] = ang
  }
  const pts: THREE.Vector2[] = []
  const nrm: THREE.Vector2[] = []
  for (let i = 0; i < n; i++) {
    const P = pulleys[i]
    const a0 = inA[i]
    let a1 = outA[i]
    while (a1 < a0) a1 += Math.PI * 2
    const arcSteps = Math.max(2, Math.ceil(((a1 - a0) * P.r) / step))
    for (let k = 0; k < arcSteps; k++) {
      const a = a0 + ((a1 - a0) * k) / arcSteps
      const nn = new THREE.Vector2(Math.cos(a), Math.sin(a))
      nrm.push(nn)
      pts.push(P.c.clone().add(nn.clone().multiplyScalar(P.r)))
    }
    const m = new THREE.Vector2(Math.cos(a1), Math.sin(a1))
    const next = pulleys[(i + 1) % n]
    const from = P.c.clone().add(m.clone().multiplyScalar(P.r))
    const to = next.c.clone().add(m.clone().multiplyScalar(next.r))
    const segs = Math.max(1, Math.ceil(from.distanceTo(to) / step))
    for (let k = 0; k < segs; k++) {
      pts.push(from.clone().lerp(to, k / segs))
      nrm.push(m.clone())
    }
  }
  return { pts, nrm }
}

/** Flat belt geometry along a closed 2D path, at x = 0, width along X. Returns its length too. */
export function ribbonGeometry(
  pts: THREE.Vector2[],
  nrm: THREE.Vector2[],
  width: number,
  thick: number,
): { geometry: THREE.BufferGeometry; length: number } {
  const n = pts.length
  const len: number[] = [0]
  for (let i = 1; i <= n; i++) len.push(len[i - 1] + pts[i % n].distanceTo(pts[i - 1]))
  const total = len[n]
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const w = width / 2
  const at = (i: number, off: number, x: number): [number, number, number] => [
    x,
    pts[i].y + nrm[i].y * off,
    pts[i].x + nrm[i].x * off,
  ]
  type Strip = (i: number) => { a: [number, number, number]; b: [number, number, number]; n: [number, number, number] }
  const strip = (fn: Strip) => {
    const base = pos.length / 3
    for (let k = 0; k <= n; k++) {
      const i = k % n
      const { a, b, n: nn } = fn(i)
      pos.push(...a, ...b)
      nor.push(...nn, ...nn)
      uv.push(len[k] / total, 0, len[k] / total, 1)
    }
    for (let k = 0; k < n; k++) {
      const v = base + k * 2
      idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2)
    }
  }
  strip((i) => ({ a: at(i, thick, -w), b: at(i, thick, w), n: [0, nrm[i].y, nrm[i].x] }))
  strip((i) => ({ a: at(i, 0, w), b: at(i, 0, -w), n: [0, -nrm[i].y, -nrm[i].x] }))
  strip((i) => ({ a: at(i, thick, w), b: at(i, 0, w), n: [1, 0, 0] }))
  strip((i) => ({ a: at(i, 0, -w), b: at(i, thick, -w), n: [-1, 0, 0] }))
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return { geometry: g, length: total }
}

/** Connecting rod outline: big end at the origin, small end at (0, length). */
export function rodShape(length: number, big: number, small: number, bigHole: number, smallHole: number): THREE.Shape {
  const s = new THREE.Shape()
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, steps: number, first: boolean) => {
    for (let k = 0; k <= steps; k++) {
      const a = a0 + ((a1 - a0) * k) / steps
      const x = cx + r * Math.cos(a)
      const y = cy + r * Math.sin(a)
      if (first && k === 0) s.moveTo(x, y)
      else s.lineTo(x, y)
    }
  }
  const D = Math.PI / 180
  arc(0, 0, big, 62 * D, -242 * D, 40, true)
  s.quadraticCurveTo(-small * 0.62, length * 0.52, small * Math.cos(200 * D), length + small * Math.sin(200 * D))
  arc(0, length, small, 200 * D, -20 * D, 24, false)
  s.quadraticCurveTo(small * 0.62, length * 0.52, big * Math.cos(62 * D), big * Math.sin(62 * D))
  s.holes.push(circle(0, 0, bigHole), circle(0, length, smallHole))
  return s
}

/** Crank web with counterweight: crankpin at (0, throw) in shape space. */
export function webShape(throwR: number, pinR: number, cwR: number): THREE.Shape {
  const s = new THREE.Shape()
  const D = Math.PI / 180
  for (let k = 0; k <= 24; k++) {
    const a = (-10 + (200 * k) / 24) * D
    const x = pinR * Math.cos(a)
    const y = throwR + pinR * Math.sin(a)
    if (k === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  for (let k = 0; k <= 28; k++) {
    const a = (200 + (140 * k) / 28) * D
    s.lineTo(cwR * Math.cos(a), cwR * Math.sin(a))
  }
  s.closePath()
  return s
}

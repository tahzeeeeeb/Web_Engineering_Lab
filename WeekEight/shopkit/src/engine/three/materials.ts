import * as THREE from 'three'

/* Physically based materials for the engine, plus a few textures
   generated on a canvas at start-up (no image files to load). */

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  return [c, ctx]
}

/** Grey value noise built from a few smoothed random layers. */
function noiseCanvas(size: number, cells: number[], seed: number): HTMLCanvasElement {
  const [c, ctx] = canvas(size, size)
  const rand = rng(seed)
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)
  ctx.imageSmoothingEnabled = true
  cells.forEach((n, layer) => {
    const [s, sc] = canvas(n, n)
    const img = sc.createImageData(n, n)
    for (let i = 0; i < n * n; i++) {
      const v = Math.floor(rand() * 255)
      img.data[i * 4] = v
      img.data[i * 4 + 1] = v
      img.data[i * 4 + 2] = v
      img.data[i * 4 + 3] = 255
    }
    sc.putImageData(img, 0, 0)
    ctx.globalAlpha = layer === 0 ? 0.6 : 0.45
    ctx.drawImage(s, 0, 0, size, size)
  })
  ctx.globalAlpha = 1
  return c
}

function tex(c: HTMLCanvasElement, repeat: number, srgb = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = 4
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Stainless heat tint along an exhaust primary: straw → bronze → plum → blue → steel. */
function heatTint(): THREE.CanvasTexture {
  const [c, ctx] = canvas(256, 4)
  const g = ctx.createLinearGradient(0, 0, 256, 0)
  g.addColorStop(0, '#b7a274')
  g.addColorStop(0.12, '#b08a52')
  g.addColorStop(0.24, '#8c5a3a')
  g.addColorStop(0.36, '#5f4a64')
  g.addColorStop(0.5, '#4d5f7c')
  g.addColorStop(0.68, '#7d838c')
  g.addColorStop(1, '#8e9196')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 4)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Timing-belt teeth: one tooth per texture repeat. */
function beltTeeth(): THREE.CanvasTexture {
  const [c, ctx] = canvas(32, 32)
  ctx.fillStyle = '#2a2b2e'
  ctx.fillRect(0, 0, 32, 32)
  ctx.fillStyle = '#121314'
  ctx.fillRect(0, 0, 13, 32)
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fillRect(13, 0, 2, 32)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Raised lettering for the cam cover. */
function logo(text: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(1024, 160)
  ctx.clearRect(0, 0, 1024, 160)
  ctx.font = '700 104px "Saira Condensed", "Arial Narrow", Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#e6e7e9'
  ctx.fillText(text, 512, 84)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export function createMaterials() {
  const fine = tex(noiseCanvas(256, [24, 96, 256], 11), 3)
  const crinkle = tex(noiseCanvas(512, [160, 512], 23), 2)
  const M = THREE.MeshStandardMaterial
  const PM = THREE.MeshPhysicalMaterial
  return {
    castAlu: new M({ color: 0x9c9fa3, metalness: 0.8, roughness: 0.6, bumpMap: fine, bumpScale: 1.4 }),
    filter: new M({ color: 0x2f3a48, metalness: 0.4, roughness: 0.45 }),
    machined: new M({ color: 0xd0d3d6, metalness: 1, roughness: 0.28 }),
    steel: new M({ color: 0x9a9da2, metalness: 1, roughness: 0.3 }),
    darkSteel: new M({ color: 0x5c5f64, metalness: 1, roughness: 0.36 }),
    polished: new M({ color: 0xdcdee1, metalness: 1, roughness: 0.14 }),
    piston: new M({ color: 0xc6c8ca, metalness: 0.85, roughness: 0.4, side: THREE.DoubleSide }),
    spring: new M({ color: 0x46484c, metalness: 0.9, roughness: 0.42 }),
    crinkleRed: new PM({
      color: 0x9a140e,
      metalness: 0.06,
      roughness: 0.52,
      bumpMap: crinkle,
      bumpScale: 3,
      clearcoat: 0.45,
      clearcoatRoughness: 0.4,
    }),
    plastic: new M({ color: 0x232426, metalness: 0, roughness: 0.55 }),
    rubber: new M({ color: 0x1c1d1f, metalness: 0, roughness: 0.85 }),
    ceramic: new PM({ color: 0xf0eee8, metalness: 0, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    nickel: new M({ color: 0xbfc1c4, metalness: 1, roughness: 0.26 }),
    belt: new M({ color: 0xffffff, map: beltTeeth(), metalness: 0, roughness: 0.8 }),
    panPaint: new M({ color: 0x2c2d30, metalness: 0.35, roughness: 0.48 }),
    exhaust: new M({ color: 0xffffff, map: heatTint(), metalness: 0.95, roughness: 0.34, side: THREE.DoubleSide }),
    collector: new M({ color: 0x84878c, metalness: 1, roughness: 0.4, side: THREE.DoubleSide }),
    burnt: new M({ color: 0x6b625b, metalness: 0.85, roughness: 0.45 }),
    brass: new M({ color: 0xb38a4c, metalness: 1, roughness: 0.32 }),
    logo: new M({ map: logo('DOHC  16  VALVE'), transparent: true, metalness: 0.9, roughness: 0.28, depthWrite: false }),
    port: new M({ color: 0x3b3531, metalness: 0.15, roughness: 0.92, side: THREE.DoubleSide }),
    sleeve: new M({
      color: 0xc9ccd0,
      metalness: 0.6,
      roughness: 0.35,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    housing: new M({ color: 0xa9adb1, metalness: 0.8, roughness: 0.5, bumpMap: fine, bumpScale: 1 }),
  }
}

export type Materials = ReturnType<typeof createMaterials>

/** Raked gravel for the zen-garden floor: ripples around the engine, straight rake lines beyond. */
export function gravelTextures(): { map: THREE.CanvasTexture; alpha: THREE.CanvasTexture } {
  const S = 1024
  const [c, ctx] = canvas(S, S)
  const rand = rng(7)
  ctx.fillStyle = '#d7d4cd'
  ctx.fillRect(0, 0, S, S)
  for (let i = 0; i < 90000; i++) {
    const v = 175 + rand() * 70
    ctx.fillStyle = `rgba(${v},${v - 2},${v - 8},0.55)`
    const s = 0.8 + rand() * 1.6
    ctx.fillRect(rand() * S, rand() * S, s, s)
  }
  const groove = (draw: () => void) => {
    ctx.lineWidth = 3.2
    ctx.strokeStyle = 'rgba(70,64,56,0.16)'
    draw()
    ctx.stroke()
    ctx.save()
    ctx.translate(0, 2.4)
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255,255,255,0.32)'
    draw()
    ctx.stroke()
    ctx.restore()
  }
  const cx = S / 2
  const cy = S / 2
  const inner = 150
  const outer = 330
  // straight rake lines everywhere, then clear the ripple field
  for (let y = 6; y < S; y += 15) {
    groove(() => {
      ctx.beginPath()
      ctx.moveTo(0, y)
      for (let x = 0; x <= S; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.01 + y) * 0.8)
    })
  }
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, cy, outer * 1.45, outer, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = '#d7d4cd'
  ctx.fillRect(0, 0, S, S)
  for (let i = 0; i < 40000; i++) {
    const v = 175 + rand() * 70
    ctx.fillStyle = `rgba(${v},${v - 2},${v - 8},0.55)`
    const s = 0.8 + rand() * 1.6
    ctx.fillRect(rand() * S, rand() * S, s, s)
  }
  for (let r = inner; r <= outer; r += 15) {
    groove(() => {
      ctx.beginPath()
      ctx.ellipse(cx, cy, r * 1.45, r, 0, 0, Math.PI * 2)
    })
  }
  ctx.restore()
  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8

  const [a, actx] = canvas(256, 256)
  const g = actx.createRadialGradient(128, 128, 40, 128, 128, 128)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.62, '#ffffff')
  g.addColorStop(1, '#000000')
  actx.fillStyle = g
  actx.fillRect(0, 0, 256, 256)
  const alpha = new THREE.CanvasTexture(a)
  return { map, alpha }
}

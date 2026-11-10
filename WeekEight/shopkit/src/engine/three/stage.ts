import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { gravelTextures } from './materials'
import { prefs } from '../ui/prefs'

type V3 = [number, number, number]

export type StageOptions = {
  position: V3
  target: V3
  fov?: number
  ground?: number | null // y of the gravel floor, or null for none
  minDistance?: number
  maxDistance?: number
  autoRotate?: boolean
  zoom?: boolean
  clipping?: boolean
  shadows?: boolean
  shadowExtent?: number
  /** Below this aspect ratio the camera backs off so the subject still fits the width. */
  fitAspect?: number
}

export type Stage = {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  setFrame(fn: (dt: number) => void): void
  /** Slide the rendered view by (x, y) pixels, e.g. to keep the subject clear of a side panel. */
  setViewShift(x: number, y: number): void
  /** How much further back the camera sits because the view is narrow (1 on wide screens). */
  distScale(): number
  pick(clientX: number, clientY: number, root: THREE.Object3D): THREE.Intersection[]
  /** Dark: black-sand garden, cool rim light. Light: pale raked gravel, soft studio light. */
  setTheme(dark: boolean): void
  /** Render now and return the frame as an image, for the katana-cut transitions. */
  snapshot(): string
  dispose(): void
}

export function createStage(canvas: HTMLCanvasElement, o: StageOptions): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.98
  renderer.localClippingEnabled = !!o.clipping
  const shadows = o.shadows ?? true
  renderer.shadowMap.enabled = shadows
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture
  pmrem.dispose()

  const camera = new THREE.PerspectiveCamera(o.fov ?? 30, 1, 0.1, 120)
  camera.position.set(...o.position)

  const controls = new OrbitControls(camera, canvas)
  controls.target.set(...o.target)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.enableZoom = o.zoom ?? true
  controls.minDistance = o.minDistance ?? 4
  controls.maxDistance = o.maxDistance ?? 30
  controls.maxPolarAngle = Math.PI * 0.53
  controls.autoRotate = !!o.autoRotate
  controls.autoRotateSpeed = 0.45
  controls.update()

  // Studio light: soft sky, one warm key casting shadows, one cool fill, and a rim from behind.
  const hemi = new THREE.HemisphereLight(0xf3f1ec, 0x8a857c, 0.55)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xfff6ea, 2.1)
  key.position.set(4.5, 10, 6.5)
  key.castShadow = shadows
  const ext = o.shadowExtent ?? 7
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -ext
  key.shadow.camera.right = ext
  key.shadow.camera.top = ext
  key.shadow.camera.bottom = -ext
  key.shadow.camera.near = 1
  key.shadow.camera.far = 32
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.025
  key.shadow.radius = 3
  scene.add(key)
  const fill = new THREE.DirectionalLight(0xdfe6ef, 0.55)
  fill.position.set(-7, 4, -5)
  scene.add(fill)
  const rim = new THREE.DirectionalLight(0xd9e2ff, 0.5)
  rim.position.set(2, 6, -10)
  scene.add(rim)

  let ground: THREE.Mesh | null = null
  if (o.ground !== undefined && o.ground !== null) {
    const { map, alpha } = gravelTextures()
    const mat = new THREE.MeshStandardMaterial({
      map,
      bumpMap: map,
      bumpScale: 2,
      alphaMap: alpha,
      transparent: true,
      roughness: 1,
      metalness: 0,
      depthWrite: false,
    })
    ground = new THREE.Mesh(new THREE.CircleGeometry(13, 96), mat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = o.ground
    ground.receiveShadow = true
    ground.renderOrder = -1
    scene.add(ground)
  }

  // Size to the canvas' box
  const parent = canvas.parentElement ?? canvas
  let vw = 1
  let vh = 1
  let shiftX = 0
  let shiftY = 0
  const applyShift = () => {
    if (Math.abs(shiftX) < 0.5 && Math.abs(shiftY) < 0.5) camera.clearViewOffset()
    else camera.setViewOffset(vw, vh, shiftX, shiftY, vw, vh)
  }
  let scale = 1
  const resize = () => {
    vw = Math.max(1, parent.clientWidth)
    vh = Math.max(1, parent.clientHeight)
    renderer.setSize(vw, vh, false)
    camera.aspect = vw / vh
    applyShift()
    camera.updateProjectionMatrix()
    const next = o.fitAspect ? Math.max(1, o.fitAspect / camera.aspect) : 1
    if (Math.abs(next - scale) > 0.001) {
      const off = camera.position.clone().sub(controls.target).multiplyScalar(next / scale)
      camera.position.copy(controls.target).add(off)
      controls.maxDistance = (o.maxDistance ?? 30) * next
      scale = next
    }
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(parent)

  // Only render while on screen
  let visible = true
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible) kick()
  })
  io.observe(canvas)

  let frameFn: (dt: number) => void = () => {}
  let raf = 0
  let last = performance.now()
  const loop = (now: number) => {
    raf = 0
    if (!visible || document.hidden) return
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    frameFn(dt)
    controls.update()
    renderer.render(scene, camera)
    raf = requestAnimationFrame(loop)
  }
  const kick = () => {
    if (raf) return
    last = performance.now()
    raf = requestAnimationFrame(loop)
  }
  const onVis = () => {
    if (!document.hidden) kick()
  }
  document.addEventListener('visibilitychange', onVis)
  kick()

  const setTheme = (dark: boolean) => {
    renderer.toneMappingExposure = dark ? 1.08 : 0.98
    scene.environmentIntensity = dark ? 0.75 : 1
    hemi.color.setHex(dark ? 0xc4c9d2 : 0xf3f1ec)
    hemi.groundColor.setHex(dark ? 0x141416 : 0x8a857c)
    hemi.intensity = dark ? 0.32 : 0.55
    key.color.setHex(dark ? 0xfff1e0 : 0xfff6ea)
    key.intensity = dark ? 2.5 : 2.1
    fill.intensity = dark ? 0.3 : 0.55
    rim.intensity = dark ? 2.6 : 0.5
    if (ground) {
      const m = ground.material as THREE.MeshStandardMaterial
      m.color.setHex(dark ? 0x2c2c31 : 0xffffff)
    }
    // draw straight away so the theme cut reveals the new lighting, not last frame's
    if (visible) renderer.render(scene, camera)
    kick()
  }
  setTheme(prefs.get().theme === 'dark')
  let theme = prefs.get().theme
  const unsubTheme = prefs.subscribe(() => {
    if (prefs.get().theme === theme) return
    theme = prefs.get().theme
    setTheme(theme === 'dark')
  })

  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()

  return {
    renderer,
    scene,
    camera,
    controls,
    setFrame(fn) {
      frameFn = fn
    },
    distScale: () => scale,
    setViewShift(x, y) {
      if (Math.abs(x - shiftX) < 0.25 && Math.abs(y - shiftY) < 0.25) return
      shiftX = x
      shiftY = y
      applyShift()
    },
    setTheme,
    snapshot() {
      renderer.render(scene, camera)
      return canvas.toDataURL('image/webp', 0.88)
    },
    pick(clientX, clientY, root) {
      const r = canvas.getBoundingClientRect()
      ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      return raycaster.intersectObject(root, true).filter((h) => h.object.visible && h.object.userData.part)
    },
    dispose() {
      cancelAnimationFrame(raf)
      unsubTheme()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      controls.dispose()
      if (ground) {
        ground.geometry.dispose()
        const m = ground.material as THREE.MeshStandardMaterial
        m.map?.dispose()
        m.alphaMap?.dispose()
        m.dispose()
      }
      envRT.dispose()
      renderer.dispose()
    },
  }
}

/** Free every geometry, material and texture under an object. */
export function disposeTree(root: THREE.Object3D): void {
  const mats = new Set<THREE.Material>()
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh) {
      mesh.geometry.dispose()
      const m = mesh.material
      if (Array.isArray(m)) m.forEach((x) => mats.add(x))
      else mats.add(m)
    }
  })
  mats.forEach((m) => {
    const sm = m as THREE.MeshStandardMaterial
    sm.map?.dispose()
    sm.bumpMap?.dispose()
    m.dispose()
  })
}

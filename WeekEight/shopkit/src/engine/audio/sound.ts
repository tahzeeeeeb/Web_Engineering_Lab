import { prefs } from '../ui/prefs'
import type { FirePattern } from '../three/layoutRig'

/* Every sound on the site is synthesised here with the Web Audio API: no audio files.
   Browsers only allow sound after the visitor has clicked or pressed a key, so nothing
   plays until then, and nothing plays at all while sound is switched off. */

let ctx: AudioContext | null = null
let bus: GainNode | null = null
let unlocked = false
let noiseBuf: AudioBuffer | null = null

type Syncable = { sync(): void }
const voices = new Set<Syncable>()

const GESTURES = ['pointerdown', 'pointerup', 'keydown', 'touchend', 'click'] as const

function onGesture() {
  unlocked = true
  const c = audio()
  if (c && c.state === 'running') GESTURES.forEach((g) => window.removeEventListener(g, onGesture, true))
  voices.forEach((v) => v.sync())
}

if (typeof window !== 'undefined') {
  GESTURES.forEach((g) => window.addEventListener(g, onGesture, true))
  document.addEventListener('visibilitychange', () => voices.forEach((v) => v.sync()))
  prefs.subscribe(() => {
    if (prefs.get().sound) audio()
    else if (ctx && ctx.state === 'running') void ctx.suspend()
    voices.forEach((v) => v.sync())
  })
}

function audio(): AudioContext | null {
  if (!unlocked || !prefs.get().sound) return null
  if (!ctx) {
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -16
    comp.knee.value = 12
    comp.ratio.value = 4
    comp.attack.value = 0.004
    comp.release.value = 0.2
    bus = ctx.createGain()
    bus.gain.value = 0.8
    bus.connect(comp)
    comp.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noise(c: AudioContext): AudioBuffer {
  if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

const env = (p: AudioParam, t: number, peak: number, attack: number, decay: number) => {
  p.setValueAtTime(0.0001, t)
  p.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack)
  p.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

/** A blade cutting the air, then the ring of steel. */
export function playSlash(strength = 1) {
  const c = audio()
  if (!c || !bus) return
  const t = c.currentTime + 0.005
  const n = c.createBufferSource()
  n.buffer = noise(c)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.3
  bp.frequency.setValueAtTime(650, t)
  bp.frequency.exponentialRampToValueAtTime(5600, t + 0.1)
  bp.frequency.exponentialRampToValueAtTime(1700, t + 0.3)
  const g = c.createGain()
  env(g.gain, t, 0.6 * strength, 0.07, 0.24)
  const pan = c.createStereoPanner()
  pan.pan.setValueAtTime(-0.7, t)
  pan.pan.linearRampToValueAtTime(0.7, t + 0.26)
  n.connect(bp).connect(g).connect(pan).connect(bus)
  n.start(t, Math.random() * 0.5)
  n.stop(t + 0.36)

  const hit = t + 0.085
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 1100
  const ringPan = c.createStereoPanner()
  ringPan.pan.value = 0.35
  hp.connect(ringPan).connect(bus)
  const partials: [number, number][] = [
    [1870, 1],
    [2963, 0.62],
    [4711, 0.4],
    [6229, 0.24],
    [7988, 0.14],
  ]
  partials.forEach(([f, a], i) => {
    const o = c.createOscillator()
    o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.012)
    const og = c.createGain()
    env(og.gain, hit, 0.11 * a * strength, 0.003, 1.15 / (1 + i * 0.7))
    o.connect(og).connect(hp)
    o.start(hit)
    o.stop(hit + 1.2)
  })
}

/** A small, dry click, like a tsuba seating against its scabbard. */
export function playTick(strength = 1) {
  const c = audio()
  if (!c || !bus) return
  const t = c.currentTime + 0.002
  const o = c.createOscillator()
  o.type = 'triangle'
  o.frequency.setValueAtTime(2600, t)
  o.frequency.exponentialRampToValueAtTime(820, t + 0.03)
  const g = c.createGain()
  env(g.gain, t, 0.12 * strength, 0.002, 0.05)
  o.connect(g).connect(bus)
  o.start(t)
  o.stop(t + 0.07)
}

/** The soft thump of one combustion, for the slow single-cylinder cutaway. */
export function playThump(strength = 1) {
  const c = audio()
  if (!c || !bus) return
  const t = c.currentTime + 0.002
  const o = c.createOscillator()
  o.frequency.setValueAtTime(110, t)
  o.frequency.exponentialRampToValueAtTime(36, t + 0.2)
  const g = c.createGain()
  env(g.gain, t, 0.55 * strength, 0.004, 0.3)
  o.connect(g).connect(bus)
  o.start(t)
  o.stop(t + 0.34)
  const n = c.createBufferSource()
  n.buffer = noise(c)
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 900
  const ng = c.createGain()
  env(ng.gain, t, 0.3 * strength, 0.002, 0.09)
  n.connect(lp).connect(ng).connect(bus)
  n.start(t, Math.random() * 0.5)
  n.stop(t + 0.12)
}

/* ---------------- engine voice ---------------- */

const REF = 3000 // the buffer is synthesised at this speed; playbackRate scales it to any rpm

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

/** Forty engine cycles of exhaust pulses, one per firing event, panned by bank. Loops seamlessly. */
function synth(c: AudioContext, p: FirePattern): AudioBuffer {
  const sr = c.sampleRate
  const cycle = 120 / REF // seconds for 720° of crank rotation
  const NC = 40
  const len = Math.round(cycle * NC * sr)
  const buf = c.createBuffer(2, len, sr)
  const L = buf.getChannelData(0)
  const R = buf.getChannelData(1)
  const rand = rng(p.angles.length * 7919 + 13)
  const cylGain = p.angles.map(() => 0.82 + rand() * 0.36)
  const cylTone = p.angles.map(() => 0.94 + rand() * 0.12)
  const f1 = p.sharp ? 290 : 168
  const tau1 = p.sharp ? 0.0024 : 0.0045
  const tauN = p.sharp ? 0.0042 : 0.0022
  const pulse = Math.round(0.034 * sr)
  const TWO_PI = Math.PI * 2
  for (let k = 0; k < NC; k++) {
    p.angles.forEach((ang, i) => {
      const t0 = ((k * 720 + ang) / 720) * cycle + (rand() - 0.5) * 0.00025
      const s0 = Math.round(t0 * sr)
      const amp = cylGain[i] * (0.86 + rand() * 0.28)
      const pan = p.pans[i] ?? 0
      const gl = Math.cos(((pan + 1) * Math.PI) / 4)
      const gr = Math.sin(((pan + 1) * Math.PI) / 4)
      const f = f1 * cylTone[i]
      const ph = rand() * 0.8
      for (let j = 0; j < pulse; j++) {
        const t = j / sr
        const attack = t < 0.0004 ? t / 0.0004 : 1
        const v =
          attack *
          amp *
          (0.9 * Math.sin(TWO_PI * f * t + ph) * Math.exp(-t / tau1) +
            0.6 * Math.sin(TWO_PI * 56 * t) * Math.exp(-t / 0.009) +
            0.32 * Math.sin(TWO_PI * f * 2.71 * t) * Math.exp(-t / 0.0015) +
            0.3 * (rand() * 2 - 1) * Math.exp(-t / tauN))
        const idx = (s0 + j) % len
        L[idx] += v * gl
        R[idx] += v * gr
      }
    })
  }
  let peak = 0
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
  const norm = peak > 0 ? 0.62 / peak : 1
  for (let i = 0; i < len; i++) {
    L[i] *= norm
    R[i] *= norm
  }
  return buf
}

function tanhCurve(k: number): Float32Array<ArrayBuffer> {
  const n = 1024
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1
    out[i] = Math.tanh(k * x) / Math.tanh(k)
  }
  return out
}

export type EngineVoice = {
  setPattern(p: FirePattern): void
  setRpm(rpm: number): void
  setActive(on: boolean): void
  dispose(): void
}

/** A continuous engine note whose rhythm comes from the real firing order. */
export function createEngineVoice(level = 1): EngineVoice {
  let pattern: FirePattern | null = null
  let buffer: AudioBuffer | null = null
  let rpm = 1000
  let active = false
  let src: AudioBufferSourceNode | null = null
  let chain: { input: AudioNode; lp: BiquadFilterNode; out: GainNode } | null = null

  const cutoff = (r: number) => 420 + r * 0.55
  const gainFor = (r: number) => level * (0.2 + 0.26 * Math.min(1, r / 8000))

  const graph = (c: AudioContext) => {
    if (chain) return chain
    const shaper = c.createWaveShaper()
    shaper.curve = tanhCurve(1.8)
    shaper.oversample = '2x'
    const peak = c.createBiquadFilter()
    peak.type = 'peaking'
    peak.frequency.value = 110
    peak.Q.value = 0.9
    peak.gain.value = 5
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.Q.value = 0.8
    const out = c.createGain()
    out.gain.value = 0
    shaper.connect(peak).connect(lp).connect(out).connect(bus!)
    chain = { input: shaper, lp, out }
    return chain
  }

  const start = () => {
    const c = audio()
    if (!c || !bus || !pattern || src) return
    if (!buffer || buffer.sampleRate !== c.sampleRate) buffer = synth(c, pattern)
    const g = graph(c)
    const s = c.createBufferSource()
    s.buffer = buffer
    s.loop = true
    s.playbackRate.value = rpm / REF
    s.connect(g.input)
    const t = c.currentTime
    g.lp.frequency.setValueAtTime(cutoff(rpm), t)
    g.out.gain.cancelScheduledValues(t)
    g.out.gain.setValueAtTime(0, t)
    g.out.gain.linearRampToValueAtTime(gainFor(rpm), t + 0.35)
    s.start(t, Math.random() * buffer.duration)
    src = s
  }

  const stop = () => {
    const s = src
    src = null
    if (!s || !ctx || !chain) return
    const t = ctx.currentTime
    chain.out.gain.cancelScheduledValues(t)
    chain.out.gain.setValueAtTime(chain.out.gain.value, t)
    chain.out.gain.linearRampToValueAtTime(0, t + 0.2)
    s.stop(t + 0.25)
  }

  const v: Syncable = {
    sync() {
      const want = active && unlocked && prefs.get().sound && !document.hidden
      if (want && !src) start()
      else if (!want && src) stop()
    },
  }
  voices.add(v)

  return {
    setPattern(p) {
      pattern = p
      buffer = null
      if (src) stop()
      v.sync()
    },
    setRpm(r) {
      rpm = r
      if (src && ctx && chain) {
        const t = ctx.currentTime
        src.playbackRate.setTargetAtTime(r / REF, t, 0.04)
        chain.lp.frequency.setTargetAtTime(cutoff(r), t, 0.05)
        chain.out.gain.setTargetAtTime(gainFor(r), t, 0.08)
      }
    },
    setActive(on) {
      if (on === active) return
      active = on
      v.sync()
    },
    dispose() {
      active = false
      stop()
      voices.delete(v)
    },
  }
}

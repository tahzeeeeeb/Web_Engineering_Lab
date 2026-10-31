/* Mechanical sounds for the wheel and the finish (Web Audio, no files). */

let ctx: AudioContext | null = null
let muted = false

export const setMuted = (m: boolean): void => {
  muted = m
}

function audio(): AudioContext | null {
  if (muted) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function noise(a: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.max(1, Math.floor(a.sampleRate * seconds))
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay
  return buf
}

/** Short click for paddles, rotaries and buttons. */
export function click(freq = 2200, dur = 0.014, gain = 0.04): void {
  navigator.vibrate?.(6)
  const a = audio()
  if (!a) return
  const t = a.currentTime
  const osc = a.createOscillator()
  const amp = a.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(freq, t)
  amp.gain.setValueAtTime(gain, t)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(amp)
  amp.connect(a.destination)
  osc.start(t)
  osc.stop(t + dur + 0.01)
}

/** Two steel poles clashing. */
export function clang(): void {
  navigator.vibrate?.([18, 30, 10])
  const a = audio()
  if (!a) return
  const t = a.currentTime
  const out = a.createGain()
  out.gain.value = 0.08
  out.connect(a.destination)

  const partials: [number, number, number][] = [
    [523, 0.9, 1],
    [1187, 0.65, 0.6],
    [1873, 0.45, 0.45],
    [2731, 0.3, 0.3],
    [3613, 0.2, 0.22],
  ]
  for (const [f, d, g] of partials) {
    const o = a.createOscillator()
    const e = a.createGain()
    o.frequency.value = f * (0.99 + Math.random() * 0.02)
    e.gain.setValueAtTime(g, t)
    e.gain.exponentialRampToValueAtTime(0.0001, t + d)
    o.connect(e)
    e.connect(out)
    o.start(t)
    o.stop(t + d + 0.02)
  }

  const hit = a.createBufferSource()
  hit.buffer = noise(a, 0.09, 3)
  const bp = a.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1800
  const hg = a.createGain()
  hg.gain.value = 1.6
  hit.connect(bp)
  bp.connect(hg)
  hg.connect(out)
  hit.start(t)
}

/** Air rushing past as the flags fly in. */
export function whoosh(dur = 0.75): void {
  const a = audio()
  if (!a) return
  const t = a.currentTime
  const src = a.createBufferSource()
  src.buffer = noise(a, dur, 0.3)
  const bp = a.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.2
  bp.frequency.setValueAtTime(300, t)
  bp.frequency.exponentialRampToValueAtTime(2600, t + dur)
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.09, t + dur * 0.85)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(bp)
  bp.connect(g)
  g.connect(a.destination)
  src.start(t)
}

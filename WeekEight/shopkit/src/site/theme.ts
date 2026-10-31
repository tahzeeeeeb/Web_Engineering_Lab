/* Brake-balance rotary → page darkness.
   Each detent maps linearly to a mix between the light and dark palettes,
   so position 6 of 12 gives a page that is ~45% of the way to dark. */

export const BB_POSITIONS = 12

type RGBA = [number, number, number, number]

const hex = (h: string, a = 1): RGBA => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
  a,
]

const LIGHT: Record<string, RGBA> = {
  '--paper': hex('#e6d3b1'),
  '--sheet': hex('#efe2c6'),
  '--ink': hex('#2b1d14'),
  '--ink-soft': hex('#5a4434'),
  '--rust': hex('#a4441c'),
  '--rust-deep': hex('#6e2a12'),
  '--olive': hex('#4e5f30'),
  '--grid': hex('#a4441c', 0.13),
  '--grid-strong': hex('#a4441c', 0.26),
  '--line': hex('#2b1d14', 0.3),
  '--hole': hex('#e6d3b1'),
}

const DARK: Record<string, RGBA> = {
  '--paper': hex('#1c140f'),
  '--sheet': hex('#291f18'),
  '--ink': hex('#ecdcbf'),
  '--ink-soft': hex('#b9a386'),
  '--rust': hex('#d36c3c'),
  '--rust-deep': hex('#e98b5c'),
  '--olive': hex('#a9bd7c'),
  '--grid': hex('#d36c3c', 0.12),
  '--grid-strong': hex('#d36c3c', 0.22),
  '--line': hex('#ecdcbf', 0.26),
  '--hole': hex('#1c140f'),
}

const mix = (a: RGBA, b: RGBA, t: number) =>
  `rgba(${Math.round(a[0] + (b[0] - a[0]) * t)}, ${Math.round(a[1] + (b[1] - a[1]) * t)}, ${Math.round(
    a[2] + (b[2] - a[2]) * t,
  )}, ${(a[3] + (b[3] - a[3]) * t).toFixed(3)})`

/** t = 0 is full light, t = 1 is full dark. */
export function applyTheme(t: number): void {
  const root = document.documentElement
  for (const key of Object.keys(LIGHT)) {
    root.style.setProperty(key, mix(LIGHT[key], DARK[key], t))
  }
  root.style.setProperty('--dark', t.toFixed(3))
  root.style.colorScheme = t > 0.5 ? 'dark' : 'light'
  root.dataset.dark = t > 0.5 ? '1' : '0'
}

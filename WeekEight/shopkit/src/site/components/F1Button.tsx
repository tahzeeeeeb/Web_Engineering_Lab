import type { ReactNode } from 'react'
import { click } from '../sound'

type Tone = 'rust' | 'olive' | 'ink' | 'amber' | 'teal' | 'cream'
type Size = 'sm' | 'md' | 'round'

type Props = {
  children: ReactNode
  tone?: Tone
  size?: Size
  href?: string
  external?: boolean
  onClick?: () => void
  /** Shows the small status LED; true lights it. */
  active?: boolean
  current?: boolean
  type?: 'button' | 'submit'
  label?: string
  className?: string
}

/** A rusted push button in the style of the ones on an F1 steering wheel. */
export function F1Button({
  children,
  tone = 'rust',
  size = 'md',
  href,
  external,
  onClick,
  active,
  current,
  type = 'button',
  label,
  className = '',
}: Props) {
  const cls = `f1b f1b--${tone} f1b--${size}${active ? ' is-lit' : ''} ${className}`.trim()
  const led = active === undefined ? null : <span className="f1b-led" aria-hidden="true" />
  const cap = <span className="f1b-cap">{children}</span>

  if (href) {
    return (
      <a
        className={cls}
        href={href}
        aria-label={label}
        aria-current={current ? 'page' : undefined}
        onClick={() => {
          click(1500, 0.02, 0.03)
          onClick?.()
        }}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {led}
        {cap}
      </a>
    )
  }
  return (
    <button
      type={type}
      className={cls}
      aria-label={label}
      aria-pressed={active}
      onClick={() => {
        click(1500, 0.02, 0.03)
        onClick?.()
      }}
    >
      {led}
      {cap}
    </button>
  )
}

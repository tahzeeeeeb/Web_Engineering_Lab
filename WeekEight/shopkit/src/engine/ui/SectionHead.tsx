import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Sliced } from './Sliced'
import { Sparkle } from './Ornament'
import { watchVisibility } from './visibility'

type Props = { num: string; sector: string; jp: string; title: string; id: string; children?: ReactNode }

/** Section heading: a chrome blackletter numeral, a sector tag with a kerb stripe,
    a vertical Japanese label and a title cut clean through when it scrolls into view. */
export function SectionHead({ num, sector, jp, title, id, children }: Props) {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return watchVisibility(el, 0.3, (on) => {
      if (on) setInView(true)
    })
  }, [])

  return (
    <header ref={ref} className={`sh${inView ? ' is-in' : ''}`}>
      <div className="sh-side" aria-hidden="true">
        <span className="sh-num">{num}</span>
        <span className="sh-jp" lang="ja">
          {jp}
        </span>
      </div>
      <div className="sh-text">
        <p className="sh-sector">
          <span className="kerb" aria-hidden="true" />
          {sector}
        </p>
        <h2 className="sh-title" id={id}>
          <Sliced text={title} />
          <Sparkle className="sh-spark" />
        </h2>
        {children && <div className="sh-lead">{children}</div>}
      </div>
    </header>
  )
}

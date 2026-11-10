import { useEffect, useId, useRef, useState } from 'react'
import type { Part } from '../data/parts'
import { PARTS } from '../data/parts'
import { Corners } from './Ornament'
import { playTick } from '../audio/sound'

type Props = {
  part: Part
  onClose: () => void
  onStep: (dir: 1 | -1) => void
}

/** What the part is in two lines, then everything about it behind "Show more". */
export function PartPanel({ part, onClose, onStep }: Props) {
  const [more, setMore] = useState(false)
  const [shownFor, setShownFor] = useState(part.id)
  const detailsId = useId()
  const scrollRef = useRef<HTMLDivElement>(null)
  const index = PARTS.findIndex((p) => p.id === part.id)

  // A new part starts with the short version
  if (shownFor !== part.id) {
    setShownFor(part.id)
    setMore(false)
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [part.id])

  return (
    <aside className="pp" aria-live="polite" aria-label={`${part.name} details`}>
      <Corners />
      <span className="pp-slash" key={`s-${part.id}`} aria-hidden="true" />
      <div className="pp-jp" lang="ja" aria-hidden="true" key={`j-${part.id}`}>
        {part.jp}
      </div>
      <div className="pp-body" ref={scrollRef}>
        <div className="pp-top">
          <span className="roundel" aria-label={`Part ${index + 1} of ${PARTS.length}`}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="pp-nav">
            <button type="button" className="pp-icon" onClick={() => onStep(-1)} aria-label="Previous part">
              ‹
            </button>
            <button type="button" className="pp-icon" onClick={() => onStep(1)} aria-label="Next part">
              ›
            </button>
            <button type="button" className="pp-icon" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        </div>

        <div className="pp-cutin" key={part.id}>
          <h2 className="pp-name">{part.name}</h2>
          <p className="pp-short">{part.short}</p>
        </div>

        <button
          type="button"
          className="pp-more"
          aria-expanded={more}
          aria-controls={detailsId}
          onClick={() => {
            playTick()
            setMore((m) => !m)
          }}
        >
          <span>{more ? 'Show less' : 'Show more'}</span>
          <span className="pp-more-mark" aria-hidden="true" />
        </button>

        <div className={`pp-details${more ? ' is-open' : ''}`} id={detailsId}>
          <div>
            {part.details.map((d) => (
              <p key={d}>{d}</p>
            ))}
            <dl className="pp-facts">
              {part.facts.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <div className="pp-track">
              <span className="pp-track-flag" aria-hidden="true" />
              <div>
                <h3>On track</h3>
                <p>{part.track}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

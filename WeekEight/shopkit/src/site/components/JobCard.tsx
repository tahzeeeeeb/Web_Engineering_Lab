import { useId, useState } from 'react'
import type { Project } from '../data'
import { F1Button } from './F1Button'

const statusClass = (s: Project['status']) => (s === 'Built' ? 'built' : s === 'Paused' ? 'paused' : 'wip')

/** A workshop job card: what it is, its state, the parts fitted, and notes behind a flap. */
export function JobCard({ project, compact }: { project: Project; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const notesId = useId()

  return (
    <article className={`job${compact ? ' job--compact' : ''}`}>
      <header className="job-head">
        <span className="job-cat">{project.category}</span>
        <span className={`stamp job-stamp is-${statusClass(project.status)}`}>{project.status}</span>
      </header>
      <h3 className="job-title">{project.title}</h3>
      <p className="job-summary">{project.summary}</p>
      <ul className="job-parts" aria-label="Built with">
        {project.stack.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      {!compact && (
        <>
          <div className={`job-notes${open ? ' is-open' : ''}`} id={notesId}>
            <div>
              <ul>
                {project.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="job-foot">
            <F1Button size="sm" tone={open ? 'rust' : 'ink'} onClick={() => setOpen((o) => !o)} active={open}>
              {open ? 'Close notes' : 'Read notes'}
            </F1Button>
          </div>
        </>
      )}
    </article>
  )
}

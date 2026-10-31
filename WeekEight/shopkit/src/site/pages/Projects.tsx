import { useState } from 'react'
import { CATEGORIES, PROJECTS } from '../data'
import { F1Button } from '../components/F1Button'
import { JobCard } from '../components/JobCard'
import { GearTrain } from '../components/Gears'
import { CoffeeRing } from '../components/Coffee'

export default function Projects() {
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>('All')
  const list = filter === 'All' ? PROJECTS : PROJECTS.filter((p) => p.category === filter)

  return (
    <section className="page">
      <CoffeeRing seed={14} className="ring-page" />
      <div className="page-head">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-lead">
            Job cards from the garage: what each thing does, what it's built with, and whether it's running, still on
            the stands, or parked for now. Open a card to read the notes.
          </p>
        </div>
        <GearTrain className="gears--head" module={6} gears={[{ teeth: 20 }, { teeth: 10, at: 20 }]} />
      </div>

      <div className="filters" role="group" aria-label="Filter projects">
        {CATEGORIES.map((c) => (
          <F1Button key={c} size="sm" tone={filter === c ? 'rust' : 'ink'} active={filter === c} onClick={() => setFilter(c)}>
            {c}
          </F1Button>
        ))}
      </div>

      <div className="job-grid">
        {list.map((p) => (
          <JobCard key={p.id} project={p} />
        ))}
      </div>
    </section>
  )
}

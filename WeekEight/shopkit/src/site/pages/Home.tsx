import type { PageProps } from '../data'
import { GITHUB, PROJECTS, pageHref, pageIndex } from '../data'
import { F1Button } from '../components/F1Button'
import { CoffeeRing, CoffeeSpill } from '../components/Coffee'
import { GearTrain } from '../components/Gears'
import { Printout } from '../components/Printout'
import { JobCard } from '../components/JobCard'

const FEATURED = ['slab-guardian', 'karbonomy', 'track-dominance']

export default function Home({ onGo }: PageProps) {
  const featured = FEATURED.map((id) => PROJECTS.find((p) => p.id === id)).filter((p) => p !== undefined)

  return (
    <>
      <section className="hero">
        <CoffeeRing seed={3} className="ring-title" double />
        <CoffeeRing seed={8} className="ring-corner" />
        <CoffeeSpill className="spill-hero" />

        <div className="hero-intro">
          <h1 className="hero-title">
            Models, backends,
            <br />
            and lap data.
          </h1>
          <div className="hero-side">
            <p className="hero-lead">
              I'm a computer science student at Sukkur IBA, looking for machine learning and backend internships. I
              like problems where the data is messy and the answer has to arrive fast, which is why my spare time goes
              into Formula 1 telemetry.
            </p>
            <div className="hero-actions">
              <F1Button tone="rust" href={pageHref(pageIndex('projects'))}>
                See projects
              </F1Button>
              <F1Button tone="cream" href={GITHUB} external>
                View GitHub
              </F1Button>
            </div>
            <p className="stamp hero-stamp" aria-label="Open to internships">
              <span>Open to</span>
              <span>internships</span>
            </p>
          </div>
        </div>

        <Printout />
      </section>

      <section className="home-grid">
        <div className="home-grid-head">
          <h2 className="section-title">On the grid right now</h2>
          <p className="section-lead">
            Three of the things I'm building. The rest, and what's paused, are on the projects page.
          </p>
        </div>
        <GearTrain
          className="gears--home"
          module={7}
          gears={[{ teeth: 28 }, { teeth: 12, at: -30 }, { teeth: 18, at: 40 }]}
        />
        <div className="home-cards">
          {featured.map((p) => (
            <JobCard key={p.id} project={p} compact />
          ))}
        </div>
        <div className="home-more">
          <F1Button tone="olive" onClick={() => onGo(pageIndex('projects'))}>
            All projects
          </F1Button>
        </div>
      </section>

      <section className="home-radio">
        <h2 className="section-title">Need someone on the pit wall?</h2>
        <p className="section-lead">
          I'm after internships in machine learning, backend engineering or motorsport data. Remote works.
        </p>
        <F1Button tone="rust" onClick={() => onGo(pageIndex('contact'))}>
          Open team radio
        </F1Button>
      </section>
    </>
  )
}

import type { PageProps } from '../data'
import { pageIndex } from '../data'
import { F1Button } from '../components/F1Button'
import { GearTrain } from '../components/Gears'
import { CoffeeRing } from '../components/Coffee'

const TOOLBOX = [
  { group: 'Data and ML', items: ['Python', 'Pandas', 'FastF1', 'Matplotlib', 'ML classifiers'] },
  { group: 'Backend', items: ['FastAPI', 'PostgreSQL', 'TimescaleDB', 'Supabase'] },
  { group: 'Front end', items: ['React', 'TypeScript', 'Vite'] },
  { group: 'Hardware', items: ['ESP32', 'PZEM-004T', 'CT clamps', 'IR control'] },
  { group: 'Mobile', items: ['Kotlin', 'Android'] },
  { group: 'Shipping', items: ['AWS EC2', 'Nginx', 'Playwright', 'Linux'] },
]

export default function About({ onGo }: PageProps) {
  return (
    <section className="page">
      <CoffeeRing seed={31} className="ring-page" />
      <div className="about">
        <div className="about-text">
          <h1 className="page-title">About</h1>
          <p className="about-big">
            I'm Muhammad Tahzeeb Khan, a computer science student at Sukkur IBA University in Sindh, Pakistan.
          </p>
          <p>
            I build machine learning models and the backends that serve them, and I like it best when there's real
            hardware or real-world data on the other end: energy meters, smart-grid measurements, a Formula 1 car going
            through a corner at 300 km/h.
          </p>
          <p>
            Long term, I want to work in Formula 1 through data: strategy and performance analysis, on the pit wall
            rather than the sofa. Right now I'm looking for internships in machine learning, backend engineering or
            motorsport analytics.
          </p>
          <p>Off the clock: Formula 1, football and eFootball, car detailing, and a good Indian thriller.</p>
          <div className="about-actions">
            <F1Button tone="rust" onClick={() => onGo(pageIndex('contact'))}>
              Get in touch
            </F1Button>
            <F1Button tone="cream" onClick={() => onGo(pageIndex('projects'))}>
              See the work
            </F1Button>
          </div>
        </div>

        <aside className="toolbox" aria-label="Toolbox">
          <h2 className="toolbox-title">Toolbox</h2>
          {TOOLBOX.map((t) => (
            <div key={t.group} className="drawer">
              <h3>{t.group}</h3>
              <ul>
                {t.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </aside>
      </div>
      <GearTrain
        className="gears--about"
        module={8}
        gears={[{ teeth: 32 }, { teeth: 14, at: -20 }, { teeth: 22, at: 30 }, { teeth: 10, at: -50 }]}
      />
    </section>
  )
}

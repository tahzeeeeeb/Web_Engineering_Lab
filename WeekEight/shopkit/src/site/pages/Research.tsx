import { GearTrain } from '../components/Gears'
import { CoffeeRing } from '../components/Coffee'

const INTERESTS = [
  {
    title: 'Race strategy from telemetry',
    body: 'Turning FastF1 timing and car data into the calls a strategy engineer makes: where time is lost, which stint is quicker, when the tyre falls away.',
  },
  {
    title: 'Security of learning-based control',
    body: 'What happens when an attacker feeds false measurements to a reinforcement-learning controller, and how to catch it before it acts.',
  },
  {
    title: 'Energy use you can see',
    body: 'Non-intrusive load monitoring: working out which appliance is drawing power from one meter on the main board, for homes in Pakistan.',
  },
]

export default function Research() {
  return (
    <section className="page">
      <CoffeeRing seed={22} className="ring-page ring-page--left" double />
      <div className="page-head">
        <div>
          <h1 className="page-title">Research</h1>
          <p className="page-lead">One paper in the works and the questions I keep coming back to.</p>
        </div>
        <GearTrain className="gears--head" module={5} gears={[{ teeth: 16 }, { teeth: 24, at: 160 }]} />
      </div>

      <article className="paper">
        <p className="paper-venue">Manuscript, targeting IEEE GLOBECOM 2026</p>
        <h2 className="paper-title">False Data Injection Attacks on RL-Based Smart Grid Systems</h2>
        <dl className="paper-meta">
          <div>
            <dt>Role</dt>
            <dd>Co-author</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>Writing in progress</dd>
          </div>
          <div>
            <dt>Tools</dt>
            <dd>Python, Overleaf, Zotero, Excel</dd>
          </div>
        </dl>
        <p className="paper-body">
          A survey of false data injection attacks against smart grids run by reinforcement-learning controllers, paired
          with a machine-learning classifier experiment on an IEC 61850 dataset. The paper is organised around four
          research questions, from how these attacks are built to the challenges still open.
        </p>
        <p className="stamp paper-stamp">Draft</p>
      </article>

      <h2 className="section-title">Questions I keep coming back to</h2>
      <ul className="notebook">
        {INTERESTS.map((it) => (
          <li key={it.title}>
            <h3>{it.title}</h3>
            <p>{it.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

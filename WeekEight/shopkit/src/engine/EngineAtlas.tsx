import { useLayoutEffect } from 'react'
import './engine.css'
import { HeroEngine } from './sections/HeroEngine'
import { StrokeSection } from './sections/StrokeSection'
import { CamSection } from './sections/CamSection'
import { LayoutSection } from './sections/LayoutSection'
import { TheorySection } from './sections/TheorySection'
import { Barbed, Sparkle } from './ui/Ornament'
import { prefs, usePrefs } from './ui/prefs'
import { themeCut } from './ui/cut'
import { playTick } from './audio/sound'

export default function EngineAtlas() {
  const { theme, sound } = usePrefs()

  // The theme lives on <html> too, so the page behind the app and the theme-cut snapshot match.
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.ka = theme
    return () => {
      delete root.dataset.ka
    }
  }, [theme])

  return (
    <div className="ka" data-theme={theme}>
      <a className="skip" href="#anatomy">
        Skip to the engine
      </a>
      <header className="top">
        <span className="top-kerb" aria-hidden="true" />
        <a className="brand" href="#anatomy">
          <span className="seal" lang="ja" aria-hidden="true">
            機
          </span>
          <span className="brand-word">Kikan</span>
          <span className="brand-sub">How an engine works</span>
        </a>
        <nav className="top-nav" aria-label="Sections">
          <a href="#anatomy">Anatomy</a>
          <a href="#strokes">Strokes</a>
          <a href="#camshaft">Camshaft</a>
          <a href="#layouts">Layouts</a>
          <a href="#theory">Theory</a>
        </nav>
        <div className="top-tools">
          <button
            type="button"
            className={`tool${sound ? ' is-on' : ''}`}
            aria-pressed={sound}
            aria-label={sound ? 'Sound on' : 'Sound off'}
            title={sound ? 'Sound on' : 'Sound off'}
            onClick={() => {
              prefs.set({ sound: !sound })
              if (!sound) window.setTimeout(() => playTick(), 30)
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" className="tool-fill" />
              {sound ? (
                <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" className="tool-line" />
              ) : (
                <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" className="tool-line" />
              )}
            </svg>
            <span lang="ja" aria-hidden="true">
              音
            </span>
          </button>
          <button
            type="button"
            className="tool tool--theme"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
            onClick={() => themeCut(theme === 'dark' ? 'light' : 'dark')}
          >
            <span className="tt-yin" lang="ja" aria-hidden="true">
              陰
            </span>
            <span className="tt-blade" aria-hidden="true" />
            <span className="tt-yang" lang="ja" aria-hidden="true">
              陽
            </span>
          </button>
        </div>
      </header>

      <main>
        <HeroEngine />
        <Barbed />
        <StrokeSection />
        <Barbed />
        <CamSection />
        <Barbed />
        <LayoutSection />
        <Barbed />
        <TheorySection />
      </main>

      <footer className="foot">
        <span className="foot-flag" aria-hidden="true" />
        <div className="foot-row">
          <span className="seal seal--sm" lang="ja" aria-hidden="true">
            機
          </span>
          <span className="foot-word">Kikan</span>
          <Sparkle className="foot-spark" />
        </div>
        <p>
          Made by Muhammad Tahzeeb Khan. Every part is modelled, animated and voiced live in your browser: no images, no
          recordings.{' '}
          <a href="https://github.com/tahzeeeeeb" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}

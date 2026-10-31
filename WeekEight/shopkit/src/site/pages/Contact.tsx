import { useState } from 'react'
import type { FormEvent } from 'react'
import { EMAIL, GITHUB } from '../data'
import { F1Button } from '../components/F1Button'
import { CoffeeRing } from '../components/Coffee'

export default function Contact() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim()) {
      setError('Write a message before sending the radio.')
      return
    }
    setError('')
    const subject = `Team radio${name.trim() ? ` from ${name.trim()}` : ''}`
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
    setSent(true)
  }

  return (
    <section className="page">
      <CoffeeRing seed={41} className="ring-page ring-page--low" double />
      <div className="contact">
        <div>
          <h1 className="page-title">Team radio</h1>
          <p className="page-lead">
            Internship offers, questions about a project, or a strategy call you think was wrong. Send it over and it
            lands in my inbox.
          </p>
          <div className="contact-direct">
            <F1Button tone="olive" href={`mailto:${EMAIL}`}>
              Email me
            </F1Button>
            <F1Button tone="cream" href={GITHUB} external>
              GitHub
            </F1Button>
          </div>
          <p className="contact-mail">{EMAIL}</p>
        </div>

        <form className="radio-form" onSubmit={onSubmit} noValidate>
          <div className="radio-head">
            <span className="radio-dot" aria-hidden="true" />
            Channel open
          </div>
          <label htmlFor="radio-name">Your name</label>
          <input id="radio-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <label htmlFor="radio-msg">Message</label>
          <textarea
            id="radio-msg"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'radio-err' : undefined}
          />
          {error && (
            <p className="radio-error" id="radio-err">
              {error}
            </p>
          )}
          <div className="radio-actions">
            <F1Button tone="rust" type="submit">
              Send radio
            </F1Button>
            <span className="radio-hint">
              {sent ? 'Your email app should open with the message ready to send.' : 'Opens your email app with this message filled in.'}
            </span>
          </div>
        </form>
      </div>
    </section>
  )
}

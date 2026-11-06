import { useEffect, useRef, useState } from 'react'

// Decorative only - echoes the logo's connection motif along one edge of
// the hero. Mirrored with CSS for the opposite edge rather than duplicating
// coordinates.
function ConnectionArt({ side }) {
  return (
    <svg
      className={`connection-art connection-art-${side}`}
      viewBox="0 0 160 420"
      fill="none"
      aria-hidden="true"
    >
      <g className="connection-lines" stroke="currentColor" strokeWidth="1">
        <line x1="24" y1="36" x2="66" y2="82" />
        <line x1="66" y1="82" x2="34" y2="146" />
        <line x1="66" y1="82" x2="118" y2="64" />
        <line x1="34" y1="146" x2="78" y2="204" />
        <line x1="78" y1="204" x2="132" y2="182" />
        <line x1="78" y1="204" x2="52" y2="272" />
        <line x1="52" y1="272" x2="96" y2="330" />
        <line x1="132" y1="182" x2="150" y2="124" />
        <line x1="96" y1="330" x2="70" y2="388" />
      </g>
      <g className="connection-dots">
        <circle cx="24" cy="36" r="3" />
        <circle cx="118" cy="64" r="3" />
        <circle cx="150" cy="124" r="3" />
        <circle cx="34" cy="146" r="3" />
        <circle cx="132" cy="182" r="3" />
        <circle cx="78" cy="204" r="3" />
        <circle cx="52" cy="272" r="3" />
        <circle cx="96" cy="330" r="3" />
        <circle cx="70" cy="388" r="3" />
      </g>
      <g className="connection-glow">
        <circle className="glow-dot glow-dot-blue" cx="66" cy="82" r="4" />
        <circle className="glow-dot glow-dot-purple" cx="78" cy="204" r="4" />
        <circle className="glow-dot glow-dot-blue" cx="96" cy="330" r="4" />
      </g>
    </svg>
  )
}

// Reveals a section once it scrolls into view, then stops watching - a
// one-time entrance, not a repeating effect.
function useRevealOnScroll() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, visible]
}

// The three scroll-section visuals below are illustrative only - fictional
// sample content, styled with the same classes the real feed uses.

function MiniFeedVisual() {
  return (
    <div className="feature-visual opportunity-card mini-feed">
      <p className="mini-feed-greeting">Good morning!</p>
      <p className="mini-feed-summary">Here are your 3 best opportunities this week.</p>
      <div className="progress">
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: '40%' }} />
        </div>
        <p className="progress-note">You've started 2 of your 5 conversations this week.</p>
      </div>
      <ul className="mini-pick-list">
        <li className="mini-pick-row">
          <span className="mini-pick-rank">#1</span> Riverwalk Business Mixer
        </li>
        <li className="mini-pick-row">
          <span className="mini-pick-rank">#2</span> Harbor Point Consulting LLC
        </li>
        <li className="mini-pick-row">
          <span className="mini-pick-rank">#3</span> Coffee Connection
        </li>
      </ul>
    </div>
  )
}

function ReasonVisual() {
  return (
    <div className="feature-visual opportunity-card top-pick-card">
      <div className="top-pick-rank">#2</div>
      <div className="top-pick-tags">
        <span className="tag tag-category-client">Potential client</span>
      </div>
      <div className="opportunity-name">Harbor Point Consulting LLC</div>
      <div className="opportunity-meta">Florida LLC · Tampa · filed Nov 2</div>
      <div className="source-line">Source: Florida Sunbiz filing, filed Nov 2</div>
      <div className="ai-section">
        <div className="ai-section-title">Why it fits</div>
        <div className="ai-section-body">
          The name suggests a consulting practice that could serve the same small-business
          clients you specialize in.
        </div>
      </div>
    </div>
  )
}

function WarmPathVisual() {
  return (
    <div className="feature-visual opportunity-card top-pick-card">
      <div className="top-pick-rank">#1</div>
      <div className="top-pick-tags">
        <span className="tag tag-category-event">Networking event</span>
      </div>
      <div className="event-name">Coffee Connection</div>
      <div className="event-meta">Morning networking · Nov 18, 8:30 AM</div>
      <div className="ai-details">
        <div className="ai-section">
          <div className="ai-section-title">Warm path</div>
          <div className="ai-section-body">
            Your chamber membership gives you a natural reason to attend, and you can ask chamber
            staff to introduce you to a few attendees.
          </div>
        </div>
        <div className="ai-section">
          <div className="ai-section-title">Opener</div>
          <div className="ai-section-body ai-section-opener">
            "I work with small businesses on retirement plans — what's been top of mind for your
            team lately?"
          </div>
        </div>
      </div>
    </div>
  )
}

const SCROLL_SECTIONS = [
  {
    heading: 'A short list, not a long one',
    body: "Nexora doesn't hand you a spreadsheet of hundreds of leads. Each week, it narrows new filings and events down to the five picks most worth your time, so you always know exactly where to start.",
    Visual: MiniFeedVisual,
  },
  {
    heading: 'A reason for every pick',
    body: "Every opportunity comes with a plain-language reason grounded in real data, not a guess. You'll always see exactly which facts led Nexora to suggest it, and where it came from.",
    Visual: ReasonVisual,
  },
  {
    heading: 'Warm paths in',
    body: "When something in your own network could plausibly open a door, Nexora points it out and suggests a natural way to use it. You'll get a concrete first step and a conversation opener you can actually use.",
    Visual: WarmPathVisual,
  },
]

function ScrollSection({ heading, body, Visual, index }) {
  const [ref, visible] = useRevealOnScroll()
  const reversed = index % 2 === 1

  return (
    <section
      ref={ref}
      className={`landing-scroll-section full-bleed${reversed ? ' landing-scroll-section-reverse' : ''}${
        visible ? ' is-visible' : ''
      }`}
    >
      <div className="landing-scroll-inner">
        <div className="landing-scroll-text">
          <h2 className="landing-scroll-heading">{heading}</h2>
          <p className="landing-scroll-body">{body}</p>
        </div>
        <div className="landing-scroll-visual">
          <Visual />
        </div>
      </div>
    </section>
  )
}

function LandingPage({ onGetStarted }) {
  return (
    <div className="landing">
      <div className="landing-hero full-bleed">
        <ConnectionArt side="left" />
        <ConnectionArt side="right" />
        <div className="landing-hero-inner">
          <h1 className="landing-headline">Better reasons to start conversations.</h1>
          <p className="landing-subheading">
            Nexora is a companion for financial advisors. Each week, it finds a few opportunities
            worth your time and shows you how to start the conversation.
          </p>
          <button type="button" className="get-started-button" onClick={onGetStarted}>
            Get Started
          </button>
        </div>
      </div>

      {SCROLL_SECTIONS.map((section, index) => (
        <ScrollSection key={section.heading} index={index} {...section} />
      ))}

      <div className="landing-closing full-bleed">
        <div className="landing-closing-inner">
          <h2 className="landing-closing-heading">Nexora is where connections spark.</h2>
          <button type="button" className="get-started-button" onClick={onGetStarted}>
            Get Started
          </button>
        </div>
      </div>
    </div>
  )
}

export default LandingPage

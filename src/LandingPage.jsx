import { useEffect, useRef, useState } from 'react'
import { SparksField, useBackdropSize } from './SparksBackground.jsx'

// Reveals a tile once it scrolls into view, then stops watching - a
// one-time entrance, not a repeating effect. If IntersectionObserver isn't
// available, reveal immediately rather than leaving the tile hidden - the
// CSS reduced-motion override below is the other half of that safety net.
function useRevealOnScroll() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
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

const HOW_IT_WORKS_STEPS = [
  {
    heading: 'Tell Nexora about your practice',
    body: 'A one-time profile covering your specialties, outreach style, and the areas you cover.',
  },
  {
    heading: 'Nexora checks new businesses and local events',
    body: 'New Hillsborough filings and upcoming networking events, matched to your coverage area.',
  },
  {
    heading: 'Get your top picks each week',
    body: 'Up to five opportunities, each with a reason, a warm path, and a way to get started.',
  },
  {
    heading: 'Start the conversation and track your progress',
    body: 'Mark each pick and watch your weekly conversation goal fill in as you go.',
  },
]

function HowItWorks() {
  const [ref, visible] = useRevealOnScroll()

  return (
    <section ref={ref} className={`how-it-works landing-tile${visible ? ' is-visible' : ''}`}>
      <div className="how-it-works-inner">
        <h2 className="how-it-works-heading">How it works</h2>
        <ol className="how-it-works-steps">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <li key={step.heading} className="how-it-works-step">
              <div className="how-it-works-number">{index + 1}</div>
              <h3 className="how-it-works-step-heading">{step.heading}</h3>
              <p className="how-it-works-step-body">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const SCROLL_SECTIONS = [
  {
    heading: 'A short list, not a long one',
    body: "Nexora doesn't hand you a spreadsheet of hundreds of leads. Each week, it narrows new filings and events down to up to five picks most worth your time, so you always know exactly where to start.",
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
      className={`landing-scroll-section landing-tile${reversed ? ' landing-scroll-section-reverse' : ''}${
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

function ClosingSection({ onGetStarted }) {
  const [ref, visible] = useRevealOnScroll()

  return (
    <section ref={ref} className={`landing-closing landing-tile${visible ? ' is-visible' : ''}`}>
      <div className="landing-closing-inner">
        <h2 className="landing-closing-heading">Nexora is where connections spark.</h2>
        <button type="button" className="get-started-button" onClick={onGetStarted}>
          Get Started
        </button>
      </div>
    </section>
  )
}

// Illustrative only - fictional, for the hero preview.
function SamplePickCard() {
  return (
    <div className="sample-pick">
      <p className="sample-pick-label">Example pick</p>
      <div className="opportunity-card top-pick-card">
        <div className="top-pick-rank">#1</div>
        <div className="top-pick-tags">
          <span className="tag tag-category-event">Networking event</span>
        </div>
        <div className="event-name">Riverwalk Business Mixer</div>
        <div className="event-meta">Evening mixer · Nov 18, 5:30 PM</div>
        <div className="ai-section">
          <div className="ai-section-title">Why it fits</div>
          <div className="ai-section-body">
            Matches your in-person outreach style and keeps you close to clients in your coverage
            area.
          </div>
        </div>
      </div>
    </div>
  )
}

function LandingPage({ onGetStarted }) {
  const landingRef = useRef(null)
  const { width, height } = useBackdropSize(landingRef)

  return (
    <div className="landing" ref={landingRef}>
      <div className="landing-backdrop">
        {width > 0 && height > 0 && (
          <SparksField width={width} height={height} containerRef={landingRef} />
        )}
      </div>

      <div className="landing-hero full-bleed">
        <div className="landing-hero-text">
          <h1 className="landing-headline">Better reasons to start conversations.</h1>
          <p className="landing-subheading">
            Nexora is a companion for financial advisors. Each week, it finds a few opportunities
            worth your time and shows you how to start the conversation.
          </p>
          <button type="button" className="get-started-button" onClick={onGetStarted}>
            Get Started
          </button>
        </div>
        <div className="landing-hero-sample">
          <SamplePickCard />
        </div>
      </div>

      <div className="landing-tiles">
        <HowItWorks />

        {SCROLL_SECTIONS.map((section, index) => (
          <ScrollSection key={section.heading} index={index} {...section} />
        ))}

        <ClosingSection onGetStarted={onGetStarted} />
      </div>
    </div>
  )
}

export default LandingPage

import { useEffect, useMemo, useState } from 'react'
import { loadProfile } from './storage.js'
import { fetchOpportunities } from './opportunities.js'
import { fetchEvents } from './events.js'
import { rankOpportunitiesBasic } from './rankingFallback.js'
import { getAiRanking, isMockAi } from './aiRanking.js'

const MAX_OPPORTUNITIES = 10
const MAX_EVENTS = 10
const MAX_TOP_PICKS = 5

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning!'
  if (hour < 18) return 'Good afternoon!'
  return 'Good evening!'
}

function parseZips(zipsText) {
  return zipsText
    .split(/[,\s]+/)
    .map((z) => z.trim())
    .filter(Boolean)
}

function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const options = { month: 'short', day: 'numeric' }
  if (year !== new Date().getFullYear()) options.year = 'numeric'
  return date.toLocaleDateString('en-US', options)
}

function formatTime(timeStr) {
  const [hour, minute] = timeStr.split(':').map(Number)
  const date = new Date(2000, 0, 1, hour, minute)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function visibleTags(tags) {
  return (tags || []).filter((t) => !(t.type === 'cost' && t.label === 'Cost unknown'))
}

function getTodayStr() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// An advisor can't plan ahead for an event that's already started or already
// over, so today's events show a "Today"/"Tonight" tag instead of being
// treated as something to plan around - and are kept out of the AI
// candidates entirely (see aiEligibleEvents below).
function getTodayTag(e) {
  if (e.date !== getTodayStr()) return null
  const [hour] = e.startTime.split(':').map(Number)
  return hour >= 17 ? 'Tonight' : 'Today'
}

// Matches the "event" vs. "business" distinction used in
// amplify/functions/rank-opportunities/prompt.js and scripts/test-ranking.js.
function isEvent(item) {
  return item.hostingOrg !== undefined
}

function BusinessContent({ o }) {
  return (
    <>
      <div className="opportunity-name">
        {o.name}
        {o.zipCoverage === 'partial' && <span className="border-area-badge">Border area</span>}
      </div>
      <div className="opportunity-meta">
        {o.entityType} · {o.city} · {formatDate(o.date)}
      </div>
    </>
  )
}

function EventContent({ e }) {
  const todayTag = getTodayTag(e)
  return (
    <>
      <div className="event-name">{e.name}</div>
      {(todayTag || visibleTags(e.tags).length > 0) && (
        <div className="event-tags">
          {todayTag && <span className="tag tag-today">{todayTag}</span>}
          {visibleTags(e.tags).map((t) => (
            <span key={t.type} className={`tag tag-${t.type}`}>
              {t.label}
            </span>
          ))}
        </div>
      )}
      <div className="event-meta">
        {e.eventType} · {formatDate(e.date)}, {formatTime(e.startTime)}
        {e.endTime ? `–${formatTime(e.endTime)}` : ''}
      </div>
      <div className="event-meta">
        {e.venue ? `${e.venue} · ` : ''}
        {e.city}
      </div>
      <div className="event-meta">{e.hostingOrg}</div>
      {e.url && (
        <a className="event-link" href={e.url} target="_blank" rel="noopener noreferrer">
          Event page
        </a>
      )}
    </>
  )
}

function AiSections({ entry }) {
  const [expanded, setExpanded] = useState(false)
  if (!entry) return null

  const hasWarmPath = entry.warmPath && entry.warmPath !== 'none'
  const hasDetails = hasWarmPath || entry.howToStart

  return (
    <>
      {entry.reason && (
        <div className="ai-section">
          <div className="ai-section-title">Why it fits</div>
          <div className="ai-section-body">{entry.reason}</div>
        </div>
      )}
      {hasDetails && (
        <>
          <button
            type="button"
            className="ai-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? 'Hide how to get started' : 'How to get started'}
          </button>
          {expanded && (
            <div className="ai-details">
              {hasWarmPath && (
                <div className="ai-section">
                  <div className="ai-section-title">Warm path</div>
                  <div className="ai-section-body">{entry.warmPath}</div>
                </div>
              )}
              {entry.howToStart && (
                <div className="ai-section">
                  <div className="ai-section-title">First step</div>
                  <div className="ai-section-body">{entry.howToStart.firstStep}</div>
                  <div className="ai-section-title">Why this approach</div>
                  <div className="ai-section-body ai-section-subtle">{entry.howToStart.whyThisApproach}</div>
                  <div className="ai-section-title">Opener</div>
                  <div className="ai-section-body ai-section-opener">“{entry.howToStart.opener}”</div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}

function HomePage() {
  const [opportunities, setOpportunities] = useState([])
  const [events, setEvents] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [hideBorderArea, setHideBorderArea] = useState(false)
  const [aiRanking, setAiRanking] = useState(null)
  const [aiUnavailable, setAiUnavailable] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  const profile = useMemo(() => loadProfile(), [])

  useEffect(() => {
    fetchOpportunities()
      .then(setOpportunities)
      .catch(() => setOpportunities([]))
      .finally(() => setLoaded(true))

    fetchEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
  }, [])

  const matched = useMemo(() => {
    const cities = new Set(profile.cities)
    const zips = new Set(parseZips(profile.zips || ''))
    const filtered = opportunities.filter((o) => cities.has(o.city) || zips.has(o.zip))
    return rankOpportunitiesBasic(filtered).slice(0, MAX_OPPORTUNITIES)
  }, [opportunities, profile])

  const matchedEvents = useMemo(() => {
    const cities = new Set(profile.cities)
    const todayStr = getTodayStr()
    return events
      .filter((e) => cities.has(e.city) && e.date >= todayStr)
      .sort((a, b) =>
        a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
      )
      .slice(0, MAX_EVENTS)
  }, [events, profile])

  // Today's events are still shown in "Upcoming events" (matchedEvents,
  // above) but an advisor can't plan ahead for something happening today or
  // already past, so they're excluded from what the AI gets to pick from.
  const aiEligibleEvents = useMemo(() => {
    const todayStr = getTodayStr()
    return matchedEvents.filter((e) => e.date > todayStr)
  }, [matchedEvents])

  // Sent to the AI together, businesses first - same candidate set
  // scripts/test-ranking.js builds for the Lambda/mock.
  const aiCandidates = useMemo(
    () => [...matched, ...aiEligibleEvents],
    [matched, aiEligibleEvents]
  )

  useEffect(() => {
    if (aiCandidates.length === 0) {
      setAiRanking(null)
      setAiUnavailable(false)
      setAiLoading(false)
      return
    }
    let cancelled = false
    setAiUnavailable(false)
    setAiLoading(true)
    getAiRanking(aiCandidates, profile)
      .then(({ ranking }) => {
        if (cancelled) return
        setAiRanking(ranking)
      })
      .catch(() => {
        if (cancelled) return
        setAiRanking(null)
        setAiUnavailable(true)
      })
      .finally(() => {
        if (cancelled) return
        setAiLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [aiCandidates, profile])

  const candidatesById = useMemo(() => {
    const map = {}
    aiCandidates.forEach((item) => {
      map[item.id] = item
    })
    return map
  }, [aiCandidates])

  // The AI's top picks, in rank order, each paired with its matching
  // business or event. Empty whenever there's no AI ranking to show yet -
  // callers fall back to the plain business/event lists in that case.
  const topPicks = useMemo(() => {
    if (!aiRanking) return []
    return [...aiRanking]
      .sort((a, b) => a.rank - b.rank)
      .map((entry) => ({ item: candidatesById[entry.id], entry }))
      .filter((pick) => pick.item)
      .slice(0, MAX_TOP_PICKS)
  }, [aiRanking, candidatesById])

  const topPickIds = useMemo(() => new Set(topPicks.map((pick) => pick.item.id)), [topPicks])

  const remainingBusinesses = useMemo(
    () => matched.filter((o) => !topPickIds.has(o.id)),
    [matched, topPickIds]
  )

  const remainingEvents = useMemo(
    () => matchedEvents.filter((e) => !topPickIds.has(e.id)),
    [matchedEvents, topPickIds]
  )

  const visibleBusinesses = hideBorderArea
    ? remainingBusinesses.filter((o) => o.zipCoverage !== 'partial')
    : remainingBusinesses

  const greeting = getGreeting()
  const hasTopPicks = topPicks.length > 0
  const totalCount = matched.length
  const totalEventCount = matchedEvents.length
  const otherBusinessCount = remainingBusinesses.length
  const otherEventCount = remainingEvents.length

  return (
    <div className="feed">
      <p className="description">
        {greeting}{' '}
        {hasTopPicks
          ? `Here are your ${topPicks.length} best opportunit${topPicks.length === 1 ? 'y' : 'ies'} this week, plus ${otherBusinessCount} more new business${otherBusinessCount === 1 ? '' : 'es'} and ${otherEventCount} upcoming event${otherEventCount === 1 ? '' : 's'}.`
          : totalCount === 0 && totalEventCount === 0
            ? "We didn't find any new businesses or upcoming events matching your coverage area yet."
            : `We found ${totalCount} new business${totalCount === 1 ? '' : 'es'} and ${totalEventCount} upcoming event${totalEventCount === 1 ? '' : 's'} that might be worth your time.`}
      </p>

      {matched.length > 0 && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={hideBorderArea}
            onChange={(e) => setHideBorderArea(e.target.checked)}
          />
          Hide border-area opportunities
        </label>
      )}

      {isMockAi && <p className="mock-ai-label">Preview: sample AI suggestions</p>}

      {aiLoading && <p className="ai-note">Finding your best opportunities for this week…</p>}

      {aiUnavailable && (
        <p className="ai-note">
          AI suggestions are unavailable right now — showing opportunities by newest filing in
          your coverage area.
        </p>
      )}

      {loaded && hasTopPicks && (
        <section className="top-picks-section">
          <h2 className="section-title">Your top picks this week</h2>
          <ul className="top-pick-list">
            {topPicks.map(({ item, entry }, index) => (
              <li key={item.id} className="opportunity-card top-pick-card">
                <div className="top-pick-rank">#{index + 1}</div>
                {isEvent(item) ? <EventContent e={item} /> : <BusinessContent o={item} />}
                <AiSections entry={entry} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {loaded && visibleBusinesses.length > 0 && (
        <section className="more-businesses-section">
          {hasTopPicks && <h2 className="section-title">More new businesses</h2>}
          <ul className="opportunity-list">
            {visibleBusinesses.map((o) => (
              <li key={o.id} className="opportunity-card">
                <BusinessContent o={o} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {loaded && remainingEvents.length > 0 && (
        <section className="events-section">
          <h2 className="section-title">Upcoming events</h2>
          <ul className="event-list">
            {remainingEvents.map((e) => (
              <li key={e.id} className="event-card">
                <EventContent e={e} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default HomePage

import { useEffect, useMemo, useState } from 'react'
import { loadProfile } from './storage.js'
import { fetchOpportunities } from './opportunities.js'
import { fetchEvents } from './events.js'

const MAX_OPPORTUNITIES = 10
const MAX_EVENTS = 10

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

function HomePage() {
  const [opportunities, setOpportunities] = useState([])
  const [events, setEvents] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [hideBorderArea, setHideBorderArea] = useState(false)

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
    return opportunities
      .filter((o) => cities.has(o.city) || zips.has(o.zip))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, MAX_OPPORTUNITIES)
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

  const visible = hideBorderArea ? matched.filter((o) => o.zipCoverage !== 'partial') : matched
  const greeting = getGreeting()
  const count = matched.length
  const eventCount = matchedEvents.length

  return (
    <div className="feed">
      <p className="description">
        {greeting}{' '}
        {count === 0 && eventCount === 0
          ? "We didn't find any new businesses or upcoming events matching your coverage area yet."
          : `We found ${count} new business${count === 1 ? '' : 'es'} and ${eventCount} upcoming event${eventCount === 1 ? '' : 's'} that might be worth your time.`}
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

      {loaded && (
        <ul className="opportunity-list">
          {visible.map((o) => (
            <li key={o.id} className="opportunity-card">
              <div className="opportunity-name">
                {o.name}
                {o.zipCoverage === 'partial' && (
                  <span className="border-area-badge">Border area</span>
                )}
              </div>
              <div className="opportunity-meta">
                {o.entityType} · {o.city} · {formatDate(o.date)}
              </div>
            </li>
          ))}
        </ul>
      )}

      {loaded && matchedEvents.length > 0 && (
        <section className="events-section">
          <h2 className="section-title">Upcoming events</h2>
          <ul className="event-list">
            {matchedEvents.map((e) => (
              <li key={e.id} className="event-card">
                <div className="event-name">{e.name}</div>
                {visibleTags(e.tags).length > 0 && (
                  <div className="event-tags">
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
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default HomePage

import { useEffect, useMemo, useState } from 'react'
import { loadProfile } from './storage.js'
import { fetchOpportunities } from './opportunities.js'

const MAX_OPPORTUNITIES = 10

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

function HomePage() {
  const [opportunities, setOpportunities] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [hideBorderArea, setHideBorderArea] = useState(false)

  const profile = useMemo(() => loadProfile(), [])

  useEffect(() => {
    fetchOpportunities()
      .then(setOpportunities)
      .catch(() => setOpportunities([]))
      .finally(() => setLoaded(true))
  }, [])

  const matched = useMemo(() => {
    const cities = new Set(profile.cities)
    const zips = new Set(parseZips(profile.zips || ''))
    return opportunities
      .filter((o) => cities.has(o.city) || zips.has(o.zip))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, MAX_OPPORTUNITIES)
  }, [opportunities, profile])

  const visible = hideBorderArea ? matched.filter((o) => o.zipCoverage !== 'partial') : matched
  const greeting = getGreeting()
  const count = matched.length

  return (
    <div className="feed">
      <p className="description">
        {greeting}{' '}
        {count === 0
          ? "We didn't find any new opportunities matching your coverage area yet."
          : `We found ${count} new opportunit${count === 1 ? 'y' : 'ies'} that might be worth your time.`}
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
    </div>
  )
}

export default HomePage

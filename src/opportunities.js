import { filterOutPersonNames } from './personNameFilter.js'

function getTodayStr() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// Safeguard against a Sunbiz filing carrying a future effective date (the
// export already excludes these - see scripts/count-filings.js - but the
// app never shows one either, in case a stale or hand-edited data file
// slips one through).
function filterOutFutureDated(opportunities) {
  const todayStr = getTodayStr()
  return opportunities.filter((o) => o.date <= todayStr)
}

export async function fetchOpportunities() {
  const res = await fetch('/opportunities.json')
  if (!res.ok) throw new Error('Failed to load opportunities')
  const opportunities = await res.json()
  return filterOutPersonNames(filterOutFutureDated(opportunities))
}

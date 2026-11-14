import { filterOutPersonNames } from './personNameFilter.js'

export async function fetchOpportunities() {
  const res = await fetch('/opportunities.json')
  if (!res.ok) throw new Error('Failed to load opportunities')
  const opportunities = await res.json()
  return filterOutPersonNames(opportunities)
}

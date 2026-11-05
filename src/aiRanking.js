import { generateClient } from 'aws-amplify/data'
import { amplifyOutputs } from './amplifyOutputs.js'

const AI_TIMEOUT_MS = 20000
const CACHE_KEY = 'nexora.aiRankingCache'
const MOCK_RANKING_URL = '/mock-ai-ranking.json'

// No deployed backend to configure Amplify with, or the mock is explicitly
// requested - use the sample ranking saved by scripts/test-ranking.js
// instead of calling the real backend.
export const isMockAi = !amplifyOutputs || import.meta.env.VITE_USE_MOCK_AI === 'true'

let client = null
function getClient() {
  if (!client) client = generateClient()
  return client
}

let mockRankingPromise = null
function loadMockRanking() {
  if (!mockRankingPromise) {
    mockRankingPromise = fetch(MOCK_RANKING_URL)
      .then((res) => (res.ok ? res.json() : []))
      .catch(() => [])
  }
  return mockRankingPromise
}

// Matches the "event" vs. "business" distinction used in
// amplify/functions/rank-opportunities/prompt.js and src/HomePage.jsx.
function serializeItem(o) {
  if (o.hostingOrg !== undefined) {
    return {
      type: 'event',
      id: o.id,
      name: o.name,
      eventType: o.eventType,
      date: o.date,
      startTime: o.startTime,
      endTime: o.endTime,
      venue: o.venue,
      city: o.city,
      hostingOrg: o.hostingOrg,
      tags: o.tags,
    }
  }
  return {
    type: 'business',
    id: o.id,
    name: o.name,
    entityType: o.entityType,
    city: o.city,
    zip: o.zip,
    date: o.date,
    zipCoverage: o.zipCoverage,
  }
}

function getTodayStr() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// Identifies "this advisor's ranking request" for the cache - profile fields
// that could change what the AI says, plus which opportunities were sent.
function requestKey(profile, opportunities) {
  return JSON.stringify({
    specialties: profile.specialties,
    currentClients: profile.currentClients,
    idealClients: profile.idealClients,
    outreachStyles: profile.outreachStyles,
    network: profile.network,
    opportunityIds: opportunities.map((o) => o.id),
  })
}

function readCache(profile, opportunities) {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (cached.date === getTodayStr() && cached.key === requestKey(profile, opportunities)) {
      return cached.ranking
    }
    return null
  } catch {
    return null
  }
}

function writeCache(profile, opportunities, ranking) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        date: getTodayStr(),
        key: requestKey(profile, opportunities),
        ranking,
      })
    )
  } catch {
    // ignore storage errors (e.g. private browsing, quota)
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('AI ranking timed out')), ms)),
  ])
}

// Returns { ranking, fromCache, isMock }. `ranking` is an array of
// { id, rank, reason, warmPath, howToStart } for (at most) the opportunities
// passed in. Callers are expected to already have capped `opportunities` to
// a small list - this function does not grow or re-fetch a larger set.
export async function getAiRanking(opportunities, profile) {
  if (opportunities.length === 0) return { ranking: [], fromCache: false, isMock: isMockAi }

  if (isMockAi) {
    const ranking = await loadMockRanking()
    return { ranking, fromCache: false, isMock: true }
  }

  const cached = readCache(profile, opportunities)
  if (cached) return { ranking: cached, fromCache: true, isMock: false }

  const result = await withTimeout(
    getClient().queries.rankOpportunities({
      input: {
        opportunities: opportunities.map(serializeItem),
        profile: {
          specialties: profile.specialties,
          currentClients: profile.currentClients,
          idealClients: profile.idealClients,
          outreachStyles: profile.outreachStyles,
          network: profile.network,
        },
      },
    }),
    AI_TIMEOUT_MS
  )

  if (result.errors?.length) throw new Error(result.errors[0].message)

  const ranking = result.data || []
  writeCache(profile, opportunities, ranking)
  return { ranking, fromCache: false, isMock: false }
}

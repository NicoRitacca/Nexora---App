// Instructions sent to Claude for ranking opportunities, shared by the
// Lambda handler (handler.ts) and the local test script
// (scripts/test-ranking.js) so the two never drift apart.
//
// An "item" here is either a business filing (from public/opportunities.json,
// type "business") or an event (from public/events.json or
// public/events-feed.json, type "event"). Items arriving without a `type`
// field (the current browser payload only ever sends business filings) are
// treated as "business" for backward compatibility.

export const MODEL_ID = 'claude-haiku-5-5'

// Haiku 5.5 defaults to "medium" effort, which thinks readily. Per Anthropic's
// current docs, asking it in the prompt to answer directly doesn't reliably
// stop it from thinking - output_config.effort is the lever that does. This
// is a simple ranking/classification task, so "low" is appropriate: it
// minimizes thinking and skips it outright for simple inputs.
export const EFFORT = 'low'

// With up to 20 items (10 business + 10 event caps below), even brief
// thinking plus the JSON response can run a few thousand tokens - a low cap
// here truncates the JSON mid-response and silently produces zero ranked
// results. Give it enough room for both.
export const MAX_OUTPUT_TOKENS = 16000

// Defensive caps applied before building the prompt, mirroring
// MAX_OPPORTUNITIES and MAX_EVENTS in src/HomePage.jsx - the browser already
// caps each list it sends, but this function must not trust the caller.
export const MAX_BUSINESS_ITEMS = 10
export const MAX_EVENT_ITEMS = 10

// Claude selects at most this many of the strongest candidates to return in
// full detail - it should leave out weak matches rather than padding the
// list up to this number.
export const MAX_RESULTS = 5

// The labels Claude may use for `category` on each ranked item - validated
// in parseRanking() below.
export const CATEGORIES = ['Potential client', 'Potential referral partner', 'Networking event']

function itemType(item) {
  if (item.type === 'business' || item.type === 'event') return item.type
  return item.hostingOrg !== undefined ? 'event' : 'business'
}

// Caps business items and event items separately, then returns them as one
// list in the order Claude should see them (business filings first).
export function capItems(items) {
  const business = items.filter((item) => itemType(item) === 'business').slice(0, MAX_BUSINESS_ITEMS)
  const events = items.filter((item) => itemType(item) === 'event').slice(0, MAX_EVENT_ITEMS)
  return [...business, ...events]
}

export function buildSystemPrompt() {
  return [
    "You are ranking new business filings and upcoming networking events for a financial advisor's prospecting feed.",
    'Only use facts given to you in the user message: for a business, its entity name, business type, filing date, city, ZIP, and whether the ZIP is fully or partially in the coverage area; for an event, its name, event type, date, time, venue, city, hosting organization, tags, and the advisor profile fields provided.',
    'Never invent revenue, industry, headcount, ownership, attendee details, or any other detail not provided.',
    'A business name may be mentioned with hedging, like "the name suggests a financial services firm" - never state an industry as fact just because the name implies one.',
    'Never treat a business name as a person, and never address or refer to anyone by a personal name - no personal names are present in the data, and none should appear in your response.',
    'Whenever a date or time appears in your response text, write it in a friendly, human format, like "Nov 18" and "8:30 AM" - never output a raw ISO date like "2026-11-18" or 24-hour time like "08:30".',
    `From everything given, select at most ${MAX_RESULTS} of the strongest matches for this advisor - considering both businesses and events together. If fewer than ${MAX_RESULTS} items have enough signal to justify inclusion, return fewer. Never pad the list with weak matches just to reach ${MAX_RESULTS}.`,
    'Respond with strict JSON only, no prose: an array of the selected items, each shaped as {"id": string, "rank": number, "category": string, "reason": string, "warmPath": string, "howToStart": {"firstStep": string, "whyThisApproach": string, "opener": string}}.',
    'Rank 1 is the most promising item for this advisor.',
    `category: exactly one of "${CATEGORIES.join('", "')}", chosen only from the facts given. Every event is "Networking event". A business is "Potential client" by default; call it "Potential referral partner" only when its stated entity type or name hints (still hedged, never stated as fact) suggest a profession that refers clients to advisors, such as a CPA, accounting, or legal practice.`,
    'reason: one short sentence, grounded only in the given facts, explaining why this item fits the advisor.',
    'warmPath: one short sentence naming the specific part of the advisor\'s network that could plausibly provide an introduction or connection here, grounded only in the network description given; if nothing in the network plausibly connects, use exactly "none".',
    'Watch for circular warm paths: if a network entry could plausibly be the same organization as the item\'s hosting org (for example, the network says "a local chamber of commerce" and the event\'s hosting org is "Tampa Bay Chamber"), that organization cannot be the connector that introduces the advisor to itself. In that case, phrase warmPath around the advisor\'s own standing with that organization instead - something like "your chamber membership gives you a natural reason to attend, and you can ask chamber staff to introduce you to a few attendees."',
    'howToStart.firstStep: a concrete suggested first step, grounded in the advisor\'s preferred outreach styles and the item\'s own facts.',
    'A business filing is not evidence of a public storefront or an address safe to visit uninvited - its entityType field is only its legal structure, not its line of work or whether it welcomes visitors. Never suggest visiting a business in person as the first step; that is appropriate only for an item the data shows is a public venue open to attendees, such as an event with its own venue and date. For a business, when nothing in the data clarifies its line of work, the first step should be to check whether it has a public website or online listing, not to visit in person.',
    'howToStart.whyThisApproach: one short sentence on why that first step fits this advisor, referencing their preferred outreach style, network, or experience as given.',
    'howToStart.opener: one natural sentence the advisor could actually say to open a conversation, grounded only in the given facts, never naming any person.',
  ].join(' ')
}

function describeBusiness(item) {
  return `- id: ${item.id}, kind: business, name: ${item.name}, type: ${item.entityType}, filed: ${item.date}, city: ${item.city}, zip: ${item.zip}, zip coverage: ${item.zipCoverage}`
}

function describeEvent(item) {
  const tags = (item.tags || []).map((t) => t.label).join(', ')
  const parts = [
    `- id: ${item.id}`,
    'kind: event',
    `name: ${item.name}`,
    `event type: ${item.eventType}`,
    `date: ${item.date}`,
    `time: ${item.startTime}${item.endTime ? `-${item.endTime}` : ''}`,
    item.venue && `venue: ${item.venue}`,
    `city: ${item.city}`,
    `hosting org: ${item.hostingOrg}`,
    tags && `tags: ${tags}`,
  ].filter(Boolean)
  return parts.join(', ')
}

export function buildUserPrompt(items, profile) {
  const profileLines = [
    profile.experience && `Experience: ${profile.experience}`,
    profile.specialties && `Specialties: ${profile.specialties}`,
    profile.currentClients && `Current clients: ${profile.currentClients}`,
    profile.idealClients && `Ideal clients: ${profile.idealClients}`,
    profile.outreachStyles?.length && `Preferred outreach: ${profile.outreachStyles.join(', ')}`,
    profile.network && `Existing network: ${profile.network}`,
  ].filter(Boolean)

  const itemLines = items.map((item) => (itemType(item) === 'event' ? describeEvent(item) : describeBusiness(item)))

  return [
    'Advisor profile:',
    profileLines.length ? profileLines.join('\n') : '(no profile details provided)',
    '',
    'Items to rank (businesses and events together):',
    itemLines.join('\n'),
  ].join('\n')
}

const VALID_CATEGORIES = new Set(CATEGORIES)

export function parseRanking(text, items) {
  const validIds = new Set(items.map((item) => item.id))
  try {
    const match = text.match(/\[[\s\S]*\]/)
    const parsed = JSON.parse(match ? match[0] : text)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((entry) => entry && validIds.has(entry.id))
      .map((entry) => {
        const howToStart = entry.howToStart || {}
        return {
          id: String(entry.id),
          rank: Number(entry.rank) || 0,
          // Defensive fallback - Claude is asked for one of CATEGORIES, but
          // don't trust it to always comply.
          category: VALID_CATEGORIES.has(entry.category) ? entry.category : null,
          reason: String(entry.reason || '').slice(0, 300),
          warmPath: String(entry.warmPath || 'none').slice(0, 300),
          howToStart: {
            firstStep: String(howToStart.firstStep || '').slice(0, 300),
            whyThisApproach: String(howToStart.whyThisApproach || '').slice(0, 300),
            opener: String(howToStart.opener || '').slice(0, 300),
          },
        }
      })
      // Defensive cap - Claude is asked for at most MAX_RESULTS, but don't
      // trust it to always comply.
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_RESULTS)
  } catch {
    return []
  }
}

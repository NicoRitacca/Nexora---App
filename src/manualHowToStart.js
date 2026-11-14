// Template-based "How to get started" content for a pick the advisor added
// themselves (see the "Add to my picks" button in src/HomePage.jsx) - no AI
// call, so it's built only from the item's own fields and the advisor's
// profile, citing nothing else, the same ground rule
// amplify/functions/rank-opportunities/prompt.js gives the real AI prompt.

// The network field is free text - entries may be separated by ";", a line
// break, a comma, or "and" (e.g. "a CPA firm; a chamber of commerce" or "a
// CPA firm, an attorney's office, and a chamber of commerce"). This takes
// the first one and drops a leading article so it reads naturally after
// "Ask your ___" (e.g. "a CPA firm" -> "CPA firm").
function firstNetworkEntry(network) {
  if (!network) return null
  const [first] = network
    .split(/[;\n]+|,\s*|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean)
  if (!first) return null
  return first.replace(/^(a|an|the)\s+/i, '')
}

const OUTREACH_TIPS = {
  'In person': 'Since you prefer in-person outreach, introduce yourself to a few attendees directly at the event.',
  Introductions: 'Since you prefer introductions, ask someone at the event to introduce you to one or two other attendees.',
  Online: "Since you prefer online outreach, look up a few attendees online and follow up with them after the event.",
}

function buildBusinessEntry(item, profile) {
  const firstStep = `Check whether ${item.name} has a public website or listing to learn what it does.`

  const network = firstNetworkEntry(profile.network)
  const warmPath = network ? `Ask your ${network} whether they know the owners.` : undefined

  const specialties = (profile.specialties || '').trim()
  const opener = specialties
    ? `I work with new small businesses on ${specialties}, and I'd love to hear what you're building.`
    : undefined

  return { warmPath, howToStart: { firstStep, opener } }
}

function buildEventEntry(item, profile) {
  const firstStep = 'Register through the event page and plan to arrive a few minutes early.'

  const [firstOutreachStyle] = profile.outreachStyles || []
  const whyThisApproach = firstOutreachStyle ? OUTREACH_TIPS[firstOutreachStyle] : undefined

  const specialties = (profile.specialties || '').trim()
  const opener = specialties
    ? `I work with small businesses on ${specialties}, and I'd love to hear what people here are building.`
    : undefined

  return { howToStart: { firstStep, whyThisApproach, opener } }
}

// Returns an object shaped like the AI's ranking entry (warmPath,
// howToStart.{firstStep,whyThisApproach,opener}) so it can be handed to the
// same TopPickCard that renders an AI pick - just without a category,
// reason, or whyNow, since there's no AI judgment behind it.
export function buildManualEntry(item, profile, isEventItem) {
  return isEventItem ? buildEventEntry(item, profile) : buildBusinessEntry(item, profile)
}

import Anthropic from '@anthropic-ai/sdk'
import type { Schema } from '../../data/resource'
import { MODEL_ID, MAX_OUTPUT_TOKENS, EFFORT, buildSystemPrompt, buildUserPrompt, parseRanking, capItems } from './prompt.js'

type BusinessItem = {
  type?: 'business'
  id: string
  name: string
  entityType: string
  city: string
  zip: string
  date: string
  zipCoverage: 'full' | 'partial'
}

type EventItem = {
  type: 'event'
  id: string
  name: string
  eventType: string
  date: string
  startTime: string
  endTime?: string
  venue?: string
  city: string
  hostingOrg: string
  tags?: { type: string; label: string }[]
}

type RankableItem = BusinessItem | EventItem

type AdvisorProfile = {
  experience?: string
  specialties?: string
  currentClients?: string
  idealClients?: string
  outreachStyles?: string[]
  network?: string
}

type RankingInput = {
  opportunities: RankableItem[]
  profile: AdvisorProfile
}

export const handler: Schema['rankOpportunities']['functionHandler'] = async (event) => {
  const input = event.arguments.input as RankingInput
  const items = capItems(input?.opportunities || [])
  if (items.length === 0) return []

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: MAX_OUTPUT_TOKENS,
    output_config: { effort: EFFORT },
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserPrompt(items, input?.profile || {}) }],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') return []

  return parseRanking(textBlock.text, items)
}

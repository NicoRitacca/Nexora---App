import { type ClientSchema, a, defineData } from '@aws-amplify/backend'
import { rankOpportunities } from '../functions/rank-opportunities/resource'

const schema = a.schema({
  HowToStart: a.customType({
    firstStep: a.string().required(),
    whyThisApproach: a.string().required(),
    opener: a.string().required(),
  }),

  RankedOpportunity: a.customType({
    id: a.string().required(),
    rank: a.integer().required(),
    reason: a.string().required(),
    whyNow: a.string().required(),
    warmPath: a.string().required(),
    howToStart: a.ref('HowToStart').required(),
  }),

  rankOpportunities: a
    .query()
    .arguments({ input: a.json().required() })
    .returns(a.ref('RankedOpportunity').array())
    // No login exists in this app yet, so this runs under Amplify Data's
    // public API-key auth mode - see README notes on who can call it.
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(rankOpportunities)),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
})

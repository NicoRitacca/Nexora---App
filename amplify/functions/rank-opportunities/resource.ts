import { defineFunction, secret } from '@aws-amplify/backend'

export const rankOpportunities = defineFunction({
  name: 'rank-opportunities',
  entry: './handler.ts',
  timeoutSeconds: 28,
  environment: {
    ANTHROPIC_API_KEY: secret('ANTHROPIC_API_KEY'),
  },
})

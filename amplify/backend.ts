import { defineBackend } from '@aws-amplify/backend'
import { data } from './data/resource'
import { rankOpportunities } from './functions/rank-opportunities/resource'

defineBackend({
  data,
  rankOpportunities,
})

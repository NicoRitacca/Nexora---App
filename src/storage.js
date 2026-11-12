const PROFILE_STORAGE_KEY = 'nexora.advisorProfile'

export const EMPTY_PROFILE = {
  experience: '',
  specialties: '',
  currentClients: '',
  idealClients: '',
  outreachStyles: [],
  cities: [],
  zips: '',
  newConversationsPerWeek: '',
  network: '',
}

export function hasSavedProfile() {
  return localStorage.getItem(PROFILE_STORAGE_KEY) !== null
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return EMPTY_PROFILE
    return { ...EMPTY_PROFILE, ...JSON.parse(raw) }
  } catch {
    return EMPTY_PROFILE
  }
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

const ACTIONS_STORAGE_KEY = 'nexora.actions'

export const ACTION_CONVERSATION = 'conversation'
export const ACTION_SAVE = 'save'
export const ACTION_SKIP = 'skip'

function todayStr() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// Monday-starting week key for a "YYYY-MM-DD" date string - used so an
// action only counts toward the goal, or keeps a skip hidden, for the week
// it was made in.
function weekKey(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const daysSinceMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - daysSinceMonday)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

function loadAllActions() {
  try {
    const raw = localStorage.getItem(ACTIONS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Records an advisor's choice (conversation / save / skip) for an
// opportunity id, keyed by today's date per the Action data model in
// SPEC.md.
export function recordAction(id, choice) {
  const actions = loadAllActions()
  actions[id] = { choice, date: todayStr() }
  try {
    localStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(actions))
  } catch {
    // ignore storage errors (e.g. private browsing, quota)
  }
}

// Returns { [opportunityId]: choice } for actions made during the current
// week only - an action from an earlier week no longer hides a skip or
// counts toward this week's conversation goal.
export function loadActionsThisWeek() {
  const actions = loadAllActions()
  const currentWeek = weekKey(todayStr())
  const result = {}
  Object.entries(actions).forEach(([id, action]) => {
    if (weekKey(action.date) === currentWeek) result[id] = action.choice
  })
  return result
}

const INSTALL_BANNER_DISMISSED_KEY = 'nexora.installBannerDismissed'

export function isInstallBannerDismissed() {
  try {
    return localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function dismissInstallBanner() {
  try {
    localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, 'true')
  } catch {
    // ignore storage errors (e.g. private browsing, quota)
  }
}

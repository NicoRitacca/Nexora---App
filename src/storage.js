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

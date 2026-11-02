import { useState } from 'react'
import { loadProfile, saveProfile } from './storage.js'
import { HILLSBOROUGH_CITIES, BORDER_AREA_CITIES } from './hillsboroughCities.js'

const OUTREACH_STYLES = ['In person', 'Introductions', 'Online']

function ProfilePage({ onSaved }) {
  const [profile, setProfile] = useState(loadProfile)

  function updateField(field, value) {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }

  function toggleListValue(field, value) {
    setProfile((prev) => {
      const has = prev[field].includes(value)
      const next = has ? prev[field].filter((v) => v !== value) : [...prev[field], value]
      return { ...prev, [field]: next }
    })
  }

  function handleSave(e) {
    e.preventDefault()
    saveProfile(profile)
    onSaved?.()
  }

  return (
    <form className="form" onSubmit={handleSave}>
      <div className="field">
        <label htmlFor="experience">Experience</label>
        <textarea
          id="experience"
          rows={3}
          placeholder="e.g., 8 years at a regional broker-dealer, background in insurance"
          value={profile.experience}
          onChange={(e) => updateField('experience', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="specialties">Specialties</label>
        <textarea
          id="specialties"
          rows={2}
          placeholder="e.g., retirement planning, small business owners"
          value={profile.specialties}
          onChange={(e) => updateField('specialties', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="currentClients">Current clients</label>
        <textarea
          id="currentClients"
          rows={2}
          placeholder="e.g., retirees, dual-income families"
          value={profile.currentClients}
          onChange={(e) => updateField('currentClients', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="idealClients">Ideal clients</label>
        <textarea
          id="idealClients"
          rows={2}
          placeholder="e.g., small business owners, young professionals"
          value={profile.idealClients}
          onChange={(e) => updateField('idealClients', e.target.value)}
        />
      </div>

      <div className="field">
        <span>Preferred outreach style</span>
        <div className="checkbox-group">
          {OUTREACH_STYLES.map((style) => (
            <label key={style}>
              <input
                type="checkbox"
                checked={profile.outreachStyles.includes(style)}
                onChange={() => toggleListValue('outreachStyles', style)}
              />
              {style}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Cities you cover</span>
        <div className="checkbox-group checkbox-group-scroll">
          {HILLSBOROUGH_CITIES.map((city) => (
            <label key={city}>
              <input
                type="checkbox"
                checked={profile.cities.includes(city)}
                onChange={() => toggleListValue('cities', city)}
              />
              {city}
            </label>
          ))}
        </div>

        <span className="sub-label">Nearby (border areas)</span>
        <div className="checkbox-group checkbox-group-scroll">
          {BORDER_AREA_CITIES.map((city) => (
            <label key={city}>
              <input
                type="checkbox"
                checked={profile.cities.includes(city)}
                onChange={() => toggleListValue('cities', city)}
              />
              {city}
            </label>
          ))}
        </div>

        <label htmlFor="zips" className="sub-label">
          Specific ZIPs (optional)
        </label>
        <input
          id="zips"
          type="text"
          placeholder="e.g., 33602, 33609"
          value={profile.zips}
          onChange={(e) => updateField('zips', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="newConversationsPerWeek">New conversations per week</label>
        <input
          id="newConversationsPerWeek"
          type="text"
          placeholder="e.g., 3 to 5"
          value={profile.newConversationsPerWeek}
          onChange={(e) => updateField('newConversationsPerWeek', e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="network">Existing network</label>
        <span className="hint">
          Describe contacts by type or organization only — no personal names (for example,
          "a CPA firm that serves physicians" or "member of the local chamber of commerce").
        </span>
        <textarea
          id="network"
          rows={4}
          placeholder="e.g., a CPA firm that serves physicians; member of the local chamber of commerce"
          value={profile.network}
          onChange={(e) => updateField('network', e.target.value)}
        />
      </div>

      <div>
        <button type="submit" className="save-button">
          Save profile
        </button>
      </div>
    </form>
  )
}

export default ProfilePage

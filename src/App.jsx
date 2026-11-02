import { useState } from 'react'
import ProfilePage from './ProfilePage.jsx'
import HomePage from './HomePage.jsx'
import { hasSavedProfile } from './storage.js'

function App() {
  const [view, setView] = useState(() => (hasSavedProfile() ? 'home' : 'setup'))

  function handleProfileSaved() {
    setView('home')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="title">Nexora</h1>
        <p className="description">Your companion for new opportunities.</p>

        {view === 'home' && (
          <nav className="nav">
            <button type="button" className="nav-button" onClick={() => setView('profile')}>
              My Profile
            </button>
          </nav>
        )}
        {view === 'profile' && (
          <nav className="nav">
            <button type="button" className="nav-button" onClick={() => setView('home')}>
              ← Back to opportunities
            </button>
          </nav>
        )}
      </header>

      <main>
        {view === 'setup' && (
          <div className="welcome">
            <p className="description">
              Welcome to Nexora! Tell us a bit about your practice so we can find opportunities
              worth a conversation.
            </p>
            <ProfilePage onSaved={handleProfileSaved} />
          </div>
        )}
        {view === 'profile' && <ProfilePage onSaved={handleProfileSaved} />}
        {view === 'home' && <HomePage />}
      </main>
    </div>
  )
}

export default App

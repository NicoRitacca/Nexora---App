import { useState } from 'react'
import LandingPage from './LandingPage.jsx'
import ProfilePage from './ProfilePage.jsx'
import HomePage from './HomePage.jsx'
import InstallBanner from './InstallBanner.jsx'
import { hasSavedProfile } from './storage.js'

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="2.2" />
      <circle cx="19" cy="6" r="2.2" />
      <circle cx="19" cy="18" r="2.2" />
      <line x1="7" y1="11" x2="17" y2="7" />
      <line x1="7" y1="13" x2="17" y2="17" />
    </svg>
  )
}

function App() {
  const [view, setView] = useState(() => (hasSavedProfile() ? 'home' : 'landing'))

  function handleGetStarted() {
    setView(hasSavedProfile() ? 'home' : 'setup')
  }

  function handleProfileSaved() {
    setView('home')
  }

  return (
    <div className="app">
      <header className="app-header">
        <button type="button" className="logo" onClick={() => setView('landing')}>
          <span className="logo-mark">
            <LogoMark />
          </span>
          <span className="logo-text">Nexora</span>
        </button>

        {view === 'landing' && (
          <nav className="nav">
            <button type="button" className="nav-button nav-button-primary" onClick={handleGetStarted}>
              Get Started
            </button>
          </nav>
        )}
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
        {view === 'landing' && <LandingPage onGetStarted={handleGetStarted} />}
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

      <InstallBanner />
    </div>
  )
}

export default App

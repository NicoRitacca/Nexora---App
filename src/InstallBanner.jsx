import { useEffect, useState } from 'react'
import { dismissInstallBanner, isInstallBannerDismissed } from './storage.js'

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

// iPhone only - iPad's larger screen isn't the "phone" case this banner is
// for, and Android tablets drop the "Mobile" token from their user agent so
// this also excludes those.
function detectPhonePlatform() {
  const ua = window.navigator.userAgent
  if (/iPhone/.test(ua)) return 'ios'
  if (/Android/.test(ua) && /Mobile/.test(ua)) return 'android'
  return null
}

// Shows a small "Add to Home Screen" banner on phone browsers that can
// install Nexora but haven't yet. iPhone Safari has no install API, so it
// just explains the manual steps; Android Chrome fires `beforeinstallprompt`,
// which this captures and replays when the user taps Install.
function InstallBanner() {
  const [platform, setPlatform] = useState(null)
  const [installEvent, setInstallEvent] = useState(null)
  const [dismissed, setDismissed] = useState(isInstallBannerDismissed)

  useEffect(() => {
    if (isStandalone()) return
    setPlatform(detectPhonePlatform())

    function handleBeforeInstallPrompt(e) {
      e.preventDefault()
      setInstallEvent(e)
    }
    function handleAppInstalled() {
      dismissInstallBanner()
      setDismissed(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  function handleDismiss() {
    dismissInstallBanner()
    setDismissed(true)
  }

  async function handleInstallClick() {
    if (!installEvent) return
    installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }

  if (dismissed) return null
  // Android: wait for the browser to actually offer an install prompt
  // before showing a button that would otherwise do nothing.
  if (platform === 'android' && !installEvent) return null
  if (platform !== 'ios' && platform !== 'android') return null

  return (
    <div className="install-banner" role="complementary">
      <span className="install-banner-text">
        {platform === 'ios'
          ? 'Add Nexora to your home screen: tap the Share button, then "Add to Home Screen."'
          : 'Add Nexora to your home screen for quick access.'}
      </span>
      <span className="install-banner-actions">
        {platform === 'android' && (
          <button type="button" className="install-banner-install" onClick={handleInstallClick}>
            Install
          </button>
        )}
        <button
          type="button"
          className="install-banner-dismiss"
          aria-label="Dismiss"
          onClick={handleDismiss}
        >
          ×
        </button>
      </span>
    </div>
  )
}

export default InstallBanner

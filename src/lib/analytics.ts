// Google Analytics integration with consent mode
export function initializeAnalytics(googleAnalyticsId: string) {
  // Only run on client side
  if (typeof window === 'undefined') return

  // Add Google Analytics script with consent mode
  const gaScript = document.createElement('script')
  gaScript.async = true
  gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`
  document.head.appendChild(gaScript)

  // Initialize GA with consent mode
  window.dataLayer = window.dataLayer || []
  window.gtag = function(...args: unknown[]) { window.dataLayer.push(args) }
  
  // Initialize with default settings - all denied until consent given
  window.gtag('js', new Date().toISOString())
  window.gtag('config', googleAnalyticsId)
  
  // Initialize consent mode with default settings (everything denied)
  window.gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'wait_for_update': 500 // Wait for consent update before running analytics
  })

  // Listen for consent changes
  window.addEventListener('cookieConsentChange', (event: Event) => {
    const consentEvent = event as CustomEvent<{
      analytics: boolean
      marketing: boolean
      functional: boolean
    }>
    
    if (consentEvent.detail) {
      // Update Google consent settings based on user preferences
      window.gtag('consent', 'update', {
        'analytics_storage': consentEvent.detail.analytics ? 'granted' : 'denied',
        'ad_storage': consentEvent.detail.marketing ? 'granted' : 'denied',
        'ad_user_data': consentEvent.detail.marketing ? 'granted' : 'denied',
        'ad_personalization': consentEvent.detail.marketing ? 'granted' : 'denied'
      })
    }
  })
}

// Add type definitions
declare global {
  interface Window {
    dataLayer: Array<unknown[]>
    gtag: (command: string, action: string, params?: Record<string, unknown>) => void
  }
}
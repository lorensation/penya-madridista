"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

type CookieConsent = {
  essential: boolean
  analytics: boolean
  marketing: boolean
  functional: boolean
}

const defaultConsent: CookieConsent = {
  essential: true, // Essential cookies are always required and cannot be disabled
  analytics: false,
  marketing: false,
  functional: false
}

const COOKIE_CONSENT_KEY = "cookie-consent"

// Cookie utility functions
const setCookie = (name: string, value: string, days: number = 365, path: string = '/') => {
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + days)
  
  const cookieValue = encodeURIComponent(value) + 
    "; expires=" + expirationDate.toUTCString() + 
    "; path=" + path + 
    "; SameSite=Lax"
  
  document.cookie = name + "=" + cookieValue
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _getCookie = (name: string): string | null => {
  const nameEQ = name + "="
  const ca = document.cookie.split(';')
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i]
    while (c.charAt(0) === ' ') c = c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length))
  }
  
  return null
}

const deleteCookie = (name: string, path: string = '/') => {
  setCookie(name, '', -1, path)
}

export default function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false)
  const [consent, setConsent] = useState<CookieConsent>(defaultConsent)
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [hasConsentSaved, setHasConsentSaved] = useState(false)

  // Remove all non-essential cookies when user declines
  const removeNonEssentialCookies = () => {
    removeAnalyticsCookies()
    removeMarketingCookies()
    removeFunctionalCookies()
  }
  
  // Remove analytics cookies
  const removeAnalyticsCookies = useCallback(() => {
    // Common Google Analytics cookies
    deleteCookie('_ga')
    deleteCookie('_gid')
    deleteCookie('_gat')
    
    // Remove cookies with _ga prefix (catch all GA cookies)
    const cookies = document.cookie.split(';')
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      if (cookie.indexOf('_ga') === 0) {
        const cookieName = cookie.split('=')[0]
        deleteCookie(cookieName)
      }
    }
  }, [])
  
  // Remove marketing cookies
  const removeMarketingCookies = useCallback(() => {
    // Common marketing/advertising cookies
    deleteCookie('_fbp') // Facebook Pixel
    deleteCookie('fr') // Facebook
    deleteCookie('IDE') // Google DoubleClick
    deleteCookie('NID') // Google advertising
  }, [])
  
  // Remove functional cookies
  const removeFunctionalCookies = useCallback(() => {
    // Site-specific functional cookies would be removed here
    // This is placeholder for your actual implementation
    // Example:
    deleteCookie('user_preferences')
    deleteCookie('language_preference')
    deleteCookie('theme_preference')
  }, [])
  
  // Apply the consent preferences (enable/disable cookies accordingly)
  const applyConsent = useCallback((consentSettings: CookieConsent) => {
    // Essential cookies are always enabled
    setCookie('essential_consent', 'true', 365)
    
    // For analytics cookies (like Google Analytics)
    if (consentSettings.analytics) {
      setCookie('analytics_consent', 'true', 365)
      
      // Initialize Google Analytics if it exists
      if (typeof window !== 'undefined' && window.gtag) {
        // Enable analytics data collection
        window.gtag('consent', 'update', {
          analytics_storage: 'granted'
        })
      }
    } else {
      deleteCookie('analytics_consent')
      
      // Disable Google Analytics if it exists
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: 'denied'
        })
      }
      
      // Remove existing analytics cookies
      removeAnalyticsCookies()
    }
    
    // For marketing cookies
    if (consentSettings.marketing) {
      setCookie('marketing_consent', 'true', 365)
      
      // Enable marketing features if they exist
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted'
        })
      }
    } else {
      deleteCookie('marketing_consent')
      
      // Disable marketing features if they exist
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied'
        })
      }
      
      // Remove existing marketing cookies
      removeMarketingCookies()
    }
    
    // For functional cookies
    if (consentSettings.functional) {
      setCookie('functional_consent', 'true', 365)
      // Enable functional features here
    } else {
      deleteCookie('functional_consent')
      // Disable functional features here
      
      // Remove existing functional cookies
      removeFunctionalCookies()
    }
    
    // Dispatch an event so other parts of your application 
    // can react to consent changes
    window.dispatchEvent(new CustomEvent('cookieConsentChange', { 
      detail: consentSettings 
    }))
  }, [removeAnalyticsCookies, removeMarketingCookies, removeFunctionalCookies])

  // Check if user has already provided consent
  useEffect(() => {
    setIsMounted(true)
    
    // Wait a moment to avoid hydration errors
    const timer = setTimeout(() => {
      try {
        // First check if we have consent saved in localStorage
        const savedConsent = localStorage.getItem(COOKIE_CONSENT_KEY)
        
        if (savedConsent) {
          const parsedConsent = JSON.parse(savedConsent)
          setConsent(parsedConsent)
          setHasConsentSaved(true)
          
          // If we have saved consent, make sure cookies are applied
          applyConsent(parsedConsent)
        } else {
          // No consent saved yet, show the dialog
          setIsOpen(true)
          setHasConsentSaved(false)
        }
      } catch (error) {
        console.error("Error reading cookie consent from localStorage:", error)
        setIsOpen(true)
        setHasConsentSaved(false)
      }
    }, 1000) // Delay showing the popup for better user experience
    
    return () => clearTimeout(timer)
  }, [applyConsent])

  // Save consent to localStorage and trigger cookies setup accordingly
  const saveConsent = (newConsent: CookieConsent) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(newConsent))
      setConsent(newConsent)
      setIsOpen(false)
      setHasConsentSaved(true)
      applyConsent(newConsent)
      
      // Set a consent cookie that expires in 6 months
      setCookie('cookie-consent-given', 'true', 180)
    } catch (error) {
      console.error("Error saving cookie consent to localStorage:", error)
    }
  }

  // Handle accepting all cookies
  const handleAcceptAll = () => {
    const allConsent: CookieConsent = {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true
    }
    saveConsent(allConsent)
  }

  // Handle declining all non-essential cookies
  const handleDecline = () => {
    const minimalConsent: CookieConsent = {
      essential: true,
      analytics: false,
      marketing: false,
      functional: false
    }
    saveConsent(minimalConsent)
    
    // Remove any existing non-essential cookies
    removeNonEssentialCookies()
  }

  // Handle saving custom preferences
  const handleSavePreferences = () => {
    saveConsent(consent)
    
    // Remove cookies for categories that are not consented
    if (!consent.analytics) removeAnalyticsCookies()
    if (!consent.marketing) removeMarketingCookies() 
    if (!consent.functional) removeFunctionalCookies()
  }

  // Function to open cookie settings dialog
  const openCookieSettings = useCallback(() => {
    setIsCustomizing(true)
    setIsOpen(true)
  }, [])

  // Allow users to update their preferences anytime via a button or link in footer
  useEffect(() => {
    // Add a global function to open cookie settings
    window.openCookieSettings = openCookieSettings
    
    return () => {
      // Clean up
      delete window.openCookieSettings
    }
  }, [openCookieSettings, applyConsent])

  // If not mounted yet (server-side), don't render anything to avoid errors
  if (!isMounted) {
    return null
  }

  return (
    <>
      {/* Replaced Dialog with a corner banner */}
      {isOpen ? (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5">
            <h3 className="text-lg font-bold mb-2">Política de cookies</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Utilizamos cookies para mejorar su experiencia en nuestra web, personalizar contenido y analizar el tráfico.
            </p>
            
            {isCustomizing ? (
              <div className="space-y-3 mb-4">
                {/* Essential Cookies - Always enabled and checked */}
                <div className="flex items-start space-x-3 space-y-0">
                  <Checkbox 
                    id="essential" 
                    checked={consent.essential} 
                    disabled={true} 
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="essential" className="font-semibold">Esenciales</Label>
                    <p className="text-xs text-muted-foreground">
                      Necesarias para el funcionamiento.
                    </p>
                  </div>
                </div>
                
                {/* Analytics Cookies */}
                <div className="flex items-start space-x-3 space-y-0">
                  <Checkbox 
                    id="analytics" 
                    checked={consent.analytics} 
                    onCheckedChange={(checked) => 
                      setConsent({ ...consent, analytics: checked === true })
                    } 
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="analytics" className="font-semibold">Analíticas</Label>
                    <p className="text-xs text-muted-foreground">
                      Ayudan a mejorar el sitio.
                    </p>
                  </div>
                </div>
                
                {/* Marketing Cookies */}
                <div className="flex items-start space-x-3 space-y-0">
                  <Checkbox 
                    id="marketing" 
                    checked={consent.marketing} 
                    onCheckedChange={(checked) => 
                      setConsent({ ...consent, marketing: checked === true })
                    } 
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="marketing" className="font-semibold">Marketing</Label>
                    <p className="text-xs text-muted-foreground">
                      Para contenido personalizado.
                    </p>
                  </div>
                </div>
                
                {/* Functional Cookies */}
                <div className="flex items-start space-x-3 space-y-0">
                  <Checkbox 
                    id="functional" 
                    checked={consent.functional} 
                    onCheckedChange={(checked) => 
                      setConsent({ ...consent, functional: checked === true })
                    } 
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor="functional" className="font-semibold">Funcionales</Label>
                    <p className="text-xs text-muted-foreground">
                      Funcionalidad mejorada.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-sm">
                  Elija cómo desea que usemos cookies en este sitio.
                </p>
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              {isCustomizing ? (
                <>
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-white hover:border hover:border-black hover:text-black"
                      onClick={() => setIsCustomizing(false)}
                    >
                      Atrás
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hover:bg-white hover:border hover:border-black hover:text-black"
                        onClick={handleDecline}
                      >
                        Solo esenciales
                      </Button>
                      <Button
                        size="sm"
                        className="bg-primary text-white hover:bg-white hover:border hover:border-black hover:text-black"
                        onClick={handleSavePreferences}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-white hover:border hover:border-black hover:text-black"
                      onClick={handleDecline}
                    >
                      Rechazar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-white hover:border hover:border-black hover:text-black"
                      onClick={() => setIsCustomizing(true)}
                    >
                      Personalizar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary text-white hover:bg-white hover:border hover:border-black hover:text-black"
                      onClick={handleAcceptAll}
                    >
                      Aceptar todas
                    </Button>
                  </div>
                </>
              )}
              <div className="text-xs text-center">
                <a href="/privacy-policy" className="text-primary hover:underline">
                  Política de Privacidad
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Cookie settings button that appears in corner after consent is given */}
      {isMounted && hasConsentSaved && (
        <button
          onClick={openCookieSettings}
          className="fixed bottom-4 left-4 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-shadow"
          aria-label="Configurar cookies"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
            <path d="M8.5 8.5v.01" />
            <path d="M16 15.5v.01" />
            <path d="M12 12v.01" />
            <path d="M11 17v.01" />
            <path d="M7 14v.01" />
          </svg>
        </button>
      )}
    </>
  )
}

// Add global types for the window object
declare global {
  interface Window {
    openCookieSettings?: () => void;
    gtag: (command: string, action: string, params?: Record<string, unknown>) => void;
  }
}
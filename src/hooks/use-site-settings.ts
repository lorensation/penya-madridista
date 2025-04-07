"use client"

import { useState, useEffect } from "react"
import { SiteSettings, defaultSettings } from "@/lib/site-settings"
import { supabase } from "@/lib/supabase"

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true)
        
        // Fetch settings
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .order('id', { ascending: false })
          .limit(1)
          .single()
        
        if (error) {
          throw new Error(`Error fetching site settings: ${error.message}`)
        }
        
        if (data) {
          setSettings(data as SiteSettings)
        } else {
          setSettings(defaultSettings)
        }
      } catch (err) {
        console.error("Error in useSiteSettings:", err)
        setError(err instanceof Error ? err : new Error('Unknown error fetching site settings'))
        setSettings(defaultSettings)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSettings()
  }, [])

  return { settings, loading, error }
}

// Get a specific setting with a fallback value
export function useSetting<K extends keyof SiteSettings>(
  key: K, 
  fallback?: SiteSettings[K]
) {
  const { settings, loading, error } = useSiteSettings()
  
  const value = settings[key] ?? (fallback !== undefined ? fallback : defaultSettings[key])
  
  return { value, loading, error }
}
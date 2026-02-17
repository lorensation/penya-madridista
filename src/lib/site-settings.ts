import { supabase } from "@/lib/supabase"
import { cache } from "react"

// Define the settings interface
export interface SiteSettings {
  id?: number;
  site_name: string;
  site_description?: string | null;
  contact_email?: string | null;
  support_email?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  enable_blog?: boolean | null;
  enable_subscriptions?: boolean | null;
  footer_text?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  maintenance_mode?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Default settings
export const defaultSettings: SiteSettings = {
  site_name: "Peña Lorenzo Sanz",
  site_description: "Peña Madridista Lorenzo Sanz",
  contact_email: "contacto@penallorenzosanz.com",
  support_email: "soporte@penallorenzosanz.com",
  logo_url: "/logo.png",
  favicon_url: "/favicon.ico",
  primary_color: "#1e40af",
  secondary_color: "#ffffff",
  enable_blog: true,
  enable_subscriptions: true,
  footer_text: "© Peña Lorenzo Sanz. Todos los derechos reservados.",
  meta_description: "Peña Madridista Lorenzo Sanz - Aficionados del Real Madrid",
  meta_keywords: "real madrid, peña, lorenzo sanz, madridistas",
  maintenance_mode: false
}

// Cache the settings to avoid multiple fetches
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    // Fetch settings
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      console.error("Error fetching site settings:", error)
      return defaultSettings
    }
    
    if (data) {
      return data as SiteSettings
    }
    
    return defaultSettings
  } catch (err) {
    console.error("Error in getSiteSettings:", err)
    return defaultSettings
  }
})

// Get a specific setting with a fallback value
export async function getSetting<K extends keyof SiteSettings>(
  key: K, 
  fallback?: SiteSettings[K]
): Promise<SiteSettings[K]> {
  const settings = await getSiteSettings()
  return settings[key] ?? (fallback !== undefined ? fallback : defaultSettings[key])
}

// Client-side settings hook (for use in client components)
export async function useSiteSettings() {
  return await getSiteSettings()
}

// Function to format currency based on site settings
export async function formatCurrency(amount: number): Promise<string> {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

// Check if maintenance mode is enabled
export async function isMaintenanceMode(): Promise<boolean> {
  const settings = await getSiteSettings()
  return settings.maintenance_mode === true
}

// Get site metadata for SEO
export async function getSiteMetadata() {
  const settings = await getSiteSettings()
  
  return {
    title: settings.site_name,
    description: settings.meta_description,
    keywords: settings.meta_keywords,
  }
}

// Get social media links
export async function getSocialLinks() {
  // Social links are not currently stored in site_settings
  return {
    twitter: "",
    facebook: "",
    instagram: "",
  }
}

// Get contact information
export async function getContactInfo() {
  const settings = await getSiteSettings()
  
  return {
    contactEmail: settings.contact_email,
    supportEmail: settings.support_email,
  }
}

// Get subscription information
export async function getSubscriptionInfo() {
  const settings = await getSiteSettings()
  
  return {
    enabled: settings.enable_subscriptions,
    price: 30,
    currency: "EUR",
  }
}

// Get legal documents
export async function getLegalDocuments() {
  // Legal documents are served from dedicated pages, not settings
  return {
    privacyPolicy: "/privacy-policy",
    termsOfService: "/terms-and-conditions",
  }
}

// Get site appearance settings
export async function getAppearanceSettings() {
  const settings = await getSiteSettings()
  
  return {
    logoUrl: settings.logo_url,
    faviconUrl: settings.favicon_url,
    primaryColor: settings.primary_color,
    secondaryColor: settings.secondary_color,
    footerText: settings.footer_text,
  }
}
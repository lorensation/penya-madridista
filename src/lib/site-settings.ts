import { supabase } from "@/lib/supabase"
import { cache } from "react"

// Define the settings interface
export interface SiteSettings {
  id?: number;
  site_name: string;
  site_description: string;
  contact_email: string;
  support_email: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  enable_blog: boolean;
  enable_subscriptions: boolean;
  subscription_price: number;
  subscription_currency: string;
  footer_text: string;
  privacy_policy: string;
  terms_of_service: string;
  meta_description: string;
  meta_keywords: string;
  social_twitter: string;
  social_facebook: string;
  social_instagram: string;
  maintenance_mode: boolean;
  updated_at?: string;
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
  subscription_price: 30,
  subscription_currency: "EUR",
  footer_text: "© Peña Lorenzo Sanz. Todos los derechos reservados.",
  privacy_policy: "",
  terms_of_service: "",
  meta_description: "Peña Madridista Lorenzo Sanz - Aficionados del Real Madrid",
  meta_keywords: "real madrid, peña, lorenzo sanz, madridistas",
  social_twitter: "",
  social_facebook: "",
  social_instagram: "",
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
  const currency = await getSetting('subscription_currency', 'EUR')
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// Check if maintenance mode is enabled
export async function isMaintenanceMode(): Promise<boolean> {
  return await getSetting('maintenance_mode', false)
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
  const settings = await getSiteSettings()
  
  return {
    twitter: settings.social_twitter,
    facebook: settings.social_facebook,
    instagram: settings.social_instagram,
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
    price: settings.subscription_price,
    currency: settings.subscription_currency,
  }
}

// Get legal documents
export async function getLegalDocuments() {
  const settings = await getSiteSettings()
  
  return {
    privacyPolicy: settings.privacy_policy,
    termsOfService: settings.terms_of_service,
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
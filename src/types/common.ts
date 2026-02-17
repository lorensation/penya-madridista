// Common types used throughout the application

import type { User as SupabaseUser } from "@supabase/supabase-js"

// User profile type - extends Supabase User type
export interface UserProfile extends Omit<SupabaseUser, "app_metadata" | "user_metadata"> {
  role?: string
  subscription_status?: string
  user_metadata?: {
    name?: string
    [key: string]: unknown
  }
  app_metadata?: {
    [key: string]: unknown
  }
  [key: string]: unknown
}

// API response type
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

// Form submission result
export interface FormResult {
  success: boolean
  message?: string
  error?: string
  [key: string]: unknown
}

// Blog post type
export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  author?: string
  category?: string
  created_at: string
  updated_at?: string
  image_url?: string
  [key: string]: unknown
}

// Event type
export interface Event {
  id: string
  title: string
  description: string
  date: string
  location?: string
  image_url?: string
  created_at: string
  [key: string]: unknown
}

// Payment transaction result (RedSys)
export interface PaymentResult {
  success: boolean
  order?: string
  dsResponse?: string
  authorizationCode?: string
  error?: string
  errorCode?: string
}

// Define an interface for the member data
export interface MemberData {
  user_id?: number
  id?: string // This should match the auth.users(id)
  user_uuid?: string | null // This should match users(id)
  temp_auth_id?: string
  dni_pasaporte?: string
  name?: string
  apellido1?: string
  apellido2?: string | null
  telefono?: string | number | null
  email?: string
  fecha_nacimiento?: string | Date | null
  es_socio_realmadrid?: boolean
  num_socio?: string | number | null
  socio_carnet_madridista?: boolean
  num_carnet?: string | number | null
  direccion?: string
  direccion_extra?: string | null
  poblacion?: string | null
  cp?: string | number | null
  provincia?: string | null
  pais?: string | null
  nacionalidad?: string
  cargo_directivo?: string | null
  created_at?: string | Date
  role?: string | null
  // Subscription related fields
  subscription_status?: string | null
  subscription_plan?: string | null
  subscription_id?: string | null
  subscription_updated_at?: string | Date | null
  last_four?: string | null
  redsys_token?: string | null
  redsys_token_expiry?: string | null
  email_notifications?: boolean | null
  marketing_emails?: boolean | null
  auth_id?: string // For compatibility
  [key: string]: unknown // Allow for additional properties
}


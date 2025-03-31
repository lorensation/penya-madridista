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

// Stripe session type
export interface StripeSession {
  id: string
  url: string
  [key: string]: unknown
}

// Webhook event type
export interface WebhookEvent {
  id: string
  type: string
  data: {
    object: {
      id: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

// Define an interface for the member data
export interface MemberData {
  id?: string
  user_uuid?: string
  dni_pasaporte?: string
  name?: string
  apellido1?: string
  apellido2?: string
  telefono?: string | number | null
  email?: string
  fecha_nacimiento?: string | Date | null
  es_socio_realmadrid?: boolean
  num_socio?: string | number | null
  socio_carnet_madridista?: boolean
  num_carnet?: string | number | null
  direccion?: string
  direccion_extra?: string
  poblacion?: string
  cp?: string | number | null
  provincia?: string
  pais?: string
  nacionalidad?: string
  [key: string]: unknown // Allow for additional properties
}


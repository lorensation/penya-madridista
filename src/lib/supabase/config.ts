//import { Database } from "@/types/supabase"

// Environment variables are accessible in both client and server components
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// For server-side operations that need more privileges
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Common Supabase options
export const defaultOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
}

// Admin-specific options 
export const adminOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
}

// Base URL for redirects
export const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
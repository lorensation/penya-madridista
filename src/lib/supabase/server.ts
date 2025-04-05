import { createClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"
import { supabaseUrl, supabaseAnonKey, defaultOptions } from "./config"

/**
 * Creates a Supabase client for server-side operations
 * This should be used in server components or server actions
 */
export function createServerSupabaseClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    ...defaultOptions,
    auth: {
      ...defaultOptions.auth,
      persistSession: false, // Server shouldn't persist sessions
    },
  })
}
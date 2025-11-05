import { createClient } from "@supabase/supabase-js"
import { Database } from "@/types/supabase"
import { supabaseUrl, supabaseServiceKey, adminOptions } from "./config"

/**
 * Creates a Supabase client with admin privileges using the service role key
 * This should only be used in secure server contexts like API routes
 */
export function createAdminSupabaseClient() {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations. Please check your environment variables.")
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, adminOptions)
}
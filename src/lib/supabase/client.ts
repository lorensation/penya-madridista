import { createBrowserClient } from "@supabase/ssr"
import { Database } from "@/types/supabase"
import { supabaseUrl, supabaseAnonKey, defaultOptions } from "./config"

// Create a single client instance that can be used in browser environments
// Use a singleton pattern to prevent multiple instances
let browserInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createBrowserSupabaseClient() {
  if (typeof window === "undefined") {
    throw new Error("createBrowserSupabaseClient should only be used in browser environments")
  }

  if (!browserInstance) {
    browserInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, defaultOptions)
  }
  
  return browserInstance
}

// Convenience export for direct usage
export const supabaseClient = typeof window !== "undefined" ? createBrowserSupabaseClient() : null
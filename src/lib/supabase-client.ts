import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

// Create a single client instance that can be used in browser environments
// Use a singleton pattern to prevent multiple instances
let browserInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createBrowserSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('createBrowserSupabaseClient should only be used in browser environments')
  }
  
  if (browserInstance) return browserInstance
  
  browserInstance = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return browserInstance
}

// For backward compatibility with existing code
export const supabase = typeof window !== 'undefined' 
  ? createBrowserSupabaseClient() 
  : createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
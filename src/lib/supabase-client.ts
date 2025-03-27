import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// For backward compatibility with existing code
export const supabase = createBrowserSupabaseClient()


import { createServerClient } from "@supabase/ssr"
import { Database } from "@/types/supabase"
import { supabaseUrl, supabaseAnonKey } from "./config"

/**
 * Creates a Supabase client for server-side operations in App Router.
 * Uses @supabase/ssr `createServerClient` with `getAll`/`setAll` (non-deprecated API).
 *
 * This is async because Next.js 15 `cookies()` returns a Promise.
 * All callers must `await createServerSupabaseClient()`.
 * 
 * Note: `next/headers` is imported dynamically to avoid module-level server-only imports
 * that would breaking client-side module loading.
 */
export async function createServerSupabaseClient() {
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // `setAll` can fail in Server Components (read-only context).
          // This is expected when called from a Server Component.
          // Mutations should go through Server Actions or Route Handlers.
        }
      },
    },
  })
}
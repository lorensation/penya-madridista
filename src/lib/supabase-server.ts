import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import type { CookieOptions } from "@supabase/ssr"
import type { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies"

export function createServerSupabaseClient() {
  // We need to dynamically import next/headers because it's only available in server components
  try {
    // This will throw an error if we're not in a server component
    // Using dynamic import instead of require
    const headers = import("next/headers")
    
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            try {
              // Using Promise-based approach with dynamic import
              const cookieStore = headers.then(module => module.cookies())
              return cookieStore.then(store => 
                store.getAll().map((cookie: RequestCookie) => ({
                  name: cookie.name,
                  value: cookie.value,
                }))
              ).catch(() => [])
            } catch (error) {
              console.error("Error getting cookies:", error)
              return []
            }
          },
          setAll(cookieOptions) {
            try {
              // Using Promise-based approach with dynamic import
              headers.then(module => {
                const cookieStore = module.cookies()
                // We need to return this promise to ensure it completes
                return cookieStore.then(store => {
                  cookieOptions.forEach(({ name, value, ...options }) => {
                    store.set({ name, value, ...options as CookieOptions })
                  })
                })
              }).catch(error => {
                console.error("Error setting cookies:", error)
              })
            } catch (error) {
              console.error("Error setting cookies:", error)
            }
          },
        },
      },
    )
  } catch {
    // If we're not in a server component, return a client that doesn't use cookies
    console.warn("Not in a server component, returning a client without cookie handling")
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return [] },
          setAll() { /* no-op */ },
        },
      },
    )
  }
}
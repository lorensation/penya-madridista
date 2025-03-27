import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import type { CookieOptions } from "@supabase/ssr"

export function createServerActionClient() {
  // We need to dynamically import next/headers because it's only available in server components
  try {
    // This will throw an error if we're not in a server component
    const { cookies } = require("next/headers")
    
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            try {
              const cookieStore = cookies()
              // Type assertion to handle the TypeScript error
              return (cookieStore as any).getAll().map((cookie: any) => ({
                name: cookie.name,
                value: cookie.value,
              }))
            } catch (error) {
              console.error("Error getting cookies:", error)
              return []
            }
          },
          setAll(cookieOptions) {
            try {
              const cookieStore = cookies()
              cookieOptions.forEach(({ name, value, ...options }) => {
                // Type assertion to handle the TypeScript error
                (cookieStore as any).set({ name, value, ...options as CookieOptions })
              })
            } catch (error) {
              console.error("Error setting cookies:", error)
            }
          },
        },
      },
    )
  } catch (error) {
    // If we're not in a server action, return a client that doesn't use cookies
    console.warn("Not in a server action, returning a client without cookie handling")
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
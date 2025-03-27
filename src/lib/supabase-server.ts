import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

export function createServerSupabaseClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieStore = cookies()
          // Type assertion to handle the TypeScript error
          const cookieList = (cookieStore as any).getAll?.() || []
          return cookieList.map((cookie: any) => ({
            name: cookie.name,
            value: cookie.value,
          }))
        },
        setAll(cookieOptions) {
          try {
            const cookieStore = cookies()
            cookieOptions.forEach(({ name, value, ...options }) => {
              // Type assertion to handle the TypeScript error
              (cookieStore as any).set?.({ name, value, ...options })
            })
          } catch (error) {
            // This might fail in middleware or other contexts
            // We can safely ignore this error
          }
        },
      },
    },
  )
}
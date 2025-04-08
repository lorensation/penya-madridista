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
    browserInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      ...defaultOptions,
      cookies: {
        get(name: string) {
          return document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1]
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean }) {
          let cookie = `${name}=${value}`
          if (options.path) cookie += `; path=${options.path}`
          if (options.maxAge) cookie += `; max-age=${options.maxAge}`
          if (options.domain) cookie += `; domain=${options.domain}`
          if (options.secure) cookie += `; secure`
          document.cookie = cookie
        },
        remove(name: string, options: { path?: string }) {
          document.cookie = `${name}=; max-age=0${options.path ? `; path=${options.path}` : ''}`
        },
      },
    })
  }
  
  return browserInstance
}

// Convenience export for direct usage
export const supabaseClient = typeof window !== "undefined" ? createBrowserSupabaseClient() : null
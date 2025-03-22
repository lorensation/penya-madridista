import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Environment variables are accessible in both client and server components
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// For server-side operations that need more privileges 
const supabaseServiceKey = process.env.SUPABASE_WEBHOOK_SECRET

// Create a single client instance that can be used everywhere
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// For server-side operations that need admin privileges
export const getServiceSupabase = () => {
  if (!supabaseServiceKey) {
    console.warn("SUPABASE_WEBHOOK_SECRET is not defined")
    return supabase
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Auth related functions
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
    },
  })

  return { data, error }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password`,
  })

  return { data, error }
}

// User profile functions
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase.from("webusers").select("*").eq("id", userId).single()

  return { data, error }
}

export async function updateUserProfile(userId: string, updates: any) {
  const { data, error } = await supabase.from("webusers").update(updates).eq("id", userId).select()

  return { data, error }
}

// Member functions
export async function createMember(memberData: any) {
  const { data, error } = await supabase.from("miembros").insert(memberData).select()

  return { data, error }
}

export async function getMember(userId: string) {
  const { data, error } = await supabase.from("miembros").select("*").eq("user_id", userId).single()

  return { data, error }
}

export async function updateMember(userId: string, updates: any) {
  const { data, error } = await supabase.from("miembros").update(updates).eq("user_id", userId).select()

  return { data, error }
}


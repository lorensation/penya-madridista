import { createClient } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"

// Environment variables are accessible in both client and server components
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// For server-side operations that need more privileges
//const supabaseServiceKey = process.env.SUPABASE_WEBHOOK_SECRET

// Create a single client instance that can be used in browser environments
// Use a singleton pattern to prevent multiple instances
let browserInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export const createBrowserSupabaseClient = () => {
  if (typeof window === "undefined") {
    throw new Error("createBrowserSupabaseClient should only be used in browser environments")
  }

  if (browserInstance) return browserInstance

  browserInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  return browserInstance
}

// For backward compatibility with existing code
export const supabase =
  typeof window !== "undefined" ? createBrowserSupabaseClient() : createClient<Database>(supabaseUrl, supabaseAnonKey)

// For server-side operations that need admin privileges
export const getServiceSupabase = () => {
  const supabaseServiceKey = process.env.SUPABASE_WEBHOOK_SECRET

  if (!supabaseServiceKey) {
    console.error("SUPABASE_WEBHOOK_SECRET is not defined - admin operations will fail")
    throw new Error("Service role key is required for admin operations")
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
  const client =
    typeof window !== "undefined" ? createBrowserSupabaseClient() : createClient<Database>(supabaseUrl, supabaseAnonKey)

  const { data, error } = await client.auth.signUp({
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
  const client =
    typeof window !== "undefined" ? createBrowserSupabaseClient() : createClient<Database>(supabaseUrl, supabaseAnonKey)

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

export async function signOut() {
  const client =
    typeof window !== "undefined" ? createBrowserSupabaseClient() : createClient<Database>(supabaseUrl, supabaseAnonKey)

  const { error } = await client.auth.signOut()
  return { error }
}

export async function resetPassword(email: string) {
  const client =
    typeof window !== "undefined" ? createBrowserSupabaseClient() : createClient<Database>(supabaseUrl, supabaseAnonKey)

  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password`,
  })

  return { data, error }
}

// User profile functions
export async function getUserProfile() {
  const client =
    typeof window !== "undefined" ? createBrowserSupabaseClient() : createClient<Database>(supabaseUrl, supabaseAnonKey)

  // Get the auth user
  const { data: authUser } = await client.auth.getUser()

  if (!authUser?.user) {
    return { data: null, error: new Error("User not found") }
  }

  // Get user from the users table
  const { data, error } = await client.from("users").select("*").eq("id", authUser.user.id).single()

  return { data, error }
}

export async function updateUserProfile(updates: Record<string, unknown>) {
  const client =
    typeof window !== "undefined" ? createBrowserSupabaseClient() : createClient<Database>(supabaseUrl, supabaseAnonKey)

  // Get the auth user
  const { data: authUser } = await client.auth.getUser()

  if (!authUser?.user) {
    return { data: null, error: new Error("User not found") }
  }

  // Update user in the users table
  const { data, error } = await client.from("users").update(updates).eq("id", authUser.user.id).select()

  return { data: data?.[0] || null, error }
}

// Member functions
export async function createMember(memberData: Record<string, unknown>) {
  const client =
    typeof window !== "undefined" ? createBrowserSupabaseClient() : createClient<Database>(supabaseUrl, supabaseAnonKey)

  // Get the auth user
  const { data: authUser } = await client.auth.getUser()

  if (!authUser?.user) {
    return { data: null, error: new Error("Auth user not found") }
  }

  // First update the users table to mark as member
  const { error: userError } = await client.from("users").update({ is_member: true }).eq("id", authUser.user.id)

  if (userError) {
    return { data: null, error: userError }
  }

  // Then create the member record
  const { data, error } = await client
    .from("miembros")
    .insert({
      user_uuid: authUser.user.id,
      auth_id: authUser.user.id, // Keep for backward compatibility
      ...memberData,
    })
    .select()

  return { data, error }
}

export async function getMember() {
  const client =
    typeof window !== "undefined" ? createBrowserSupabaseClient() : createClient<Database>(supabaseUrl, supabaseAnonKey)

  // Get the auth user
  const { data: authUser } = await client.auth.getUser()

  if (!authUser?.user) {
    return { data: null, error: new Error("User not found") }
  }

  // Get member by user_uuid
  const { data, error } = await client.from("miembros").select("*").eq("user_uuid", authUser.user.id).single()

  return { data, error }
}

export async function updateMember(updates: Record<string, unknown>) {
  const client =
    typeof window !== "undefined" ? createBrowserSupabaseClient() : createClient<Database>(supabaseUrl, supabaseAnonKey)

  // Get the auth user
  const { data: authUser } = await client.auth.getUser()

  if (!authUser?.user) {
    return { data: null, error: new Error("User not found") }
  }

  // Update member by user_uuid
  const { data, error } = await client.from("miembros").update(updates).eq("user_uuid", authUser.user.id).select()

  return { data: data?.[0] || null, error }
}

// Add a function to check if a user is a member
export async function checkMembershipStatus() {
  const client =
    typeof window !== "undefined" ? createBrowserSupabaseClient() : createClient<Database>(supabaseUrl, supabaseAnonKey)

  // Get the auth user
  const { data: authUser } = await client.auth.getUser()

  if (!authUser?.user) {
    return { isMember: false, error: new Error("User not found") }
  }

  // Check membership status in users table
  const { data, error } = await client.from("users").select("is_member").eq("id", authUser.user.id).single()

  if (error) {
    return { isMember: false, error }
  }

  return { isMember: data?.is_member || false, error: null }
}
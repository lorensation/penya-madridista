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
  // Get the auth user
  const { data: authUser } = await supabase.auth.getUser()

  if (!authUser?.user) {
    return { data: null, error: new Error("User not found") }
  }

  // Get user from the users table
  const { data, error } = await supabase.from("users").select("*").eq("id", authUser.user.id).single()

  return { data, error }
}

export async function updateUserProfile(userId: string, updates: any) {
  // Get the auth user
  const { data: authUser } = await supabase.auth.getUser()

  if (!authUser?.user) {
    return { data: null, error: new Error("User not found") }
  }

  // Update user in the users table
  const { data, error } = await supabase.from("users").update(updates).eq("id", authUser.user.id).select()

  return { data: data?.[0] || null, error }
}

// Member functions
export async function createMember(memberData: any) {
  // Get the auth user
  const { data: authUser } = await supabase.auth.getUser()

  if (!authUser?.user) {
    return { data: null, error: new Error("Auth user not found") }
  }

  // First update the users table to mark as member
  const { error: userError } = await supabase.from("users").update({ is_member: true }).eq("id", authUser.user.id)

  if (userError) {
    return { data: null, error: userError }
  }

  // Get the user record to get the numeric ID if needed
  const { data: userData, error: userFetchError } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUser.user.id)
    .single()

  if (userFetchError) {
    return { data: null, error: userFetchError }
  }

  // Then create the member record
  const { data, error } = await supabase
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
  // Get the auth user
  const { data: authUser } = await supabase.auth.getUser()

  if (!authUser?.user) {
    return { data: null, error: new Error("User not found") }
  }

  // Get member by user_uuid
  const { data, error } = await supabase.from("miembros").select("*").eq("user_uuid", authUser.user.id).single()

  return { data, error }
}

export async function updateMember(updates: any) {
  // Get the auth user
  const { data: authUser } = await supabase.auth.getUser()

  if (!authUser?.user) {
    return { data: null, error: new Error("User not found") }
  }

  // Update member by user_uuid
  const { data, error } = await supabase.from("miembros").update(updates).eq("user_uuid", authUser.user.id).select()

  return { data: data?.[0] || null, error }
}

// Add a function to check if a user is a member
export async function checkMembershipStatus() {
  // Get the auth user
  const { data: authUser } = await supabase.auth.getUser()

  if (!authUser?.user) {
    return { isMember: false, error: new Error("User not found") }
  }

  // Check membership status in users table
  const { data, error } = await supabase.from("users").select("is_member").eq("id", authUser.user.id).single()

  if (error) {
    return { isMember: false, error }
  }

  return { isMember: data?.is_member || false, error: null }
}



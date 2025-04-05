import { createBrowserSupabaseClient } from "./client"
import { createServerSupabaseClient } from "./server"
import { getCurrentUser } from "./auth-service"

/**
 * Get the appropriate Supabase client based on the environment
 */
function getClient() {
  return typeof window !== "undefined" 
    ? createBrowserSupabaseClient() 
    : createServerSupabaseClient()
}

/**
 * Get the current user's profile data
 */
export async function getUserProfile() {
  const client = getClient()
  
  // Get the auth user
  const { data: authUser, error: authError } = await getCurrentUser()

  if (authError || !authUser?.user) {
    return { data: null, error: authError || new Error("User not found") }
  }

  // Get user from the users table
  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("id", authUser.user.id)
    .single()

  return { data, error }
}

/**
 * Update the current user's profile data
 */
export async function updateUserProfile(updates: Record<string, unknown>) {
  const client = getClient()
  
  // Get the auth user
  const { data: authUser, error: authError } = await getCurrentUser()

  if (authError || !authUser?.user) {
    return { data: null, error: authError || new Error("User not found") }
  }

  // Update user in the users table
  const { data, error } = await client
    .from("users")
    .update(updates)
    .eq("id", authUser.user.id)
    .select()

  return { data: data?.[0] || null, error }
}

/**
 * Check if the current user is a member
 */
export async function checkMembershipStatus() {
  const client = getClient()
  
  // Get the auth user
  const { data: authUser, error: authError } = await getCurrentUser()

  if (authError || !authUser?.user) {
    return { isMember: false, error: authError || new Error("User not found") }
  }

  // Check membership status in users table
  const { data, error } = await client
    .from("users")
    .select("is_member")
    .eq("id", authUser.user.id)
    .single()

  if (error) {
    return { isMember: false, error }
  }

  return { isMember: data?.is_member || false, error: null }
}
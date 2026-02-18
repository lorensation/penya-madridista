import { createBrowserSupabaseClient } from "./client"
import { createServerSupabaseClient } from "./server"
import { baseUrl } from "./config"

/**
 * Get the appropriate Supabase client based on the environment
 */
async function getClient() {
  return typeof window !== "undefined" 
    ? createBrowserSupabaseClient() 
    : await createServerSupabaseClient()
}

/**
 * Register a new user with email and password
 */
export async function signUp(email: string, password: string, name: string) {
  const client = await getClient()
  
  return await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      emailRedirectTo: `${baseUrl}/auth/callback`,
    },
  })
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const client = await getClient()
  
  return await client.auth.signInWithPassword({
    email,
    password,
  })
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const client = await getClient()
  
  return await client.auth.signOut()
}

/**
 * Send a password reset email
 */
export async function resetPassword(email: string) {
  const client = await getClient()
  
  return await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/reset-password`,
  })
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const client = await getClient()
  return await client.auth.getUser()
}
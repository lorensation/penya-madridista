import type { MemberData } from "@/types/common"

// Re-export everything from the modular files
export * from "./supabase/config"
export * from "./supabase/client"
export * from "./supabase/server"
export * from "./supabase/admin"
export * from "./supabase/auth-service"
export * from "./supabase/user-service"
export * from "./supabase/member-service"

// Import specific functions for backward compatibility
import { createBrowserSupabaseClient } from "./supabase/client"
import { createServerSupabaseClient } from "./supabase/server"
import { createAdminSupabaseClient } from "./supabase/admin"
import { 
  signUp, 
  signIn, 
  signOut, 
  resetPassword, 
  getCurrentUser 
} from "./supabase/auth-service"
import { 
  getUserProfile, 
  updateUserProfile, 
  checkMembershipStatus 
} from "./supabase/user-service"
import { 
  createMember, 
  getMember, 
  updateMember 
} from "./supabase/member-service"

/**
 * Legacy Supabase client for backward compatibility (CLIENT-SIDE ONLY).
 *
 * In server contexts (server components, server actions, API routes)
 * use `const supabase = await createServerSupabaseClient()` instead.
 */
export const supabase = typeof window !== "undefined" 
  ? createBrowserSupabaseClient() 
  : (null as unknown as ReturnType<typeof createBrowserSupabaseClient>)

/**
 * Legacy function to get admin Supabase client for backward compatibility
 */
export const getServiceSupabase = createAdminSupabaseClient

// Re-export all the original functions for backward compatibility
// This ensures all existing code using these functions will continue to work

// Original auth functions
export { 
  signUp, 
  signIn, 
  signOut, 
  resetPassword,
  getCurrentUser
}

// Original profile functions
export { 
  getUserProfile, 
  updateUserProfile,
  checkMembershipStatus
}

// Original member functions
export { 
  createMember, 
  getMember, 
  updateMember
}

/**
 * Creates appropriate Supabase client based on environment (async).
 * Server contexts return a Promise; browser contexts return sync.
 */
export async function createSupabaseClient() {
  return typeof window !== "undefined"
    ? createBrowserSupabaseClient()
    : await createServerSupabaseClient()
}

/**
 * Gets the current authenticated user
 * @returns Promise with user data and error if any
 */
export async function getAuthUser() {
  return await getCurrentUser()
}

/**
 * Utility to check if code is running in browser environment
 * @returns boolean indicating if code is running in browser
 */
export function isClientSide(): boolean {
  return typeof window !== "undefined"
}

/**
 * Utility to check if code is running in server environment
 * @returns boolean indicating if code is running in server
 */
export function isServerSide(): boolean {
  return typeof window === "undefined"
}

/**
 * Utility function to get the appropriate client based on context (async).
 * Useful for functions that need to work in both environments.
 */
export async function getClient() {
  return isClientSide() 
    ? createBrowserSupabaseClient() 
    : await createServerSupabaseClient()
}

/**
 * Utility function to prepare member data for database operations
 * @param memberData The member data to prepare
 * @param userId The user ID to associate with the member
 * @returns Prepared member data
 */
export function prepareMemberData(memberData: MemberData, userId: string): MemberData {
  return {
    ...memberData,
    user_uuid: userId,
    created_at: memberData.created_at || new Date().toISOString()
  }
}

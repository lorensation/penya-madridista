//lib/auth.ts
"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Checks if the current user has admin privileges
 * @returns An object containing user and profile information if admin, null otherwise
 */
export async function checkAdminStatus() {
  try {
    const supabase = await createServerSupabaseClient();
    // Get the current user session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error retrieving session:", sessionError);
      return null;
    }

    if (!session) {
      console.warn("No active session found");
      return null;
    }

    console.log("Session user ID:", session.user.id);
    console.log("Session user email:", session.user.email);

    // Get the member profile using the helper function
    const profile = await getMemberProfile(session.user.id);
    
    if (!profile) {
      console.warn("No profile found for user");
      return null;
    }

    if (profile.role !== "admin") {
      console.warn("User is not an admin. Role:", profile.role);
      return null;
    }

    return {
      user: session.user,
      profile,
    };
  } catch (error) {
    console.error("Unexpected error in admin check:", error);
    return null;
  }
}

/**
 * Checks if a user has a specific role
 * @param role The role to check for (e.g., "admin", "user")
 * @returns An object containing user and profile information if the role matches, null otherwise
 */
export async function checkUserRole(role: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return null;
    }

    const profile = await getMemberProfile(session.user.id);

    if (!profile) {
      return null;
    }

    if (profile.role !== role) {
      return null;
    }

    return {
      user: session.user,
      profile,
    };
  } catch (error) {
    console.error("Error checking user role:", error);
    return null;
  }
}

/**
 * Get basic user data from the users table
 * @returns Basic user information or null if not found
 */
export async function getBasicUserData() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, email, name, is_member')
      .eq('id', session.user.id)
      .single();
      
    if (error || !userData) {
      console.error('Error fetching basic user data:', error);
      return null;
    }
    
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      isMember: userData.is_member
    };
  } catch (error) {
    console.error("Error getting basic user data:", error);
    return null;
  }
}

/**
 * Get detailed member data from the miembros table
 * @returns Full member profile or null if not found
 */
export async function getMemberData() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    return await getMemberProfile(session.user.id);
  } catch (error) {
    console.error("Error getting member data:", error);
    return null;
  }
}

/**
 * Helper function to get a member profile using multiple lookup methods
 * @param userId The user's ID
 * @param email The user's email
 * @returns Member profile or null if not found
 */
async function getMemberProfile(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: profileByUuid, error: uuidError } = await supabase
    .from("miembros")
    .select("*")
    .eq("user_uuid", userId)
    .maybeSingle();
    
  if (!uuidError && profileByUuid) {
    console.log("User found via user_uuid match");
    return profileByUuid;
  }

  if (uuidError) {
    console.error("Error loading member profile by user_uuid:", uuidError);
  }

  console.warn("User profile not found by any method");
  return null;
}

/**
 * Get basic user data from the users table (Server Component version)
 * Now unified: uses the same createServerSupabaseClient as all server contexts.
 */
export async function getBasicUserDataSSR() {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, email, name, is_member')
      .eq('id', session.user.id)
      .single();
      
    if (error || !userData) {
      console.error('Error fetching basic user data:', error);
      return null;
    }
    
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      isMember: userData.is_member
    };
  } catch (error) {
    console.error("Error getting basic user data (SSR):", error);
    return null;
  }
}

/**
 * Get detailed member data from the miembros table (Server Component version)
 * Now unified: uses the same createServerSupabaseClient as all server contexts.
 */
export async function getMemberDataSSR() {
  const supabase = await createServerSupabaseClient();
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: memberByUuid, error: uuidError } = await supabase
      .from('miembros')
      .select('*')
      .eq('user_uuid', session.user.id)
      .maybeSingle();

    if (uuidError) {
      console.error("Error loading member data by user_uuid (SSR):", uuidError);
    }

    return memberByUuid ?? null;
  } catch (error) {
    console.error("Error getting member data (SSR):", error);
    return null;
  }
}

/**
 * Check if the current user has admin privileges (Server Component version)
 */
export async function checkAdminStatusSSR() {
  const memberData = await getMemberDataSSR();
  
  if (!memberData || memberData.role !== 'admin') {
    return null;
  }
  
  return memberData;
}

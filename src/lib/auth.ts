///lib/auth.ts
import { supabase } from "@/lib/supabase";
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Checks if the current user has admin privileges
 * @returns An object containing user and profile information if admin, null otherwise
 */
export async function checkAdminStatus() {
  try {
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
    const profile = await getMemberProfile(session.user.id, session.user.email);
    
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
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return null;
    }

    const profile = await getMemberProfile(session.user.id, session.user.email);

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    return await getMemberProfile(session.user.id, session.user.email);
  } catch (error) {
    console.error("Error getting member data:", error);
    return null;
  }
}

/**
 * Get subscription status for the current user
 * @returns Subscription information or default values if not found
 */
export async function getSubscriptionStatus() {
  try {
    const memberData = await getMemberData();
    
    if (!memberData) {
      return {
        status: 'unknown',
        plan: null,
        lastUpdated: null
      };
    }
    
    return {
      status: memberData.subscription_status || 'inactive',
      plan: memberData.subscription_plan,
      lastUpdated: memberData.subscription_updated_at,
      customerId: memberData.stripe_customer_id,
      lastFour: memberData.last_four
    };
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return {
      status: 'error',
      plan: null,
      lastUpdated: null
    };
  }
}

/**
 * Helper function to get a member profile using multiple lookup methods
 * @param userId The user's ID
 * @param email The user's email
 * @returns Member profile or null if not found
 */
async function getMemberProfile(userId: string, email?: string) {
  // 1. Try by user_uuid
  const { data: profileByUuid, error: uuidError } = await supabase
    .from("miembros")
    .select("*")
    .eq("user_uuid", userId)
    .single();
    
  if (!uuidError && profileByUuid) {
    console.log("User found via user_uuid match");
    return profileByUuid;
  }
  
  // 2. Try by id
  const { data: profileById, error: idError } = await supabase
    .from("miembros")
    .select("*")
    .eq("id", userId)
    .single();
    
  if (!idError && profileById) {
    console.log("User found via id match");
    return profileById;
  }
  
  // 3. Try by email as final fallback
  if (email) {
    console.log("Attempting email-based lookup for:", email);
    const { data: profileByEmail, error: emailError } = await supabase
      .from("miembros")
      .select("*")
      .eq("email", email)
      .single();
      
    if (!emailError && profileByEmail) {
      console.log("User found via email match");
      return profileByEmail;
    }
  }
  
  console.warn("User profile not found by any method");
  return null;
}

/**
 * Server component version of the auth check functions
 * These use the createServerComponentClient for use in React Server Components
 */

/**
 * Get basic user data from the users table (Server Component version)
 */
export async function getBasicUserDataSSR() {
  const supabase = createServerComponentClient({ cookies });
  
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
 */
export async function getMemberDataSSR() {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    // Try all three methods to find the member
    let memberData = null;
    
    // 1. Try by user_uuid
    const { data: memberByUuid, error: uuidError } = await supabase
      .from('miembros')
      .select('*')
      .eq('user_uuid', session.user.id)
      .single();
      
    if (!uuidError && memberByUuid) {
      memberData = memberByUuid;
    } else {
      // 2. Try by id
      const { data: memberById, error: idError } = await supabase
        .from('miembros')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (!idError && memberById) {
        memberData = memberById;
      } else if (session.user.email) {
        // 3. Try by email
        const { data: memberByEmail, error: emailError } = await supabase
          .from('miembros')
          .select('*')
          .eq('email', session.user.email)
          .single();
          
        if (!emailError && memberByEmail) {
          memberData = memberByEmail;
        }
      }
    }
    
    return memberData;
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
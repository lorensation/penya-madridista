import { supabase } from "@/lib/supabase";

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

    // Get the user profile from the miembros table
    const { data: profile, error: profileError } = await supabase
      .from("miembros")
      .select("*")
      .eq("user_uuid", session.user.id)
      .single();

    if (profileError || !profile) {
      console.error("Error retrieving profile by user_uuid:", profileError, "for user ID:", session.user.id);
      
      // Try alternative lookup by id field as fallback
      const { data: profileAlt, error: profileAltError } = await supabase
        .from("miembros")
        .select("*")
        .eq("id", session.user.id)
        .single();
        
      if (profileAltError || !profileAlt) {
        console.error("Alternative lookup by id also failed:", profileAltError);
        
        // If both UUID lookups failed, try email lookup as final fallback
        if (session.user.email) {
          console.log("Attempting email-based lookup for:", session.user.email);
          const { data: profileByEmail, error: emailError } = await supabase
            .from("miembros")
            .select("*")
            .eq("email", session.user.email)
            .single();
            
          if (emailError || !profileByEmail) {
            console.error("Email-based lookup also failed:", emailError);
            return null;
          }
          
          if (profileByEmail.role !== "admin") {
            console.warn("User found by email but is not an admin. Role:", profileByEmail.role);
            return null;
          }
          
          console.log("User authenticated as admin via email match");
          return {
            user: session.user,
            profile: profileByEmail,
          };
        }
        
        return null;
      }
      
      if (profileAlt.role !== "admin") {
        console.warn("User found but is not an admin. Role:", profileAlt.role);
        return null;
      }
      
      console.log("User authenticated as admin via id match");
      return {
        user: session.user,
        profile: profileAlt,
      };
    }

    if (profile.role !== "admin") {
      console.warn("User is not an admin. Role:", profile.role);
      return null;
    }

    console.log("User authenticated as admin via user_uuid match");
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

    // Try all three methods to find the user profile
    let profile = null;
    
    // 1. Try by user_uuid
    const { data: profileByUuid } = await supabase
      .from("miembros")
      .select("*")
      .eq("user_uuid", session.user.id)
      .single();
      
    if (profileByUuid) {
      profile = profileByUuid;
    } else {
      // 2. Try by id
      const { data: profileById } = await supabase
        .from("miembros")
        .select("*")
        .eq("id", session.user.id)
        .single();
        
      if (profileById) {
        profile = profileById;
      } else if (session.user.email) {
        // 3. Try by email
        const { data: profileByEmail } = await supabase
          .from("miembros")
          .select("*")
          .eq("email", session.user.email)
          .single();
          
        if (profileByEmail) {
          profile = profileByEmail;
        }
      }
    }

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
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";

export interface BlockedUserInfo {
  id: string;
  reason: string;
  reason_type: string;
  created_at: string;
  notes?: string | null;
}

/**
 * Checks if a user is blocked, to be used on the server-side
 * @param userId The ID of the user to check
 * @returns An object with blocked status and reason if blocked
 */
export async function checkUserBlocked(userId: string): Promise<{ 
  blocked: boolean; 
  info?: BlockedUserInfo;
}> {
  const supabase = await createServerSupabaseClient();
  
  // Check if the user exists in the blocked_users table
  const { data, error } = await supabase
    .from("blocked_users")
    .select("id, reason, reason_type, created_at, notes")
    .eq("user_id", userId)
    .single();
  
  if (error) {
    // If error is PGRST116 (not found), user is not blocked
    if (error.code === "PGRST116") {
      return { blocked: false };
    }
    
    // For any other error, log it but don't block the user
    console.error("Error checking if user is blocked:", error);
    return { blocked: false };
  }
  
  // User is blocked
  if (data) {
    return { 
      blocked: true,
      info: data as BlockedUserInfo
    };
  }
  
  // Default return if no data found
  return { blocked: false };
}

/**
 * Middleware function to check if user is blocked and redirect if needed
 * Called during auth flow
 */
export async function checkAndHandleBlockedUser(userId: string | undefined) {
  if (!userId) return false;
  
  const { blocked, info } = await checkUserBlocked(userId);
  
  if (blocked) {
    // Store reason in URL params for the blocked page
    const params = new URLSearchParams();
    if (info?.reason_type) {
      params.append("reason", info.reason_type);
    }
    
    // Redirect to blocked page with reason
    redirect(`/blocked?${params.toString()}`);
  }
  
  return false;
}

/**
 * Client-side function to check if user is blocked
 * @param userId The ID of the user to check
 */
export async function checkUserBlockedClient(userId: string): Promise<{
  blocked: boolean;
  info?: BlockedUserInfo;
}> {
  const supabase = createBrowserSupabaseClient();
  
  const { data, error } = await supabase
    .from("blocked_users")
    .select("id, reason, reason_type, created_at, notes")
    .eq("user_id", userId)
    .single();
  
  if (error) {
    // If error is PGRST116 (not found), user is not blocked
    if (error.code === "PGRST116") {
      return { blocked: false };
    }
    
    // For any other error, log it but don't block the user
    console.error("Error checking if user is blocked:", error);
    return { blocked: false };
  }
  
  // User is blocked
  if (data) {
    return { 
      blocked: true,
      info: data as BlockedUserInfo
    };
  }
  
  // Default return if no data found
  return { blocked: false };
}
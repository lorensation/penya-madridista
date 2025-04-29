"use server"

import { createAdminSupabaseClient } from "@/lib/supabase";
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export type BlockReasonType = 
  | 'spam'
  | 'harassment'
  | 'inappropriate_content'
  | 'fake_account'
  | 'payment_issues'
  | 'multiple_accounts'
  | 'violation_of_terms'
  | 'other';

export interface BlockedUser {
  id: string;
  user_id: string;
  reason_type: BlockReasonType;
  reason?: string | null;
  blocked_by?: string | null;
  blocked_at: string;
  notes?: string | null;
}

/**
 * Check if a user is blocked
 * @param userId The user ID to check
 * @returns The blocked user record if blocked, null otherwise
 */
export async function isUserBlocked(userId: string): Promise<BlockedUser | null> {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from('blocked_users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data as BlockedUser;
  } catch (error) {
    console.error("Error checking if user is blocked:", error);
    return null;
  }
}

/**
 * Block a user
 * @param userId The user ID to block
 * @param reasonType The reason for blocking
 * @param reasonDetails Additional details about the reason
 * @param notes Optional admin notes
 * @returns Success status and error if any
 */
export async function blockUser(
  adminId: string,
  userId: string,
  reasonType: BlockReasonType,
  reasonDetails?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminSupabaseClient();
    
    // Check if user is already blocked
    const { data: existingBlock } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (existingBlock) {
      // Update existing block
      const { error } = await supabase
        .from('blocked_users')
        .update({
          reason_type: reasonType,
          reason: reasonDetails || null,
          notes: notes || null,
          blocked_by: adminId,
          created_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (error) {
        console.error("Error updating blocked user:", error);
        return { success: false, error: error.message };
      }
    } else {
      // Create new block
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          user_id: userId,
          reason_type: reasonType,
          reason: reasonDetails || null,
          notes: notes || null,
          blocked_by: adminId
        });
      
      if (error) {
        console.error("Error blocking user:", error);
        return { success: false, error: error.message };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Unexpected error in blockUser:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Unblock a user
 * @param userId The user ID to unblock
 * @returns Success status and error if any
 */
export async function unblockUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminSupabaseClient();
    
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error("Error unblocking user:", error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Unexpected error in unblockUser:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Get all blocked users 
 * @returns List of blocked users
 */
export async function getBlockedUsers(): Promise<BlockedUser[]> {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminSupabaseClient();
    
    const { data, error } = await supabase
      .from('blocked_users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error getting blocked users:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Unexpected error in getBlockedUsers:", error);
    return [];
  }
}

/**
 * Server component version that checks if user is blocked (for middleware)
 */
export async function isUserBlockedSSR(userId: string): Promise<BlockedUser | null> {
  // Fix: await cookies() properly by using a cookie store
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data as BlockedUser;
  } catch (error) {
    console.error("Error checking if user is blocked (SSR):", error);
    return null;
  }
}
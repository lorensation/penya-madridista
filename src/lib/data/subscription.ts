import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

export type LatestSubscription = Database["public"]["Tables"]["subscriptions"]["Row"]

export async function getLatestSubscriptionByUserId(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ data: LatestSubscription | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("member_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    data: data ?? null,
    error,
  }
}

/**
 * @deprecated Use getLatestSubscriptionByUserId. Kept for compatibility while
 * legacy callsites are migrated.
 */
export const getLatestSubscriptionByMemberId = getLatestSubscriptionByUserId

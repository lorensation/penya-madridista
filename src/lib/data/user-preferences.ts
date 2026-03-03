import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

export type UserPreferences = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "email_notifications" | "marketing_emails" | "updated_at"
>

export async function getUserPreferences(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ data: UserPreferences | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email_notifications, marketing_emails, updated_at")
    .eq("id", userId)
    .maybeSingle()

  return {
    data: data ?? null,
    error,
  }
}

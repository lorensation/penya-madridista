import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

export type OptionalMemberProfile = Database["public"]["Tables"]["miembros"]["Row"]

export async function getOptionalMemberProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ data: OptionalMemberProfile | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("miembros")
    .select("*")
    .eq("user_uuid", userId)
    .maybeSingle()

  return {
    data: data ?? null,
    error,
  }
}

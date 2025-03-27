import { supabase } from "@/lib/supabase"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/dashboard"

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error && data?.user) {
        // Check if user profile exists
        const { data: profile, error: profileError } = await supabase
          .from("miembros")
          .select("id")
          .eq("auth_id", data.user.id)
          .single()

        // If profile doesn't exist, create it
        if ((profileError || !profile) && data.user.email) {
          const { error: insertError } = await supabase.from("miembros").insert({
            auth_id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email.split("@")[0] || "",
            role: "user", // It's OK to set role here since this is the miembros table
            created_at: new Date().toISOString(),
          })

          if (insertError) {
            console.error("Error creating profile in callback:", insertError)
          }
        }
      }
    } catch (err) {
      console.error("Exception in auth callback:", err)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(next, request.url))
}

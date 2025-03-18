import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { createUserProfile } from "@/app/actions/auth"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") || "/dashboard"

  if (code) {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      // Check if user profile exists
      const { data: profile } = await supabase.from("miembros").select("id").eq("auth_id", data.user.id).single()

      // If profile doesn't exist, create it
      if (!profile) {
        await createUserProfile(
          data.user.id,
          data.user.email || "",
          data.user.user_metadata?.name || data.user.email?.split("@")[0] || "",
        )
      }
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}


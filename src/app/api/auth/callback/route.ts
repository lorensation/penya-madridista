import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") || "/dashboard"

  if (code) {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      // Use the SQL function to create a profile
      try {
        await supabase.rpc("create_user_profile", {
          user_id: data.user.id,
          user_email: data.user.email || "",
          user_name: data.user.user_metadata?.name || null,
        })
      } catch (fnError) {
        console.error("Error calling create_user_profile function:", fnError)
      }
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}


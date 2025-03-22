import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") || "/dashboard"

  if (code) {
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
        try {
          const { error: insertError } = await supabase.from("miembros").insert({
            auth_id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email.split("@")[0] || "",
            role: "user",
            created_at: new Date().toISOString(),
          })

          if (insertError) {
            console.error("Error creating profile in callback:", insertError)
          }
        } catch (err) {
          console.error("Exception creating profile in callback:", err)
        }
      }
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}


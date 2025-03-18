import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()
    const { userId, email, name } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Try using the RPC function first
    try {
      await supabase.rpc("create_user_profile", {
        user_id: userId,
        user_email: email,
        user_name: name || null,
      })
      return NextResponse.json({ success: true })
    } catch (rpcError) {
      console.error("RPC error:", rpcError)

      // Fallback to direct insert
      try {
        const { error } = await supabase.from("miembros").insert({
          auth_id: userId,
          email: email,
          name: name || email.split("@")[0],
          role: "user",
          created_at: new Date().toISOString(),
        })

        if (error) {
          throw error
        }

        return NextResponse.json({ success: true })
      } catch (insertError) {
        console.error("Insert error:", insertError)
        throw insertError
      }
    }
  } catch (error) {
    console.error("Profile creation error:", error)
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
  }
}


import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createServerSupabaseClient()

  try {
    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("miembros")
      .select("*")
      .eq("user_uuid", session.user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: "Error loading user profile" }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Not authorized", role: profile.role }, { status: 403 })
    }

    return NextResponse.json({
      message: "Admin access granted",
      user: {
        id: session.user.id,
        email: session.user.email,
        name: profile.name,
        role: profile.role,
      },
    })
  } catch (error) {
    console.error("Admin check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


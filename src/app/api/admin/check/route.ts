import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Get the current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Try to find the user profile using multiple methods
    let profile = null

    // 1. Try by user_uuid
    const { data: profileByUuid, error: uuidError } = await supabase
      .from("miembros")
      .select("*")
      .eq("user_uuid", session.user.id)
      .single()

    if (!uuidError && profileByUuid) {
      profile = profileByUuid
    } else {
      // 2. Try by id
      const { data: profileById, error: idError } = await supabase
        .from("miembros")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (!idError && profileById) {
        profile = profileById
      } else if (session.user.email) {
        // 3. Try by email
        const { data: profileByEmail, error: emailError } = await supabase
          .from("miembros")
          .select("*")
          .eq("email", session.user.email)
          .single()

        if (!emailError && profileByEmail) {
          profile = profileByEmail
        }
      }
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


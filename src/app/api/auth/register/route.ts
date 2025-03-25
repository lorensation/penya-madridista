import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Use standard sign-up method instead of admin API
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/auth/callback`,
      },
    })

    if (error) {
      console.error("Auth error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If auto-confirm is enabled in Supabase, create the profile now
    // Otherwise, it will be created in the auth callback after email verification
    if (data.user && !data.session) {
      // This means email confirmation is required
      return NextResponse.json({
        success: true,
        message: "Verification email sent",
      })
    } else if (data.user && data.session) {
      // This means auto-confirm is enabled, but we only create webusers entry
      // The miembros entry will be created after payment
      try {
        // Check if webusers entry exists (it should be created by the trigger)
        const { data: existingUser, error: checkError } = await supabase
          .from("webusers")
          .select("id")
          .eq("id", data.user.id)
          .single()

        if (checkError || !existingUser) {
          // If not created by trigger, create it manually
          const { error: profileError } = await supabase.from("webusers").insert({
            id: data.user.id,
            email: email,
            name: name || email.split("@")[0],
            is_member: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })

          if (profileError) {
            console.error("Profile creation error:", profileError)
          }
        }
      } catch (profileErr) {
        console.error("Profile creation exception:", profileErr)
      }

      return NextResponse.json({
        success: true,
        message: "User registered successfully",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Registration process started",
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}


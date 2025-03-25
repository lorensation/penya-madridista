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
      // This means auto-confirm is enabled
      // The trigger should automatically create a user record
      // But we can verify it exists
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("id", data.user.id)
        .single()

      if (checkError) {
        // If the trigger didn't work, create the user manually
        const { error: createError } = await supabase.from("users").insert({
          id: data.user.id,
          email: email,
          name: name || email.split("@")[0],
          is_member: false,
          created_at: new Date().toISOString(),
        })

        if (createError) {
          console.error("User creation error:", createError)
        }
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


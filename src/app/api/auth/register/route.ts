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
      try {
        // Use a separate supabase client for this operation to avoid transaction issues
        const { error: insertError } = await supabase.from("users").insert({
          id: data.user.id,
          email: email,
          is_member: false,
          // Remove the role field from here
        })

        if (insertError) {
          console.error("User creation error:", insertError)

          // Try a raw SQL approach as a fallback
          try {
            const { error: rpcError } = await supabase.rpc("create_user_safely", {
              user_uuid: data.user.id,
              user_email: email,
              user_name: name || null,
              // Don't pass role here either
            })

            if (rpcError) {
              console.error("RPC error:", rpcError)
            }
          } catch (rpcErr) {
            console.error("RPC exception:", rpcErr)
          }
        }
      } catch (err) {
        console.error("Error handling user creation:", err)
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


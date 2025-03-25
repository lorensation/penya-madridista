import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { userId, email, name } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create webuser entry
    try {
      const { error: webusersError } = await supabase.from("webusers").insert({
        email: email,
        name: name || email.split("@")[0],
        is_miembro: false,
        is_member: false,
        created_at: new Date().toISOString(),
      })

      if (webusersError) {
        console.error("Webusers insert error:", webusersError)
        return NextResponse.json({ error: "Failed to create webuser" }, { status: 500 })
      }

      // Get the newly created webuser to get its ID
      const { data: newUser, error: fetchError } = await supabase
        .from("webusers")
        .select("id")
        .eq("email", email)
        .single()

      if (fetchError || !newUser) {
        console.error("Error fetching new user:", fetchError)
        return NextResponse.json({ error: "Failed to fetch new user" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        userId: newUser.id,
      })
    } catch (error) {
      console.error("Profile creation error:", error)
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
    }
  } catch (error) {
    console.error("Profile creation error:", error)
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
  }
}

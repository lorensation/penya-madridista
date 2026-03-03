import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { userId, email, name, emailNotifications, marketingEmails } = await request.json()
    const safeEmailNotifications = emailNotifications !== false
    const safeMarketingEmails = marketingEmails !== false

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create user entry
    try {
      const supabase = await createServerSupabaseClient()
      const { error: usersError } = await supabase.from("users").insert({
        id: userId,
        email: email,
        name: name || email.split("@")[0],
        is_member: false,
        email_notifications: safeEmailNotifications,
        marketing_emails: safeMarketingEmails,
        created_at: new Date().toISOString(),
      })

      if (usersError) {
        console.error("Users insert error:", usersError)
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        userId: userId,
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

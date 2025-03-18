import { createServerSupabaseClient } from "@/lib/supabase-server"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const headersList = await headers()
  const signature = headersList.get("x-supabase-webhook-signature")

  // In production, you should verify the webhook signature
  // using a secret from your environment variables

  try {
    const payload = await request.json()
    const event = payload.type
    const supabase = createServerSupabaseClient()

    // Handle different webhook events
    if (event === "user.created") {
      // User was created in Auth, but we've already created the profile
      // in our server action. This is just a backup.
      const user = payload.record

      // Check if profile already exists
      const { data: existingProfile } = await supabase.from("miembros").select("id").eq("auth_id", user.id).single()

      if (!existingProfile) {
        // Create profile if it doesn't exist
        await supabase.from("miembros").insert({
          auth_id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email.split("@")[0],
          role: "user",
          created_at: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 })
  }
}


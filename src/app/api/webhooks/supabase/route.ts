import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createHmac } from "crypto"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const headersList = await headers()
  const signature = headersList.get("x-supabase-webhook-signature")
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET

  // Clone the request to get the body as text
  const body = await request.text()

  // Verify the webhook signature in production
  if (process.env.NODE_ENV === "production" && webhookSecret) {
    if (!signature) {
      return NextResponse.json({ error: "Missing signature header" }, { status: 401 })
    }

    // Create HMAC using the webhook secret
    const hmac = createHmac("sha256", webhookSecret)
    hmac.update(body)
    const computedSignature = hmac.digest("hex")

    // Compare signatures
    if (computedSignature !== signature) {
      console.error("Webhook signature verification failed")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  }

  try {
    const payload = JSON.parse(body)
    const event = payload.type
    const supabase = createServerSupabaseClient()

    // Handle different webhook events
    if (event === "user.created") {
      // User was created in Auth
      const user = payload.record

      // Check if profile already exists
      const { data: existingProfile, error: profileError } = await supabase
        .from("miembros")
        .select("id")
        .eq("auth_id", user.id)
        .single()

      if (profileError && !existingProfile) {
        // Create profile if it doesn't exist
        const { error: insertError } = await supabase.from("miembros").insert({
          auth_id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email.split("@")[0],
          role: "user",
          created_at: new Date().toISOString(),
        })

        if (insertError) {
          console.error("Error creating profile in webhook:", insertError)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 })
  }
}


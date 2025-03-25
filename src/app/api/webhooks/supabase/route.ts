import { supabase } from "@/lib/supabase"
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

    // Handle different webhook events
    if (event === "user.created") {
      // User was created in Auth
      const user = payload.record

      // The trigger should automatically create a user record
      // But we can verify it exists
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single()

      if (checkError) {
        // If the trigger didn't work, create the user manually
        const { error: createError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email || "",
          name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
          is_member: false,
          created_at: new Date().toISOString(),
        })

        if (createError) {
          console.error("User creation error:", createError)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 })
  }
}


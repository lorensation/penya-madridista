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

      // Use the SQL function to create a profile
      try {
        await supabase.rpc("create_user_profile", {
          user_id: user.id,
          user_email: user.email || "",
          user_name: user.user_metadata?.name || null,
        })
      } catch (fnError) {
        console.error("Error calling create_user_profile function in webhook:", fnError)

        // Fallback to direct API call
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/profile/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              email: user.email,
              name: user.user_metadata?.name,
            }),
          })

          if (!response.ok) {
            throw new Error(`API call failed: ${response.status}`)
          }
        } catch (apiError) {
          console.error("API fallback error:", apiError)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 })
  }
}

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

      try {
        // Use a separate supabase client for this operation to avoid transaction issues
        const { error: insertError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email || "",
          is_member: false,
        })

        if (insertError) {
          console.error("User creation error in webhook:", insertError)

          // Try a raw SQL approach as a fallback
          try {
            const { error: rpcError } = await supabase.rpc("create_user_safely", {
              user_uuid: user.id,
              user_email: user.email || "",
              user_name: user.user_metadata?.name || null,
            })

            if (rpcError) {
              console.error("RPC error in webhook:", rpcError)
            }
          } catch (rpcErr) {
            console.error("RPC exception in webhook:", rpcErr)
          }
        }
      } catch (err) {
        console.error("Error in webhook user creation:", err)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 })
  }
}


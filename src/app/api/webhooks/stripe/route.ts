import { createServerSupabaseClient } from "@/lib/supabase-server"
import { handleStripeWebhookEvent } from "@/lib/stripe"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
  }

  try {
    const payload = await request.text()
    const event = await handleStripeWebhookEvent(signature, Buffer.from(payload))
    const supabase = createServerSupabaseClient()

    // Handle different webhook events
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any

        // Update the checkout session status
        await supabase.from("checkout_sessions").update({ status: "completed" }).eq("session_id", session.id)

        // Get user information from the checkout session
        const { data: checkoutData } = await supabase
          .from("checkout_sessions")
          .select("user_id, plan_type")
          .eq("session_id", session.id)
          .single()

        if (checkoutData) {
          // Update the user's subscription status
          await supabase
            .from("miembros")
            .update({
              subscription_id: session.subscription,
              subscription_status: "active",
              subscription_plan: checkoutData.plan_type,
              subscription_updated_at: new Date().toISOString(),
            })
            .eq("auth_id", checkoutData.user_id)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as any

        // Find the user with this subscription
        const { data: userData } = await supabase
          .from("miembros")
          .select("auth_id")
          .eq("subscription_id", subscription.id)
          .single()

        if (userData) {
          // Update the subscription status
          await supabase
            .from("miembros")
            .update({
              subscription_status: subscription.status,
              subscription_updated_at: new Date().toISOString(),
            })
            .eq("auth_id", userData.auth_id)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any

        // Find the user with this subscription
        const { data: userData } = await supabase
          .from("miembros")
          .select("auth_id")
          .eq("subscription_id", subscription.id)
          .single()

        if (userData) {
          // Update the subscription status
          await supabase
            .from("miembros")
            .update({
              subscription_status: "cancelled",
              subscription_updated_at: new Date().toISOString(),
            })
            .eq("auth_id", userData.auth_id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 400 })
  }
}

// This is needed to disable the default body parsing
export const config = {
  api: {
    bodyParser: false,
  },
}


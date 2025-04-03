import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    // Log request details to help debug
    console.log("Webhook request received")
    console.log("URL:", request.url)
    console.log("Method:", request.method)
    console.log("Headers:", Object.fromEntries(request.headers.entries()))

    // Get the raw request body
    const payload = await request.text()

    // Get the Stripe signature from headers
    const signature = request.headers.get("stripe-signature")

    if (!signature || !webhookSecret) {
      console.error("Missing signature or webhook secret")
      return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 })
    }

    // Verify the event
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
      console.log(`Webhook verified: ${event.type}`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error(`Webhook signature verification failed: ${errorMessage}`)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the event based on its type
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Checkout session completed: ${session.id}`)

        // Get the user ID from metadata
        const userId = session.metadata?.userId || session.client_reference_id

        if (!userId) {
          console.error("No user ID found in session metadata or client_reference_id")
          return NextResponse.json({ error: "No user ID found" }, { status: 400 })
        }

        // Process the successful checkout
        await handleSuccessfulCheckout(session, userId)
        break

      case "customer.subscription.updated":
      case "customer.subscription.created":
        const subscription = event.data.object as Stripe.Subscription
        console.log(`Subscription ${event.type}: ${subscription.id}`)

        // Get the user ID from metadata
        const subUserId = subscription.metadata?.userId

        if (!subUserId) {
          console.error("No user ID found in subscription metadata")
          return NextResponse.json({ error: "No user ID found" }, { status: 400 })
        }

        // Update the user's subscription status
        await updateSubscriptionStatus(subscription, subUserId)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`Webhook error: ${errorMessage}`)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// Helper function to handle successful checkout
async function handleSuccessfulCheckout(session: Stripe.Checkout.Session, userId: string) {
  try {
    // Import the getServiceSupabase function
    const { getServiceSupabase } = await import("@/lib/supabase")
    const supabase = getServiceSupabase()

    // Get the subscription from Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia",
    })

    // If there's a subscription ID, retrieve it
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

      // Update the user's subscription status in the database
      const { error } = await supabase
        .from("miembros")
        .update({
          subscription_status: subscription.status,
          subscription_plan: subscription.items.data[0].price.id,
          subscription_id: subscription.id,
          subscription_updated_at: new Date().toISOString(),
          stripe_customer_id: subscription.customer as string,
        })
        .or(`user_id.eq.${userId},user_uuid.eq.${userId},auth_id.eq.${userId},id.eq.${userId}`)

      if (error) {
        console.error("Error updating member subscription:", error)
      }
    }
  } catch (error) {
    console.error("Error in handleSuccessfulCheckout:", error)
  }
}

// Helper function to update subscription status
async function updateSubscriptionStatus(subscription: Stripe.Subscription, userId: string) {
  try {
    // Import the getServiceSupabase function
    const { getServiceSupabase } = await import("@/lib/supabase")
    const supabase = getServiceSupabase()

    // Update the user's subscription status in the database
    const { error } = await supabase
      .from("miembros")
      .update({
        subscription_status: subscription.status,
        subscription_plan: subscription.items.data[0].price.id,
        subscription_id: subscription.id,
        subscription_updated_at: new Date().toISOString(),
        stripe_customer_id: subscription.customer as string,
      })
      .or(`user_id.eq.${userId},user_uuid.eq.${userId},auth_id.eq.${userId},id.eq.${userId}`)

    if (error) {
      console.error("Error updating member subscription:", error)
    }
  } catch (error) {
    console.error("Error in updateSubscriptionStatus:", error)
  }
}


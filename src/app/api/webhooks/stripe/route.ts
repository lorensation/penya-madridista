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

    // Log the full event object for debugging
    console.log("Full event data:", JSON.stringify(event, null, 2))

    // Handle the event based on its type
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case "customer.subscription.updated":
      case "customer.subscription.created":
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription, event.type)
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

// Helper function to handle checkout.session.completed events
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log("Processing checkout.session.completed event")
    console.log("Session data:", JSON.stringify(session, null, 2))

    // Try to find the user ID from various possible locations
    let userId = session.metadata?.userId || session.client_reference_id

    // If we still don't have a user ID, try to find it from the customer
    if (!userId && session.customer) {
      // Get customer details to find user ID in metadata
      const customerResponse = await stripe.customers.retrieve(session.customer as string)
      if ("metadata" in customerResponse) {
        userId = customerResponse.metadata?.userId
        console.log("Retrieved customer metadata:", customerResponse.metadata)
      }
    }

    // If we still don't have a user ID, try to find it from the subscription
    if (!userId && session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      userId = subscription.metadata?.userId
      console.log("Retrieved subscription metadata:", subscription.metadata)

      // If we found a user ID, update the subscription
      if (userId) {
        await updateSubscriptionStatus(subscription, userId)
        return
      }
    }

    if (!userId) {
      console.error("No user ID found in session, customer, or subscription")
      // Instead of returning an error, we'll just log it and continue
      // This way the webhook won't be retried unnecessarily
      return
    }

    // Process the successful checkout
    await handleSuccessfulCheckout(session, userId)
  } catch (error) {
    console.error("Error in handleCheckoutSessionCompleted:", error)
  }
}

// Helper function to handle subscription events
async function handleSubscriptionEvent(subscription: Stripe.Subscription, eventType: string) {
  try {
    console.log(`Processing ${eventType} event`)
    console.log("Subscription data:", JSON.stringify(subscription, null, 2))

    // Try to find the user ID from various possible locations
    let userId = subscription.metadata?.userId

    // If we don't have a user ID, try to find it from the customer
    if (!userId && subscription.customer) {
      // Get customer details to find user ID in metadata
      const customerResponse = await stripe.customers.retrieve(subscription.customer as string)
      if ("metadata" in customerResponse) {
        userId = customerResponse.metadata?.userId
        console.log("Retrieved customer metadata:", customerResponse.metadata)
      }
    }

    if (!userId) {
      // If we still don't have a user ID, we need to try to find the user by customer ID
      const { getServiceSupabase } = await import("@/lib/supabase")
      const supabase = getServiceSupabase()

      // Try to find a member with this stripe_customer_id
      const { data: memberData, error: memberError } = await supabase
        .from("miembros")
        .select("id, user_uuid, auth_id")
        .eq("stripe_customer_id", subscription.customer)
        .single()

      if (!memberError && memberData) {
        userId = memberData.user_uuid || memberData.auth_id || memberData.id
        console.log("Found user ID from database:", userId)
      } else {
        console.error("No user ID found in subscription or customer, and no matching member in database")
        // Instead of returning an error, we'll just log it and continue
        return
      }
    }

    // Update the user's subscription status
    await updateSubscriptionStatus(subscription, userId)
  } catch (error) {
    console.error(`Error in handle${eventType}:`, error)
  }
}

// Helper function to handle successful checkout
async function handleSuccessfulCheckout(session: Stripe.Checkout.Session, userId: string) {
  try {
    // Import the getServiceSupabase function
    const { getServiceSupabase } = await import("@/lib/supabase")
    const supabase = getServiceSupabase()

    // If there's a subscription ID, retrieve it
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

      // Store the customer ID for future reference
      const customerId = subscription.customer as string

      // Update the user's subscription status in the database
      const { error } = await supabase
        .from("miembros")
        .update({
          subscription_status: subscription.status,
          subscription_plan: subscription.items.data[0].price.id,
          subscription_id: subscription.id,
          subscription_updated_at: new Date().toISOString(),
          stripe_customer_id: customerId,
        })
        .or(`user_id.eq.${userId},user_uuid.eq.${userId},auth_id.eq.${userId},id.eq.${userId}`)

      if (error) {
        console.error("Error updating member subscription:", error)
      } else {
        console.log(`Successfully updated subscription for user ${userId}`)
      }
    } else {
      console.log("No subscription found in session")
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
    } else {
      console.log(`Successfully updated subscription status for user ${userId}`)
    }
  } catch (error) {
    console.error("Error in updateSubscriptionStatus:", error)
  }
}

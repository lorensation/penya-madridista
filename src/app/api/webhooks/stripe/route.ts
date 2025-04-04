import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Create a service role client for admin operations that need to bypass RLS
const serviceRoleClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature") as string

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err instanceof Error ? err.message : "Unknown error"}`)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    // Get the subscription details if available
    let subscriptionData = null
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      subscriptionData = subscription
    }

    // Update the checkout_sessions table using service role client
    await serviceRoleClient
      .from("checkout_sessions")
      .update({
        status: session.status,
        updated_at: new Date().toISOString(),
        subscription_id: session.subscription as string || null,
        customer_id: session.customer as string || null,
        subscription_status: subscriptionData ? subscriptionData.status : "active",
        payment_status: session.payment_status,
        payment_intent: session.payment_intent as string || null,
      })
      .eq("session_id", session.id)

    // We don't update the miembros table here because the user might need to complete their profile first
    // That will be handled in the success page flow
    console.log(`Successfully processed checkout.session.completed for session ${session.id}`)
  } catch (error) {
    console.error("Error handling checkout.session.completed:", error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // Find the user associated with this subscription
    const { data: memberData, error: memberError } = await serviceRoleClient
      .from("miembros")
      .select("id")
      .eq("subscription_id", subscription.id)
      .single()

    if (memberError) {
      console.error("Error finding member for subscription update:", memberError)
      return
    }

    // Log the member data for debugging
    console.log(`Updating subscription status for member with id: ${memberData.id}`)

    // Update the member's subscription status
    const { error: updateMemberError } = await serviceRoleClient
      .from("miembros")
      .update({
        subscription_status: subscription.status,
        subscription_updated_at: new Date().toISOString(),
      })
      .eq("subscription_id", subscription.id)
    
    if (updateMemberError) {
      console.error("Error updating member subscription status:", updateMemberError)
    }

    // Also update any related checkout sessions
    const { error: updateSessionError } = await serviceRoleClient
      .from("checkout_sessions")
      .update({
        subscription_status: subscription.status,
        updated_at: new Date().toISOString(),
      })
      .eq("subscription_id", subscription.id)
    
    if (updateSessionError) {
      console.error("Error updating checkout sessions:", updateSessionError)
    }
    
    console.log(`Successfully updated subscription status to ${subscription.status} for subscription ${subscription.id}`)
  } catch (error) {
    console.error("Error handling subscription.updated:", error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    // Update the member's subscription status to canceled
    const { error: updateMemberError } = await serviceRoleClient
      .from("miembros")
      .update({
        subscription_status: "canceled",
        subscription_updated_at: new Date().toISOString(),
      })
      .eq("subscription_id", subscription.id)
    
    if (updateMemberError) {
      console.error("Error updating member subscription status to canceled:", updateMemberError)
    }

    // Also update any related checkout sessions
    const { error: updateSessionError } = await serviceRoleClient
      .from("checkout_sessions")
      .update({
        subscription_status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("subscription_id", subscription.id)
    
    if (updateSessionError) {
      console.error("Error updating checkout sessions for canceled subscription:", updateSessionError)
    }
    
    console.log(`Successfully marked subscription ${subscription.id} as canceled`)
  } catch (error) {
    console.error("Error handling subscription.deleted:", error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    if (invoice.subscription) {
      // Update the subscription status to active if it was past_due
      const { error: updateError } = await serviceRoleClient
        .from("miembros")
        .update({
          subscription_status: "active",
          subscription_updated_at: new Date().toISOString(),
        })
        .eq("subscription_id", invoice.subscription as string)
        .eq("subscription_status", "past_due")
      
      if (updateError) {
        console.error("Error updating subscription status after payment success:", updateError)
      } else {
        console.log(`Successfully updated subscription status to active for subscription ${invoice.subscription}`)
      }
    }
  } catch (error) {
    console.error("Error handling invoice.payment_succeeded:", error)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    if (invoice.subscription) {
      // Update the subscription status to past_due
      const { error: updateError } = await serviceRoleClient
        .from("miembros")
        .update({
          subscription_status: "past_due",
          subscription_updated_at: new Date().toISOString(),
        })
        .eq("subscription_id", invoice.subscription as string)
      
      if (updateError) {
        console.error("Error updating subscription status to past_due:", updateError)
      } else {
        console.log(`Updated subscription ${invoice.subscription} status to past_due due to failed payment`)
      }
    }
  } catch (error) {
    console.error("Error handling invoice.payment_failed:", error)
  }
}
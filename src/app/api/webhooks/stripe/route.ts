import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia", // Using the correct API version
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

    console.log(`Processing Stripe event: ${event.type}`)

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

    // Check if a checkout session record already exists
    const { data: existingSession, error: checkError } = await serviceRoleClient
      .from("checkout_sessions")
      .select("*")
      .eq("session_id", session.id)
      .maybeSingle()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking for existing checkout session:", checkError)
      return
    }

    // Extract the plan type from metadata or line items
    let planType = "unknown"
    if (session.metadata && session.metadata.plan_type) {
      planType = session.metadata.plan_type
    } else if (session.line_items) {
      // If we have line items, try to extract plan type from there
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
        if (lineItems.data.length > 0 && lineItems.data[0].price) {
          const price = await stripe.prices.retrieve(lineItems.data[0].price.id)
          planType = price.nickname || price.id
        }
      } catch (e) {
        console.error("Error fetching line items:", e)
      }
    }

    if (existingSession) {
      // Update the existing record
      const { error: updateError } = await serviceRoleClient
        .from("checkout_sessions")
        .update({
          status: session.status,
          updated_at: new Date().toISOString(),
          subscription_id: session.subscription as string || null,
          customer_id: session.customer as string || null,
          subscription_status: subscriptionData ? subscriptionData.status : "active",
          payment_status: session.payment_status,
          payment_intent: session.payment_intent as string || null,
          plan_type: planType,
        })
        .eq("session_id", session.id)

      if (updateError) {
        console.error("Error updating checkout session:", updateError)
        return
      }
      console.log(`Updated existing checkout session: ${session.id}`)
    } else {
      // Create a new record if it doesn't exist
      // Only proceed if we have a user_id (client_reference_id)
      if (!session.client_reference_id) {
        console.error("Cannot create checkout session record: No client_reference_id provided in session", session.id)
        return
      }

      const sessionData = {
        session_id: session.id,
        user_id: session.client_reference_id,
        status: session.status,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        subscription_id: session.subscription as string || null,
        customer_id: session.customer as string || null,
        subscription_status: subscriptionData ? subscriptionData.status : "active",
        payment_status: session.payment_status,
        payment_intent: session.payment_intent as string || null,
        plan_type: planType,
        price_id: session.metadata?.price_id || null,
      }

      const { error: insertError } = await serviceRoleClient
        .from("checkout_sessions")
        .insert([sessionData])

      if (insertError) {
        console.error("Error creating checkout session:", insertError)
        return
      }
      console.log(`Created new checkout session record: ${session.id}`)
    }

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
    // Note: Using 'id' column instead of 'auth_id'
    const { data: memberData, error: memberError } = await serviceRoleClient
      .from("miembros")
      .select("id, user_uuid")
      .eq("subscription_id", subscription.id)
      .maybeSingle()

    if (memberError && memberError.code !== "PGRST116") {
      console.error("Error finding member for subscription update:", memberError)
      return
    }

    if (memberData) {
      // Update the member's subscription status
      // Note: Using 'id' column instead of 'auth_id'
      const { error: updateMemberError } = await serviceRoleClient
        .from("miembros")
        .update({
          subscription_status: subscription.status,
          subscription_updated_at: new Date().toISOString(),
        })
        .eq("id", memberData.id)
      
      if (updateMemberError) {
        console.error("Error updating member subscription status:", updateMemberError)
      } else {
        console.log(`Updated subscription status to ${subscription.status} for member ${memberData.id}`)
      }
    } else {
      console.log(`No member found with subscription_id ${subscription.id}. Will update checkout_sessions only.`)
    }

    // Also update any related checkout sessions
    const { data: checkoutSessions, error: sessionsError } = await serviceRoleClient
      .from("checkout_sessions")
      .select("id, session_id")
      .eq("subscription_id", subscription.id)

    if (sessionsError) {
      console.error("Error finding checkout sessions for subscription update:", sessionsError)
      return
    }

    if (checkoutSessions && checkoutSessions.length > 0) {
      const { error: updateSessionError } = await serviceRoleClient
        .from("checkout_sessions")
        .update({
          subscription_status: subscription.status,
          updated_at: new Date().toISOString(),
        })
        .eq("subscription_id", subscription.id)
      
      if (updateSessionError) {
        console.error("Error updating checkout sessions:", updateSessionError)
      } else {
        console.log(`Updated ${checkoutSessions.length} checkout sessions for subscription ${subscription.id}`)
      }
    } else {
      console.log(`No checkout sessions found with subscription_id ${subscription.id}`)
    }
    
    console.log(`Successfully processed subscription.updated for subscription ${subscription.id}`)
  } catch (error) {
    console.error("Error handling subscription.updated:", error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    // Find the user associated with this subscription
    // Note: Using 'id' column instead of 'auth_id'
    const { data: memberData, error: memberError } = await serviceRoleClient
      .from("miembros")
      .select("id, user_uuid")
      .eq("subscription_id", subscription.id)
      .maybeSingle()

    if (memberError && memberError.code !== "PGRST116") {
      console.error("Error finding member for subscription deletion:", memberError)
      return
    }

    if (memberData) {
      // Update the member's subscription status to canceled
      // Note: Using 'id' column instead of 'auth_id'
      const { error: updateMemberError } = await serviceRoleClient
        .from("miembros")
        .update({
          subscription_status: "canceled",
          subscription_updated_at: new Date().toISOString(),
        })
        .eq("id", memberData.id)
      
      if (updateMemberError) {
        console.error("Error updating member subscription status to canceled:", updateMemberError)
      } else {
        console.log(`Updated subscription status to canceled for member ${memberData.id}`)
      }
    } else {
      console.log(`No member found with subscription_id ${subscription.id}. Will update checkout_sessions only.`)
    }

    // Also update any related checkout sessions
    const { data: checkoutSessions, error: sessionsError } = await serviceRoleClient
      .from("checkout_sessions")
      .select("id, session_id")
      .eq("subscription_id", subscription.id)

    if (sessionsError) {
      console.error("Error finding checkout sessions for subscription deletion:", sessionsError)
      return
    }

    if (checkoutSessions && checkoutSessions.length > 0) {
      const { error: updateSessionError } = await serviceRoleClient
        .from("checkout_sessions")
        .update({
          subscription_status: "canceled",
          updated_at: new Date().toISOString(),
        })
        .eq("subscription_id", subscription.id)
      
      if (updateSessionError) {
        console.error("Error updating checkout sessions for canceled subscription:", updateSessionError)
      } else {
        console.log(`Updated ${checkoutSessions.length} checkout sessions for subscription ${subscription.id}`)
      }
    } else {
      console.log(`No checkout sessions found with subscription_id ${subscription.id}`)
    }
    
    console.log(`Successfully processed subscription.deleted for subscription ${subscription.id}`)
  } catch (error) {
    console.error("Error handling subscription.deleted:", error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    if (invoice.subscription) {
      // Find members with this subscription that are in past_due status
      // Note: Using 'id' column instead of 'auth_id'
      const { data: memberData, error: memberError } = await serviceRoleClient
        .from("miembros")
        .select("id, user_uuid")
        .eq("subscription_id", invoice.subscription as string)
        .eq("subscription_status", "past_due")
        .maybeSingle()

      if (memberError && memberError.code !== "PGRST116") {
        console.error("Error finding member for invoice payment success:", memberError)
        return
      }

      if (memberData) {
        // Update the subscription status to active
        // Note: Using 'id' column instead of 'auth_id'
        const { error: updateError } = await serviceRoleClient
          .from("miembros")
          .update({
            subscription_status: "active",
            subscription_updated_at: new Date().toISOString(),
          })
          .eq("id", memberData.id)
        
        if (updateError) {
          console.error("Error updating subscription status after payment success:", updateError)
        } else {
          console.log(`Successfully updated subscription status to active for member ${memberData.id}`)
        }
      } else {
        console.log(`No past_due member found with subscription_id ${invoice.subscription}`)
      }
    }
    console.log(`Successfully processed invoice.payment_succeeded for invoice ${invoice.id}`)
  } catch (error) {
    console.error("Error handling invoice.payment_succeeded:", error)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    if (invoice.subscription) {
      // Find members with this subscription
      // Note: Using 'id' column instead of 'auth_id'
      const { data: memberData, error: memberError } = await serviceRoleClient
        .from("miembros")
        .select("id, user_uuid")
        .eq("subscription_id", invoice.subscription as string)
        .maybeSingle()

      if (memberError && memberError.code !== "PGRST116") {
        console.error("Error finding member for invoice payment failure:", memberError)
        return
      }

      if (memberData) {
        // Update the subscription status to past_due
        // Note: Using 'id' column instead of 'auth_id'
        const { error: updateError } = await serviceRoleClient
          .from("miembros")
          .update({
            subscription_status: "past_due",
            subscription_updated_at: new Date().toISOString(),
          })
          .eq("id", memberData.id)
        
        if (updateError) {
          console.error("Error updating subscription status to past_due:", updateError)
        } else {
          console.log(`Updated subscription status to past_due for member ${memberData.id} due to failed payment`)
        }
      } else {
        console.log(`No member found with subscription_id ${invoice.subscription}`)
      }
    }
    console.log(`Successfully processed invoice.payment_failed for invoice ${invoice.id}`)
  } catch (error) {
    console.error("Error handling invoice.payment_failed:", error)
  }
}
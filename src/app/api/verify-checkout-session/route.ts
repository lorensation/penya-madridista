import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
})

// Create a service role client for admin operations that need to bypass RLS
const serviceRoleClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    console.log(`Processing checkout session: ${sessionId}`)

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer", "line_items"],
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Get the user ID from the session metadata, client_reference_id, or from the request body
    let userId = session.metadata?.userId || session.client_reference_id || request.headers.get("x-user-id")

    // If userId is still not found, try to extract it from the request body
    if (!userId) {
      try {
        const requestBody = await request.clone().json()
        userId = requestBody.userId
      } catch (e) {
        console.log("Logging e in requestBody: ", e)
      }
    }

    if (!userId) {
      console.error("User ID missing in session:", {
        sessionId,
        metadata: session.metadata,
        clientReferenceId: session.client_reference_id,
      })

      // Return a more detailed error response
      return NextResponse.json(
        {
          error: "User ID not found in session",
          session: {
            id: session.id,
            hasMetadata: !!session.metadata,
            hasClientReferenceId: !!session.client_reference_id,
          },
          status: "incomplete",
        },
        { status: 400 },
      )
    }

    // Get the subscription details
    const subscription = session.subscription as Stripe.Subscription
    const customer = session.customer as Stripe.Customer

    // Get payment method details to extract last four digits
    let lastFour = null
    if (subscription && subscription.default_payment_method) {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        typeof subscription.default_payment_method === "string"
          ? subscription.default_payment_method
          : subscription.default_payment_method.id,
      )
      lastFour = paymentMethod.card?.last4
    }

    // Determine the subscription plan based on the price ID
    const lineItems = session.line_items?.data || []
    const priceId = lineItems[0]?.price?.id || session.metadata?.price_id

    let plan = null
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID) {
      plan = "annual"
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID) {
      plan = "family"
    } else {
      console.log(`Unknown price ID: ${priceId}, defaulting to null plan`)
    }

    // Find the checkout session in our database by looking for the Stripe session ID in metadata
    const { data: checkoutSessions, error: findError } = await serviceRoleClient
      .from("checkout_sessions")
      .select("*")
      .eq("metadata->stripe_session_id", sessionId)
      .limit(1)

    if (findError) {
      console.error("Error finding checkout session:", findError)
    }

    const checkoutSession = checkoutSessions && checkoutSessions.length > 0 ? checkoutSessions[0] : null

    if (checkoutSession) {
      // Update the existing checkout session
      const { error: updateError } = await serviceRoleClient
        .from("checkout_sessions")
        .update({
          status: session.payment_status,
          subscription_id: subscription?.id,
          customer_id: customer?.id,
          price_id: priceId,
          updated_at: new Date().toISOString(),
          metadata: {
            ...checkoutSession.metadata,
            stripe_session_id: sessionId,
            payment_status: session.payment_status,
            subscription_status: subscription?.status || "active",
            last_four: lastFour,
            plan,
          },
        })
        .eq("session_id", checkoutSession.session_id)

      if (updateError) {
        console.error("Error updating checkout session:", updateError)
      } else {
        console.log(`Successfully updated checkout session ${checkoutSession.session_id} in database`)
      }
    } else {
      // Create a new checkout session record
      const { error: insertError } = await serviceRoleClient.from("checkout_sessions").insert([
        {
          user_id: userId,
          status: session.payment_status,
          subscription_id: subscription?.id,
          customer_id: customer?.id,
          price_id: priceId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            stripe_session_id: sessionId,
            payment_status: session.payment_status,
            subscription_status: subscription?.status || "active",
            last_four: lastFour,
            plan,
          },
        },
      ])

      if (insertError) {
        console.error("Error creating checkout session:", insertError)
      } else {
        console.log(`Successfully created checkout session for Stripe session ${sessionId} in database`)
      }
    }

    return NextResponse.json({
      status: session.payment_status === "paid" ? "complete" : session.payment_status,
      plan,
      subscriptionId: subscription?.id,
      customerId: customer?.id,
      lastFour,
      userId, // Include userId in the response for debugging
    })
  } catch (error: unknown) {
    console.error("Error verifying checkout session:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
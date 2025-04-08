import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getServiceSupabase } from "@/lib/supabase"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer', 'line_items']
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Get the user ID from the session metadata
    const userId = session.metadata?.userId || session.client_reference_id

    if (!userId) {
      return NextResponse.json({ error: "User ID not found in session" }, { status: 400 })
    }

    // Get the subscription details
    const subscription = session.subscription as Stripe.Subscription
    const customer = session.customer as Stripe.Customer
    
    // Get payment method details to extract last four digits
    let lastFour = null
    if (subscription && subscription.default_payment_method) {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        typeof subscription.default_payment_method === 'string' 
          ? subscription.default_payment_method 
          : subscription.default_payment_method.id
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
    }

    // Update the checkout session in your database
    const supabase = getServiceSupabase()
    const { error: updateError } = await supabase
      .from("checkout_sessions")
      .update({
        status: session.payment_status,
        subscription_id: subscription?.id,
        customer_id: customer?.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId)

    if (updateError) {
      console.error("Error updating checkout session:", updateError)
      // Continue anyway since we have the Stripe data
    }

    return NextResponse.json({
      status: session.payment_status === "paid" ? "complete" : session.payment_status,
      plan,
      subscriptionId: subscription?.id,
      customerId: customer?.id,
      lastFour
    })
  } catch (error: unknown) {
    console.error("Error verifying checkout session:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
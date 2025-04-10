'use server'

import { createServerSupabaseClient } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { getBaseUrl } from "@/lib/utils"
import Stripe from "stripe"

// Initialize Stripe with the secret key - only used server-side
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
})

export async function createCheckoutSession(priceId: string) {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("Authentication error in createCheckoutSession:", authError)
      return redirect("/login?redirect=/dashboard/membership")
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${getBaseUrl()}/dashboard/membership?success=true`,
      cancel_url: `${getBaseUrl()}/dashboard/membership?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
      },
    })

    if (session.url) {
      return redirect(session.url)
    }

    return redirect("/dashboard/membership?error=true")
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return redirect("/dashboard/membership?error=checkout-failed")
  }
}

export async function createBillingPortalSession(customerIdParam?: string) {
  try {
    // Use the customer ID passed from the client directly
    // This avoids authentication issues with server actions
    if (!customerIdParam) {
      console.error("No customer ID provided")
      return { error: "no-customer", message: "No customer ID provided" }
    }

    const stripeCustomerId = customerIdParam;
    console.log("Using customer ID:", stripeCustomerId)

    // Ensure stripeCustomerId is a string before using it
    if (!stripeCustomerId || typeof stripeCustomerId !== 'string') {
      console.error("Invalid customer ID:", stripeCustomerId)
      return { error: "invalid-customer", message: "Invalid customer ID" }
    }

    // Create a billing portal session
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${getBaseUrl()}/dashboard/membership`,
      })

      if (session.url) {
        return { url: session.url }
      } else {
        console.error("No URL in session response")
        return { error: "no-session-url", message: "No URL in session response" }
      }
    } catch (stripeError: any) {
      console.error("Stripe error:", stripeError.message)
      return { error: "stripe-error", message: stripeError.message }
    }
  } catch (error: any) {
    console.error("Unexpected error in createBillingPortalSession:", error)
    return { error: "unexpected", message: error?.message || "An unexpected error occurred" }
  }
}

export async function cancelSubscription(subscriptionId: string) {
  try {
    if (!subscriptionId) {
      return {
        success: false,
        error: "No subscription ID provided"
      }
    }

    // Cancel the subscription at period end
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    })

    return {
      success: true,
      message: "Subscription will be canceled at the end of the billing period"
    }
  } catch (error) {
    console.error("Error canceling subscription:", error)
    return {
      success: false,
      error: "Failed to cancel subscription"
    }
  }
}
'use server'

import { createServerSupabaseClient } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { getBaseUrl } from "@/lib/utils"
import Stripe from "stripe"

// Initialize Stripe with the secret key - only used server-side
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
})

// Define proper error types
interface PortalSessionError {
  error: string;
  message: string;
  url?: never; // Ensure url doesn't exist on error type
}

interface PortalSessionSuccess {
  url: string;
  error?: never; // Ensure error doesn't exist on success type
  message?: never; // Ensure message doesn't exist on success type
}

type PortalSessionResponse = PortalSessionSuccess | PortalSessionError;

type SubscriptionResponse = {
  success: boolean;
  message?: string;
  error?: string;
}

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

export async function createBillingPortalSession(customerIdParam?: string): Promise<PortalSessionResponse> {
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
    } catch (stripeError: unknown) {
      // Handle Stripe errors properly without using StripeError type
      let errorMessage = 'Unknown Stripe error';
      
      if (stripeError instanceof Error) {
        errorMessage = stripeError.message;
      } else if (typeof stripeError === 'object' && stripeError !== null && 'message' in stripeError) {
        errorMessage = String((stripeError as { message: unknown }).message);
      }
      
      console.error("Stripe error:", errorMessage)
      return { error: "stripe-error", message: errorMessage }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error("Unexpected error in createBillingPortalSession:", error)
    return { error: "unexpected", message: errorMessage }
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error canceling subscription:", error)
    return {
      success: false,
      error: `Failed to cancel subscription: ${errorMessage}`
    }
  }
}
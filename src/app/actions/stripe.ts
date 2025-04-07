
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
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/login")
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
}

export async function createBillingPortalSession(customerId?: string) {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/login")
  }

  let stripeCustomerId = customerId;

  // If no customer ID was provided, retrieve it from Supabase
  if (!stripeCustomerId) {
    // Retrieve customer ID from Supabase
    const { data: profile } = await supabase
      .from("miembros")
      .select("stripe_customer_id")
      .eq("user_uuid", user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return redirect("/dashboard/membership?error=no-customer")
    }
    
    stripeCustomerId = profile.stripe_customer_id;
  }

  // Ensure stripeCustomerId is a string before using it
  if (!stripeCustomerId) {
    return redirect("/dashboard/membership?error=invalid-customer")
  }

  // Create a billing portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${getBaseUrl()}/dashboard/membership`,
  })

  if (session.url) {
    return { url: session.url }
  }

  return redirect("/dashboard/membership?error=true")
}

export async function cancelSubscription() {
  const supabase = createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error: "Not authenticated"
    }
  }

  try {
    // Retrieve customer ID and subscription ID from Supabase
    const { data: profile } = await supabase
      .from("miembros")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("user_uuid", user.id)
      .single()

    if (!profile?.stripe_subscription_id) {
      return {
        success: false,
        error: "No active subscription found"
      }
    }

    // Cancel the subscription at period end
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
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
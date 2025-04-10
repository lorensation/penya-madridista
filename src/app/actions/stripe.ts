"use server"

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
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Authentication error:", authError)
      return redirect("/login?redirect=/dashboard/membership")
    }

    if (!user) {
      console.log("No user found in session")
      return redirect("/login?redirect=/dashboard/membership")
    }

    let stripeCustomerId = customerId;

    // If no customer ID was provided, retrieve it from Supabase
    if (!stripeCustomerId) {
      console.log("No customer ID provided, fetching from database for user:", user.id)
      
      // Retrieve customer ID from Supabase
      const { data: profile, error: profileError } = await supabase
        .from("miembros")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single()

      if (profileError) {
        console.error("Error fetching profile:", profileError)
        return redirect("/dashboard/membership?error=profile-fetch-failed")
      }

      if (!profile) {
        console.log("No profile found for user")
        return redirect("/dashboard/membership?error=no-profile")
      }

      if (!profile.stripe_customer_id) {
        console.log("No Stripe customer ID found in profile")
        return redirect("/dashboard/membership?error=no-customer")
      }
      
      stripeCustomerId = profile.stripe_customer_id;
      console.log("Retrieved customer ID:", stripeCustomerId)
    }

    // Ensure stripeCustomerId is a string before using it
    if (!stripeCustomerId || typeof stripeCustomerId !== 'string') {
      console.error("Invalid customer ID:", stripeCustomerId)
      return redirect("/dashboard/membership?error=invalid-customer")
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
        return redirect("/dashboard/membership?error=no-session-url")
      }
    } catch (stripeError: any) {
      console.error("Stripe error:", stripeError.message)
      return redirect(`/dashboard/membership?error=stripe-error&message=${encodeURIComponent(stripeError.message)}`)
    }
  } catch (error) {
    console.error("Unexpected error in createBillingPortalSession:", error)
    return redirect("/dashboard/membership?error=unexpected")
  }
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
      .select("subscription_id")
      .eq("id", user.id)
      .single()

    if (!profile?.subscription_id) {
      return {
        success: false,
        error: "No active subscription found"
      }
    }

    // Cancel the subscription at period end
    await stripe.subscriptions.update(profile.subscription_id, {
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
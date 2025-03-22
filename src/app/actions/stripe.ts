"use server"

import { createCheckoutSession, createCustomer, cancelSubscription as cancelStripeSubscription } from "@/lib/stripe"
import { supabase } from "@/lib/supabase" // Updated import
import { revalidatePath } from "next/cache"

export async function createStripeCheckout(formData: FormData) {
  try {
    const priceId = formData.get("priceId") as string
    const userId = formData.get("userId") as string
    const email = formData.get("email") as string
    const name = formData.get("name") as string
    const planType = formData.get("planType") as string

    if (!priceId || !userId || !email) {
      return {
        error: "Missing required fields",
      }
    }

    // Check if user already has a Stripe customer ID
    const { data: profileData } = await supabase
      .from("miembros")
      .select("stripe_customer_id")
      .eq("auth_id", userId)
      .single()

    let customerId = profileData?.stripe_customer_id

    // If not, create a new customer
    if (!customerId) {
      const customer = await createCustomer(email, name)
      customerId = customer.id

      // Update the user profile with the Stripe customer ID
      await supabase.from("miembros").update({ stripe_customer_id: customerId }).eq("auth_id", userId)
    }

    // Create a checkout session
    const checkoutSession = await createCheckoutSession(customerId, priceId, email)

    // Store the checkout session in the database
    await supabase.from("checkout_sessions").insert({
      user_id: userId,
      session_id: checkoutSession.id,
      price_id: priceId,
      plan_type: planType,
      status: "pending",
    })

    revalidatePath("/membership")
    revalidatePath("/dashboard")

    return {
      url: checkoutSession.url,
    }
  } catch (error: any) {
    console.error("Error creating checkout session:", error)
    return {
      error: error.message || "Failed to create checkout session",
    }
  }
}

export async function cancelSubscription(formData: FormData) {
  try {
    const subscriptionId = formData.get("subscriptionId") as string
    const userId = formData.get("userId") as string

    if (!subscriptionId || !userId) {
      return {
        error: "Missing required fields",
      }
    }

    // Cancel the subscription in Stripe
    await cancelStripeSubscription(subscriptionId)

    // Update the user profile
    await supabase
      .from("miembros")
      .update({
        subscription_status: "cancelled",
        subscription_updated_at: new Date().toISOString(),
      })
      .eq("auth_id", userId)

    revalidatePath("/dashboard/membership")
    revalidatePath("/dashboard")

    return {
      success: true,
    }
  } catch (error: any) {
    console.error("Error cancelling subscription:", error)
    return {
      error: error.message || "Failed to cancel subscription",
    }
  }
}


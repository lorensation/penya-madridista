"use server"

import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import Stripe from "stripe"
import type { ApiResponse, StripeSession } from "@/types/common"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
})

export async function createCheckoutSession(formData: FormData): Promise<ApiResponse<StripeSession>> {
  const priceId = formData.get("priceId") as string
  const returnUrl = (formData.get("returnUrl") as string) || `${process.env.NEXT_PUBLIC_BASE_URL}/membership/success`

  if (!priceId) {
    return {
      success: false,
      error: "Price ID is required",
    }
  }

  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to subscribe",
      }
    }

    // Get or create the customer
    let customerId: string
    const { data: customers } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single()

    if (customers?.stripe_customer_id) {
      customerId = customers.stripe_customer_id
    } else {
      // Create a new customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Save the customer ID
      await supabase.from("stripe_customers").insert({
        user_id: user.id,
        stripe_customer_id: customerId,
      })
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: returnUrl,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/membership?canceled=true`,
      metadata: {
        user_id: user.id,
      },
    })

    return {
      success: true,
      data: {
        id: session.id,
        url: session.url || "",
      },
    }
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function createBillingPortalSession(): Promise<ApiResponse<StripeSession>> {
  try {
    const supabase = createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        error: "You must be logged in to manage your subscription",
      }
    }

    // Get the customer
    const { data: customer } = await supabase
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single()

    if (!customer?.stripe_customer_id) {
      return {
        success: false,
        error: "No subscription found",
      }
    }

    // Create the billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/membership`,
    })

    return {
      success: true,
      data: {
        id: session.id,
        url: session.url,
      },
    }
  } catch (error) {
    console.error("Stripe billing portal error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function redirectToCheckout(formData: FormData) {
  const result = await createCheckoutSession(formData)

  if (!result.success || !result.data?.url) {
    // Handle error
    return {
      success: false,
      error: result.error || "Failed to create checkout session",
    }
  }

  redirect(result.data.url)
}

export async function redirectToBillingPortal() {
  const result = await createBillingPortalSession()

  if (!result.success || !result.data?.url) {
    // Handle error
    return {
      success: false,
      error: result.error || "Failed to create billing portal session",
    }
  }

  redirect(result.data.url)
}


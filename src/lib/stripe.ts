import Stripe from "stripe"

// Initialize Stripe with the secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
})

/**
 * Create a new Stripe customer
 */
export async function createCustomer(email: string, name?: string) {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
    })
    return customer
  } catch (error) {
    console.error("Error creating Stripe customer:", error)
    throw error
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(customerId: string, priceId: string, customerEmail: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/dashboard/membership?success=true`,
      cancel_url: `${baseUrl}/membership?canceled=true`,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
    })

    return session
  } catch (error) {
    console.error("Error creating checkout session:", error)
    throw error
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId)
    return subscription
  } catch (error) {
    console.error("Error cancelling subscription:", error)
    throw error
  }
}

/**
 * Retrieve a subscription
 */
export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return subscription
  } catch (error) {
    console.error("Error retrieving subscription:", error)
    throw error
  }
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(customerId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/dashboard/membership`,
    })

    return session
  } catch (error) {
    console.error("Error creating billing portal session:", error)
    throw error
  }
}

/**
 * Webhook handler for Stripe events
 */
export async function handleStripeWebhookEvent(signature: string, payload: Buffer) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error("Missing Stripe webhook secret")
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
    return event
  } catch (error) {
    console.error("Error verifying webhook signature:", error)
    throw error
  }
}


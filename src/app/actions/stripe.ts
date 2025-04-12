"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
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

// Define plan types
export type PlanType = 'under25' | 'over25' | 'family';
export type PaymentType = 'monthly' | 'annual';

// Map price IDs to plan types and payment types
const priceIdToPlanMap: Record<string, { planType: PlanType, paymentType: PaymentType }> = {
  // Under 25 plans
  'price_under25_monthly': { planType: 'under25', paymentType: 'monthly' },
  'price_under25_annual': { planType: 'under25', paymentType: 'annual' },
  
  // Over 25 plans
  'price_over25_monthly': { planType: 'over25', paymentType: 'monthly' },
  'price_over25_annual': { planType: 'over25', paymentType: 'annual' },
  
  // Family plans
  'price_family_monthly': { planType: 'family', paymentType: 'monthly' },
  'price_family_annual': { planType: 'family', paymentType: 'annual' },
};

// Map product IDs to plan types
const productIdToPlanType: Record<string, PlanType> = {
  [process.env.NEXT_PUBLIC_STRIPE_UNDER25_PRODUCT_ID || '']: 'under25',
  [process.env.NEXT_PUBLIC_STRIPE_OVER25_PRODUCT_ID || '']: 'over25',
  [process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRODUCT_ID || '']: 'family',
};

export async function createCheckoutSession(priceId: string, successRedirect?: string) {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("Authentication error in createCheckoutSession:", authError)
      return redirect("/login?redirect=/membership")
    }

    // Try to determine plan type and payment type from price ID
    let planType: PlanType | undefined;
    let paymentType: PaymentType | undefined;
    
    // First check our mapping
    const planInfo = priceIdToPlanMap[priceId];
    if (planInfo) {
      planType = planInfo.planType;
      paymentType = planInfo.paymentType;
    } else {
      // If not in our mapping, try to fetch from Stripe
      try {
        const price = await stripe.prices.retrieve(priceId);
        if (price.product && typeof price.product === 'string') {
          planType = productIdToPlanType[price.product];
        }
        
        if (price.recurring) {
          paymentType = price.recurring.interval === 'year' ? 'annual' : 'monthly';
        }
      } catch (error) {
        console.error("Error fetching price details:", error);
      }
    }

    // Fix the TypeScript error by using the correct type for the checkout session parameters
    // Use explicit type casting to Stripe.Checkout.SessionCreateParams
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${getBaseUrl()}${successRedirect || '/membership/success'}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getBaseUrl()}/membership?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        plan_type: planType ?? "",
        payment_type: paymentType ?? "",
        price_id: priceId
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (session.url) {
      return redirect(session.url)
    }

    return redirect("/membership?error=true")
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return redirect("/membership?error=checkout-failed")
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

    const supabase = createServerSupabaseClient()

    // Cancel the subscription at period end
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    })

    // Update the subscription status in our database
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
      // Update in subscriptions table
      const { error: subUpdateError } = await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString()
        })
        .eq("member_id", userData.user.id)
        .eq("stripe_subscription_id", subscriptionId)

      if (subUpdateError) {
        console.error("Error updating subscription status in database:", subUpdateError)
      }

      // Also update in miembros table for backward compatibility
      const { error: memberUpdateError } = await supabase
        .from("miembros")
        .update({
          subscription_status: "canceled",
          subscription_updated_at: new Date().toISOString()
        })
        .eq("id", userData.user.id)
        .eq("subscription_id", subscriptionId)

      if (memberUpdateError) {
        console.error("Error updating member subscription status:", memberUpdateError)
      }
    }

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

// New function to handle direct checkout links
export async function handleDirectCheckout(planType: PlanType, paymentType: PaymentType) {
  try {
    const supabase = createServerSupabaseClient()

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("Authentication error in handleDirectCheckout:", authError)
      return redirect(`/login?redirect=/membership&plan=${planType}&payment=${paymentType}`)
    }

    // Map of direct checkout URLs
    const checkoutUrls: Record<string, string> = {
      'under25-monthly': 'https://buy.stripe.com/test_3cscMRcEy0c92nS28c',
      'under25-annual': 'https://buy.stripe.com/test_4gw9AF6ga5wtd2w7sv',
      'over25-monthly': 'https://buy.stripe.com/test_bIY149dIC6AxgeI6ou',
      'over25-annual': 'https://buy.stripe.com/test_4gw5kpcEy6Ax9Qk7sx',
      'family-monthly': 'https://buy.stripe.com/test_14k149fQK2kh4w06ow',
      'family-annual': 'https://buy.stripe.com/test_dR67sx8oi0c99Qk6ov'
    }

    const key = `${planType}-${paymentType}`
    const checkoutUrl = checkoutUrls[key]

    if (!checkoutUrl) {
      console.error("Invalid plan or payment type:", planType, paymentType)
      return redirect("/membership?error=invalid-plan")
    }

    // Store the user's selection in the database for later reference
    const { error: insertError } = await supabase
      .from("checkout_selections")
      .insert({
        user_id: user.id,
        plan_type: planType,
        payment_type: paymentType,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error("Error storing checkout selection:", insertError)
      // Continue anyway, as this is not critical
    }

    // Redirect to the direct checkout URL
    return redirect(checkoutUrl)
  } catch (error) {
    console.error("Error in handleDirectCheckout:", error)
    return redirect("/membership?error=checkout-failed")
  }
}
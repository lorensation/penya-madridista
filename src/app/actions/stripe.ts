import { createServerActionClient } from "@/lib/supabase-server-actions"
import { redirect } from "next/navigation"
import { stripe } from "@/lib/stripe"
import { getBaseUrl } from "@/lib/utils"

export async function createCheckoutSession(priceId: string) {
  const supabase = createServerActionClient()

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

export async function createPortalSession() {
  const supabase = createServerActionClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect("/login")
  }

  // Retrieve customer ID from Supabase
  const { data: profile } = await supabase
    .from("miembros")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return redirect("/dashboard/membership?error=no-customer")
  }

  // Create a billing portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${getBaseUrl()}/dashboard/membership`,
  })

  if (session.url) {
    return redirect(session.url)
  }

  return redirect("/dashboard/membership?error=true")
}

export async function cancelSubscription() {
  const supabase = createServerActionClient()

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
      .eq("id", user.id)
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
import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getServiceSupabase } from "@/lib/supabase"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
})

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId } = await request.json()

    if (!priceId || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get user details from Supabase
    const supabase = getServiceSupabase()
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, name")
      .eq("id", userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      billing_address_collection: "required",
      client_reference_id: userId,
      customer_email: userData.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription", // Ensure this is set to subscription
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          userId,
        },
      },
      // Make sure to include the session_id parameter in the success URL
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/complete-profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/membership?canceled=true`,
      // Add metadata to the session itself as well
      metadata: {
        userId,
        price_id: priceId,
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error: unknown) {
    console.error("Error creating checkout session:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}


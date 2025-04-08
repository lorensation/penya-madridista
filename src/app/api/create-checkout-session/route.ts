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
    
    // First check if the user exists in the auth.users table
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    
    if (authError || !authUser?.user) {
      console.error("Auth user not found:", authError)
      return NextResponse.json({ error: "User not found in auth system" }, { status: 404 })
    }
    
    // Then get user profile from miembros table
    const { data: userData, error: userError } = await supabase
      .from("miembros")
      .select("email, name")
      .eq("id", userId)
      .single()
    
      if (userError) console.log("Error while fetching userData from miembros: ", userError) 

    // If user doesn't have a profile yet, use the auth user data
    const userEmail = userData?.email || authUser.user.email
    const userName = userData?.name || authUser.user.user_metadata?.name || ''
    
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 404 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      billing_address_collection: "required",
      client_reference_id: userId,
      customer_email: userEmail,
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
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/complete-profile?session_id={CHECKOUT_SESSION_ID}&userId=${userId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/membership?canceled=true`,
      // Add metadata to the session itself as well
      metadata: {
        userId,
        userName,
        price_id: priceId,
      },
    })

    // Store the checkout session in your database with the user_id
    const { error: insertError } = await supabase
      .from("checkout_sessions")
      .insert({
        id: session.id,
        user_id: userId,
        price_id: priceId,
        status: session.status,
        metadata: session.metadata
      })

    if (insertError) {
      console.error("Error storing checkout session:", insertError)
      // Continue anyway since the Stripe session was created successfully
    }

    return NextResponse.json({ sessionId: session.id })
  } catch (error: unknown) {
    console.error("Error creating checkout session:", error)
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
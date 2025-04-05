import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import Stripe from "stripe"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia", // Using the correct API version
})

// Create a service role client for admin operations that need to bypass RLS
const serviceRoleClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id parameter" }, { status: 400 })
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer", "line_items"],
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Get user from auth context or from the client_reference_id
    const { data: authData } = await serviceRoleClient.auth.getUser()
    const userId = authData.user?.id || session.client_reference_id

    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    // Check if a checkout session record already exists
    const { data: existingSession, error: checkError } = await serviceRoleClient
      .from("checkout_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking for existing checkout session:", checkError)
      return NextResponse.json({ error: "Failed to check for existing session" }, { status: 500 })
    }

    // Extract plan type from metadata or line items
    let planType = "unknown"
    if (session.metadata && session.metadata.plan_type) {
      planType = session.metadata.plan_type
    } else if (session.line_items && session.line_items.data.length > 0) {
      const lineItem = session.line_items.data[0]
      if (lineItem.price && lineItem.price.product) {
        const productId = typeof lineItem.price.product === 'string' 
          ? lineItem.price.product 
          : lineItem.price.product.id
        
        try {
          const product = await stripe.products.retrieve(productId)
          planType = product.name || productId
        } catch (e) {
          console.error("Error fetching product:", e)
        }
      }
    }

    // Safely extract subscription and customer IDs with null checks
    const subscriptionId = session.subscription && typeof session.subscription === 'object' 
      ? session.subscription.id 
      : (typeof session.subscription === 'string' ? session.subscription : null)
    
    const customerId = session.customer && typeof session.customer === 'object' 
      ? session.customer.id 
      : (typeof session.customer === 'string' ? session.customer : null)
    
    // Determine subscription status with null checks
    let subscriptionStatus = null
    if (session.subscription && typeof session.subscription === 'object') {
      subscriptionStatus = session.subscription.status
    } else if (session.payment_status === "paid") {
      subscriptionStatus = "active"
    } else {
      subscriptionStatus = session.payment_status
    }

    // Prepare the session data
    const sessionData = {
      session_id: sessionId,
      user_id: userId,
      status: session.status,
      updated_at: new Date().toISOString(),
      subscription_id: subscriptionId,
      customer_id: customerId,
      subscription_status: subscriptionStatus,
      payment_status: session.payment_status,
      payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      plan_type: planType,
      price_id: session.metadata?.price_id || null,
    }

    if (existingSession) {
      // Update the existing record
      const { error: updateError } = await serviceRoleClient
        .from("checkout_sessions")
        .update({
          status: sessionData.status,
          updated_at: sessionData.updated_at,
          subscription_id: sessionData.subscription_id,
          customer_id: sessionData.customer_id,
          subscription_status: sessionData.subscription_status,
          payment_status: sessionData.payment_status,
          payment_intent: sessionData.payment_intent,
          plan_type: sessionData.plan_type,
        })
        .eq("session_id", sessionId)
        .eq("user_id", userId)

      if (updateError) {
        console.error("Error updating checkout session:", updateError)
        return NextResponse.json({ error: "Failed to update checkout session" }, { status: 500 })
      }
      console.log(`Updated existing checkout session: ${sessionId}`)
    } else {
      // Create a new record if it doesn't exist
      const insertData = {
        ...sessionData,
        created_at: new Date().toISOString(),
      }

      const { error: insertError } = await serviceRoleClient
        .from("checkout_sessions")
        .insert([insertData])

      if (insertError) {
        console.error("Error creating checkout session:", insertError)
        return NextResponse.json({ error: "Failed to create checkout session record" }, { status: 500 })
      }
      console.log(`Created new checkout session record: ${sessionId}`)
    }

    // Log the successful update
    console.log(`Successfully processed checkout session ${sessionId} for user ${userId}`)

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        customer_id: customerId,
        subscription_id: subscriptionId,
        payment_status: session.payment_status,
        subscription_status: subscriptionStatus,
        plan_type: planType,
      }
    })
  } catch (error) {
    console.error("Error processing checkout session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 }
    )
  }
}
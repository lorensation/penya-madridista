import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"
import Stripe from "stripe"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
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
      expand: ["subscription", "customer"],
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Get user from auth context or from the client_reference_id
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id || session.client_reference_id

    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    // Verify that the user has permission to access this session
    // First check if the session exists and belongs to this user
    const { data: existingSession, error: sessionError } = await supabase
      .from("checkout_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .single()

    // If there's an error and it's not just "no rows returned"
    if (sessionError && sessionError.code !== "PGRST116") {
      console.error("Error verifying session ownership:", sessionError)
      return NextResponse.json({ error: "Failed to verify session ownership" }, { status: 403 })
    }

    // If no session found for this user, they don't have permission
    if (!existingSession && sessionError?.code === "PGRST116") {
      console.error("User attempted to access a session they don't own")
      return NextResponse.json({ error: "You don't have permission to access this session" }, { status: 403 })
    }

    // Safely extract subscription and customer IDs with null checks
    const subscriptionId = session.subscription && typeof session.subscription === 'object' 
      ? session.subscription.id 
      : null
    
    const customerId = session.customer && typeof session.customer === 'object' 
      ? session.customer.id 
      : null
    
    // Determine subscription status with null checks
    let subscriptionStatus = null
    if (session.subscription && typeof session.subscription === 'object') {
      subscriptionStatus = session.subscription.status
    } else if (session.payment_status === "paid") {
      subscriptionStatus = "active"
    } else {
      subscriptionStatus = session.payment_status
    }

    // Use the service role client to update the checkout_sessions table
    // This bypasses RLS policies for this specific operation
    const { error: updateError } = await serviceRoleClient
      .from("checkout_sessions")
      .update({
        status: session.status,
        updated_at: new Date().toISOString(),
        subscription_id: subscriptionId,
        customer_id: customerId,
        subscription_status: subscriptionStatus,
        payment_status: session.payment_status,
        payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      })
      .eq("session_id", sessionId)
      .eq("user_id", userId)

    if (updateError) {
      console.error("Error updating checkout session:", updateError)
      return NextResponse.json({ error: "Failed to update checkout session" }, { status: 500 })
    }

    // Log the successful update
    console.log(`Successfully updated checkout session ${sessionId} for user ${userId}`)

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        status: session.status,
        customer_id: customerId,
        subscription_id: subscriptionId,
        payment_status: session.payment_status,
        subscription_status: subscriptionStatus,
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
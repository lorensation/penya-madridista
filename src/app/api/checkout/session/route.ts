import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { getServiceSupabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get("session_id")

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id parameter" }, { status: 400 })
    }

    // Get the current user
    const supabase = getServiceSupabase()

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Extract the important information
    const data: {
      sessionId: string
      customerId?: string
      subscriptionId?: string
      status: string | null
      userId?: string
      subscriptionStatus?: string
      subscriptionPlan?: string
    } = {
      sessionId: session.id,
      status: session.status,
      userId: session.client_reference_id || session.metadata?.userId,
    }

    // Handle customer which could be a string or object
    if (session.customer) {
      if (typeof session.customer === "string") {
        data.customerId = session.customer
      } else {
        data.customerId = session.customer.id
      }
    }

    // Handle subscription which could be a string or object
    if (session.subscription) {
      if (typeof session.subscription === "string") {
        data.subscriptionId = session.subscription
      } else {
        data.subscriptionId = session.subscription.id
        data.subscriptionStatus = session.subscription.status
        if (session.subscription.items.data.length > 0) {
          data.subscriptionPlan = session.subscription.items.data[0].price.id
        }
      }
    }

    // Store this information in the checkout_sessions table if it doesn't exist
    if (data.userId) {
      const { error } = await supabase.from("checkout_sessions").upsert(
        {
          session_id: session.id,
          user_id: data.userId,
          customer_id: data.customerId,
          subscription_id: data.subscriptionId,
          status: session.status,
          subscription_status: data.subscriptionStatus,
          plan_type: data.subscriptionPlan,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "session_id",
        },
      )

      if (error) {
        console.error("Error storing checkout session:", error)
      }
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error retrieving checkout session:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}


import { type NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase" // Changed from @/lib/supabase-server
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    // This endpoint should be protected in production
    const { userId, subscriptionId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // If subscriptionId is provided, fetch it from Stripe
    let subscription
    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId)
    } else {
      // Check if user has a subscription in the subscriptions table
      const { data: subscriptionData } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .single()

      if (subscriptionData?.id) {
        subscription = await stripe.subscriptions.retrieve(subscriptionData.id)
      } else {
        // No subscription found
        return NextResponse.json({ error: "No subscription found for this user" }, { status: 404 })
      }
    }

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    // Update the miembros table
    const { data: member, error: memberError } = await supabase
      .from("miembros")
      .select("id")
      .or(`user_id.eq.${userId},user_uuid.eq.${userId},id.eq.${userId}`)
      .single()

    if (memberError) {
      return NextResponse.json({ error: `Member not found: ${memberError.message}` }, { status: 404 })
    }

    // Update the member's subscription information
    const { error: updateError } = await supabase
      .from("miembros")
      .update({
        subscription_status: subscription.status,
        subscription_plan: subscription.items.data[0].price.id,
        subscription_id: subscription.id,
        subscription_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${userId},user_uuid.eq.${userId}`)

    if (updateError) {
      return NextResponse.json({ error: `Failed to update subscription: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Subscription updated successfully",
      data: {
        memberId: member.id,
        subscriptionStatus: subscription.status,
        subscriptionPlan: subscription.items.data[0].price.id,
      },
    })
  } catch (error) {
    console.error("Error updating subscription:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}


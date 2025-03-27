import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getServiceSupabase } from "@/lib/supabase"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const signature = request.headers.get("stripe-signature") as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    console.error(`Webhook signature verification failed: ${errorMessage}`)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const userId = subscription.metadata.userId

          if (!userId) {
            throw new Error("No userId found in subscription metadata")
          }

          // Get user details from Supabase
          const { data: userData, error: userError } = await supabase
            .from("webusers")
            .select("email, name")
            .eq("id", userId)
            .single()

          if (userError || !userData) {
            throw new Error(`User not found: ${userError?.message}`)
          }

          // Update webusers to mark as member
          const { error: updateError } = await supabase.from("webusers").update({ is_member: true }).eq("id", userId)

          if (updateError) {
            throw new Error(`Error updating user: ${updateError.message}`)
          }

          // Insert subscription data into the database
          const { error: subscriptionError } = await supabase.from("subscriptions").insert({
            id: subscription.id,
            user_id: userId,
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            quantity: subscription.items.data[0].quantity,
            cancel_at_period_end: subscription.cancel_at_period_end,
            created_at: new Date(subscription.created * 1000).toISOString(),
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
            cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          })

          if (subscriptionError) {
            throw new Error(`Error inserting subscription: ${subscriptionError.message}`)
          }

          // Check if user already exists in miembros table
          const { data: existingMember, error: memberCheckError } = await supabase
            .from("miembros")
            .select("id")
            .eq("user_id", userId)
            .single()

          // Only create a minimal miembros entry if it doesn't exist
          // The user will complete their profile later
          if (!existingMember && !memberCheckError) {
            const { error: memberError } = await supabase.from("miembros").insert({
              user_id: userId,
              email: userData.email,
              name: userData.name,
              subscription_status: subscription.status,
              subscription_plan: subscription.items.data[0].price.id,
              subscription_id: subscription.id,
              subscription_updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })

            if (memberError) {
              throw new Error(`Error creating member: ${memberError.message}`)
            }
          }
        }
        break
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.userId

        if (!userId) {
          throw new Error("No userId found in subscription metadata")
        }

        // Update webusers membership status based on subscription status
        const { error: userError } = await supabase
          .from("webusers")
          .update({
            is_member: subscription.status === "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId)

        if (userError) {
          throw new Error(`Error updating user: ${userError.message}`)
        }

        // Update subscription data in the database
        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
            cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          })
          .eq("id", subscription.id)

        if (subscriptionError) {
          throw new Error(`Error updating subscription: ${subscriptionError.message}`)
        }

        // Update miembros subscription status
        const { error: memberError } = await supabase
          .from("miembros")
          .update({
            subscription_status: subscription.status,
            subscription_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)

        if (memberError) {
          throw new Error(`Error updating member: ${memberError.message}`)
        }
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        // Update subscription data in the database
        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            ended_at: new Date(subscription.ended_at! * 1000).toISOString(),
          })
          .eq("id", subscription.id)

        if (subscriptionError) {
          throw new Error(`Error updating subscription: ${subscriptionError.message}`)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error(`Webhook error: ${errorMessage}`)
    return NextResponse.json({ error: errorMessage || "Webhook handler failed" }, { status: 500 })
  }
}

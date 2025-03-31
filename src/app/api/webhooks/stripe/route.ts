import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getServiceSupabase } from "@/lib/supabase"

// Add this function to manually update a member's subscription status
async function updateMemberSubscription(userId: string, subscription: Stripe.Subscription) {
  const supabase = getServiceSupabase()
  try {
    // First check if the member exists
    const { data: member, error: memberError } = await supabase
      .from("miembros")
      .select("*")
      .or(`user_id.eq.${userId},user_uuid.eq.${userId},auth_id.eq.${userId}`)
      .single()

    if (memberError) {
      console.error(`Error finding member for subscription update: ${memberError.message}`)
      return false
    }

    if (member) {
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
        .eq("id", member.id)

      if (updateError) {
        console.error(`Error updating member subscription: ${updateError.message}`)
        return false
      }

      console.log(`Successfully updated subscription for member: ${member.id}`)
      return true
    }

    return false
  } catch (error) {
    console.error(`Exception in updateMemberSubscription: ${error}`)
    return false
  }
}

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
    console.log(`Processing webhook event: ${event.type}`)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log("Checkout session completed:", session.id)

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const userId = subscription.metadata.userId

          if (!userId) {
            throw new Error("No userId found in subscription metadata")
          }

          console.log(`Updating membership status for user: ${userId}`)

          // Get user details from Supabase
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("email, name")
            .eq("id", userId)
            .single()

          if (userError || !userData) {
            throw new Error(`User not found: ${userError?.message}`)
          }

          // Also update the users table if it exists
          try {
            await supabase
              .from("users")
              .update({
                is_member: true,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId)
          } catch (error) {
            console.log("No users table or user not found in users table:", error)
            // Continue even if this fails
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
            .select("id, user_uuid")
            .or(`user_id.eq.${userId},user_uuid.eq.${userId},auth_id.eq.${userId}`)
            .single()

          // Only create a minimal miembros entry if it doesn't exist
          // The user will complete their profile later
          if (!existingMember && !memberCheckError) {
            const { error: memberError } = await supabase.from("miembros").insert({
              user_id: userId,
              user_uuid: userId, // Make sure user_uuid is set
              auth_id: userId, // Add auth_id field to match with the user
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
          } else if (existingMember) {
            // Update the existing member with subscription information
            const { error: updateError } = await supabase
              .from("miembros")
              .update({
                subscription_status: subscription.status,
                subscription_plan: subscription.items.data[0].price.id,
                subscription_id: subscription.id,
                subscription_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("user_uuid", userId)

            if (updateError) {
              throw new Error(`Error updating member subscription: ${updateError.message}`)
            }

            console.log(`Successfully updated subscription for existing member: ${userId}`)
          }

          console.log(`Successfully processed subscription for user: ${userId}`)
        }
        break
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.userId

        if (!userId) {
          throw new Error("No userId found in subscription metadata")
        }

        // Also update the users table if it exists
        try {
          await supabase
            .from("users")
            .update({
              is_member: subscription.status === "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId)
        } catch (error) {
          console.log("No users table or user not found in users table:", error)
          // Continue even if this fails
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
        const updated = await updateMemberSubscription(userId, subscription)
        if (!updated) {
          console.error(`Failed to update member subscription for user ${userId}`)
        }
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.userId

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

        // If we have a userId, update the user's membership status
        if (userId) {
          // Update users table
          try {
            await supabase
              .from("users")
              .update({
                is_member: false,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId)
          } catch (error) {
            console.log("Error updating users:", error)
          }
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

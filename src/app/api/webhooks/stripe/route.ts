import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia", // Using the correct API version
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
const shopWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET_SHOP

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature") as string

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 })
    }

    // Determine which webhook secret to use based on the signature
    // Try the main webhook secret first (for subscriptions)
    let event: Stripe.Event
    let isShopEvent = false

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      // If the main webhook secret fails, try the shop webhook secret
      try {
        if (shopWebhookSecret) {
          event = stripe.webhooks.constructEvent(body, signature, shopWebhookSecret)
          isShopEvent = true
        } else {
          console.error(`Webhook signature verification failed: ${err instanceof Error ? err.message : "Unknown error"}`)
          return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
        }
      } catch (shopErr) {
        console.error(`Webhook signature verification failed for both secrets: ${shopErr instanceof Error ? shopErr.message : "Unknown error"}`)
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
      }
    }

    console.log(`Processing Stripe event: ${event.type}`)

    // Handle the event based on whether it's a shop event or subscription event
    if (isShopEvent) {
      // Handle shop events
      switch (event.type) {
        case "checkout.session.completed":
          const session = event.data.object as Stripe.Checkout.Session
          if (session.mode === "payment") {
            await handleShopPayment(session)
          }
          break
        case "payment_intent.succeeded":
          // Handle successful shop payment intent if needed
          break
        case "payment_intent.payment_failed":
          // Handle failed shop payment intent if needed
          break
        default:
          console.log(`Unhandled shop event type: ${event.type}`)
      }
    } else {
      // Handle subscription events (existing functionality)
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
          break
        case "customer.subscription.updated":
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break
        case "invoice.payment_succeeded":
          await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
          break
        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
          break
        default:
          console.log(`Unhandled subscription event type: ${event.type}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 }
    )
  }
}

async function handleShopPayment(session: Stripe.Checkout.Session) {
  try {
    console.log('Processing shop payment:', session.id)
    
    if (!session?.metadata?.cart_id) {
      console.error('No cart_id in session metadata')
      return
    }

    const supabase = createRouteHandlerClient({ cookies })
    const cartId = session.metadata.cart_id
    const userId = session.metadata.user_id || null

    // 1. Create order in database
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        stripe_checkout_id: session.id,
        amount_cents: Number(session.amount_total),
        currency: session.currency || 'eur',
        status: 'paid',
        shipping: session.shipping_details,
        metadata: {
          customer_email: session.customer_details?.email,
          customer_name: session.customer_details?.name,
        }
      })
      .select('id')
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return
    }

    // 2. Get cart items
    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items_with_prices')
      .select('*')
      .eq('cart_id', cartId)

    if (cartError || !cartItems?.length) {
      console.error('Error getting cart items:', cartError)
      return
    }

    // 3. Copy cart items to order_items
    const orderItems = cartItems.map(item => ({
      order_id: orderData.id,
      variant_id: item.variant_id,
      qty: item.qty,
      price_cents: item.price_cents
    }))

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (orderItemsError) {
      console.error('Error creating order items:', orderItemsError)
      return
    }

    // 4. Decrement inventory (careful with race conditions)
    for (const item of cartItems) {
      // Use a transaction or stored procedure here in production
      const { error: inventoryError } = await supabase.rpc('decrement_inventory', {
        p_variant_id: item.variant_id,
        p_quantity: item.qty
      })
      
      if (inventoryError) {
        console.error('Error updating inventory:', inventoryError)
      }
    }

    // 5. Clear the cart (optional, some sites keep the cart)
    const { error: clearCartError } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId)

    if (clearCartError) {
      console.error('Error clearing cart:', clearCartError)
    }

    console.log('Shop payment processed successfully for order:', orderData.id)
  } catch (error) {
    console.error('Error handling shop payment:', error)
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    // Get the subscription details if available
    let subscriptionData = null
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      subscriptionData = subscription
    }

    // Extract the plan type from metadata or line items
    let planType = "unknown"
    let priceId = null
    let paymentType = "monthly" // Default to monthly
    
    if (session.metadata && session.metadata.price_id) {
      priceId = session.metadata.price_id
    }
    
    if (session.metadata && session.metadata.plan_type) {
      planType = session.metadata.plan_type
    }

    if (session.metadata && session.metadata.payment_type) {
      paymentType = session.metadata.payment_type
    }
    
    // If plan_type is not in metadata, try to extract from line items
    if (planType === "unknown" && session.line_items) {
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
        if (lineItems.data.length > 0 && lineItems.data[0].price) {
          const price = await stripe.prices.retrieve(lineItems.data[0].price.id)
          
          // Try to determine plan type from price nickname or product
          if (price.nickname) {
            if (price.nickname.toLowerCase().includes('under25')) {
              planType = 'under25';
            } else if (price.nickname.toLowerCase().includes('over25')) {
              planType = 'over25';
            } else if (price.nickname.toLowerCase().includes('family')) {
              planType = 'family';
            }
          }
          
          // Try to determine payment type from price recurring interval
          if (price.recurring && price.recurring.interval) {
            paymentType = price.recurring.interval === 'year' ? 'annual' : 
                          price.recurring.interval_count && price.recurring.interval_count >= 10 ? 'decade' : 'monthly';
          }
          
          priceId = lineItems.data[0].price.id
        }
      } catch (e) {
        console.error("Error fetching line items:", e)
      }
    }

    // Prepare metadata to store
    const metadataObj = {
      plan_type: planType,
      payment_type: paymentType,
      payment_status: session.payment_status,
      payment_intent: session.payment_intent || null,
      ...session.metadata
    }

    // Check if a checkout session record already exists with the Stripe session ID
    const { data: existingSessions, error: checkError } = await serviceRoleClient
      .from("checkout_sessions")
      .select("*")
      .eq("metadata->stripe_session_id", session.id)

    if (checkError) {
      console.error("Error checking for existing checkout session:", checkError)
      return
    }

    // Handle checkout_sessions table (for backward compatibility)
    if (existingSessions && existingSessions.length > 0) {
      // Update the existing record
      const { error: updateError } = await serviceRoleClient
        .from("checkout_sessions")
        .update({
          status: session.status,
          updated_at: new Date().toISOString(),
          subscription_id: session.subscription as string || null,
          customer_id: session.customer as string || null,
          price_id: priceId,
          plan_type: planType, // Add plan_type directly to the record
          metadata: {
            ...existingSessions[0].metadata,
            ...metadataObj,
            subscription_status: subscriptionData ? subscriptionData.status : "active"
          }
        })
        .eq("session_id", existingSessions[0].session_id)

      if (updateError) {
        console.error("Error updating checkout session:", updateError)
        return
      }
      console.log(`Updated existing checkout session for Stripe session: ${session.id}`)
    } else {
      // Create a new record if it doesn't exist
      // Only proceed if we have a user_id (client_reference_id)
      if (!session.client_reference_id) {
        console.error("Cannot create checkout session record: No client_reference_id provided in session", session.id)
        return
      }

      const sessionData = {
        user_id: session.client_reference_id,
        status: session.status,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        subscription_id: session.subscription as string || null,
        customer_id: session.customer as string || null,
        price_id: priceId,
        plan_type: planType, // Add plan_type directly to the record
        metadata: {
          stripe_session_id: session.id, // Store the Stripe session ID in metadata
          ...metadataObj,
          subscription_status: subscriptionData ? subscriptionData.status : "active"
        }
      }

      const { error: insertError } = await serviceRoleClient
        .from("checkout_sessions")
        .insert([sessionData])

      if (insertError) {
        console.error("Error creating checkout session:", insertError)
        return
      }
      console.log(`Created new checkout session record for Stripe session: ${session.id}`)
    }

    // Now handle the new subscriptions table
    if (session.client_reference_id && session.subscription) {
      // Check if a subscription record already exists
      const { data: existingSubscription, error: subCheckError } = await serviceRoleClient
        .from("subscriptions")
        .select("id")
        .eq("member_id", session.client_reference_id)
        .eq("stripe_subscription_id", session.subscription as string)
        .maybeSingle()

      if (subCheckError && subCheckError.code !== "PGRST116") {
        console.error("Error checking for existing subscription:", subCheckError)
        return
      }

      // Calculate subscription dates
      const startDate = new Date()
      const endDate = new Date()
      
      if (paymentType === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1)
      } else if (paymentType === 'decade') {
        endDate.setFullYear(endDate.getFullYear() + 10)
      } else {
        endDate.setMonth(endDate.getMonth() + 1)
      }

      if (existingSubscription) {
        // Update existing subscription
        const { error: updateSubError } = await serviceRoleClient
          .from("subscriptions")
          .update({
            plan_type: planType,
            payment_type: paymentType,
            stripe_customer_id: session.customer as string,
            stripe_checkout_session_id: session.id,
            status: subscriptionData ? subscriptionData.status : "active",
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", existingSubscription.id)

        if (updateSubError) {
          console.error("Error updating subscription:", updateSubError)
        } else {
          console.log(`Updated existing subscription for member ${session.client_reference_id}`)
        }
      } else {
        // Create new subscription
        const { error: insertSubError } = await serviceRoleClient
          .from("subscriptions")
          .insert({
            member_id: session.client_reference_id,
            plan_type: planType,
            payment_type: paymentType,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            stripe_checkout_session_id: session.id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: subscriptionData ? subscriptionData.status : "active",
          })

        if (insertSubError) {
          console.error("Error creating subscription:", insertSubError)
        } else {
          console.log(`Created new subscription for member ${session.client_reference_id}`)
        }
      }
    }

    // We don't update the miembros table here because the user might need to complete their profile first
    // That will be handled in the success page flow
    console.log(`Successfully processed checkout.session.completed for session ${session.id}`)
  } catch (error) {
    console.error("Error handling checkout.session.completed:", error)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    // Find the user associated with this subscription in miembros table
    const { data: memberData, error: memberError } = await serviceRoleClient
      .from("miembros")
      .select("id, user_uuid")
      .eq("subscription_id", subscription.id)
      .maybeSingle()

    if (memberError && memberError.code !== "PGRST116") {
      console.error("Error finding member for subscription update:", memberError)
      return
    }

    // Update the member's subscription status if found
    if (memberData) {
      const { error: updateMemberError } = await serviceRoleClient
        .from("miembros")
        .update({
          subscription_status: subscription.status,
          subscription_updated_at: new Date().toISOString(),
        })
        .eq("id", memberData.id)
      
      if (updateMemberError) {
        console.error("Error updating member subscription status:", updateMemberError)
      } else {
        console.log(`Updated subscription status to ${subscription.status} for member ${memberData.id}`)
      }
    } else {
      console.log(`No member found with subscription_id ${subscription.id} in miembros table`)
    }

    // Update the subscription in the new subscriptions table
    const { data: subscriptionData, error: subscriptionError } = await serviceRoleClient
      .from("subscriptions")
      .select("id, member_id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle()

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      console.error("Error finding subscription record:", subscriptionError)
      return
    }

    if (subscriptionData) {
      const { error: updateSubError } = await serviceRoleClient
        .from("subscriptions")
        .update({
          status: subscription.status,
          updated_at: new Date().toISOString()
        })
        .eq("id", subscriptionData.id)

      if (updateSubError) {
        console.error("Error updating subscription record:", updateSubError)
      } else {
        console.log(`Updated subscription status to ${subscription.status} in subscriptions table`)
      }
    } else {
      console.log(`No subscription record found with stripe_subscription_id ${subscription.id}`)
    }

    // Also update any related checkout sessions (for backward compatibility)
    const { data: checkoutSessions, error: sessionsError } = await serviceRoleClient
      .from("checkout_sessions")
      .select("*")
      .eq("subscription_id", subscription.id)

    if (sessionsError) {
      console.error("Error finding checkout sessions for subscription update:", sessionsError)
      return
    }

    if (checkoutSessions && checkoutSessions.length > 0) {
      // Update each session individually to properly handle the metadata
      for (const session of checkoutSessions) {
        const { error: updateSessionError } = await serviceRoleClient
          .from("checkout_sessions")
          .update({
            updated_at: new Date().toISOString(),
            metadata: {
              ...session.metadata,
              subscription_status: subscription.status
            }
          })
          .eq("session_id", session.session_id)
        
        if (updateSessionError) {
          console.error(`Error updating checkout session ${session.session_id}:`, updateSessionError)
        }
      }
      
      console.log(`Updated ${checkoutSessions.length} checkout sessions for subscription ${subscription.id}`)
    } else {
      console.log(`No checkout sessions found with subscription_id ${subscription.id}`)
    }
    
    console.log(`Successfully processed subscription.updated for subscription ${subscription.id}`)
  } catch (error) {
    console.error("Error handling subscription.updated:", error)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    // Find the user associated with this subscription in miembros table
    const { data: memberData, error: memberError } = await serviceRoleClient
      .from("miembros")
      .select("id, user_uuid")
      .eq("subscription_id", subscription.id)
      .maybeSingle()

    if (memberError && memberError.code !== "PGRST116") {
      console.error("Error finding member for subscription deletion:", memberError)
      return
    }

    // Update the member's subscription status to canceled if found
    if (memberData) {
      const { error: updateMemberError } = await serviceRoleClient
        .from("miembros")
        .update({
          subscription_status: "canceled",
          subscription_updated_at: new Date().toISOString(),
        })
        .eq("id", memberData.id)
      
      if (updateMemberError) {
        console.error("Error updating member subscription status to canceled:", updateMemberError)
      } else {
        console.log(`Updated subscription status to canceled for member ${memberData.id}`)
      }
    } else {
      console.log(`No member found with subscription_id ${subscription.id} in miembros table`)
    }

    // Update the subscription in the new subscriptions table
    const { data: subscriptionData, error: subscriptionError } = await serviceRoleClient
      .from("subscriptions")
      .select("id, member_id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle()

    if (subscriptionError && subscriptionError.code !== "PGRST116") {
      console.error("Error finding subscription record:", subscriptionError)
      return
    }

    if (subscriptionData) {
      const { error: updateSubError } = await serviceRoleClient
        .from("subscriptions")
        .update({
          status: "canceled",
          updated_at: new Date().toISOString()
        })
        .eq("id", subscriptionData.id)

      if (updateSubError) {
        console.error("Error updating subscription record to canceled:", updateSubError)
      } else {
        console.log(`Updated subscription status to canceled in subscriptions table`)
      }
    } else {
      console.log(`No subscription record found with stripe_subscription_id ${subscription.id}`)
    }

    // Also update any related checkout sessions (for backward compatibility)
    const { data: checkoutSessions, error: sessionsError } = await serviceRoleClient
      .from("checkout_sessions")
      .select("*")
      .eq("subscription_id", subscription.id)

    if (sessionsError) {
      console.error("Error finding checkout sessions for subscription deletion:", sessionsError)
      return
    }

    if (checkoutSessions && checkoutSessions.length > 0) {
      // Update each session individually to properly handle the metadata
      for (const session of checkoutSessions) {
        const { error: updateSessionError } = await serviceRoleClient
          .from("checkout_sessions")
          .update({
            updated_at: new Date().toISOString(),
            metadata: {
              ...session.metadata,
              subscription_status: "canceled"
            }
          })
          .eq("session_id", session.session_id)
        
        if (updateSessionError) {
          console.error(`Error updating checkout session ${session.session_id}:`, updateSessionError)
        }
      }
      
      console.log(`Updated ${checkoutSessions.length} checkout sessions for subscription ${subscription.id}`)
    } else {
      console.log(`No checkout sessions found with subscription_id ${subscription.id}`)
    }
    
    console.log(`Successfully processed subscription.deleted for subscription ${subscription.id}`)
  } catch (error) {
    console.error("Error handling subscription.deleted:", error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    if (invoice.subscription) {
      // Find members with this subscription that are in past_due status
      const { data: memberData, error: memberError } = await serviceRoleClient
        .from("miembros")
        .select("id, user_uuid")
        .eq("subscription_id", invoice.subscription as string)
        .eq("subscription_status", "past_due")
        .maybeSingle()

      if (memberError && memberError.code !== "PGRST116") {
        console.error("Error finding member for invoice payment success:", memberError)
        return
      }

      // Update the member's subscription status if found
      if (memberData) {
        const { error: updateError } = await serviceRoleClient
          .from("miembros")
          .update({
            subscription_status: "active",
            subscription_updated_at: new Date().toISOString(),
          })
          .eq("id", memberData.id)
        
        if (updateError) {
          console.error("Error updating subscription status after payment success:", updateError)
        } else {
          console.log(`Successfully updated subscription status to active for member ${memberData.id}`)
        }
      } else {
        console.log(`No past_due member found with subscription_id ${invoice.subscription} in miembros table`)
      }

      // Update the subscription in the new subscriptions table
      const { data: subscriptionData, error: subscriptionError } = await serviceRoleClient
        .from("subscriptions")
        .select("id")
        .eq("stripe_subscription_id", invoice.subscription as string)
        .eq("status", "past_due")
        .maybeSingle()

      if (subscriptionError && subscriptionError.code !== "PGRST116") {
        console.error("Error finding subscription record:", subscriptionError)
        return
      }

      if (subscriptionData) {
        const { error: updateSubError } = await serviceRoleClient
          .from("subscriptions")
          .update({
            status: "active",
            updated_at: new Date().toISOString()
          })
          .eq("id", subscriptionData.id)

        if (updateSubError) {
          console.error("Error updating subscription record to active:", updateSubError)
        } else {
          console.log(`Updated subscription status to active in subscriptions table after payment success`)
        }
      } else {
        console.log(`No past_due subscription record found with stripe_subscription_id ${invoice.subscription}`)
      }

      // Also update any related checkout sessions (for backward compatibility)
      const { data: checkoutSessions, error: sessionsError } = await serviceRoleClient
        .from("checkout_sessions")
        .select("*")
        .eq("subscription_id", invoice.subscription as string)

      if (sessionsError) {
        console.error("Error finding checkout sessions for invoice payment success:", sessionsError)
        return
      }

      if (checkoutSessions && checkoutSessions.length > 0) {
        // Update each session individually to properly handle the metadata
        for (const session of checkoutSessions) {
          if (session.metadata?.subscription_status === "past_due") {
            const { error: updateSessionError } = await serviceRoleClient
              .from("checkout_sessions")
              .update({
                updated_at: new Date().toISOString(),
                metadata: {
                  ...session.metadata,
                  subscription_status: "active",
                  last_invoice_paid: invoice.id,
                  last_payment_date: new Date().toISOString()
                }
              })
              .eq("session_id", session.session_id)
            
            if (updateSessionError) {
              console.error(`Error updating checkout session ${session.session_id}:`, updateSessionError)
            }
          }
        }
        
        console.log(`Updated checkout sessions for subscription ${invoice.subscription} after successful payment`)
      }
    }
    console.log(`Successfully processed invoice.payment_succeeded for invoice ${invoice.id}`)
  } catch (error) {
    console.error("Error handling invoice.payment_succeeded:", error)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    if (invoice.subscription) {
      // Find members with this subscription
      const { data: memberData, error: memberError } = await serviceRoleClient
        .from("miembros")
        .select("id, user_uuid")
        .eq("subscription_id", invoice.subscription as string)
        .maybeSingle()

      if (memberError && memberError.code !== "PGRST116") {
        console.error("Error finding member for invoice payment failure:", memberError)
        return
      }

      // Update the member's subscription status if found
      if (memberData) {
        const { error: updateError } = await serviceRoleClient
          .from("miembros")
          .update({
            subscription_status: "past_due",
            subscription_updated_at: new Date().toISOString(),
          })
          .eq("id", memberData.id)
        
        if (updateError) {
          console.error("Error updating subscription status to past_due:", updateError)
        } else {
          console.log(`Updated subscription status to past_due for member ${memberData.id} due to failed payment`)
        }
      } else {
        console.log(`No member found with subscription_id ${invoice.subscription} in miembros table`)
      }

      // Update the subscription in the new subscriptions table
      const { data: subscriptionData, error: subscriptionError } = await serviceRoleClient
        .from("subscriptions")
        .select("id")
        .eq("stripe_subscription_id", invoice.subscription as string)
        .maybeSingle()

      if (subscriptionError && subscriptionError.code !== "PGRST116") {
        console.error("Error finding subscription record:", subscriptionError)
        return
      }

      if (subscriptionData) {
        const { error: updateSubError } = await serviceRoleClient
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString()
          })
          .eq("id", subscriptionData.id)

        if (updateSubError) {
          console.error("Error updating subscription record to past_due:", updateSubError)
        } else {
          console.log(`Updated subscription status to past_due in subscriptions table after payment failure`)
        }
      } else {
        console.log(`No subscription record found with stripe_subscription_id ${invoice.subscription}`)
      }

      // Also update any related checkout sessions (for backward compatibility)
      const { data: checkoutSessions, error: sessionsError } = await serviceRoleClient
        .from("checkout_sessions")
        .select("*")
        .eq("subscription_id", invoice.subscription as string)

      if (sessionsError) {
        console.error("Error finding checkout sessions for invoice payment failure:", sessionsError)
        return
      }

      if (checkoutSessions && checkoutSessions.length > 0) {
        // Update each session individually to properly handle the metadata
        for (const session of checkoutSessions) {
          const { error: updateSessionError } = await serviceRoleClient
            .from("checkout_sessions")
            .update({
              updated_at: new Date().toISOString(),
              metadata: {
                ...session.metadata,
                subscription_status: "past_due",
                last_invoice_failed: invoice.id,
                last_payment_failure_date: new Date().toISOString()
              }
            })
            .eq("session_id", session.session_id)
          
          if (updateSessionError) {
            console.error(`Error updating checkout session ${session.session_id}:`, updateSessionError)
          }
        }
        
        console.log(`Updated checkout sessions for subscription ${invoice.subscription} after failed payment`)
      }
    }
    console.log(`Successfully processed invoice.payment_failed for invoice ${invoice.id}`)
  } catch (error) {
    console.error("Error handling invoice.payment_failed:", error)
  }
}
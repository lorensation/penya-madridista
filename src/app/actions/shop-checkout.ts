"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { v4 as uuidv4 } from "uuid"
import Stripe from "stripe"
import { CartItem } from "@/stores/cart"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia"
})

export async function createCheckoutSession(items: CartItem[]) {
  if (!items.length) {
    return { error: "No hay productos en el carrito" }
  }

  try {
    const supabase = createServerActionClient({ cookies })
    
    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    
    // Create or get cart in database
    const cartId = uuidv4()
    
    // Create line items for Stripe
    const lineItems = items.map(item => ({
      price: item.variant.stripePriceId,
      quantity: item.qty
    }))

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/tienda/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/tienda/cart`,
      metadata: {
        cart_id: cartId,
        user_id: user?.id || null
      },
      shipping_address_collection: {
        allowed_countries: ["ES"] // Only Spain for now
      },
      phone_number_collection: {
        enabled: true
      },
      billing_address_collection: "required",
      // Add customer details if available
      customer_email: user?.email
    })

    return { url: session.url }
  } catch (error: unknown) {
    console.error("Error creating checkout session:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al crear la sesión de pago"
    return { error: errorMessage }
  }
}

export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "customer"]
    })
    
    return { session }
  } catch (error: unknown) {
    console.error("Error retrieving checkout session:", error)
    const errorMessage = error instanceof Error ? error.message : "Error al recuperar la sesión de pago"
    return { error: errorMessage }
  }
}
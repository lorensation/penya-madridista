import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

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
      persistSession: false,
    },
  },
)

// Helper function to determine plan type from product ID or price ID
function determinePlanType(priceId: string | undefined, productId: string | undefined): string | null {
  // First check product ID against environment variables
  if (productId) {
    if (productId === process.env.NEXT_PUBLIC_STRIPE_UNDER25_PRODUCT_ID) {
      return "under25";
    } else if (productId === process.env.NEXT_PUBLIC_STRIPE_OVER25_PRODUCT_ID) {
      return "over25";
    } else if (productId === process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRODUCT_ID) {
      return "family";
    }
  }

  // If no match with product ID, try to determine from price ID or metadata
  // This is a fallback and should be enhanced with your actual price IDs if known
  if (priceId) {
    if (priceId.toLowerCase().includes('under25')) {
      return "under25";
    } else if (priceId.toLowerCase().includes('over25')) {
      return "over25";
    } else if (priceId.toLowerCase().includes('family')) {
      return "family";
    }
  }

  return null;
}

// Helper function to determine payment type (monthly/annual)
function determinePaymentType(priceId: string | undefined, recurring: Stripe.Price.Recurring | null): string {
  // First check if we have recurring information
  if (recurring && recurring.interval) {
    return recurring.interval === 'year' ? 'annual' : 'monthly';
  }

  // Otherwise try to determine from price ID
  if (priceId) {
    if (priceId.toLowerCase().includes('annual') || priceId.toLowerCase().includes('year')) {
      return "annual";
    }
  }

  // Default to monthly if we can't determine
  return "monthly";
}

// Common handler for both GET and POST requests
async function handleVerifyCheckoutSession(request: NextRequest) {
  try {
    // Get session ID from query params (GET) or request body (POST)
    let sessionId: string | null = null;
    let userId: string | null = null;

    // Check if this is a GET request with query params
    const url = new URL(request.url);
    sessionId = url.searchParams.get('session_id');

    // If no session ID in query params, try to get it from the request body (POST)
    if (!sessionId) {
      try {
        const body = await request.json();
        sessionId = body.sessionId;
        userId = body.userId;
      } catch (e) {
        // If parsing JSON fails, it might not be a POST request with JSON body
        console.log("Could not parse request body as JSON:", e);
      }
    }

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 });
    }

    console.log(`Processing checkout session: ${sessionId}`);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer", "line_items.data.price.product"],
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get the user ID from various sources
    userId = userId || session.metadata?.userId || session.client_reference_id || request.headers.get("x-user-id");

    if (!userId) {
      console.error("User ID missing in session:", {
        sessionId,
        metadata: session.metadata,
        clientReferenceId: session.client_reference_id,
      });

      // Return a more detailed error response
      return NextResponse.json(
        {
          error: "User ID not found in session",
          session: {
            id: session.id,
            hasMetadata: !!session.metadata,
            hasClientReferenceId: !!session.client_reference_id,
          },
          status: "incomplete",
        },
        { status: 400 },
      );
    }

    // Get the subscription details
    const subscription = session.subscription as Stripe.Subscription;
    const customer = session.customer as Stripe.Customer;

    // Get payment method details to extract last four digits
    let lastFour = null;
    if (subscription && subscription.default_payment_method) {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        typeof subscription.default_payment_method === "string"
          ? subscription.default_payment_method
          : subscription.default_payment_method.id,
      );
      lastFour = paymentMethod.card?.last4;
    }

    // Determine the subscription plan based on the line items
    const lineItems = session.line_items?.data || [];
    let priceId: string | undefined;
    let productId: string | undefined;
    let paymentType: string = "monthly"; // Default to monthly

    if (lineItems.length > 0 && lineItems[0].price) {
      priceId = lineItems[0].price.id;
      
      // Get product ID if available
      if (lineItems[0].price.product && typeof lineItems[0].price.product !== 'string') {
        productId = lineItems[0].price.product.id;
      }
      
      // Determine payment type from price recurring attribute
      if (lineItems[0].price.recurring) {
        paymentType = determinePaymentType(priceId, lineItems[0].price.recurring);
      }
    } else {
      // Fallback to metadata if line items aren't available
      priceId = session.metadata?.price_id;
      productId = session.metadata?.product_id;
      paymentType = session.metadata?.payment_type || "monthly";
    }

    // Determine plan type from product ID or price ID
    const planType = session.metadata?.plan_type || determinePlanType(priceId, productId);

    // Find the checkout session in our database by looking for the Stripe session ID in metadata
    const { data: checkoutSessions, error: findError } = await serviceRoleClient
      .from("checkout_sessions")
      .select("*")
      .eq("metadata->stripe_session_id", sessionId)
      .limit(1);

    if (findError) {
      console.error("Error finding checkout session:", findError);
    }

    const checkoutSession = checkoutSessions && checkoutSessions.length > 0 ? checkoutSessions[0] : null;

    if (checkoutSession) {
      // Update the existing checkout session
      const { error: updateError } = await serviceRoleClient
        .from("checkout_sessions")
        .update({
          status: session.payment_status,
          subscription_id: subscription?.id,
          customer_id: customer?.id,
          price_id: priceId,
          plan_type: planType || null, // Add plan_type directly to the record
          updated_at: new Date().toISOString(),
          metadata: {
            ...checkoutSession.metadata,
            stripe_session_id: sessionId,
            payment_status: session.payment_status,
            subscription_status: subscription?.status || "active",
            last_four: lastFour,
            plan_type: planType,
            payment_type: paymentType,
          },
        })
        .eq("session_id", checkoutSession.session_id);

      if (updateError) {
        console.error("Error updating checkout session:", updateError);
      } else {
        console.log(`Successfully updated checkout session ${checkoutSession.session_id} in database`);
      }
    } else {
      // Create a new checkout session record
      const { error: insertError } = await serviceRoleClient.from("checkout_sessions").insert([
        {
          user_id: userId,
          status: session.payment_status,
          subscription_id: subscription?.id,
          customer_id: customer?.id,
          price_id: priceId,
          plan_type: planType || null, // Add plan_type directly to the record
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            stripe_session_id: sessionId,
            payment_status: session.payment_status,
            subscription_status: subscription?.status || "active",
            last_four: lastFour,
            plan_type: planType,
            payment_type: paymentType,
          },
        },
      ]);

      if (insertError) {
        console.error("Error creating checkout session:", insertError);
      } else {
        console.log(`Successfully created checkout session for Stripe session ${sessionId} in database`);
      }
    }

    // Also create or update a record in the subscriptions table
    if (subscription && planType) {
      // Check if a subscription record already exists
      const { data: existingSubscription, error: subCheckError } = await serviceRoleClient
        .from("subscriptions")
        .select("id")
        .eq("member_id", userId)
        .eq("stripe_subscription_id", subscription.id)
        .maybeSingle();

      if (subCheckError && subCheckError.code !== "PGRST116") {
        console.error("Error checking for existing subscription:", subCheckError);
      }

      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();
      
      if (paymentType === 'annual') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      if (existingSubscription) {
        // Update existing subscription
        const { error: updateSubError } = await serviceRoleClient
          .from("subscriptions")
          .update({
            plan_type: planType,
            payment_type: paymentType,
            stripe_customer_id: customer?.id,
            stripe_checkout_session_id: session.id,
            status: subscription.status || "active",
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", existingSubscription.id);

        if (updateSubError) {
          console.error("Error updating subscription:", updateSubError);
        } else {
          console.log(`Updated existing subscription for member ${userId}`);
        }
      } else {
        // Create new subscription
        const { error: insertSubError } = await serviceRoleClient
          .from("subscriptions")
          .insert({
            member_id: userId,
            plan_type: planType,
            payment_type: paymentType,
            stripe_customer_id: customer?.id,
            stripe_subscription_id: subscription.id,
            stripe_checkout_session_id: session.id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: subscription.status || "active",
          });

        if (insertSubError) {
          console.error("Error creating subscription:", insertSubError);
        } else {
          console.log(`Created new subscription for member ${userId}`);
        }
      }
    }

    return NextResponse.json({
      status: session.payment_status === "paid" ? "complete" : session.payment_status,
      plan: planType,
      paymentType: paymentType,
      subscriptionId: subscription?.id,
      customerId: customer?.id,
      lastFour,
      userId, // Include userId in the response for debugging
    });
  } catch (error: unknown) {
    console.error("Error verifying checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Handle POST requests
export async function POST(request: NextRequest) {
  return handleVerifyCheckoutSession(request);
}

// Handle GET requests
export async function GET(request: NextRequest) {
  return handleVerifyCheckoutSession(request);
}

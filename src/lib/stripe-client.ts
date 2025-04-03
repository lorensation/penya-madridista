// This file contains client-safe Stripe functionality
// No server-side secrets are used here

import { loadStripe } from '@stripe/stripe-js';

// Load the Stripe.js library with the publishable key
export const getStripe = async () => {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    throw new Error('Stripe publishable key is missing');
  }
  
  const stripePromise = loadStripe(publishableKey);
  return stripePromise;
};

// Redirect to Stripe Checkout using the session ID from a server action
export async function redirectToCheckout(sessionId: string) {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Failed to load Stripe.js');
    }
    
    const { error } = await stripe.redirectToCheckout({
      sessionId,
    });
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
}
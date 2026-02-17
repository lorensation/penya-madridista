// DEPRECATED: Stripe actions replaced by RedSys payment actions.
// See: actions/payment.ts (prepareMembershipPayment, executePayment)
// TODO: Delete this file

"use server"

/**
 * @deprecated All Stripe actions have been replaced by RedSys.
 * Use actions/payment.ts for payment operations.
 */
export async function createCheckoutSession() {
  return { error: "Stripe has been replaced by RedSys" }
}

export async function createBillingPortalSession() {
  return { error: "Stripe billing portal is no longer available" }
}

export async function cancelSubscription() {
  return { error: "Use RedSys for subscription management" }
}
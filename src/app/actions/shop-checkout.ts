"use server"

// DEPRECATED: Stripe has been replaced by RedSys/Getnet.
// Use actions/payment.ts (prepareShopPayment + executePayment) instead.
// TODO: Delete this file.

/** @deprecated Use prepareShopPayment + executePayment from actions/payment.ts */
export async function createCheckoutSession() {
  return { error: "Stripe checkout has been replaced by RedSys. Use the new payment flow." }
}

/** @deprecated Stripe sessions no longer used */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getCheckoutSession(_sessionId: string) {
  return { error: "Stripe checkout has been replaced by RedSys." }
}
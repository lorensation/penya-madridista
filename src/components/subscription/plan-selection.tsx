// DEPRECATED: Stripe plan selection replaced by RedSys InSite payment.
// See: src/app/membership/page.tsx for the new RedSys-based flow.
// TODO: Delete this file

"use client"

/**
 * @deprecated This component used Stripe Checkout. 
 * Membership payments now use RedSys InSite on the membership page.
 */
export default function PlanSelection() {
  return (
    <div className="text-center p-8">
      <p>Plan selection has moved to the membership page.</p>
    </div>
  )
}
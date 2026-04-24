import { createClient } from "@supabase/supabase-js"

export interface PaymentTransactionStatusRow {
  event_id: string | null
  member_id: string | null
  redsys_order: string
  status: string
  context: string
  amount_cents: number
  ds_response: string | null
  updated_at: string
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export async function getPaymentTransactionStatusByOrder(order: string): Promise<PaymentTransactionStatusRow | null> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from("payment_transactions")
    .select("event_id, member_id, redsys_order, status, context, amount_cents, ds_response, updated_at")
    .eq("redsys_order", order)
    .maybeSingle()

  if (error) {
    console.error("[redsys] Failed loading transaction status", { order, error })
    return null
  }

  return data
}

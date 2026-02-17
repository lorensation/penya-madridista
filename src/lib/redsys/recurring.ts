/**
 * MIT Recurring Billing Service
 *
 * SERVER-ONLY — processes subscription renewals using stored card tokens.
 * Called by the cron endpoint at /api/payments/redsys/recurring.
 *
 * Flow:
 *   1. Query subscriptions whose end_date ≤ now AND status = "active"
 *   2. For each, call chargeMIT() with stored token + COF TxnID
 *   3. On success: extend end_date, create payment_transaction record
 *   4. On failure: mark subscription as past_due, create failed transaction record
 */

import { createClient } from "@supabase/supabase-js"
import { chargeMIT } from "./client"
import { generateOrderNumber } from "./order-number"
import { getMembershipPlan } from "./config"
import type { PlanType, PaymentInterval } from "./config"
import type { ExecutePaymentResult } from "./types"

// Admin client (bypasses RLS)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface RenewalResult {
  subscriptionId: string
  memberId: string
  planType: string
  interval: string
  success: boolean
  dsResponse?: string
  error?: string
  order?: string
}

export interface RecurringRunResult {
  processedAt: string
  totalDue: number
  totalProcessed: number
  totalSucceeded: number
  totalFailed: number
  totalSkipped: number
  results: RenewalResult[]
}

// ── Main Runner ──────────────────────────────────────────────────────────────

/**
 * Process all subscriptions due for renewal.
 *
 * @param dryRun  If true, only report what would be charged without charging.
 * @param limit   Max subscriptions to process in one run (default: 50).
 */
export async function processRenewals(options?: {
  dryRun?: boolean
  limit?: number
}): Promise<RecurringRunResult> {
  const dryRun = options?.dryRun ?? false
  const limit = options?.limit ?? 50
  const admin = getAdminClient()

  const result: RecurringRunResult = {
    processedAt: new Date().toISOString(),
    totalDue: 0,
    totalProcessed: 0,
    totalSucceeded: 0,
    totalFailed: 0,
    totalSkipped: 0,
    results: [],
  }

  // 1. Find subscriptions due for renewal
  const now = new Date().toISOString()

  const { data: dueSubs, error: queryErr } = await admin
    .from("subscriptions")
    .select("*")
    .eq("status", "active")
    .lte("end_date", now)
    .not("redsys_token", "is", null)
    .not("redsys_cof_txn_id", "is", null)
    .limit(limit)
    .order("end_date", { ascending: true })

  if (queryErr) {
    console.error("[recurring] Error querying due subscriptions:", queryErr)
    throw new Error(`Failed to query subscriptions: ${queryErr.message}`)
  }

  if (!dueSubs?.length) {
    console.log("[recurring] No subscriptions due for renewal")
    return result
  }

  result.totalDue = dueSubs.length

  // 2. Process each subscription
  for (const sub of dueSubs) {
    const subResult: RenewalResult = {
      subscriptionId: sub.id,
      memberId: sub.member_id,
      planType: sub.plan_type ?? "unknown",
      interval: sub.payment_type ?? "unknown",
      success: false,
    }

    try {
      // Validate token presence
      if (!sub.redsys_token || !sub.redsys_cof_txn_id) {
        subResult.error = "Missing redsys_token or cof_txn_id"
        result.totalSkipped++
        result.results.push(subResult)
        continue
      }

      // Look up plan amount
      const plan = getMembershipPlan(
        sub.plan_type as PlanType,
        sub.payment_type as PaymentInterval,
      )

      if (!plan) {
        subResult.error = `Unknown plan: ${sub.plan_type}_${sub.payment_type}`
        result.totalSkipped++
        result.results.push(subResult)
        continue
      }

      // Dry-run mode: report only
      if (dryRun) {
        subResult.success = true
        subResult.error = "DRY_RUN — not charged"
        result.totalProcessed++
        result.totalSucceeded++
        result.results.push(subResult)
        continue
      }

      // Generate new order number
      const order = generateOrderNumber("R")
      subResult.order = order

      // Create pending transaction
      const { data: txn, error: txnErr } = await admin
        .from("payment_transactions")
        .insert({
          redsys_order: order,
          transaction_type: "0",
          amount_cents: plan.amountCents,
          currency: "978",
          status: "pending",
          context: "membership",
          member_id: sub.member_id,
          subscription_id: sub.id,
          is_mit: true,
          metadata: {
            type: "recurring_renewal",
            planType: sub.plan_type,
            interval: sub.payment_type,
            previousEndDate: sub.end_date,
          },
        })
        .select("id")
        .single()

      if (txnErr || !txn) {
        console.error(`[recurring] Error creating txn for sub ${sub.id}:`, txnErr)
        subResult.error = "Failed to create transaction record"
        result.totalFailed++
        result.results.push(subResult)
        continue
      }

      // Execute MIT charge
      const chargeResult = await chargeMIT({
        order,
        amountCents: plan.amountCents,
        redsysToken: sub.redsys_token,
        cofTxnId: sub.redsys_cof_txn_id,
        description: `Renovación ${plan.name} — Peña Lorenzo Sanz`,
      })

      // Update transaction record
      await admin
        .from("payment_transactions")
        .update({
          status: chargeResult.success ? "authorized" : "denied",
          ds_response: chargeResult.dsResponse ?? null,
          ds_authorization_code: chargeResult.authorizationCode ?? null,
          cof_txn_id: chargeResult.cofTxnId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", txn.id)

      if (chargeResult.success) {
        // Extend the subscription period
        await handleRenewalSuccess(admin, sub, chargeResult, order)
        subResult.success = true
        subResult.dsResponse = chargeResult.dsResponse
        result.totalSucceeded++
      } else {
        // Mark for retry / past_due
        await handleRenewalFailure(admin, sub, chargeResult)
        subResult.success = false
        subResult.dsResponse = chargeResult.dsResponse
        subResult.error = chargeResult.error
        result.totalFailed++
      }

      result.totalProcessed++
      result.results.push(subResult)
    } catch (err) {
      console.error(`[recurring] Error processing sub ${sub.id}:`, err)
      subResult.error = err instanceof Error ? err.message : "Unexpected error"
      result.totalFailed++
      result.totalProcessed++
      result.results.push(subResult)
    }
  }

  return result
}

// ── Post-Charge Handlers ─────────────────────────────────────────────────────

async function handleRenewalSuccess(
  admin: ReturnType<typeof getAdminClient>,
  sub: Record<string, unknown>,
  chargeResult: ExecutePaymentResult,
  order: string,
) {
  const interval = sub.payment_type as string
  const currentEnd = new Date(sub.end_date as string)
  const newEnd = new Date(currentEnd)

  if (interval === "annual") {
    newEnd.setFullYear(newEnd.getFullYear() + 1)
  } else {
    newEnd.setMonth(newEnd.getMonth() + 1)
  }

  // If Redsys returned a new COF TxnID, update it
  const cofUpdate: Record<string, unknown> = {
    end_date: newEnd.toISOString(),
    redsys_last_order: order,
    updated_at: new Date().toISOString(),
    renewal_failures: 0, // Reset failure counter on success
  }

  if (chargeResult.cofTxnId && chargeResult.cofTxnId !== sub.redsys_cof_txn_id) {
    cofUpdate.redsys_cof_txn_id = chargeResult.cofTxnId
  }

  await admin
    .from("subscriptions")
    .update(cofUpdate)
    .eq("id", sub.id as string)

  console.log(
    `[recurring] ✓ Renewed sub ${sub.id} for ${sub.member_id} — new end: ${newEnd.toISOString()}`,
  )
}

async function handleRenewalFailure(
  admin: ReturnType<typeof getAdminClient>,
  sub: Record<string, unknown>,
  chargeResult: ExecutePaymentResult,
) {
  const failures = ((sub.renewal_failures as number) ?? 0) + 1
  const MAX_RETRIES = 3

  if (failures >= MAX_RETRIES) {
    // Too many failures — expire the subscription
    await admin
      .from("subscriptions")
      .update({
        status: "expired",
        renewal_failures: failures,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id as string)

    // Update miembros
    await admin
      .from("miembros")
      .update({
        subscription_status: "expired",
        subscription_updated_at: new Date().toISOString(),
      })
      .eq("user_uuid", sub.member_id as string)

    // Update users.is_member
    await admin
      .from("users")
      .update({ is_member: false })
      .eq("id", sub.member_id as string)

    console.warn(
      `[recurring] ✗ Sub ${sub.id} expired after ${failures} failed renewals (last error: ${chargeResult.error})`,
    )
  } else {
    // Mark as past_due for retry (next cron run will try again)
    await admin
      .from("subscriptions")
      .update({
        status: "past_due",
        renewal_failures: failures,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id as string)

    // Also flag miembros table
    await admin
      .from("miembros")
      .update({
        subscription_status: "past_due",
        subscription_updated_at: new Date().toISOString(),
      })
      .eq("user_uuid", sub.member_id as string)

    console.warn(
      `[recurring] ✗ Sub ${sub.id} renewal failed (attempt ${failures}/${MAX_RETRIES}): ${chargeResult.error}`,
    )
  }
}

// ── Expired Subscription Cleanup ─────────────────────────────────────────────

/**
 * Deactivate canceled subscriptions whose end_date has passed.
 * Call this alongside processRenewals.
 */
export async function expireCanceledSubscriptions(): Promise<{
  expired: number
}> {
  const admin = getAdminClient()
  const now = new Date().toISOString()

  // Find subscriptions that were canceled and whose period has ended
  const { data: canceledSubs, error } = await admin
    .from("subscriptions")
    .select("id, member_id")
    .eq("status", "canceled")
    .eq("cancel_at_period_end", true)
    .lte("end_date", now)

  if (error || !canceledSubs?.length) {
    return { expired: 0 }
  }

  for (const sub of canceledSubs) {
    await admin
      .from("subscriptions")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id)

    await admin
      .from("miembros")
      .update({
        subscription_status: "expired",
        subscription_updated_at: new Date().toISOString(),
      })
      .eq("user_uuid", sub.member_id)

    await admin
      .from("users")
      .update({ is_member: false })
      .eq("id", sub.member_id)
  }

  console.log(`[recurring] Expired ${canceledSubs.length} canceled subscriptions`)
  return { expired: canceledSubs.length }
}

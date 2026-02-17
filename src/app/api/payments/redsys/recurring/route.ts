/**
 * Recurring Billing Cron Endpoint
 *
 * POST /api/payments/redsys/recurring
 *
 * Secured with a shared secret (CRON_SECRET env var).
 * Designed to be called by:
 *   - Vercel Cron Jobs (vercel.json)
 *   - External cron services (e.g., cron-job.org, EasyCron)
 *   - Manual invocation from admin panel
 *
 * Processes all subscriptions due for renewal using MIT (Merchant-Initiated Transactions).
 */

import { NextRequest, NextResponse } from "next/server"
import { processRenewals, expireCanceledSubscriptions } from "@/lib/redsys"

// Allow GET for cron services that only support GET, but prefer POST
export async function GET(request: NextRequest) {
  return handleRenewals(request)
}

export async function POST(request: NextRequest) {
  return handleRenewals(request)
}

async function handleRenewals(request: NextRequest) {
  try {
    // ── Authentication ──────────────────────────────────────────────────
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error("[cron/recurring] CRON_SECRET env var not configured")
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 },
      )
    }

    // Check Authorization header (Bearer token) or query param
    const authHeader = request.headers.get("authorization")
    const querySecret = request.nextUrl.searchParams.get("secret")
    const providedSecret = authHeader?.replace("Bearer ", "") || querySecret

    if (providedSecret !== cronSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      )
    }

    // ── Parse options ──────────────────────────────────────────────────
    const dryRun = request.nextUrl.searchParams.get("dry_run") === "true"
    const limitParam = request.nextUrl.searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : 50

    console.log(
      `[cron/recurring] Starting renewal run — dryRun=${dryRun}, limit=${limit}`,
    )

    // ── 1. Process active renewals ──────────────────────────────────────
    const renewalResult = await processRenewals({ dryRun, limit })

    // ── 2. Expire canceled subscriptions whose period ended ─────────────
    const expireResult = await expireCanceledSubscriptions()

    // ── Summary log ────────────────────────────────────────────────────
    console.log(
      `[cron/recurring] Complete — ` +
      `Renewals: ${renewalResult.totalSucceeded}/${renewalResult.totalDue} OK, ` +
      `${renewalResult.totalFailed} failed, ` +
      `${renewalResult.totalSkipped} skipped | ` +
      `Expired canceled: ${expireResult.expired}`,
    )

    return NextResponse.json({
      ok: true,
      renewals: {
        processedAt: renewalResult.processedAt,
        totalDue: renewalResult.totalDue,
        totalProcessed: renewalResult.totalProcessed,
        totalSucceeded: renewalResult.totalSucceeded,
        totalFailed: renewalResult.totalFailed,
        totalSkipped: renewalResult.totalSkipped,
        // Include individual results only in non-production or dry-run
        ...(dryRun || process.env.NODE_ENV !== "production"
          ? { results: renewalResult.results }
          : {}),
      },
      expiredCanceled: expireResult.expired,
    })
  } catch (err) {
    console.error("[cron/recurring] Fatal error:", err)
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Internal error",
      },
      { status: 500 },
    )
  }
}

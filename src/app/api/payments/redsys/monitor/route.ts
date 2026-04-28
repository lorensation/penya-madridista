import { NextRequest, NextResponse } from "next/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

const DEFAULT_PENDING_MINUTES = 30
const DEFAULT_PENDING_PROFILE_HOURS = 24
const DEFAULT_LIMIT = 50

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function subtractMs(ms: number): string {
  return new Date(Date.now() - ms).toISOString()
}

function compactUnique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

export async function GET(request: NextRequest) {
  return handleMonitor(request)
}

export async function POST(request: NextRequest) {
  return handleMonitor(request)
}

async function handleMonitor(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error("[redsys.monitor]", {
        event: "redsys.monitor.failed",
        reason: "missing_cron_secret",
      })
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }

    const authHeader = request.headers.get("authorization")
    const querySecret = request.nextUrl.searchParams.get("secret")
    const providedSecret = authHeader?.replace("Bearer ", "") || querySecret

    if (providedSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const pendingMinutes = parsePositiveInteger(
      request.nextUrl.searchParams.get("pending_minutes"),
      DEFAULT_PENDING_MINUTES,
    )
    const pendingProfileHours = parsePositiveInteger(
      request.nextUrl.searchParams.get("pending_profile_hours"),
      DEFAULT_PENDING_PROFILE_HOURS,
    )
    const limit = Math.min(
      parsePositiveInteger(request.nextUrl.searchParams.get("limit"), DEFAULT_LIMIT),
      500,
    )

    const admin = createAdminSupabaseClient()
    const stalePendingCutoff = subtractMs(pendingMinutes * 60_000)
    const pendingProfileCutoff = subtractMs(pendingProfileHours * 60 * 60_000)
    const recentErrorCutoff = subtractMs(24 * 60 * 60_000)

    const [stalePendingResult, authorizedResult, pendingProfileResult, missingLastFourResult, errorResult] =
      await Promise.all([
        admin
          .from("payment_transactions")
          .select("id, redsys_order, member_id, amount_cents, created_at, updated_at")
          .eq("context", "membership")
          .eq("status", "pending")
          .lt("created_at", stalePendingCutoff)
          .order("created_at", { ascending: true })
          .limit(limit),
        admin
          .from("payment_transactions")
          .select("id, redsys_order, member_id, authorized_at, subscription_id")
          .eq("context", "membership")
          .eq("status", "authorized")
          .not("member_id", "is", null)
          .order("authorized_at", { ascending: false, nullsFirst: false })
          .limit(500),
        admin
          .from("subscriptions")
          .select("id, member_id, redsys_last_order, status, created_at, updated_at")
          .eq("status", "pending_profile")
          .lt("updated_at", pendingProfileCutoff)
          .order("updated_at", { ascending: true })
          .limit(limit),
        admin
          .from("payment_transactions")
          .select("id, redsys_order, member_id, authorized_at")
          .eq("context", "membership")
          .eq("status", "authorized")
          .is("last_four", null)
          .order("authorized_at", { ascending: false, nullsFirst: false })
          .limit(limit),
        admin
          .from("payment_transactions")
          .select("id, redsys_order, member_id, ds_response, created_at, updated_at")
          .eq("context", "membership")
          .eq("status", "error")
          .gte("updated_at", recentErrorCutoff)
          .order("updated_at", { ascending: false })
          .limit(limit),
      ])

    const queryErrors = [
      stalePendingResult.error,
      authorizedResult.error,
      pendingProfileResult.error,
      missingLastFourResult.error,
      errorResult.error,
    ].filter(Boolean)

    if (queryErrors.length > 0) {
      console.error("[redsys.monitor]", {
        event: "redsys.monitor.failed",
        reason: "query_failed",
        errors: queryErrors.map((error) => error?.message),
      })

      return NextResponse.json(
        {
          ok: false,
          error: "Monitoring query failed",
          details: queryErrors.map((error) => error?.message),
        },
        { status: 500 },
      )
    }

    const authorizedTransactions = authorizedResult.data ?? []
    const memberIds = compactUnique(authorizedTransactions.map((transaction) => transaction.member_id))

    const subscriptionsResult = memberIds.length
      ? await admin
          .from("subscriptions")
          .select("id, member_id, redsys_last_order, status")
          .in("member_id", memberIds)
      : { data: [], error: null }

    if (subscriptionsResult.error) {
      console.error("[redsys.monitor]", {
        event: "redsys.monitor.failed",
        reason: "subscription_lookup_failed",
        error_message: subscriptionsResult.error.message,
      })

      return NextResponse.json(
        {
          ok: false,
          error: "Subscription lookup failed",
          details: subscriptionsResult.error.message,
        },
        { status: 500 },
      )
    }

    const subscriptions = subscriptionsResult.data ?? []
    const authorizedWithoutSubscription = authorizedTransactions
      .filter((transaction) => {
        return !subscriptions.some(
          (subscription) =>
            subscription.member_id === transaction.member_id &&
            subscription.redsys_last_order === transaction.redsys_order,
        )
      })
      .slice(0, limit)

    const result = {
      checked_at: new Date().toISOString(),
      thresholds: {
        pending_minutes: pendingMinutes,
        pending_profile_hours: pendingProfileHours,
      },
      stale_pending_membership_transactions: stalePendingResult.data ?? [],
      authorized_memberships_without_subscription: authorizedWithoutSubscription,
      pending_profile_subscriptions: pendingProfileResult.data ?? [],
      authorized_memberships_missing_last_four: missingLastFourResult.data ?? [],
      recent_membership_error_transactions: errorResult.data ?? [],
    }

    const alertCounts = {
      stale_pending_membership_transactions: result.stale_pending_membership_transactions.length,
      authorized_memberships_without_subscription: result.authorized_memberships_without_subscription.length,
      pending_profile_subscriptions: result.pending_profile_subscriptions.length,
      authorized_memberships_missing_last_four: result.authorized_memberships_missing_last_four.length,
      recent_membership_error_transactions: result.recent_membership_error_transactions.length,
    }

    const hasHighPriorityAlert =
      alertCounts.stale_pending_membership_transactions > 0 ||
      alertCounts.authorized_memberships_without_subscription > 0 ||
      alertCounts.recent_membership_error_transactions > 0

    console[hasHighPriorityAlert ? "error" : "info"]("[redsys.monitor]", {
      event: hasHighPriorityAlert ? "redsys.monitor.alert" : "redsys.monitor.ok",
      ...alertCounts,
    })

    return NextResponse.json({
      ok: true,
      alert: hasHighPriorityAlert,
      counts: alertCounts,
      ...result,
    })
  } catch (error) {
    console.error("[redsys.monitor]", {
      event: "redsys.monitor.failed",
      reason: "unhandled_error",
      error_message: error instanceof Error ? error.message : String(error),
    })

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 },
    )
  }
}

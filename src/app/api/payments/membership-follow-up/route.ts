import { NextRequest, NextResponse } from "next/server"
import { processIncompletePaidMemberships } from "@/lib/membership/onboarding"

export async function GET(request: NextRequest) {
  return handleMembershipFollowUp(request)
}

export async function POST(request: NextRequest) {
  return handleMembershipFollowUp(request)
}

async function handleMembershipFollowUp(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error("[cron/membership-follow-up] CRON_SECRET env var not configured")
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
    }

    const authHeader = request.headers.get("authorization")
    const querySecret = request.nextUrl.searchParams.get("secret")
    const providedSecret = authHeader?.replace("Bearer ", "") || querySecret

    if (providedSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dryRun = request.nextUrl.searchParams.get("dry_run") === "true"
    const limitParam = request.nextUrl.searchParams.get("limit")
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 100

    const result = await processIncompletePaidMemberships({
      dryRun,
      limit,
    })

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    console.error("[cron/membership-follow-up] Fatal error", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 },
    )
  }
}

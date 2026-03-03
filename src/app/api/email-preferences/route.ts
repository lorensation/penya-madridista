import { NextRequest, NextResponse } from "next/server"
import { verifyPreferencesToken } from "@/lib/email/preferences-token"
import { createAdminSupabaseClient } from "@/lib/supabase"

/**
 * GET /api/email-preferences?token=xxx
 * Fetch current email preferences for the token holder.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.json({ success: false, error: "Token requerido" }, { status: 400 })
  }

  const payload = verifyPreferencesToken(token)
  if (!payload) {
    return NextResponse.json({ success: false, error: "Token no válido o expirado" }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()
  const { email, userId } = payload

  // Default preferences
  let marketing_emails = true
  let event_notifications = true

  // Try to get from users table
  const userQuery = userId
    ? supabase.from("users").select("marketing_emails, event_notifications").eq("id", userId).single()
    : supabase.from("users").select("marketing_emails, event_notifications").eq("email", email).maybeSingle()

  const { data: userData } = await userQuery

  if (userData) {
    marketing_emails = userData.marketing_emails ?? true
    event_notifications = userData.event_notifications ?? true
  }

  // Check newsletter subscriber status
  const { data: subscriber } = await supabase
    .from("newsletter_subscribers")
    .select("status")
    .eq("email", email)
    .maybeSingle()

  // If newsletter is unsubscribed, override marketing to false
  if (subscriber?.status === "unsubscribed") {
    marketing_emails = false
  }

  return NextResponse.json({
    success: true,
    email,
    preferences: {
      marketing_emails,
      event_notifications,
    },
  })
}

/**
 * POST /api/email-preferences
 * Update email preferences.
 * Body: { token, marketing_emails?, event_notifications? }
 */
export async function POST(request: NextRequest) {
  let body: {
    token?: string
    marketing_emails?: boolean
    event_notifications?: boolean
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Cuerpo de solicitud no válido" }, { status: 400 })
  }

  const { token, marketing_emails, event_notifications } = body

  if (!token) {
    return NextResponse.json({ success: false, error: "Token requerido" }, { status: 400 })
  }

  const payload = verifyPreferencesToken(token)
  if (!payload) {
    return NextResponse.json({ success: false, error: "Token no válido o expirado" }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()
  const { email, userId } = payload

  try {
    // Resolve user
    let resolvedUserId = userId || null
    if (!resolvedUserId) {
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle()
      resolvedUserId = userData?.id || null
    }

    // Update users table if user exists
    if (resolvedUserId) {
      // Fetch current values for audit
      const { data: currentUser } = await supabase
        .from("users")
        .select("marketing_emails, event_notifications")
        .eq("id", resolvedUserId)
        .single()

      if (currentUser) {
        const updates: Record<string, boolean> = {}

        if (typeof marketing_emails === "boolean" && currentUser.marketing_emails !== marketing_emails) {
          updates.marketing_emails = marketing_emails

          await supabase.from("communication_preference_audit").insert({
            email,
            user_id: resolvedUserId,
            channel: "marketing",
            old_value: currentUser.marketing_emails,
            new_value: marketing_emails,
            source: "preference_center",
          })
        }

        if (typeof event_notifications === "boolean" && currentUser.event_notifications !== event_notifications) {
          updates.event_notifications = event_notifications

          await supabase.from("communication_preference_audit").insert({
            email,
            user_id: resolvedUserId,
            channel: "events",
            old_value: currentUser.event_notifications,
            new_value: event_notifications,
            source: "preference_center",
          })
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from("users")
            .update(updates)
            .eq("id", resolvedUserId)
        }
      }
    }

    // Handle newsletter subscriber marketing opt-out/in
    if (typeof marketing_emails === "boolean") {
      const { data: subscriber } = await supabase
        .from("newsletter_subscribers")
        .select("id, status")
        .eq("email", email)
        .maybeSingle()

      if (subscriber) {
        if (!marketing_emails && subscriber.status !== "unsubscribed") {
          await supabase
            .from("newsletter_subscribers")
            .update({
              status: "unsubscribed",
              unsubscribed_at: new Date().toISOString(),
            })
            .eq("id", subscriber.id)
        } else if (marketing_emails && subscriber.status === "unsubscribed") {
          await supabase
            .from("newsletter_subscribers")
            .update({
              status: "active",
              unsubscribed_at: null,
            })
            .eq("id", subscriber.id)
        }
      }
    }

    return NextResponse.json({ success: true, message: "Preferencias actualizadas correctamente" })
  } catch (error) {
    console.error("Error updating email preferences:", error)
    return NextResponse.json({ success: false, error: "Error al actualizar las preferencias" }, { status: 500 })
  }
}

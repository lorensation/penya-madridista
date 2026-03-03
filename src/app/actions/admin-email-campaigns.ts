"use server"

import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import { renderEventNotificationEmail, getListUnsubscribeHeaders } from "@/lib/email/templates/event-notification"
import { renderMarketingEmail, getListUnsubscribeHeaders as getMarketingUnsubHeaders } from "@/lib/email/templates/marketing"
import { generatePreferencesToken } from "@/lib/email/preferences-token"
import { revalidatePath } from "next/cache"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CampaignResult {
  success: boolean
  campaignId?: string
  error?: string
}

export interface SendResult {
  success: boolean
  sent: number
  failed: number
  skipped: number
  error?: string
}

interface RecipientRow {
  email: string
  user_id: string
  source: "users" | "newsletter_subscribers"
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")

  const admin = createAdminSupabaseClient()
  const { data: member } = await admin
    .from("miembros")
    .select("role")
    .eq("user_uuid", user.id)
    .single()

  if (member?.role !== "admin") throw new Error("Acceso denegado")
  return user.id
}

function formatDateES(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// ─── Event Campaigns ────────────────────────────────────────────────────────

/**
 * Create a draft event notification campaign for a given event.
 */
export async function createEventCampaign(
  eventId: string,
  subjectOverride?: string,
  previewText?: string
): Promise<CampaignResult> {
  try {
    const adminUserId = await requireAdmin()
    const supabase = createAdminSupabaseClient()

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single()

    if (eventError || !event) {
      return { success: false, error: "Evento no encontrado" }
    }

    const subject = subjectOverride || `Nuevo evento: ${event.title}`

    // Build HTML with a placeholder token (will be replaced per-recipient)
    const html = renderEventNotificationEmail({
      eventTitle: event.title,
      eventDate: formatDateES(event.date),
      eventTime: event.time,
      eventLocation: event.location,
      eventDescription: event.description,
      eventImageUrl: event.image_url,
    })

    const { data: campaign, error: insertError } = await supabase
      .from("email_campaigns")
      .insert({
        kind: "event",
        status: "draft",
        subject,
        preview_text: previewText || null,
        html_body: html,
        event_id: eventId,
        segment: "active_members",
        created_by: adminUserId,
      })
      .select("id")
      .single()

    if (insertError || !campaign) {
      console.error("Error creating event campaign:", insertError)
      return { success: false, error: "Error al crear la campaña" }
    }

    revalidatePath("/admin/events")
    return { success: true, campaignId: campaign.id }
  } catch (error) {
    console.error("createEventCampaign error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" }
  }
}

/**
 * Get event campaign recipients: active members with event_notifications=true.
 */
async function getEventRecipients(): Promise<RecipientRow[]> {
  const supabase = createAdminSupabaseClient()

  // Get active members with event notifications enabled
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, is_member, event_notifications")
    .eq("is_member", true)
    .eq("event_notifications", true)

  if (error || !users) {
    console.error("Error fetching event recipients:", error)
    return []
  }

  // Filter by subscription status (active or trialing)
  const recipients: RecipientRow[] = []
  const seen = new Set<string>()

  for (const user of users) {
    if (seen.has(user.email)) continue

    // Check subscription status
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("member_id", user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle()

    // Also accept members who were invited (no subscription needed) by checking miembros
    if (!sub) {
      const { data: miembro } = await supabase
        .from("miembros")
        .select("role")
        .eq("user_uuid", user.id)
        .maybeSingle()

      if (!miembro) {
        continue
      }
    }

    seen.add(user.email)
    recipients.push({ email: user.email, user_id: user.id, source: "users" })
  }

  return recipients
}

/**
 * Get marketing campaign recipients based on segment.
 */
async function getMarketingRecipients(
  segment: string
): Promise<RecipientRow[]> {
  const supabase = createAdminSupabaseClient()
  const seen = new Set<string>()
  const recipients: RecipientRow[] = []

  if (segment === "all_opted_in" || segment === "members_opted_in") {
    // Users with marketing_emails=true
    const userQuery = supabase
      .from("users")
      .select("id, email, marketing_emails, is_member")
      .eq("marketing_emails", true)

    if (segment === "members_opted_in") {
      userQuery.eq("is_member", true)
    }

    const { data: users } = await userQuery

    if (users) {
      for (const user of users) {
        if (!seen.has(user.email)) {
          seen.add(user.email)
          recipients.push({ email: user.email, user_id: user.id, source: "users" })
        }
      }
    }
  }

  if (segment === "all_opted_in" || segment === "newsletter_only") {
    // Newsletter subscribers with status=active
    const { data: subscribers } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .eq("status", "active")

    if (subscribers) {
      for (const sub of subscribers) {
        if (!seen.has(sub.email)) {
          seen.add(sub.email)
          recipients.push({
            email: sub.email,
            user_id: null as unknown as string,
            source: "newsletter_subscribers",
          })
        }
      }
    }
  }

  return recipients
}

// ─── Marketing Campaigns ────────────────────────────────────────────────────

/**
 * Create a draft marketing campaign.
 */
export async function createMarketingCampaign(data: {
  subject: string
  previewText?: string
  htmlBody: string
  textBody?: string
  segment: string
}): Promise<CampaignResult> {
  try {
    const adminUserId = await requireAdmin()
    const supabase = createAdminSupabaseClient()

    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .insert({
        kind: "marketing",
        status: "draft",
        subject: data.subject,
        preview_text: data.previewText || null,
        html_body: data.htmlBody,
        text_body: data.textBody || null,
        segment: data.segment || "all_opted_in",
        created_by: adminUserId,
      })
      .select("id")
      .single()

    if (error || !campaign) {
      console.error("Error creating marketing campaign:", error)
      return { success: false, error: "Error al crear la campaña" }
    }

    revalidatePath("/admin/emails")
    return { success: true, campaignId: campaign.id }
  } catch (error) {
    console.error("createMarketingCampaign error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" }
  }
}

// ─── Send Campaign ──────────────────────────────────────────────────────────

/**
 * Send a test email for a campaign to a single address.
 */
export async function sendTestCampaign(
  campaignId: string,
  testEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminSupabaseClient()

    const { data: campaign, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single()

    if (error || !campaign) {
      return { success: false, error: "Campaña no encontrada" }
    }

    let preferencesToken: string | undefined
    try {
      preferencesToken = generatePreferencesToken(testEmail)
    } catch { /* no secret configured */ }

    let html: string
    const extraHeaders: Record<string, string> = {}

    if (campaign.kind === "event") {
      // Re-render with per-recipient token
      const event = campaign.event_id
        ? (await supabase.from("events").select("*").eq("id", campaign.event_id).single()).data
        : null

      html = renderEventNotificationEmail({
        eventTitle: event?.title || campaign.subject,
        eventDate: event ? formatDateES(event.date) : "",
        eventTime: event?.time,
        eventLocation: event?.location,
        eventDescription: event?.description,
        eventImageUrl: event?.image_url,
        preferencesToken,
      })
      Object.assign(extraHeaders, getListUnsubscribeHeaders(preferencesToken))
    } else {
      html = renderMarketingEmail({
        subject: campaign.subject,
        previewText: campaign.preview_text || undefined,
        htmlContent: campaign.html_body,
        preferencesToken,
      })
      Object.assign(extraHeaders, getMarketingUnsubHeaders(preferencesToken))
    }

    const result = await sendEmail({
      to: testEmail,
      subject: `[TEST] ${campaign.subject}`,
      html,
      text: campaign.text_body || undefined,
      headers: extraHeaders,
    })

    return { success: result.success }
  } catch (error) {
    console.error("sendTestCampaign error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" }
  }
}

/**
 * Send a campaign to all matching recipients.
 */
export async function sendCampaign(campaignId: string): Promise<SendResult> {
  try {
    await requireAdmin()
    const supabase = createAdminSupabaseClient()

    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single()

    if (campaignError || !campaign) {
      return { success: false, sent: 0, failed: 0, skipped: 0, error: "Campaña no encontrada" }
    }

    if (campaign.status === "sent") {
      return { success: false, sent: 0, failed: 0, skipped: 0, error: "Esta campaña ya ha sido enviada" }
    }

    // Mark as sending
    await supabase
      .from("email_campaigns")
      .update({ status: "sending", updated_at: new Date().toISOString() })
      .eq("id", campaignId)

    // Get recipients based on campaign type and segment
    const recipients =
      campaign.kind === "event"
        ? await getEventRecipients()
        : await getMarketingRecipients(campaign.segment)

    // Fetch event data for event campaigns
    let eventData = null
    if (campaign.kind === "event" && campaign.event_id) {
      const { data } = await supabase.from("events").select("*").eq("id", campaign.event_id).single()
      eventData = data
    }

    // Create delivery records
    const deliveryRows = recipients.map((r) => ({
      campaign_id: campaignId,
      recipient_email: r.email,
      recipient_user_id: r.user_id || null,
      recipient_source: r.source,
      status: "pending" as const,
    }))

    if (deliveryRows.length > 0) {
      await supabase.from("email_deliveries").insert(deliveryRows)
    }

    // Update recipient count
    await supabase
      .from("email_campaigns")
      .update({ recipient_count: recipients.length })
      .eq("id", campaignId)

    let sentCount = 0
    let failedCount = 0
    let skippedCount = 0

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        let preferencesToken: string | undefined
        try {
          preferencesToken = generatePreferencesToken(
            recipient.email,
            recipient.user_id || undefined
          )
        } catch { /* no secret */ }

        let html: string
        const extraHeaders: Record<string, string> = {}

        if (campaign.kind === "event") {
          html = renderEventNotificationEmail({
            eventTitle: eventData?.title || campaign.subject,
            eventDate: eventData ? formatDateES(eventData.date) : "",
            eventTime: eventData?.time,
            eventLocation: eventData?.location,
            eventDescription: eventData?.description,
            eventImageUrl: eventData?.image_url,
            preferencesToken,
          })
          Object.assign(extraHeaders, getListUnsubscribeHeaders(preferencesToken))
        } else {
          html = renderMarketingEmail({
            subject: campaign.subject,
            previewText: campaign.preview_text || undefined,
            htmlContent: campaign.html_body,
            preferencesToken,
          })
          Object.assign(extraHeaders, getMarketingUnsubHeaders(preferencesToken))
        }

        const result = await sendEmail({
          to: recipient.email,
          subject: campaign.subject,
          html,
          text: campaign.text_body || undefined,
          headers: extraHeaders,
        })

        if (result.success) {
          sentCount++
          await supabase
            .from("email_deliveries")
            .update({
              status: "sent",
              provider_message_id: result.messageId || null,
              sent_at: new Date().toISOString(),
            })
            .eq("campaign_id", campaignId)
            .eq("recipient_email", recipient.email)
        } else {
          failedCount++
          await supabase
            .from("email_deliveries")
            .update({
              status: "failed",
              error_message: String(result.error || "Unknown error"),
            })
            .eq("campaign_id", campaignId)
            .eq("recipient_email", recipient.email)
        }
      } catch (err) {
        failedCount++
        await supabase
          .from("email_deliveries")
          .update({
            status: "failed",
            error_message: err instanceof Error ? err.message : "Unknown error",
          })
          .eq("campaign_id", campaignId)
          .eq("recipient_email", recipient.email)
      }
    }

    // Update campaign status and counts
    const finalStatus = failedCount === recipients.length && recipients.length > 0 ? "failed" : "sent"
    await supabase
      .from("email_campaigns")
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)

    revalidatePath("/admin/events")
    revalidatePath("/admin/emails")

    return {
      success: true,
      sent: sentCount,
      failed: failedCount,
      skipped: skippedCount,
    }
  } catch (error) {
    console.error("sendCampaign error:", error)

    // Try to mark campaign as failed
    try {
      const supabase = createAdminSupabaseClient()
      await supabase
        .from("email_campaigns")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", campaignId)
    } catch { /* ignore */ }

    return {
      success: false,
      sent: 0,
      failed: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

// ─── Campaign Queries ───────────────────────────────────────────────────────

/**
 * Get all campaigns, optionally filtered by kind.
 */
export async function getCampaigns(kind?: "event" | "marketing") {
  try {
    await requireAdmin()
    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false })

    if (kind) {
      query = query.eq("kind", kind)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching campaigns:", error)
      return []
    }

    return data || []
  } catch {
    return []
  }
}

/**
 * Check if an event already has a sent campaign.
 */
export async function getEventCampaignStatus(eventId: string): Promise<{
  hasSentCampaign: boolean
  campaignId?: string
  sentAt?: string
}> {
  try {
    const supabase = createAdminSupabaseClient()

    const { data } = await supabase
      .from("email_campaigns")
      .select("id, status, sent_at")
      .eq("event_id", eventId)
      .eq("status", "sent")
      .maybeSingle()

    if (data) {
      return { hasSentCampaign: true, campaignId: data.id, sentAt: data.sent_at ?? undefined }
    }

    return { hasSentCampaign: false }
  } catch {
    return { hasSentCampaign: false }
  }
}

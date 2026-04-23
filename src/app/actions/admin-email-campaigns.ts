"use server"

import { revalidatePath } from "next/cache"
import { sendEmail } from "@/lib/email"
import { generatePreferencesToken } from "@/lib/email/preferences-token"
import { getAcquisitionCampaignTemplate } from "@/lib/email/templates/acquisition-campaign"
import {
  getListUnsubscribeHeaders as getEventUnsubscribeHeaders,
  renderEventNotificationEmail,
} from "@/lib/email/templates/event-notification"
import {
  getListUnsubscribeHeaders as getMarketingUnsubscribeHeaders,
  renderMarketingEmail,
} from "@/lib/email/templates/marketing"
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase"

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
  user_id: string | null
  source: "users" | "newsletter_subscribers"
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function requireAdmin(): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("No autenticado")
  }

  const admin = createAdminSupabaseClient()
  const { data: member } = await admin.from("miembros").select("role").eq("user_uuid", user.id).single()

  if (member?.role !== "admin") {
    throw new Error("Acceso denegado")
  }

  return user.id
}

function formatDateES(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

function pushUniqueRecipient(
  recipients: RecipientRow[],
  seen: Set<string>,
  recipient: RecipientRow | null
) {
  if (!recipient) {
    return
  }

  const normalizedEmail = normalizeEmail(recipient.email)
  if (!normalizedEmail || !isValidEmail(normalizedEmail) || seen.has(normalizedEmail)) {
    return
  }

  seen.add(normalizedEmail)
  recipients.push({
    ...recipient,
    email: normalizedEmail,
  })
}

export async function createEventCampaign(
  eventId: string,
  subjectOverride?: string,
  previewText?: string
): Promise<CampaignResult> {
  try {
    const adminUserId = await requireAdmin()
    const supabase = createAdminSupabaseClient()

    const { data: event, error: eventError } = await supabase.from("events").select("*").eq("id", eventId).single()

    if (eventError || !event) {
      return { success: false, error: "Evento no encontrado" }
    }

    const subject = subjectOverride || `Te invitamos al próximo evento: ${event.title}`

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
        preview_text: previewText || `Te invitamos a acompañarnos en ${event.title}`,
        html_body: html,
        event_id: eventId,
        segment: "newsletter_only",
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

async function getEventRecipients(): Promise<RecipientRow[]> {
  const supabase = createAdminSupabaseClient()
  const recipients: RecipientRow[] = []
  const seen = new Set<string>()

  const { data: subscribers, error } = await supabase
    .from("newsletter_subscribers")
    .select("email")
    .eq("status", "active")
    .is("unsubscribed_at", null)

  if (error || !subscribers) {
    console.error("Error fetching event recipients:", error)
    return []
  }

  for (const subscriber of subscribers) {
    pushUniqueRecipient(recipients, seen, {
      email: subscriber.email,
      user_id: null,
      source: "newsletter_subscribers",
    })
  }

  return recipients
}

async function getMarketingRecipients(segment: string): Promise<RecipientRow[]> {
  const supabase = createAdminSupabaseClient()
  const recipients: RecipientRow[] = []
  const seen = new Set<string>()

  if (segment === "all_opted_in" || segment === "members_opted_in") {
    const userQuery = supabase.from("users").select("id, email, marketing_emails, is_member").eq("marketing_emails", true)

    if (segment === "members_opted_in") {
      userQuery.eq("is_member", true)
    }

    const { data: users } = await userQuery

    for (const user of users || []) {
      pushUniqueRecipient(recipients, seen, {
        email: user.email,
        user_id: user.id,
        source: "users",
      })
    }
  }

  if (segment === "all_opted_in" || segment === "newsletter_only") {
    const { data: subscribers } = await supabase
      .from("newsletter_subscribers")
      .select("email")
      .eq("status", "active")
      .is("unsubscribed_at", null)

    for (const subscriber of subscribers || []) {
      pushUniqueRecipient(recipients, seen, {
        email: subscriber.email,
        user_id: null,
        source: "newsletter_subscribers",
      })
    }
  }

  return recipients
}

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

export async function createAcquisitionCampaignDraft(): Promise<CampaignResult> {
  const template = getAcquisitionCampaignTemplate()

  return createMarketingCampaign({
    subject: template.subject,
    previewText: template.previewText,
    htmlBody: template.htmlBody,
    textBody: template.textBody,
    segment: template.segment,
  })
}

export async function sendTestCampaign(
  campaignId: string,
  testEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    const supabase = createAdminSupabaseClient()

    const { data: campaign, error } = await supabase.from("email_campaigns").select("*").eq("id", campaignId).single()

    if (error || !campaign) {
      return { success: false, error: "Campaña no encontrada" }
    }

    let preferencesToken: string | undefined

    try {
      preferencesToken = generatePreferencesToken(testEmail)
    } catch {
      preferencesToken = undefined
    }

    let html: string
    const extraHeaders: Record<string, string> = {}

    if (campaign.kind === "event") {
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
      Object.assign(extraHeaders, getEventUnsubscribeHeaders(preferencesToken))
    } else {
      html = renderMarketingEmail({
        subject: campaign.subject,
        previewText: campaign.preview_text || undefined,
        htmlContent: campaign.html_body,
        preferencesToken,
      })
      Object.assign(extraHeaders, getMarketingUnsubscribeHeaders(preferencesToken))
    }

    const result = await sendEmail({
      to: testEmail,
      subject: `[TEST] ${campaign.subject}`,
      html,
      text: campaign.text_body || undefined,
      headers: extraHeaders,
    })

    return { success: result.success, error: result.success ? undefined : "Error al enviar el email de prueba" }
  } catch (error) {
    console.error("sendTestCampaign error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Error desconocido" }
  }
}

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

    await supabase.from("email_campaigns").update({ status: "sending", updated_at: new Date().toISOString() }).eq("id", campaignId)

    const recipients = campaign.kind === "event" ? await getEventRecipients() : await getMarketingRecipients(campaign.segment)

    let eventData = null
    if (campaign.kind === "event" && campaign.event_id) {
      const { data } = await supabase.from("events").select("*").eq("id", campaign.event_id).single()
      eventData = data
    }

    const deliveryRows = recipients.map((recipient) => ({
      campaign_id: campaignId,
      recipient_email: recipient.email,
      recipient_user_id: recipient.user_id,
      recipient_source: recipient.source,
      status: "pending" as const,
    }))

    if (deliveryRows.length > 0) {
      await supabase.from("email_deliveries").insert(deliveryRows)
    }

    await supabase.from("email_campaigns").update({ recipient_count: recipients.length }).eq("id", campaignId)

    let sentCount = 0
    let failedCount = 0
    const skippedCount = 0

    for (const recipient of recipients) {
      try {
        let preferencesToken: string | undefined

        try {
          preferencesToken = generatePreferencesToken(recipient.email, recipient.user_id || undefined)
        } catch {
          preferencesToken = undefined
        }

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
          Object.assign(extraHeaders, getEventUnsubscribeHeaders(preferencesToken))
        } else {
          html = renderMarketingEmail({
            subject: campaign.subject,
            previewText: campaign.preview_text || undefined,
            htmlContent: campaign.html_body,
            preferencesToken,
          })
          Object.assign(extraHeaders, getMarketingUnsubscribeHeaders(preferencesToken))
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
      } catch (error) {
        failedCount++
        await supabase
          .from("email_deliveries")
          .update({
            status: "failed",
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("campaign_id", campaignId)
          .eq("recipient_email", recipient.email)
      }
    }

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

    try {
      const supabase = createAdminSupabaseClient()
      await supabase.from("email_campaigns").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", campaignId)
    } catch {
      // Ignore campaign status fallback errors.
    }

    return {
      success: false,
      sent: 0,
      failed: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function getCampaigns(kind?: "event" | "marketing") {
  try {
    await requireAdmin()
    const supabase = createAdminSupabaseClient()

    let query = supabase.from("email_campaigns").select("*").order("created_at", { ascending: false })

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

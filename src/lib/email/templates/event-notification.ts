/**
 * Event notification email template.
 * Sent to active members when an admin triggers an event email campaign.
 */

import { renderEmailLayout, getListUnsubscribeHeaders } from "./layout"

export interface EventNotificationTemplateData {
  eventTitle: string
  eventDate: string
  eventTime?: string | null
  eventLocation?: string | null
  eventDescription?: string | null
  eventImageUrl?: string | null
  /** Preferences token for unsubscribe/manage links */
  preferencesToken?: string
}

export function renderEventNotificationEmail(data: EventNotificationTemplateData): string {
  const imageHtml = data.eventImageUrl
    ? `<div style="text-align:center;margin-bottom:20px;">
        <img src="${data.eventImageUrl}" alt="${data.eventTitle}" style="max-width:100%;height:auto;border-radius:8px;" />
      </div>`
    : ""

  const timeHtml = data.eventTime
    ? `<p style="margin:4px 0;"><strong>Hora:</strong> ${data.eventTime} h</p>`
    : ""

  const locationHtml = data.eventLocation
    ? `<p style="margin:4px 0;"><strong>Lugar:</strong> ${data.eventLocation}</p>`
    : ""

  const descriptionHtml = data.eventDescription
    ? `<p style="margin-top:16px;">${data.eventDescription}</p>`
    : ""

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lorenzosanz.com"

  const body = `
    <h1>Nuevo evento: ${data.eventTitle}</h1>
    
    ${imageHtml}
    
    <p>Hola,</p>
    <p>Te informamos de un nuevo evento organizado por la <strong>Peña Lorenzo Sanz Siempre Presente</strong>:</p>
    
    <div style="background-color:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;">
      <h2 style="margin-top:0;">${data.eventTitle}</h2>
      <p style="margin:4px 0;"><strong>Fecha:</strong> ${data.eventDate}</p>
      ${timeHtml}
      ${locationHtml}
      ${descriptionHtml}
    </div>
    
    <p style="text-align:center;">
      <a href="${baseUrl}" class="button">Ver más detalles</a>
    </p>
    
    <p>¡Hala Madrid!</p>
    <p>El equipo de la Peña Lorenzo Sanz</p>
  `

  return renderEmailLayout({
    body,
    previewText: `Nuevo evento: ${data.eventTitle}`,
    includeUnsubscribe: true,
    preferencesToken: data.preferencesToken,
  })
}

export { getListUnsubscribeHeaders }

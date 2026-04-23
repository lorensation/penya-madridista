/**
 * Event notification email template.
 * Sent when an admin launches an event campaign for newsletter subscribers.
 */

import { getListUnsubscribeHeaders, renderEmailLayout } from "./layout"

export interface EventNotificationTemplateData {
  eventTitle: string
  eventDate: string
  eventTime?: string | null
  eventLocation?: string | null
  eventDescription?: string | null
  eventImageUrl?: string | null
  preferencesToken?: string
}

export function renderEventNotificationEmail(data: EventNotificationTemplateData): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lorenzosanz.com"

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

  const body = `
    <h1>Te invitamos a nuestro próximo evento</h1>
    <p>Hola,</p>
    <p>
      La <strong>Peña Lorenzo Sanz Siempre Presente</strong> te invita a celebrar
      <strong>${data.eventTitle}</strong> junto al resto de peñistas y madridistas que comparten nuestra pasión.
    </p>

    ${imageHtml}

    <div style="background-color:#f8f9fa;padding:20px;border-radius:8px;margin:20px 0;">
      <h2 style="margin-top:0;">${data.eventTitle}</h2>
      <p style="margin:4px 0;"><strong>Fecha:</strong> ${data.eventDate}</p>
      ${timeHtml}
      ${locationHtml}
      ${descriptionHtml}
    </div>

    <p>
      Nos encantará contar contigo para seguir haciendo peña, compartir recuerdos y vivir juntos una nueva cita especial
      alrededor del madridismo y del legado de Lorenzo Sanz.
    </p>

    <p style="text-align:center;">
      <a href="${baseUrl}" class="button">Acceder a la web de la peña</a>
    </p>

    <p style="font-size:13px;color:#666666;">
      Recibes este correo porque aceptaste recibir comunicaciones e información de la Peña Lorenzo Sanz Siempre Presente.
    </p>

    <p>¡Hala Madrid!</p>
    <p>El equipo de la Peña Lorenzo Sanz</p>
  `

  return renderEmailLayout({
    body,
    previewText: `La Peña Lorenzo Sanz te invita a ${data.eventTitle}`,
    includeUnsubscribe: true,
    preferencesToken: data.preferencesToken,
  })
}

export { getListUnsubscribeHeaders }

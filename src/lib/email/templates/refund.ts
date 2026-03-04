/**
 * Refund request email templates.
 * - Admin notification (new request received)
 * - Member notification (request approved)
 * - Member notification (request declined)
 */

import { renderEmailLayout } from "./layout"

// ─── Reason labels ───────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  economic: "Motivos económicos",
  not_satisfied: "No estoy satisfecho con el servicio",
  personal: "Motivos personales",
  other: "Otro",
}

export function getReasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason
}

// ─── Admin notification ──────────────────────────────────────────────────────

export interface RefundRequestNotificationData {
  memberName: string
  memberEmail: string
  planType: string
  paymentType: string
  amountCents: number
  reason: string
  details: string
  requestDate: string
}

export function renderRefundRequestNotificationEmail(data: RefundRequestNotificationData): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lorenzosanz.com"
  const amountFormatted = (data.amountCents / 100).toFixed(2)

  const body = `
    <h1>Nueva solicitud de reembolso</h1>
    <p>Se ha recibido una nueva solicitud de reembolso de un socio.</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;width:40%;">Socio</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${data.memberName}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">Email</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${data.memberEmail}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">Plan</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${data.planType} (${data.paymentType})</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">Importe</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${amountFormatted} €</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">Motivo</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${getReasonLabel(data.reason)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">Detalles</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${data.details}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">Fecha</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${data.requestDate}</td>
      </tr>
    </table>

    <p style="text-align:center;">
      <a href="${baseUrl}/admin/refunds" class="button">Revisar solicitud</a>
    </p>
  `

  return renderEmailLayout({
    body,
    previewText: `Solicitud de reembolso de ${data.memberName}`,
  })
}

// ─── Member: refund approved ─────────────────────────────────────────────────

export interface RefundApprovedData {
  memberName: string
  amountCents: number
  last4?: string | null
  preferencesToken?: string
}

export function renderRefundApprovedEmail(data: RefundApprovedData): string {
  const amountFormatted = (data.amountCents / 100).toFixed(2)
  const cardInfo = data.last4 ? ` a la tarjeta terminada en ${data.last4}` : ""

  const body = `
    <h1>Tu reembolso ha sido aprobado</h1>
    <p>Hola ${data.memberName},</p>
    <p>Te informamos de que tu solicitud de reembolso ha sido revisada y <strong>aprobada</strong>.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-weight:600;color:#166534;">Reembolso de ${amountFormatted} €${cardInfo}</p>
      <p style="margin:8px 0 0;color:#166534;">El importe se reflejará en tu cuenta en un plazo de 5 a 10 días hábiles.</p>
    </div>

    <p>Tu suscripción ha sido cancelada. Si deseas volver a ser socio en el futuro, puedes hacerlo desde nuestra web.</p>

    <p>Si tienes alguna duda, no dudes en contactarnos en <a href="mailto:info@lorenzosanz.com">info@lorenzosanz.com</a>.</p>

    <p>Un saludo,<br/>El equipo de la Peña Lorenzo Sanz</p>
  `

  return renderEmailLayout({
    body,
    previewText: "Tu reembolso ha sido aprobado",
    preferencesToken: data.preferencesToken,
  })
}

// ─── Member: refund declined ─────────────────────────────────────────────────

export interface RefundDeclinedData {
  memberName: string
  adminResponse: string
  preferencesToken?: string
}

export function renderRefundDeclinedEmail(data: RefundDeclinedData): string {
  const body = `
    <h1>Actualización sobre tu solicitud de reembolso</h1>
    <p>Hola ${data.memberName},</p>
    <p>Hemos revisado tu solicitud de reembolso y lamentamos comunicarte que no ha sido aprobada.</p>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-weight:600;color:#991b1b;">Motivo:</p>
      <p style="margin:8px 0 0;color:#991b1b;">${data.adminResponse}</p>
    </div>

    <p>Si consideras que esta decisión no es correcta o deseas más información, puedes contactarnos en <a href="mailto:info@lorenzosanz.com">info@lorenzosanz.com</a>.</p>

    <p>Un saludo,<br/>El equipo de la Peña Lorenzo Sanz</p>
  `

  return renderEmailLayout({
    body,
    previewText: "Actualización sobre tu solicitud de reembolso",
    preferencesToken: data.preferencesToken,
  })
}

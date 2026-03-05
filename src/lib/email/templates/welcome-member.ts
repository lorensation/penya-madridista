/**
 * Welcome-member email template.
 * Sent to a new subscriber right after completing /complete-profile + payment.
 */

import { renderEmailLayout } from "./layout"

export interface WelcomeMemberTemplateData {
  /** First name of the new member */
  memberName: string
  /** Plan name, e.g. "Adulto Anual" */
  planName?: string
  /** Member number (carnet) if already assigned */
  memberNumber?: string | number | null
  /** Preferences token for the email footer links */
  preferencesToken?: string
}

export function renderWelcomeMemberEmail(data: WelcomeMemberTemplateData): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lorenzosanz.com"

  const planLine = data.planName
    ? `<p>Tu plan: <strong>${data.planName}</strong></p>`
    : ""

  const memberNumberLine =
    data.memberNumber != null
      ? `<p>Tu número de socio: <strong>${data.memberNumber}</strong></p>`
      : ""

  const body = `
    <h1>¡Bienvenido/a a la Peña Lorenzo Sanz, ${data.memberName}!</h1>

    <p>Queremos darte la más sincera enhorabuena y las gracias por unirte a la
    <strong>Peña Lorenzo Sanz Siempre Presente</strong>. Tu apoyo y tu pasión
    por el Real Madrid son lo que nos hace grandes.</p>

    ${planLine}
    ${memberNumberLine}

    <p>A partir de ahora podrás disfrutar de los siguientes beneficios:</p>

    <ul>
      <li>Acceso a eventos exclusivos organizados por la peña</li>
      <li>Descuentos en viajes organizados para ver partidos</li>
      <li>Participación en sorteos y promociones exclusivas</li>
      <li>Acceso al contenido premium en nuestra web</li>
      <li>Carnet oficial de socio de la Peña Lorenzo Sanz</li>
    </ul>

    <p>Puedes acceder a tu panel de socio en cualquier momento para consultar
    tu suscripción, tu carnet digital y todas las novedades:</p>

    <p style="text-align: center;">
      <a href="${baseUrl}/dashboard" class="button"
         style="background-color:#07025A;color:#ffffff !important;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;margin:20px 0;">
        Acceder a mi panel de socio
      </a>
    </p>

    <p>Si tienes cualquier duda, no dudes en escribirnos a
    <a href="mailto:info@lorenzosanz.com">info@lorenzosanz.com</a> o a través
    del <a href="${baseUrl}/contact">formulario de contacto</a>.</p>

    <p>¡Hala Madrid y nada más!</p>
    <p>El equipo de la Peña Lorenzo Sanz</p>
  `

  return renderEmailLayout({
    body,
    previewText:
      "¡Bienvenido/a a la Peña Lorenzo Sanz! Gracias por hacerte socio/a.",
    includeUnsubscribe: false,
    preferencesToken: data.preferencesToken,
  })
}

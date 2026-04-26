import { renderEmailLayout } from "./layout"

export interface RedsysProfileCompletionNoticeData {
  memberName?: string | null
  completeProfileUrl: string
  dashboardUrl: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function escapeAttribute(value: string): string {
  return escapeHtml(value)
}

export const REDSYS_PROFILE_COMPLETION_NOTICE_SUBJECT =
  "Tu pago se ha confirmado correctamente"

export function renderRedsysProfileCompletionNoticeEmail(
  data: RedsysProfileCompletionNoticeData,
): string {
  const memberName = escapeHtml(data.memberName?.trim() || "madridista")
  const completeProfileUrl = escapeAttribute(data.completeProfileUrl)
  const dashboardUrl = escapeAttribute(data.dashboardUrl)

  const body = `
    <h1>Completa tu perfil de socio</h1>

    <p>Hola ${memberName},</p>

    <p>
      Te escribimos porque hemos confirmado correctamente tu pago de inscripción,
      pero detectamos una incidencia técnica puntual que pudo haber impedido que
      tu perfil se actualizara correctamente en nuestra plataforma.
    </p>

    <p>
      La incidencia ya ha sido revisada. Para finalizar el proceso, solo tienes
      que completar tu perfil de socio.
    </p>

    <p>
      Puedes hacerlo desde el siguiente botón o entrando en tu panel de usuario
      y pulsando en <strong>Complete Profile</strong>.
    </p>

    <p style="text-align:center;">
      <a href="${completeProfileUrl}" class="button">Completar mi perfil</a>
    </p>

    <p>
      Si lo prefieres, también puedes acceder a tu panel desde
      <a href="${dashboardUrl}">tu dashboard</a> y continuar desde allí.
    </p>

    <p>
      Disculpa las molestias ocasionadas y gracias por tu paciencia.
    </p>

    <p>
      Si tienes cualquier problema para acceder o completar el perfil, responde
      a este correo y te ayudaremos.
    </p>

    <p>Un saludo,<br/>El equipo de la Peña Lorenzo Sanz</p>
  `

  return renderEmailLayout({
    body,
    previewText:
      "Tu pago se ha confirmado correctamente. Solo falta completar tu perfil de socio.",
    includeUnsubscribe: false,
  })
}

export function renderRedsysProfileCompletionNoticeText(
  data: RedsysProfileCompletionNoticeData,
): string {
  const memberName = data.memberName?.trim() || "madridista"

  return [
    `Hola ${memberName},`,
    "",
    "Te escribimos porque hemos confirmado correctamente tu pago de inscripción, pero detectamos una incidencia técnica puntual que pudo haber impedido que tu perfil se actualizara correctamente en nuestra plataforma.",
    "",
    "La incidencia ya ha sido revisada. Para finalizar el proceso, solo tienes que completar tu perfil de socio.",
    "",
    `Puedes hacerlo desde este enlace: ${data.completeProfileUrl}`,
    "",
    `También puedes entrar en tu panel de usuario (${data.dashboardUrl}) y pulsar en Complete Profile.`,
    "",
    "Disculpa las molestias ocasionadas y gracias por tu paciencia.",
    "",
    "Si tienes cualquier problema para acceder o completar el perfil, responde a este correo y te ayudaremos.",
    "",
    "Un saludo,",
    "El equipo de la Peña Lorenzo Sanz",
  ].join("\n")
}

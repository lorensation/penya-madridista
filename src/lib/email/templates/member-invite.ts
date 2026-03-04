/**
 * Member invitation email template.
 * Used when an admin invites a user to become a member.
 */

import { renderEmailLayout } from "./layout"

export interface MemberInviteTemplateData {
  /** The invite token to include in the complete-profile URL */
  token: string
  /** Optional preferences token for the footer link */
  preferencesToken?: string
}

export function renderMemberInviteEmail(data: MemberInviteTemplateData): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lorenzosanz.com"
  const completeProfileUrl = `${baseUrl}/complete-profile?admin_invite=${data.token}`

  const body = `
    <h1>¡Has sido invitado a ser miembro de la Peña Lorenzo Sanz!</h1>
    <p>Hola,</p>
    <p>Nos complace informarte que has sido seleccionado para ser miembro oficial de la <strong>Peña Lorenzo Sanz Siempre Presente</strong>.</p>
    
    <p>Como miembro, disfrutarás de los siguientes beneficios exclusivos:</p>
    
    <ul>
      <li>Acceso a eventos exclusivos organizados por la peña</li>
      <li>Descuentos en viajes organizados para ver partidos</li>
      <li>Participación en sorteos y promociones exclusivas</li>
      <li>Acceso al contenido premium en nuestra web</li>
      <li>Carnet oficial de socio de la Peña Lorenzo Sanz</li>
    </ul>
    
    <p><strong>Esta invitación incluye una suscripción permanente sin necesidad de pago.</strong></p>
    
    <p>Para completar tu registro, por favor haz clic en el botón de abajo:</p>
    
    <p style="text-align: center;">
      <a href="${completeProfileUrl}" class="button">Completar mi perfil</a>
    </p>
    
    <p><em>Esta invitación expirará en 7 días.</em></p>
    
    <p>¡Hala Madrid!</p>
    <p>El equipo de la Peña Lorenzo Sanz</p>
  `

  return renderEmailLayout({
    body,
    previewText: "Has sido invitado a ser miembro de la Peña Lorenzo Sanz",
    includeUnsubscribe: false,
    preferencesToken: data.preferencesToken,
  })
}

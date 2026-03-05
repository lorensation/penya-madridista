"use server"

import { sendEmail } from "@/lib/email"
import { generatePreferencesToken } from "@/lib/email/preferences-token"
import { renderWelcomeMemberEmail } from "@/lib/email/templates/welcome-member"

// ── sendWelcomeMemberEmail ──────────────────────────────────────────────────

export interface SendWelcomeMemberEmailInput {
  email: string
  memberName: string
  userId?: string
  planName?: string
  memberNumber?: string | number | null
}

/**
 * Sends a welcome / thank-you email to a newly-registered member
 * after they complete their profile and payment.
 *
 * Called from the client-side complete-profile page once the profile,
 * user update, and subscription upsert have all succeeded.
 */
export async function sendWelcomeMemberEmail(
  input: SendWelcomeMemberEmailInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { email, memberName, userId, planName, memberNumber } = input

    // Generate a preferences token so footer links work without login
    const preferencesToken = generatePreferencesToken(email, userId)

    const html = renderWelcomeMemberEmail({
      memberName,
      planName,
      memberNumber,
      preferencesToken,
    })

    const result = await sendEmail({
      to: email,
      subject: "¡Bienvenido/a a la Peña Lorenzo Sanz! 🎉",
      html,
    })

    if (!result.success) {
      console.error("[welcome-member-email] Failed to send:", result.error)
      return { success: false, error: "No se pudo enviar el email de bienvenida." }
    }

    console.log(`[welcome-member-email] Sent to ${email} (messageId: ${result.messageId})`)
    return { success: true }
  } catch (error) {
    console.error("[welcome-member-email] Unexpected error:", error)
    return { success: false, error: "Error inesperado al enviar el email de bienvenida." }
  }
}

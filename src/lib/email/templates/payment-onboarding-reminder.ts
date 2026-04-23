import { renderEmailLayout } from "./layout"

export interface PaymentOnboardingReminderTemplateData {
  memberName: string
  planName: string
  completeProfileUrl: string
  deadlineLabel: string
  reminderKind: "first" | "final"
}

export function renderPaymentOnboardingReminderEmail(
  data: PaymentOnboardingReminderTemplateData,
): string {
  const intro =
    data.reminderKind === "final"
      ? "Queremos recordarte que hemos recibido correctamente tu pago, pero todav&iacute;a necesitamos que completes tu perfil para poder activar tu membres&iacute;a."
      : "Hemos recibido correctamente tu pago y tu alta est&aacute; casi lista, pero todav&iacute;a necesitamos que completes tu perfil para activar tu membres&iacute;a."

  const body = `
    <h1>Tu pago est&aacute; confirmado y tu alta est&aacute; pendiente</h1>

    <p>Hola ${data.memberName},</p>

    <p>${intro}</p>

    <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;"><strong>Plan contratado:</strong> ${data.planName}</p>
      <p style="margin:8px 0 0;">Tu membres&iacute;a no se activar&aacute; hasta que completes los datos necesarios en el formulario de alta.</p>
    </div>

    <p style="text-align:center;">
      <a href="${data.completeProfileUrl}" class="button">Completar mi alta</a>
    </p>

    <p>Por favor, completa tu registro antes del <strong>${data.deadlineLabel}</strong>.</p>
    <p>Si no recibimos el perfil completo dentro de ese plazo, el pago quedar&aacute; marcado para revisi&oacute;n manual de reembolso.</p>

    <p>Si necesitas ayuda, puedes escribirnos a <a href="mailto:info@lorenzosanz.com">info@lorenzosanz.com</a>.</p>

    <p>Gracias por formar parte de la Pe&ntilde;a Lorenzo Sanz.</p>
    <p>Un saludo,<br/>El equipo de la Pe&ntilde;a Lorenzo Sanz</p>
  `

  return renderEmailLayout({
    body,
    previewText: "Hemos recibido tu pago, falta completar tu perfil para activar la membres&iacute;a.",
    includeUnsubscribe: false,
  })
}

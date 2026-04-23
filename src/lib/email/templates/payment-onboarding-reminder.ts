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
      ? "Queremos recordarte que hemos recibido correctamente tu pago, pero todavía necesitamos que completes tu perfil para poder activar tu membresía."
      : "Hemos recibido correctamente tu pago y tu alta está casi lista, pero todavía necesitamos que completes tu perfil para activar tu membresía."

  const body = `
    <h1>Tu pago está confirmado y tu alta está pendiente</h1>

    <p>Hola ${data.memberName},</p>

    <p>${intro}</p>

    <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;"><strong>Plan contratado:</strong> ${data.planName}</p>
      <p style="margin:8px 0 0;">Tu membresía no se activará hasta que completes los datos necesarios en el formulario de alta.</p>
    </div>

    <p style="text-align:center;">
      <a href="${data.completeProfileUrl}" class="button">Completar mi alta</a>
    </p>

    <p>Por favor, completa tu registro antes del <strong>${data.deadlineLabel}</strong>.</p>
    <p>Si no recibimos el perfil completo dentro de ese plazo, el pago quedará marcado para revisión manual de reembolso.</p>

    <p>Si necesitas ayuda, puedes escribirnos a <a href="mailto:info@lorenzosanz.com">info@lorenzosanz.com</a>.</p>

    <p>Gracias por formar parte de la Peña Lorenzo Sanz.</p>
    <p>Un saludo,<br/>El equipo de la Peña Lorenzo Sanz</p>
  `

  return renderEmailLayout({
    body,
    previewText: "Hemos recibido tu pago, falta completar tu perfil para activar la membresía.",
    includeUnsubscribe: false,
  })
}

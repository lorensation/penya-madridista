import formData from "form-data"
import Mailgun from "mailgun.js"

const mailgun = new Mailgun(formData)

if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
  throw new Error("MAILGUN_API_KEY or MAILGUN_DOMAIN is not defined")
}

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
})

export async function subscribeToNewsletter(email: string, name?: string) {
  try {
    // Add subscriber to mailing list
    await mg.lists.members.createMember(
      process.env.MAILGUN_MAILING_LIST || "newsletter@" + process.env.MAILGUN_DOMAIN,
      {
        address: email,
        name: name || "",
        subscribed: true,
        upsert: "yes",
      },
    )

    // Send welcome email
    await mg.messages.create(process.env.MAILGUN_DOMAIN!, {
      from: `Peña Lorenzo Sanz <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: [email],
      subject: "¡Bienvenido a la Newsletter de la Peña Lorenzo Sanz!",
      text: `Hola ${name || ""},\n\nGracias por suscribirte a nuestra newsletter. Te mantendremos informado sobre todas las novedades y eventos de la Peña Lorenzo Sanz.\n\nSaludos,\nEquipo de la Peña Lorenzo Sanz`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #07025A;">¡Bienvenido a la Newsletter de la Peña Lorenzo Sanz!</h2>
          <p>Hola ${name || ""},</p>
          <p>Gracias por suscribirte a nuestra newsletter. Te mantendremos informado sobre todas las novedades y eventos de la Peña Lorenzo Sanz.</p>
          <p>Saludos,<br>Equipo de la Peña Lorenzo Sanz</p>
        </div>
      `,
    })

    return { success: true }
  } catch (error: any) {
    console.error("Error subscribing to newsletter:", error)
    return { error: error.message || "Failed to subscribe to newsletter" }
  }
}

export async function sendEmail(to: string, subject: string, text: string, html: string) {
  try {
    await mg.messages.create(process.env.MAILGUN_DOMAIN!, {
      from: `Peña Lorenzo Sanz <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: [to],
      subject,
      text,
      html,
    })

    return { success: true }
  } catch (error: any) {
    console.error("Error sending email:", error)
    return { error: error.message || "Failed to send email" }
  }
}


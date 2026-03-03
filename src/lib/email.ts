import nodemailer from "nodemailer"
import { renderEmailLayout, getListUnsubscribeHeaders } from "./email/templates/layout"

// Create a transporter using environment variables
export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    secure: Boolean(process.env.EMAIL_SERVER_SECURE === "true"),
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  })
}

// Send email helper function
export async function sendEmail({
  to,
  subject,
  html,
  text,
  headers,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  /** Optional extra headers (e.g. List-Unsubscribe for marketing/event emails) */
  headers?: Record<string, string>;
}) {
  try {
    const transporter = createTransporter()
    
    const info = await transporter.sendMail({
      from: `Peña Lorenzo Sanz <${process.env.EMAIL_FROM || "noreply@lorenzosanz.com"}>`,
      to,
      subject,
      text,
      html,
      ...(headers ? { headers } : {}),
    })
    
    console.log(`Email sent: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error }
  }
}

// Generate welcome email HTML template
export function generateWelcomeEmailTemplate(recipientName?: string, preferencesToken?: string) {
  const name = recipientName || "Madridista"
  
  const body = `
        <h1>¡Bienvenido a nuestra Newsletter!</h1>
        <p>Hola ${name},</p>
        <p>Gracias por suscribirte a la newsletter de la <strong>Peña Lorenzo Sanz Siempre Presente</strong>. A partir de ahora, recibirás información sobre:</p>
        
        <ul>
          <li>Eventos y actividades exclusivas de la peña</li>
          <li>Noticias sobre el Real Madrid</li>
          <li>Ofertas especiales para socios</li>
          <li>Información sobre el legado de Lorenzo Sanz</li>
        </ul>
        
        <p>Te mantendremos informado sobre todas las novedades relacionadas con nuestra peña y el Real Madrid.</p>
        
        <p style="text-align: center;">
          <a href="https://www.lorenzosanz.com" class="button" style="background-color:#07025A;color:#ffffff !important;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;margin:20px 0;">Visita nuestra web</a>
        </p>
        
        <p>¡Hala Madrid!</p>
        <p>El equipo de la Peña Lorenzo Sanz</p>
  `

  return renderEmailLayout({
    body,
    previewText: "¡Bienvenido a la Newsletter de la Peña Lorenzo Sanz!",
    includeUnsubscribe: true,
    preferencesToken,
  })
}

/**
 * Get the List-Unsubscribe headers for welcome/newsletter emails.
 */
export function getWelcomeEmailHeaders(preferencesToken?: string): Record<string, string> {
  return getListUnsubscribeHeaders(preferencesToken)
}
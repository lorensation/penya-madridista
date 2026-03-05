import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import { renderEmailLayout, getListUnsubscribeHeaders } from "./email/templates/layout"

// ── Singleton pooled transporter ─────────────────────────────────────────────

let _transporter: Transporter | null = null

/**
 * Returns a reusable, connection-pooled SMTP transporter.
 * Avoids opening a new TCP + AUTH handshake on every email, which
 * reduces the chance of hitting provider rate-limits (454 4.3.0).
 */
export function getTransporter(): Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT),
      secure: Boolean(process.env.EMAIL_SERVER_SECURE === "true"),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
      // Enable connection pooling — keeps the socket open for reuse
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      // Reasonable timeouts so we don't hang forever
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    })
  }
  return _transporter
}

/** @deprecated Use `getTransporter()` instead. Kept for backward compat. */
export function createTransporter() {
  return getTransporter()
}

// ── Retry helper ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 3
const BASE_DELAY_MS = 2_000 // 2 s → 4 s → 8 s

function isTransientSmtpError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const e = err as { responseCode?: number; code?: string }
  // 4xx SMTP codes are transient; also retry on connection-level errors
  if (e.responseCode && e.responseCode >= 400 && e.responseCode < 500) return true
  if (e.code === "ECONNECTION" || e.code === "ETIMEDOUT" || e.code === "ESOCKET") return true
  return false
}

async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// ── Send email (with retry) ─────────────────────────────────────────────────

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
  const transporter = getTransporter()
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
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
      lastError = error
      if (isTransientSmtpError(error) && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
        console.warn(
          `[email] Transient error on attempt ${attempt}/${MAX_RETRIES}, retrying in ${delay}ms…`,
          (error as Error).message,
        )
        // Reset the pooled transporter so the next attempt opens a fresh connection
        _transporter?.close?.()
        _transporter = null
        await sleep(delay)
      } else {
        break
      }
    }
  }

  console.error("Error sending email:", lastError)
  return { success: false, error: lastError }
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
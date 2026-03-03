/**
 * Shared branded email layout for all app-sent emails.
 * All emails share the same header, styles, and legal footer.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lorenzosanz.com"

export interface EmailLayoutOptions {
  /** Main HTML content to render inside the email body */
  body: string
  /** Optional preview text (shown in inbox before opening) */
  previewText?: string
  /** Include unsubscribe CTA in footer (for marketing/event emails) */
  includeUnsubscribe?: boolean
  /** Preferences token for manage-preferences and unsubscribe links */
  preferencesToken?: string
  /** Recipient email (used for unsubscribe link fallback) */
  recipientEmail?: string
}

function getUnsubscribeUrl(token?: string): string {
  if (token) {
    return `${BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`
  }
  return `${BASE_URL}/email-preferences`
}

function getPreferencesUrl(token?: string): string {
  if (token) {
    return `${BASE_URL}/email-preferences?token=${encodeURIComponent(token)}`
  }
  return `${BASE_URL}/email-preferences`
}

/**
 * Wraps email body content in the branded layout with header, styles, and legal footer.
 */
export function renderEmailLayout(options: EmailLayoutOptions): string {
  const { body, previewText, includeUnsubscribe = false, preferencesToken } = options

  const preferencesUrl = getPreferencesUrl(preferencesToken)
  const unsubscribeUrl = getUnsubscribeUrl(preferencesToken)

  const previewHtml = previewText
    ? `<div style="display:none;font-size:1px;color:#f4f4f4;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${previewText}</div>`
    : ""

  const unsubscribeCta = includeUnsubscribe
    ? `
        <p style="margin-top:16px;">
          <a href="${unsubscribeUrl}" style="color:#999999;text-decoration:underline;font-size:12px;">Cancelar suscripción</a>
          &nbsp;|&nbsp;
          <a href="${preferencesUrl}" style="color:#999999;text-decoration:underline;font-size:12px;">Gestionar preferencias</a>
        </p>`
    : `
        <p style="margin-top:16px;">
          <a href="${preferencesUrl}" style="color:#999999;text-decoration:underline;font-size:12px;">Gestionar preferencias de email</a>
        </p>`

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Peña Lorenzo Sanz</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
        font-family: 'Arial', sans-serif;
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
      }
      .header {
        background-color: #07025A;
        padding: 20px;
        text-align: center;
      }
      .logo {
        max-width: 200px;
        height: auto;
      }
      .content {
        padding: 30px;
        color: #333333;
        font-size: 16px;
        line-height: 1.6;
      }
      .footer {
        background-color: #f4f4f4;
        padding: 20px;
        text-align: center;
        color: #666666;
        font-size: 12px;
        line-height: 1.5;
      }
      .button {
        background-color: #07025A;
        color: #ffffff !important;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
        display: inline-block;
        margin: 20px 0;
      }
      h1, h2 {
        color: #07025A;
      }
      a {
        color: #07025A;
      }
    </style>
  </head>
  <body>
    ${previewHtml}
    <div class="container">
      <div class="header">
        <img src="https://www.lorenzosanz.com/Logo-Penya-LS-resized.jpg" alt="Peña Lorenzo Sanz" class="logo" />
      </div>

      <div class="content">
        ${body}
      </div>

      <div class="footer">
        <p>Peña Lorenzo Sanz Siempre Presente</p>
        <p>&copy; ${new Date().getFullYear()} Peña Lorenzo Sanz. Todos los derechos reservados.</p>
        <p style="margin-top:12px;">
          <a href="${BASE_URL}/privacy-policy" style="color:#999999;text-decoration:underline;">Política de Privacidad</a>
          &nbsp;|&nbsp;
          <a href="${BASE_URL}/aviso-legal" style="color:#999999;text-decoration:underline;">Aviso Legal</a>
          &nbsp;|&nbsp;
          <a href="${BASE_URL}/terms-and-conditions" style="color:#999999;text-decoration:underline;">Términos y Condiciones</a>
        </p>
        <p style="margin-top:8px;">
          <a href="mailto:info@lorenzosanz.com" style="color:#999999;text-decoration:underline;">info@lorenzosanz.com</a>
        </p>
        ${unsubscribeCta}
      </div>
    </div>
  </body>
</html>`
}

/**
 * Build the List-Unsubscribe header value for marketing/event emails.
 * Supports both mailto and HTTP one-click unsubscribe (RFC 8058).
 */
export function getListUnsubscribeHeaders(preferencesToken?: string): Record<string, string> {
  const unsubscribeUrl = getUnsubscribeUrl(preferencesToken)
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  }
}

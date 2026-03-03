import { NextRequest, NextResponse } from "next/server"
import { verifyPreferencesToken } from "@/lib/email/preferences-token"
import { createAdminSupabaseClient } from "@/lib/supabase"

/**
 * GET /unsubscribe?token=xxx
 * One-click unsubscribe: disables marketing emails for the user.
 * Renders a simple confirmation HTML page.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")

  if (!token) {
    return new NextResponse(renderPage("Enlace no válido", "No se proporcionó un token válido.", true), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  const payload = verifyPreferencesToken(token)
  if (!payload) {
    return new NextResponse(renderPage("Enlace expirado", "Este enlace ha expirado o no es válido. Por favor, contacta con info@lorenzosanz.com.", true), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  const supabase = createAdminSupabaseClient()
  const { email, userId } = payload

  try {
    // Update users table if user exists
    if (userId) {
      // Fetch current value for audit
      const { data: userData } = await supabase
        .from("users")
        .select("marketing_emails")
        .eq("id", userId)
        .single()

      if (userData) {
        await supabase
          .from("users")
          .update({ marketing_emails: false })
          .eq("id", userId)

        // Audit log
        await supabase.from("communication_preference_audit").insert({
          email,
          user_id: userId,
          channel: "marketing",
          old_value: userData.marketing_emails,
          new_value: false,
          source: "unsubscribe_link",
        })
      }
    } else {
      // Try to find user by email
      const { data: userData } = await supabase
        .from("users")
        .select("id, marketing_emails")
        .eq("email", email)
        .maybeSingle()

      if (userData) {
        await supabase
          .from("users")
          .update({ marketing_emails: false })
          .eq("id", userData.id)

        await supabase.from("communication_preference_audit").insert({
          email,
          user_id: userData.id,
          channel: "marketing",
          old_value: userData.marketing_emails,
          new_value: false,
          source: "unsubscribe_link",
        })
      }
    }

    // Update newsletter_subscribers if exists
    const { data: subscriber } = await supabase
      .from("newsletter_subscribers")
      .select("id, status")
      .eq("email", email)
      .maybeSingle()

    if (subscriber && subscriber.status !== "unsubscribed") {
      await supabase
        .from("newsletter_subscribers")
        .update({
          status: "unsubscribed",
          unsubscribed_at: new Date().toISOString(),
        })
        .eq("id", subscriber.id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lorenzosanz.com"
    const preferencesUrl = `${baseUrl}/email-preferences?token=${encodeURIComponent(token)}`

    return new NextResponse(
      renderPage(
        "Suscripción cancelada",
        `Has sido dado de baja de los emails de marketing de la Peña Lorenzo Sanz.<br/><br/>Si deseas ajustar tus preferencias de forma más detallada, visita tu <a href="${preferencesUrl}" style="color:#07025A;text-decoration:underline;">centro de preferencias</a>.`,
        false
      ),
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    )
  } catch (error) {
    console.error("Error processing unsubscribe:", error)
    return new NextResponse(
      renderPage("Error", "Se produjo un error al procesar tu solicitud. Por favor, inténtalo de nuevo o contacta con info@lorenzosanz.com.", true),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    )
  }
}

function renderPage(title: string, message: string, isError: boolean): string {
  const bgColor = isError ? "#fee2e2" : "#dcfce7"
  const textColor = isError ? "#991b1b" : "#166534"

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - Peña Lorenzo Sanz</title>
  <style>
    body { margin:0; padding:0; background:#f4f4f4; font-family:Arial,sans-serif; }
    .container { max-width:500px; margin:80px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
    .header { background:#07025A; padding:20px; text-align:center; }
    .header img { max-width:150px; height:auto; }
    .content { padding:30px; text-align:center; }
    .badge { display:inline-block; padding:12px 24px; border-radius:8px; margin-bottom:16px; }
    h1 { color:#07025A; font-size:22px; margin-bottom:12px; }
    p { color:#333; font-size:15px; line-height:1.6; }
    .footer { padding:16px; text-align:center; font-size:12px; color:#999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://www.lorenzosanz.com/Logo-Penya-LS-resized.jpg" alt="Peña Lorenzo Sanz" />
    </div>
    <div class="content">
      <div class="badge" style="background:${bgColor};color:${textColor};">
        <strong>${title}</strong>
      </div>
      <p>${message}</p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Peña Lorenzo Sanz. Todos los derechos reservados.
    </div>
  </div>
</body>
</html>`
}

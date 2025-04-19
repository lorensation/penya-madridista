"use server"

import { createAdminSupabaseClient } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import { revalidatePath } from "next/cache"

export interface MakeUserMemberResponse {
  success: boolean
  message?: string
  error?: string
  token?: string
}

/**
 * Send an invitation to an auth user to become a member with an infinite subscription
 * This creates a special token that is used to validate the invite and adds it to the URL
 */
export async function makeAuthUserMember(userId: string, email: string): Promise<MakeUserMemberResponse> {
  try {
    const supabase = createAdminSupabaseClient()

    // Check if user already exists in miembros table
    const { data: existingMember, error: memberError } = await supabase
      .from("miembros")
      .select("id")
      .eq("user_uuid", userId)
      .maybeSingle()

    if (existingMember) {
      return {
        success: false,
        error: "Este usuario ya es miembro de la Peña Lorenzo Sanz"
      }
    }
    else if (memberError) {
      console.error("Error checking existing member:", memberError)
        return {
            success: false,
            error: "Error al verificar el estado de miembro"
        }
    }

    // Generate a secure token for the invitation link
    // This token will be validated when the user clicks the link
    const token = Buffer.from(`${userId}:${Date.now()}`).toString("base64")

    // Store the token with user info in a temp table or cache
    // For simplicity, we'll store it in a member_invites table
    const { error: inviteError } = await supabase
      .from("member_invites")
      .insert({
        user_id: userId,
        email: email,
        token: token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days expiration
        invitation_type: "admin_invite" 
      })

    if (inviteError) {
      console.error("Error creating member invite:", inviteError)
      return {
        success: false,
        error: "No se pudo crear la invitación de miembro"
      }
    }

    // Send invitation email
    await sendMemberInvitationEmail(email, token)

    // Revalidate relevant admin paths
    revalidatePath("/admin/users")

    return {
      success: true,
      message: "Invitación enviada correctamente",
      token: token // Return the token for testing purposes
    }
  } catch (error) {
    console.error("Error in makeAuthUserMember:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    }
  }
}

/**
 * Generate the member invitation email HTML template
 */
function generateMemberInvitationTemplate(token: string): string {
  const completeProfileUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://lorenzosanz.com'}/complete-profile?admin_invite=${token}`
  
  return `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>¡Has sido invitado a ser miembro de la Peña Lorenzo Sanz!</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
        font-family: 'Arial', sans-serif;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
      }
      .header {
        background-color: #07025A; /* Real Madrid blue */
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
        line-height: 1.5;
      }
      .footer {
        background-color: #f4f4f4;
        padding: 20px;
        text-align: center;
        color: #666666;
        font-size: 12px;
      }
      .button {
        background-color: #07025A;
        color: #ffffff;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
        display: inline-block;
        margin: 20px 0;
      }
      h1 {
        color: #07025A;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="https://www.lorenzosanz.com/Logo-Penya-LS-resized.jpg" alt="Peña Lorenzo Sanz" class="logo" />
      </div>
      
      <div class="content">
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
        
        <p><strong>Esta invitación incluye una membresía permanente sin necesidad de pago.</strong></p>
        
        <p>Para completar tu registro, por favor haz clic en el botón de abajo:</p>
        
        <p style="text-align: center;">
          <a href="${completeProfileUrl}" class="button">Completar mi perfil</a>
        </p>
        
        <p><em>Esta invitación expirará en 7 días.</em></p>
        
        <p>¡Hala Madrid!</p>
        <p>El equipo de la Peña Lorenzo Sanz</p>
      </div>
      
      <div class="footer">
        <p>© ${new Date().getFullYear()} Peña Lorenzo Sanz. Todos los derechos reservados.</p>
      </div>
    </div>
  </body>
</html>
  `
}

/**
 * Send the member invitation email
 */
async function sendMemberInvitationEmail(to: string, token: string) {
  try {
    const html = generateMemberInvitationTemplate(token)
    
    return await sendEmail({
      to,
      subject: "¡Has sido invitado a ser miembro de la Peña Lorenzo Sanz!",
      html
    })
  } catch (error) {
    console.error("Error sending member invitation email:", error)
    return { success: false, error }
  }
}
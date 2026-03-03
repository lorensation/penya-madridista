"use server"

import { createAdminSupabaseClient } from "@/lib/supabase"
import { sendEmail } from "@/lib/email"
import { revalidatePath } from "next/cache"
import { renderMemberInviteEmail } from "@/lib/email/templates/member-invite"
import { generatePreferencesToken } from "@/lib/email/preferences-token"

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
 * Generate the member invitation email HTML template using shared layout
 */
function generateMemberInvitationTemplate(token: string, email: string): string {
  let preferencesToken: string | undefined
  try {
    preferencesToken = generatePreferencesToken(email)
  } catch {
    // EMAIL_PREFERENCES_SECRET not set, skip preferences link
  }

  return renderMemberInviteEmail({ token, preferencesToken })
}

/**
 * Send the member invitation email
 */
async function sendMemberInvitationEmail(to: string, token: string) {
  try {
    const html = generateMemberInvitationTemplate(token, to)
    
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
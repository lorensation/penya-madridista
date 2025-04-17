"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { generateWelcomeEmailTemplate, sendEmail } from "@/lib/email"
import { revalidatePath } from "next/cache"

export type ApiResponse = {
  success?: boolean
  message?: string
  error?: string
}

// Add a new function to add users to the newsletter when they register
export async function addUserToNewsletter(email: string, name?: string): Promise<boolean> {
  try {
    // Store subscriber in database
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from("newsletter_subscribers").upsert(
      {
        email,
        name: name || null,
        status: "active",
        created_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    )

    if (error) {
      console.error("Supabase error when adding user to newsletter:", error)
      return false
    }

    // Send welcome email
    await sendEmail({
      to: email,
      subject: "¡Bienvenido a la Newsletter de la Peña Lorenzo Sanz!",
      html: generateWelcomeEmailTemplate(name),
    })

    return true
  } catch (error) {
    console.error("Error adding user to newsletter:", error)
    return false
  }
}

export async function subscribeToNewsletter(formData: FormData): Promise<ApiResponse> {
  const email = formData.get("email") as string
  const name = formData.get("name") as string // Optional name field

  if (!email) {
    return {
      success: false,
      error: "Email is required",
    }
  }

  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return {
        success: false,
        error: "Por favor, introduce un email válido",
      }
    }

    // Store subscriber in database
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from("newsletter_subscribers").upsert(
      {
        email,
        name: name || null,
        status: "active",
        created_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    )

    if (error) {
      console.error("Supabase error:", error)
      return {
        success: false,
        error: "Error al guardar la suscripción",
      }
    }

    // Send welcome email
    await sendEmail({
      to: email,
      subject: "¡Bienvenido a la Newsletter de la Peña Lorenzo Sanz!",
      html: generateWelcomeEmailTemplate(name),
    })

    // Revalidate relevant paths
    revalidatePath("/")
    revalidatePath("/dashboard")

    return {
      success: true,
      message: "¡Gracias por suscribirte a nuestra newsletter!",
    }
  } catch (error) {
    console.error("Newsletter subscription error:", error)
    return {
      success: false,
      error: "Error al procesar la suscripción",
    }
  }
}


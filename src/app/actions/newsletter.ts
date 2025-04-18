"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import { generateWelcomeEmailTemplate, sendEmail } from "@/lib/email"
import { revalidatePath } from "next/cache"

export type ApiResponse = {
  success?: boolean
  message?: string
  error?: string
  alreadySubscribed?: boolean
}

// Add a new function to add users to the newsletter when they register
export async function addUserToNewsletter(email: string, name?: string): Promise<boolean> {
  try {
    // Store subscriber in database
    const supabase = createServerSupabaseClient()

    // First check if the email already exists
    const { data: existingSubscriber } = await supabase
      .from("newsletter_subscribers")
      .select("id, email")
      .eq("email", email)
      .maybeSingle()

    // If the email exists, we can consider it a success (already subscribed)
    if (existingSubscriber) {
      console.log("Email already subscribed during registration:", email)
      return true
    }

    // If not existing, insert new subscriber
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({
        email,
        name: name || null,
        status: "active",
        created_at: new Date().toISOString(),
      })

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
    
    try {
      // First check if the email already exists
      const { data: existingSubscriber } = await supabase
        .from("newsletter_subscribers")
        .select("id, email")
        .eq("email", email)
        .maybeSingle()
      
      // If the email exists, we consider it a success but with a different message
      if (existingSubscriber) {
        console.log("Email already subscribed:", email)
        
        return {
          success: true,
          message: "Este email ya está suscrito a nuestra newsletter",
          alreadySubscribed: true
        }
      }
      
      // If not existing, insert new subscriber
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({
          email,
          name: name || null,
          status: "active",
          created_at: new Date().toISOString(),
        })

      if (error) {
        // Handle duplicate key error specifically
        if (error.code === '23505') {
          console.log("Duplicate email caught:", email)
          return {
            success: true,
            message: "Este email ya está suscrito a nuestra newsletter",
            alreadySubscribed: true
          }
        }
        
        console.error("Supabase error:", error)
        return {
          success: false,
          error: "Error al guardar la suscripción",
        }
      }
    } catch (dbError: unknown) {
      // Catch any database errors, including unique constraint violations
      // Type guard to check if it's a database error object with code property
      if (typeof dbError === 'object' && dbError !== null) {
        const error = dbError as { code?: string; message?: string };
        
        if (error.code === '23505' || 
           (error.message && error.message.includes('newsletter_subscribers_email_key'))) {
          console.log("Duplicate email exception caught:", email);
          return {
            success: true,
            message: "Este email ya está suscrito a nuestra newsletter",
            alreadySubscribed: true
          };
        }
      }
      
      throw dbError; // Re-throw if it's not a duplicate key error
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


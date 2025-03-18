"use server"

import { subscribeToNewsletter } from "@/lib/mailgun"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

export async function subscribeNewsletter(formData: FormData) {
  try {
    const supabase = createServerSupabaseClient()
    const email = formData.get("email") as string
    const name = (formData.get("name") as string) || undefined

    if (!email) {
      return {
        error: "Email is required",
      }
    }

    // Store subscriber in database
    await supabase.from("newsletter_subscribers").insert({
      email,
      name,
      status: "active",
    })

    // Subscribe to Mailgun
    const result = await subscribeToNewsletter(email, name)

    if (result.error) {
      throw new Error(result.error)
    }

    revalidatePath("/")

    return {
      success: true,
    }
  } catch (error: any) {
    console.error("Error subscribing to newsletter:", error)
    return {
      error: error.message || "Failed to subscribe to newsletter",
    }
  }
}


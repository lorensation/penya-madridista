"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { randomBytes } from "crypto"

export async function setupSupabaseWebhook(formData: FormData) {
  try {
    const supabase = createServerSupabaseClient()
    const webhookUrl = formData.get("webhookUrl") as string
    const webhookSecret = (formData.get("webhookSecret") as string) || randomBytes(32).toString("hex")

    if (!webhookUrl) {
      return {
        error: "Webhook URL is required",
      }
    }

    // Create a webhook in Supabase
    const { data, error } = await supabase.functions.invoke("create-webhook", {
      body: {
        url: webhookUrl,
        events: ["user.created"], // Add more events as needed
        secret: webhookSecret,
      },
    })

    if (error) {
      throw error
    }

    return {
      success: true,
      webhookId: data?.id,
      webhookSecret,
      message: "Webhook created successfully. Add the SUPABASE_WEBHOOK_SECRET to your environment variables.",
    }
  } catch (error: any) {
    console.error("Error setting up webhook:", error)
    return {
      error: error.message || "Failed to set up webhook",
    }
  }
}


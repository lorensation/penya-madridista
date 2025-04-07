"use server"

import { createServerSupabaseClient } from "@/lib/supabase"
import type { ApiResponse } from "@/types/common"

export async function setupWebhooks(formData: FormData): Promise<ApiResponse> {
  const webhookUrl = formData.get("webhookUrl") as string
  const webhookSecretValue = (formData.get("webhookSecret") as string) || generateSecret()

  if (!webhookUrl) {
    return {
      success: false,
      error: "Webhook URL is required",
    }
  }

  try {
    // In a real implementation, we would configure the webhook with Supabase
    // For now, we'll just simulate success and return the webhook secret

    // Store the webhook configuration in our database
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from("webhook_configs").upsert(
      {
        url: webhookUrl,
        secret: webhookSecretValue,
        created_at: new Date().toISOString(),
      },
      { onConflict: "url" },
    )

    if (error) {
      console.error("Supabase error:", error)
      return {
        success: false,
        error: "Failed to save webhook configuration",
      }
    }

    return {
      success: true,
      message: "Webhook configured successfully",
      data: {
        webhookSecret: webhookSecretValue
      }
    }
  } catch (error) {
    console.error("Webhook setup error:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}

// Generate a random webhook secret
function generateSecret(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

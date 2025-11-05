"use server"

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
    // Generate and return the webhook secret
    // Note: You need to manually add this secret to your environment variables
    // and configure it in Supabase dashboard

    return {
      success: true,
      message: "Webhook secret generated successfully. Copy it and add to your environment variables and Supabase dashboard.",
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

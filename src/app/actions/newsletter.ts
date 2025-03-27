"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { ApiResponse } from "@/types/common"

export async function subscribeToNewsletter(formData: FormData): Promise<ApiResponse> {
  const email = formData.get("email") as string

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
        error: "Please enter a valid email address",
      }
    }

    // Add to Mailgun mailing list
    const mailgunApiKey = process.env.MAILGUN_API_KEY
    const mailgunDomain = process.env.MAILGUN_DOMAIN
    const mailgunMailingList = process.env.MAILGUN_MAILING_LIST

    if (!mailgunApiKey || !mailgunDomain || !mailgunMailingList) {
      console.error("Mailgun configuration missing")
      return {
        success: false,
        error: "Newsletter service is not configured properly",
      }
    }

    const response = await fetch(`https://api.mailgun.net/v3/lists/${mailgunMailingList}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`api:${mailgunApiKey}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        address: email,
        subscribed: "yes",
        upsert: "yes",
      }).toString(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Mailgun API error:", errorData)
      return {
        success: false,
        error: "Failed to subscribe to the newsletter",
      }
    }

    // Also store in our database
    const supabase = createServerSupabaseClient()
    const { error } = await supabase.from("newsletter_subscribers").upsert(
      {
        email,
        subscribed_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    )

    if (error) {
      console.error("Supabase error:", error)
      // We don't return an error here since the subscription to Mailgun was successful
    }

    return {
      success: true,
      message: "Successfully subscribed to the newsletter!",
    }
  } catch (error) {
    console.error("Newsletter subscription error:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}


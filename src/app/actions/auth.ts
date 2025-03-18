"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function createUserProfile(userId: string, email: string, name: string) {
  try {
    const supabase = createServerSupabaseClient()

    // Check if profile already exists to avoid duplicates
    const { data: existingProfile } = await supabase.from("miembros").select("id").eq("auth_id", userId).single()

    if (existingProfile) {
      return { success: true, message: "Profile already exists" }
    }

    // Insert user profile into the "miembros" table
    const { error } = await supabase.from("miembros").insert({
      auth_id: userId,
      email: email,
      name: name || email.split("@")[0],
      role: "user", // Default role
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error("Database error creating profile:", error)
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error creating user profile:", error)
    return { error: error.message || "Failed to create user profile" }
  }
}

export async function createUserProfileFromAuth(formData: FormData) {
  try {
    const supabase = createServerSupabaseClient()
    const userId = formData.get("userId") as string
    const email = formData.get("email") as string
    const name = formData.get("name") as string

    if (!userId || !email) {
      return {
        error: "Missing required fields",
      }
    }

    // Insert user profile into the "miembros" table
    const { error } = await supabase.from("miembros").insert({
      auth_id: userId,
      email: email,
      name: name || email.split("@")[0], // Use part of email as name if not provided
      role: "user", // Default role
      created_at: new Date().toISOString(),
    })

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error creating user profile:", error)
    return { error: error.message || "Failed to create user profile" }
  }
}



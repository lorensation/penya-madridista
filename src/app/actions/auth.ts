"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function createUserProfile(userId: string, email: string, name: string) {
  try {
    const supabase = createServerSupabaseClient()

    // Insert user profile into the "miembros" table
    const { error } = await supabase.from("miembros").insert({
      auth_id: userId,
      email: email,
      name: name,
      role: "user", // Default role
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


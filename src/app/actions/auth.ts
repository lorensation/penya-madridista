"use server"

import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase"
import type { ApiResponse } from "@/types/common"
import type { User } from "@supabase/supabase-js"

export async function signUp(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string

  if (!email || !password || !name) {
    return {
      error: "Missing required fields",
    }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
      data: {
        name,
      },
    },
  })

  if (error) {
    return {
      error: error.message,
    }
  }

  return {
    success: true,
  }
}

export async function signIn(formData: FormData): Promise<ApiResponse> {
  const supabase = await createServerSupabaseClient()
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return {
      success: false,
      error: "Missing required fields",
    }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  return {
    success: true,
  }
}

export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function resetPassword(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const email = formData.get("email") as string

  if (!email) {
    return {
      error: "Email is required",
    }
  }

  // Use the absolute URL with origin to ensure the correct redirect
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://www.lorenzosanz.com')
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/reset-password`,
  })

  if (error) {
    return {
      error: error.message,
    }
  }

  return {
    success: true,
  }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const password = formData.get("password") as string

  if (!password) {
    return {
      error: "Password is required",
    }
  }

  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return {
      error: error.message,
    }
  }

  return {
    success: true,
  }
}

export async function getSession() {
  const supabase = await createServerSupabaseClient()
  return supabase.auth.getSession()
}

export async function getUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.auth.getUser()
  return data.user
}


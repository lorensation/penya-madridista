import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// Environment variables for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_WEBHOOK_SECRET!

// Create a Supabase client with admin privileges
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Function to check and create RLS policies
export async function setupRLSPolicies() {
  try {
    // Enable RLS on miembros table
    await supabaseAdmin.rpc("set_rls_enabled", { table: "miembros", enabled: true })

    // Create policy for users to insert their own records
    await supabaseAdmin.rpc("create_policy", {
      table: "miembros",
      name: "users_can_insert_own_records",
      definition: "auth.uid() = user_uuid",
      check: "INSERT",
      action: "PERMISSIVE",
    })

    // Create policy for users to select their own records
    await supabaseAdmin.rpc("create_policy", {
      table: "miembros",
      name: "users_can_select_own_records",
      definition: "auth.uid() = user_uuid",
      check: "SELECT",
      action: "PERMISSIVE",
    })

    // Create policy for users to update their own records
    await supabaseAdmin.rpc("create_policy", {
      table: "miembros",
      name: "users_can_update_own_records",
      definition: "auth.uid() = user_uuid",
      check: "UPDATE",
      action: "PERMISSIVE",
    })

    console.log("RLS policies set up successfully")
    return { success: true }
  } catch (error) {
    console.error("Error setting up RLS policies:", error)
    return { success: false, error }
  }
}


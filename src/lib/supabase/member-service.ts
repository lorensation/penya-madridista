import { createBrowserSupabaseClient } from "./client"
import { createServerSupabaseClient } from "./server"
import { getCurrentUser } from "./auth-service"
import type { MemberData } from "@/types/common"

/**
 * Get the appropriate Supabase client based on the environment
 */
function getClient() {
  return typeof window !== "undefined" 
    ? createBrowserSupabaseClient() 
    : createServerSupabaseClient()
}

/**
 * Prepare member data for database insertion by handling data types
 */
function prepareMemberData(memberData: MemberData, userId: string): MemberData {
  // Ensure ID fields are set correctly
  const preparedData: MemberData = {
    ...memberData,
    id: userId,
    user_uuid: userId,
    subscription_status: memberData.subscription_status || "inactive",
  }

  // Handle numeric values
  const numericFields = ['telefono', 'cp', 'num_socio', 'num_carnet'] as const;
  
  numericFields.forEach(field => {
    if (preparedData[field]) {
      if (typeof preparedData[field] === "string") {
        const parsedValue = Number.parseInt(preparedData[field] as string, 10)
        preparedData[field] = isNaN(parsedValue) ? null : parsedValue
      }
    } else {
      preparedData[field] = null
    }
  });

  return preparedData
}

/**
 * Create a new member record for the current user
 */
export async function createMember(memberData: MemberData) {
  const client = getClient()
  
  // Get the auth user
  const { data: authUser, error: authError } = await getCurrentUser()

  if (authError || !authUser?.user) {
    return { data: null, error: authError || new Error("Auth user not found") }
  }

  // First update the users table to mark as member
  const { error: userError } = await client
    .from("users")
    .update({ is_member: true })
    .eq("id", authUser.user.id)

  if (userError) {
    console.error("Error updating user:", userError)
    // Continue anyway to try creating the member record
  }

  // Prepare member data with correct types
  const preparedData = prepareMemberData(memberData, authUser.user.id)
  
  console.log("Creating member with data:", preparedData)

  // Create the member record
  const { data, error } = await client
    .from("miembros")
    .insert(preparedData)
    .select()

  if (error) {
    console.error("Error creating member:", error)
  } else if (data && data.length > 0 && (preparedData.subscription_id || preparedData.stripe_customer_id)) {
    try {
      // Call the admin API to update subscription status
      const response = await fetch("/api/admin/update-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: authUser.user.id,
        }),
      })

      if (!response.ok) {
        console.error("Failed to update subscription via admin API:", await response.text())
      }
    } catch (subscriptionErr) {
      console.error("Error calling subscription update API:", subscriptionErr)
    }
  }

  return { data, error }
}

/**
 * Get the member record for the current user
 */
export async function getMember() {
  const client = getClient()
  
  // Get the auth user
  const { data: authUser, error: authError } = await getCurrentUser()

  if (authError || !authUser?.user) {
    return { data: null, error: authError || new Error("User not found") }
  }

  // Get member by user_uuid
  const { data, error } = await client
    .from("miembros")
    .select("*")
    .eq("user_uuid", authUser.user.id)
    .single()

  return { data, error }
}

/**
 * Update the member record for the current user
 */
export async function updateMember(updates: Partial<MemberData>) {
  const client = getClient()
  
  // Get the auth user
  const { data: authUser, error: authError } = await getCurrentUser()

  if (authError || !authUser?.user) {
    return { data: null, error: authError || new Error("User not found") }
  }

  // Update member by user_uuid
  const { data, error } = await client
    .from("miembros")
    .update(updates)
    .eq("user_uuid", authUser.user.id)
    .select()

  return { data: data?.[0] || null, error }
}
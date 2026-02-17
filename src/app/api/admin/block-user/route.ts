import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()

    // Get current user (admin)
    const { data: { user: admin }, error: authError } = await supabase.auth.getUser()

    if (authError || !admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify admin status
    const { data: adminData, error: adminError } = await supabase
      .from("miembros")
      .select("role")
      .eq("user_uuid", admin.id)
      .single()

    if (adminError || adminData?.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Get request body
    const { userId, reasonType, reason, notes } = await request.json()

    if (!userId || !reasonType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check if user exists
    const { data: userExists, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle()

    if (userError) {
      return NextResponse.json({ error: "Error checking user" }, { status: 500 })
    }

    if (!userExists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Block the user
    const { data: blockData, error: blockError } = await supabase
      .from("blocked_users")
      .insert({
        user_id: userId,
        reason: reason || "Blocked by administrator",
        reason_type: reasonType,
        blocked_by: admin.id,
        notes: notes || null
      })
      .select()
      .single()

    if (blockError) {
      console.error("Error blocking user:", blockError)
      return NextResponse.json({ error: "Failed to block user" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "User blocked successfully",
      data: blockData
    })
  } catch (error) {
    console.error("Error in block-user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
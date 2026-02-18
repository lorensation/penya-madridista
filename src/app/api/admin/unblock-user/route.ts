import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

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
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Unblock the user - simply delete the record from blocked_users table
    const { error: unblockError } = await supabase
      .from("blocked_users")
      .delete()
      .eq("user_id", userId)

    if (unblockError) {
      console.error("Error unblocking user:", unblockError)
      return NextResponse.json({ error: "Failed to unblock user" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "User unblocked successfully" 
    })
  } catch (error) {
    console.error("Error in unblock-user API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
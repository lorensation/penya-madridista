import { type NextRequest, NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

export async function GET(request: NextRequest) {
  try {
    // Get the current user to verify they're an admin
    const supabaseClient = createRouteHandlerClient<Database>({ cookies })
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from("miembros")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    // Use service role client for admin operations
    const serviceClient = getServiceSupabase()

    // Get URL params
    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const perPage = Number.parseInt(searchParams.get("perPage") || "10")

    // Get users from auth.users using service role
    const {
      data: { users: authUsers },
      error: authError,
    } = await serviceClient.auth.admin.listUsers({
      page,
      perPage,
    })

    if (authError) {
      throw authError
    }

    // Get profiles from profiles table
    const { data: profiles, error: profilesError } = await serviceClient.from("miembros").select("*")

    if (profilesError) {
      throw profilesError
    }

    // Merge auth users with profiles
    const mergedUsers = authUsers.map((authUser) => {
      const profile = profiles.find((p) => p.id === authUser.id) || {}
      return {
        ...authUser,
        ...profile,
      }
    })

    return NextResponse.json({ users: mergedUsers })
  } catch (error) {
    console.error("Error in admin users API:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 },
    )
  }
}


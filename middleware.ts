import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Skip middleware for webhook endpoints - using exact path matching
  if (request.nextUrl.pathname.startsWith("/api/webhooks/")) {
    console.log("Skipping middleware for webhook endpoint")
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }))
        },
        setAll(cookieOptions) {
          cookieOptions.forEach(({ name, value, ...options }) => {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          })
        },
      },
    },
  )

  // Refresh session if expired - required for Server Components
  const { data: authData } = await supabase.auth.getUser()
  const authUser = authData?.user || null

  // If no authenticated user and trying to access protected routes, redirect to login
  if (
    !authUser &&
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/account"))
  ) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // If we have an authenticated user and they're accessing protected routes,
  // get their basic info from the users table
  if (
    authUser &&
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/admin") ||
      request.nextUrl.pathname.startsWith("/account"))
  ) {
    try {
      // First get basic user info from users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, name, is_member")
        .eq("id", authUser.id)
        .single()

      if (userError || !userData) {
        console.error("Failed to fetch user data:", userError)
        // If we can't get user data, redirect to login
        return NextResponse.redirect(new URL("/login", request.url))
      }

      // For dashboard or admin routes, we need detailed member info
      if (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/admin")) {
        // Try to get member data using multiple methods
        let memberData = null

        // 1. Try by user_uuid first
        const { data: memberByUuid, error: uuidError } = await supabase
          .from("miembros")
          .select("*")
          .eq("user_uuid", authUser.id)
          .single()

        if (!uuidError && memberByUuid) {
          memberData = memberByUuid
        } else {
          // 2. Try by id
          const { data: memberById, error: idError } = await supabase
            .from("miembros")
            .select("*")
            .eq("id", authUser.id)
            .single()

          if (!idError && memberById) {
            memberData = memberById
          } else {
            // 3. Try by email as last resort
            const { data: memberByEmail, error: emailError } = await supabase
              .from("miembros")
              .select("*")
              .eq("email", authUser.email)
              .single()

            if (!emailError && memberByEmail) {
              memberData = memberByEmail
            }
          }
        }

        // For admin routes, check if the user has admin role
        if (request.nextUrl.pathname.startsWith("/admin")) {
          if (!memberData || memberData.role !== "admin") {
            console.log("User does not have admin role:", memberData?.role || "no profile found")
            return NextResponse.redirect(new URL("/dashboard", request.url))
          }

          console.log("Admin access granted for user:", authUser.email || authUser.id)
        }

        // For dashboard routes, ensure we have member data
        if (request.nextUrl.pathname.startsWith("/dashboard")) {
          // If accessing settings but no member data, redirect to complete profile
          if (request.nextUrl.pathname.includes("/settings") && !memberData) {
            return NextResponse.redirect(new URL("/dashboard/complete-profile", request.url))
          }

          // If checking subscription status, ensure we have the data
          if (request.nextUrl.pathname.includes("/subscription") && (!memberData || !memberData.subscription_status)) {
            // Allow access but the page will handle showing appropriate message
            console.log("User accessing subscription without status data")
          }
        }
      }
    } catch (error) {
      console.error("Error in middleware:", error)
      // For any unexpected errors, redirect to dashboard
      if (request.nextUrl.pathname.startsWith("/admin")) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}

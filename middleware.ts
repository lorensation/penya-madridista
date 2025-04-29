import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { isUserBlockedSSR } from "@/lib/blocked-users"

// Paths that should be accessible even in maintenance mode
const ALLOWED_PATHS = [
  '/login',
  '/admin',
  '/maintenance',
  '/api',
  '/_next',
  '/favicon.ico',
  '/logo.png',
  '/public'
]

// Paths that should be accessible without authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api',
  '/_next',
  '/favicon.ico',
  '/blocked', // Allow access to blocked page
  '/tienda', // Allow access to shop page
]

export async function middleware(request: NextRequest) {
  // Skip middleware for webhook endpoints - using exact path matching
  if (request.nextUrl.pathname.startsWith("/api/webhooks/")) {
    console.log("Skipping middleware for webhook endpoint")
    return NextResponse.next()
  }

  // Check if the request is to the shop and is a GET request
  const isShopRequest = request.nextUrl.pathname.startsWith("/tienda/")
  const isGetRequest = request.method === "GET"
  const isPublicShopRequest = isShopRequest && isGetRequest

  // Check if the current path should be public
  const currentPath = request.nextUrl.pathname
  const isPublicPath = PUBLIC_PATHS.some(path => currentPath.startsWith(path))
  const isBlockedPage = currentPath === "/blocked"

  // Check for /complete-profile access without checkout session ID
  if (request.nextUrl.pathname === "/complete-profile") {
    const sessionId = request.nextUrl.searchParams.get("session_id")
    
    // If no session_id is provided, redirect to membership page
    if (!sessionId) {
      console.log("Attempt to access complete-profile without session_id")
      return NextResponse.redirect(new URL("/membership", request.url))
    }
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
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          response.cookies.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: authData } = await supabase.auth.getUser()
  const authUser = authData?.user || null

  // Check if user is blocked (if authenticated) and trying to access any non-blocked pages
  if (authUser && !isBlockedPage) {
    try {
      // Check if user is in blocked_users table
      const { data: blockedUser, error: blockError } = await supabase
        .from("blocked_users")
        .select("*")
        .eq("user_id", authUser.id)
        .single()
      
      if (!blockError && blockedUser) {
        console.log("Blocked user attempt to access site:", authUser.email)
        
        // User is blocked, create URL with reason type as a parameter
        const blockedUrl = new URL('/blocked', request.url)
        if (blockedUser.reason_type) {
          blockedUrl.searchParams.append('reason', blockedUser.reason_type)
        }
        
        // Force sign out the user
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) console.error("Error signing out blocked user:", signOutError)
        
        // Clear all auth cookies explicitly
        response.cookies.delete("sb-access-token")
        response.cookies.delete("sb-refresh-token")
        response.cookies.delete("supabase-auth-token")
        
        return NextResponse.redirect(blockedUrl, {
          // Using 307 Temporary Redirect to maintain the HTTP method
          status: 307,
          headers: {
            'Set-Cookie': [
              'sb-access-token=; Path=/; Max-Age=0; HttpOnly',
              'sb-refresh-token=; Path=/; Max-Age=0; HttpOnly',
              'supabase-auth-token=; Path=/; Max-Age=0; HttpOnly'
            ].join(', ')
          }
        })
      }
    } catch (error) {
      console.error("Error checking if user is blocked:", error)
      // Continue with normal flow in case of error
    }
  }

  // Check for maintenance mode
  try {
    // Get site settings to check maintenance mode
    const { data: settingsData } = await supabase
      .from('site_settings')
      .select('maintenance_mode')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    
    const maintenanceMode = settingsData?.maintenance_mode || false
    
    // If maintenance mode is enabled and the path is not in allowed paths
    if (maintenanceMode) {
      const path = request.nextUrl.pathname
      
      // Check if the path should be allowed regardless of maintenance mode
      const isAllowedPath = ALLOWED_PATHS.some(allowedPath => path.startsWith(allowedPath))
      
      // If not an allowed path, check if user is admin
      if (!isAllowedPath) {
        let isAdmin = false
        
        // Only check admin status if user is authenticated
        if (authUser) {
          try {
            // Try to get member data to check admin role
            const { data: memberData } = await supabase
              .from("miembros")
              .select("role")
              .eq("id", authUser.id)
              .single()
            
            isAdmin = memberData?.role === "admin"
          } catch (error) {
            console.error('Error checking admin status:', error)
          }
        }
        
        // If not admin, redirect to maintenance page
        if (!isAdmin) {
          return NextResponse.redirect(new URL('/maintenance', request.url))
        }
      }
    }
  } catch (error) {
    console.error('Error checking maintenance mode:', error)
    // In case of error, continue with normal middleware flow
  }

  // If no authenticated user and trying to access protected routes, redirect to login
  // Allow public access to shop GET requests
  if (
    !authUser &&
    !isPublicPath && // Skip authentication check for public paths
    !isPublicShopRequest && // Skip authentication check for GET shop requests
    (request.nextUrl.pathname.startsWith("/dashboard") ||
      request.nextUrl.pathname.startsWith("/admin"))
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

      // For admin routes, we need to check admin role
      if (request.nextUrl.pathname.startsWith("/admin")) {
        // Try to get member data using multiple methods
        let memberData = null

        // Try different approaches to find the member record
        // First try by email as it's most likely to match
        if (authUser.email) {
          const { data: memberByEmail, error: emailError } = await supabase
            .from("miembros")
            .select("*")
            .eq("email", authUser.email)
            .single()

          if (!emailError && memberByEmail) {
            memberData = memberByEmail
            console.log("Found member by email:", authUser.email)
          }
        }

        // If not found by email, try by ID
        if (!memberData) {
          const { data: memberById, error: idError } = await supabase
            .from("miembros")
            .select("*")
            .eq("id", authUser.id)
            .single()

          if (!idError && memberById) {
            memberData = memberById
            console.log("Found member by id:", authUser.id)
          }
        }

        // For admin routes, check if the user has admin role
        if (!memberData || memberData.role !== "admin") {
          console.log("User does not have admin role:", memberData?.role || "no profile found")
          return NextResponse.redirect(new URL("/dashboard", request.url))
        }

        console.log("Admin access granted for user:", authUser.email || authUser.id)
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
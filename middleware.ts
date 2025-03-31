import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
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
        // Correctly typed getAll method
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
  const { data } = await supabase.auth.getUser()
  const user = data?.user || null

  // If no user and trying to access protected routes, redirect to login
  if (!user && (
    request.nextUrl.pathname.startsWith('/dashboard') || 
    request.nextUrl.pathname.startsWith('/admin') || 
    request.nextUrl.pathname.startsWith('/account')
  )) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // For admin routes, check if the user has admin role
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // If we already know there's no user, redirect (this should be caught by the previous check,
    // but adding an extra check here for type safety)
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    try {
      // First try by user_uuid (which matches session.user.id)
      let { data: profile, error } = await supabase
        .from('miembros')
        .select('*')
        .eq('user_uuid', user.id)
        .single()

      // If that fails, try by id
      if (error || !profile) {
        const { data: profileById, error: errorById } = await supabase
          .from('miembros')
          .select('*')
          .eq('id', user.id)
          .single()
          
        if (errorById || !profileById) {
          // If both UUID lookups fail, try by email
          if (user.email) {
            const { data: profileByEmail, error: errorByEmail } = await supabase
              .from('miembros')
              .select('*')
              .eq('email', user.email)
              .single()
              
            if (errorByEmail || !profileByEmail) {
              console.error('Failed to find user profile by email:', errorByEmail)
              return NextResponse.redirect(new URL('/dashboard', request.url))
            }
            
            profile = profileByEmail
          } else {
            console.error('Failed to find user profile and no email available')
            return NextResponse.redirect(new URL('/dashboard', request.url))
          }
        } else {
          profile = profileById
        }
      }

      // Check if the user has admin role
      if (!profile || profile.role !== 'admin') {
        console.log('User does not have admin role:', profile?.role || 'no profile found')
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      
      console.log('Admin access granted for user:', user.email || user.id)
      
    } catch (error) {
      console.error('Error checking admin status:', error)
      return NextResponse.redirect(new URL('/dashboard', request.url))
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
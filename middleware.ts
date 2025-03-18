import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Check if user is authenticated
  if (!session) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirect", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Skip profile check for complete-profile page to avoid redirect loop
  if (req.nextUrl.pathname === "/complete-profile") {
    return res
  }

  // Check if profile is complete for dashboard and other protected routes
  if (req.nextUrl.pathname.startsWith("/dashboard") || req.nextUrl.pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("miembros")
      .select("dni_pasaporte, name, apellido1")
      .eq("auth_id", session.user.id)
      .single()

    // If profile is not complete, redirect to complete-profile page
    if (!profile || !profile.dni_pasaporte || !profile.name || !profile.apellido1) {
      return NextResponse.redirect(new URL("/complete-profile", req.url))
    }
  }

  // For admin routes, check if user has admin role
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const { data: profile } = await supabase.from("miembros").select("role").eq("auth_id", session.user.id).single()

    if (!profile || profile.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  return res
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/complete-profile"],
}


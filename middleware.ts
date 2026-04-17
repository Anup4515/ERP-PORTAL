import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { rateLimit } from "@/app/lib/rate-limit"

const loginLimiter = rateLimit({ interval: 60_000, maxRequests: 5 })

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rate limit login attempts (5 per minute per IP)
  if (pathname === "/api/auth/callback/credentials" && req.method === "POST") {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown"
    const result = loginLimiter.check(ip)
    if (!result.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      )
    }
  }

  // NextAuth v5 uses different cookie names in production (HTTPS) vs development
  const isSecure = req.nextUrl.protocol === "https:"
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    cookieName,
  })

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/forgot-password")
  const isSetupPage = pathname.startsWith("/setup-partner")
  const isAdminPage = pathname.startsWith("/school-admin")
  const isTeacherPage = pathname.startsWith("/teacher")
  const isApiAuth = pathname.startsWith("/api/auth")
  const isApi = pathname.startsWith("/api/")

  // Allow API auth routes
  if (isApiAuth) return NextResponse.next()

  // Allow public API routes to handle their own auth
  if (isApi) return NextResponse.next()

  // Redirect logged-in users away from auth pages
  if (isAuthPage && token) {
    if (token.role === "school_admin" && !token.school_id) {
      return NextResponse.redirect(new URL("/setup-partner", req.url))
    }
    const dashboardUrl =
      token.role === "school_admin"
        ? "/school-admin/dashboard"
        : "/teacher/dashboard"
    return NextResponse.redirect(new URL(dashboardUrl, req.url))
  }

  // Auth pages are public
  if (isAuthPage) return NextResponse.next()

  // Everything below requires authentication
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Setup page: only school_admin without partner profile
  if (isSetupPage) {
    if (token.role !== "school_admin") {
      return NextResponse.redirect(new URL("/teacher/dashboard", req.url))
    }
    if (token.school_id) {
      return NextResponse.redirect(
        new URL("/school-admin/dashboard", req.url)
      )
    }
    return NextResponse.next()
  }

  // Admin pages: school_admin + must have school_id
  if (isAdminPage) {
    if (token.role !== "school_admin") {
      return NextResponse.redirect(new URL("/teacher/dashboard", req.url))
    }
    if (!token.school_id) {
      return NextResponse.redirect(new URL("/setup-partner", req.url))
    }
    return NextResponse.next()
  }

  // Teacher pages
  if (isTeacherPage) {
    if (token.role !== "teacher") {
      return NextResponse.redirect(
        new URL("/school-admin/dashboard", req.url)
      )
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.png$).*)",
  ],
}

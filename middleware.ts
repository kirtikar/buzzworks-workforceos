import { NextRequest, NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login"]
const AUTH_COOKIE = "ops_session"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths and API routes through
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  // Check auth cookie
  const isAuthed = request.cookies.get(AUTH_COOKIE)?.value === "active"

  if (!isAuthed) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

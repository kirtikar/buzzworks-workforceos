import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const session = request.cookies.get("ops_session")
  const { pathname } = request.nextUrl

  // Let login page through always
  if (pathname === "/login") {
    // If already logged in, skip login page
    if (session?.value === "active") {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // All other routes require session
  if (!session || session.value !== "active") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

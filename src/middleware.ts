import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check for session cookie (database sessions)
  const sessionToken = request.cookies.get('next-auth.session-token')?.value || 
                       request.cookies.get('__Secure-next-auth.session-token')?.value

  const { pathname } = request.nextUrl

  // Protected routes
  const isProtectedRoute = pathname.startsWith('/dashboard') || 
                          pathname.startsWith('/expenses') || 
                          pathname.startsWith('/groups') || 
                          pathname.startsWith('/accounts')

  // If trying to access protected route without session, redirect to signin
  if (isProtectedRoute && !sessionToken) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // If authenticated user tries to access auth pages, redirect to dashboard
  if (sessionToken && (pathname.startsWith('/auth/') || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/expenses/:path*', '/groups/:path*', '/accounts/:path*', '/auth/:path*', '/']
}
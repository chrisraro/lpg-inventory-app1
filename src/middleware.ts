import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  // Use empty strings as fallback to prevent build errors
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  // If environment variables are not set, allow all requests
  if (!url || !anonKey) {
    console.warn('Supabase environment variables are not set')
    return res
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set({
          name,
          value,
          ...options,
        })
        res = NextResponse.next({
          request: {
            headers: req.headers,
          },
        })
        res.cookies.set({
          name,
          value,
          ...options,
        })
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.set({
          name,
          value: '',
          ...options,
        })
        res = NextResponse.next({
          request: {
            headers: req.headers,
          },
        })
        res.cookies.set({
          name,
          value: '',
          ...options,
        })
      },
    },
  })

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Protected routes that require authentication
    const protectedPaths = ['/dashboard', '/cylinders', '/scan', '/dispatch']
    
    // Check if the request is for a protected path
    const isProtectedPath = protectedPaths.some((path) => 
      req.nextUrl.pathname.startsWith(path)
    )

    // If the user is not logged in and trying to access a protected path, redirect to login
    if (!session && isProtectedPath) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }

    // If the user is logged in and trying to access the login page, redirect to dashboard
    if (session && req.nextUrl.pathname === '/login') {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  } catch (error) {
    console.error('Middleware error:', error)
    // In case of error, allow the request to proceed
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
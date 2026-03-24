import { NextRequest, NextResponse } from 'next/server'

function getSessionToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get('__Secure-better-auth.session_token')?.value ||
    request.cookies.get('better-auth.session_token')?.value
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = getSessionToken(request)

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin routes — verify role via API
  if (pathname.startsWith('/admin')) {
    try {
      const sessionUrl = new URL('/api/auth/get-session', request.url)
      const res = await fetch(sessionUrl.toString(), {
        headers: { cookie: request.headers.get('cookie') || '' },
      })

      if (!res.ok) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(loginUrl)
      }

      const session = await res.json()
      if (session?.user?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}

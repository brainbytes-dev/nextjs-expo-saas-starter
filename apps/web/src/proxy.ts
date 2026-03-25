import { NextRequest, NextResponse } from 'next/server'

function getSessionToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get('__Secure-better-auth.session_token')?.value ||
    request.cookies.get('better-auth.session_token')?.value
  )
}

// Extract subdomain from host header.
// "app.zentory.ch" → "app", "zentory.ch" → null, "localhost:3000" → null
function getSubdomain(host: string): string | null {
  // Ignore localhost (local dev — use path-based routing)
  if (host.includes('localhost') || host.includes('127.0.0.1')) return null
  const parts = host.replace(/:\d+$/, '').split('.')
  if (parts.length < 3) return null // "zentory.ch" — main domain, no subdomain
  return parts[0] // "app", "admin", "status"
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const subdomain = getSubdomain(host)

  // ── Main domain → subdomain redirects ────────────────────────────────────
  // Enforce canonical subdomain URLs: zentory.ch/dashboard → app.zentory.ch/dashboard
  if (subdomain === null && !host.includes('localhost')) {
    if (pathname.startsWith('/dashboard') || pathname === '/login' || pathname === '/signup' || pathname.startsWith('/forgot-password') || pathname.startsWith('/accept-invite') || pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(`https://app.zentory.ch${pathname}${request.nextUrl.search}`)
    }
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(`https://admin.zentory.ch${pathname.replace(/^\/admin/, '') || '/'}${request.nextUrl.search}`)
    }
    if (pathname.startsWith('/status')) {
      return NextResponse.redirect(`https://status.zentory.ch${pathname.replace(/^\/status/, '') || '/'}${request.nextUrl.search}`)
    }
  }

  // ── Subdomain routing ─────────────────────────────────────────────────────

  // status.zentory.ch/* → /status/*  (public, no auth)
  if (subdomain === 'status') {
    const target = pathname === '/' ? '/status' : `/status${pathname}`
    return NextResponse.rewrite(new URL(target, request.url))
  }

  // app.zentory.ch/ → redirect to /dashboard
  if (subdomain === 'app' && (pathname === '/' || pathname === '')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // admin.zentory.ch/* → /admin/* (with auth check below)
  const isAdminSubdomain = subdomain === 'admin'
  const effectivePath = isAdminSubdomain && !pathname.startsWith('/admin')
    ? `/admin${pathname === '/' ? '' : pathname}`
    : pathname

  // ── Auth guard ────────────────────────────────────────────────────────────
  const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/accept-invite', '/onboarding', '/api/', '/pricing', '/impressum', '/datenschutz', '/agb', '/developers', '/docs', '/tv', '/verify-2fa']
  const isPublic = PUBLIC_PATHS.some(p => effectivePath.startsWith(p))

  const sessionToken = getSessionToken(request)

  if (!sessionToken && !isPublic) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', effectivePath)
    return NextResponse.redirect(loginUrl)
  }

  // Admin routes — verify role via API
  if (effectivePath.startsWith('/admin')) {
    try {
      const sessionUrl = new URL('/api/auth/get-session', request.url)
      const res = await fetch(sessionUrl.toString(), {
        headers: { cookie: request.headers.get('cookie') || '' },
      })

      if (!res.ok) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', effectivePath)
        return NextResponse.redirect(loginUrl)
      }

      const session = await res.json()
      if (session?.user?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Rewrite admin.zentory.ch/* → /admin/* after auth passes
    if (isAdminSubdomain && effectivePath !== pathname) {
      return NextResponse.rewrite(new URL(effectivePath, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/admin/:path*',
    '/status/:path*',
    // Catch all on app/admin subdomains (subdomain check happens inside the function)
    '/((?!_next|api/auth|api/webhooks|favicon|zentory-logo|.*\\.svg$|.*\\.png$).*)',
  ],
}

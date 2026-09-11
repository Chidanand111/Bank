import { NextResponse, type NextRequest } from 'next/server';
import { verifySession } from './lib/auth/crypto';
import { SESSION_COOKIE_NAME } from './lib/auth/session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin and sub-routes
  if (pathname.startsWith('/admin')) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    // 1. If not authenticated at all, redirect to login
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // 2. Verify cryptographically signed session token
    const payload = await verifySession(sessionToken);
    if (!payload) {
      // Invalid/tampered/expired session token
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    // 3. Verify ADMIN role
    if (payload.role !== 'ADMIN') {
      // Normal USER attempting to access /admin -> redirect to unauthorized page
      const unauthorizedUrl = new URL('/unauthorized', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

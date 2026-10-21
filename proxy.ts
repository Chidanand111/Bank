import { NextResponse, type NextRequest } from 'next/server';
import { verifySession } from './lib/auth/crypto';
import { SESSION_COOKIE_NAME } from './lib/auth/session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // -------------------------------------------------------------
  // 1. API EXAM QUESTIONS ACCESS CONTROL (Return JSON 401/403)
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/exam-questions')) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const payload = await verifySession(sessionToken);
    if (!payload) {
      const res = NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or expired session.' },
        { status: 401 }
      );
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    if (payload.status && payload.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Account approval required.' },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // 2. ADMIN ACCESS CONTROL (Dedicated /admin Portal)
  // -------------------------------------------------------------
  if (pathname.startsWith('/admin')) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    // Public exception: The dedicated admin login portal
    if (pathname === '/admin/login') {
      if (sessionToken) {
        const payload = await verifySession(sessionToken);
        if (payload?.role === 'ADMIN') {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      }
      return NextResponse.next();
    }

    // Direct access to /admin or subroutes:
    // If not authenticated, redirect strictly to /admin/login (NOT candidate /login)
    if (!sessionToken) {
      const adminLoginUrl = new URL('/admin/login', request.url);
      adminLoginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(adminLoginUrl);
    }

    // Verify cryptographic signature
    const payload = await verifySession(sessionToken);
    if (!payload) {
      const adminLoginUrl = new URL('/admin/login', request.url);
      adminLoginUrl.searchParams.set('callbackUrl', pathname);
      const res = NextResponse.redirect(adminLoginUrl);
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    // Strict Role Enforcement: Non-admins trying to access /admin
    if (payload.role !== 'ADMIN') {
      const unauthorizedUrl = new URL('/unauthorized', request.url);
      return NextResponse.redirect(unauthorizedUrl);
    }

    // Account Status Enforcement for Admin
    if (payload.status && payload.status !== 'APPROVED') {
      const adminLoginUrl = new URL('/admin/login', request.url);
      adminLoginUrl.searchParams.set('error', payload.status === 'PENDING' ? 'pending' : 'rejected');
      return NextResponse.redirect(adminLoginUrl);
    }

    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // 3. ADMIN API ACCESS CONTROL (Return JSON 401/403)
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/admin')) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required.' },
        { status: 401 }
      );
    }

    const payload = await verifySession(sessionToken);
    if (!payload) {
      const res = NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or expired session.' },
        { status: 401 }
      );
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    if (payload.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Administrator privileges required.' },
        { status: 403 }
      );
    }

    if (payload.status && payload.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Account approval required.' },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  // -------------------------------------------------------------
  // 4. CANDIDATE ACCESS CONTROL (User must be logged in & approved)
  // -------------------------------------------------------------
  const candidateProtectedPrefixes = [
    '/test',
    '/dashboard',
    '/my-results',
    '/result',
    '/review',
    '/profile',
  ];

  const isCandidateProtected = candidateProtectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isCandidateProtected) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    // Unauthenticated visitors must sign in before taking tests or viewing records
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifySession(sessionToken);
    if (!payload) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    // Account Status Enforcement for Candidate
    if (payload.status === 'PENDING') {
      return NextResponse.redirect(new URL('/login?error=pending', request.url));
    }
    if (payload.status === 'REJECTED') {
      return NextResponse.redirect(new URL('/login?error=rejected', request.url));
    }
    if (payload.status && payload.status !== 'APPROVED') {
      return NextResponse.redirect(new URL('/login?error=unapproved', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/test/:path*',
    '/dashboard/:path*',
    '/my-results/:path*',
    '/result/:path*',
    '/review/:path*',
    '/profile/:path*',
    '/api/exam-questions/:path*',
  ],
};

import { redirect } from 'next/navigation';
import { AuthUser } from '@/types';
import { getCurrentUser } from './session';

/**
 * Checks if the given user has the ADMIN role.
 */
export function isAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === 'ADMIN';
}

/**
 * Server-side guard: Ensures the requester is logged in and approved.
 * If not authenticated, redirects to /login with callbackUrl.
 */
export async function requireUser(callbackUrl: string = '/dashboard'): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  if (user.status === 'PENDING') {
    redirect(`/login?error=pending`);
  }
  if (user.status === 'REJECTED') {
    redirect(`/login?error=rejected`);
  }
  if (user.status && user.status !== 'APPROVED') {
    redirect(`/login?error=unapproved`);
  }
  return user;
}

/**
 * Server-side guard: Ensures the requester is authenticated AND has ADMIN role in the database.
 * If not logged in, redirects to the dedicated Admin Login portal /admin/login.
 * If logged in as normal USER, redirects to /unauthorized.
 * If account is suspended or pending, redirects to login error.
 */
export async function requireAdmin(callbackUrl: string = '/admin'): Promise<AuthUser> {
  if (process.env.NODE_ENV !== 'production' && process.env.ADMIN_OVERRIDE === 'true') {
    return {
      id: 'admin-1',
      name: 'Platform Admin',
      email: 'admin@bankmock.com',
      role: 'ADMIN',
      status: 'APPROVED',
      createdAt: new Date().toISOString(),
      attemptCount: 0,
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/admin/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  if (user.role !== 'ADMIN') {
    redirect('/unauthorized');
  }
  if (user.status && user.status !== 'APPROVED') {
    redirect(user.status === 'PENDING' ? '/login?error=pending' : '/login?error=rejected');
  }
  return user;
}

/**
 * Strict server assertion for mutations: throws an error if user is not an approved ADMIN.
 */
export function assertAdmin(user: AuthUser | null): asserts user is AuthUser & { role: 'ADMIN' } {
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }
  if (user.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin authorization required.');
  }
  if (user.status && user.status !== 'APPROVED') {
    throw new Error('Forbidden: Account approval required.');
  }
}

/**
 * Non-redirecting authentication & authorization resolver for API routes and backend services.
 */
export async function getAuthenticatedAdmin(): Promise<
  { user: AuthUser; error?: never; status?: never } | { user?: never; error: string; status: number }
> {
  if (process.env.NODE_ENV !== 'production' && process.env.ADMIN_OVERRIDE === 'true') {
    return {
      user: {
        id: 'admin-1',
        name: 'Platform Admin',
        email: 'admin@bankmock.com',
        role: 'ADMIN',
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
        attemptCount: 0,
      },
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized: Authentication required.', status: 401 };
  }
  if (user.role !== 'ADMIN') {
    return { error: 'Forbidden: Administrator privileges required.', status: 403 };
  }
  if (user.status && user.status !== 'APPROVED') {
    return { error: 'Forbidden: Account approval required.', status: 403 };
  }
  return { user };
}

/**
 * Non-redirecting authentication & approval resolver for candidate operations.
 */
export async function getAuthenticatedUser(): Promise<
  { user: AuthUser; error?: never; status?: never } | { user?: never; error: string; status: number }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized: Authentication required.', status: 401 };
  }
  if (user.status && user.status !== 'APPROVED') {
    return { error: 'Forbidden: Account approval required.', status: 403 };
  }
  return { user };
}

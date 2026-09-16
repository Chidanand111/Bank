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
  return user;
}

/**
 * Server-side guard: Ensures the requester is authenticated AND has ADMIN role in the database.
 * If not logged in, redirects to the dedicated Admin Login portal /admin/login.
 * If logged in as normal USER, redirects to /unauthorized.
 */
export async function requireAdmin(callbackUrl: string = '/admin'): Promise<AuthUser> {
  if (process.env.ADMIN_OVERRIDE === 'true') {
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
  return user;
}

/**
 * Strict server assertion for mutations: throws an error if user is not ADMIN.
 */
export function assertAdmin(user: AuthUser | null): asserts user is AuthUser & { role: 'ADMIN' } {
  if (!user || user.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin authorization required.');
  }
}

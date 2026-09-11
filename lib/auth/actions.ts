'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { clearSessionCookie, createSessionCookie, findDatabaseUserByEmail, createDatabaseUser, getDatabaseUsers } from './session';
import { Role } from '@/types';

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export async function loginAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const user = findDatabaseUserByEmail(email);
  if (!user || user.passwordHash !== password) {
    return { success: false, error: 'Invalid email or password credentials.' };
  }

  // Create session with canonical database user role
  await createSessionCookie({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  revalidatePath('/', 'layout');

  const redirectUrl = user.role === 'ADMIN' ? '/admin' : '/dashboard';
  redirect(redirectUrl);
}

export async function registerAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const name = formData.get('name')?.toString().trim();
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();

  if (!name || !email || !password) {
    return { success: false, error: 'All fields are required.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const existing = findDatabaseUserByEmail(email);
  if (existing) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  // Normal registration always defaults to USER role
  const newUser = createDatabaseUser({
    name,
    email,
    passwordHash: password,
    role: 'USER',
  });

  await createSessionCookie({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
  });

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Server-side Demo Login Action.
 * Instantly logs in as verified ADMIN or normal USER for testing and evaluation.
 */
export async function demoLoginAction(role: Role): Promise<void> {
  const users = getDatabaseUsers();
  const targetUser = users.find(u => u.role === role) || users[0];

  await createSessionCookie({
    id: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    role: targetUser.role, // Set from database
  });

  revalidatePath('/', 'layout');

  const targetPath = role === 'ADMIN' ? '/admin' : '/dashboard';
  redirect(targetPath);
}

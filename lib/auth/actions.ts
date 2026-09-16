'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  clearSessionCookie,
  createSessionCookie,
  findDatabaseUserByEmail,
  createDatabaseUser,
  getDatabaseUsers,
} from './session';
import { Role } from '@/types';

export interface AuthActionResult {
  success: boolean;
  error?: string;
  pendingApproval?: boolean;
  message?: string;
}

/**
 * Standard Candidate / Student Login Action
 * STRICT RULE: Only candidates/students can log in here.
 * If an admin tries to log in, they are instructed to use the direct /admin URL.
 * If a candidate account is PENDING approval, login is blocked with an informative message.
 */
export async function loginAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();
  const callbackUrl = formData.get('callbackUrl')?.toString() || '/dashboard';

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const user = findDatabaseUserByEmail(email);
  if (!user || user.passwordHash !== password) {
    return { success: false, error: 'Invalid email or password credentials.' };
  }

  // Strict Role Separation: Administrators must log in via the direct /admin portal
  if (user.role === 'ADMIN') {
    return {
      success: false,
      error: 'Administrator accounts must sign in via the direct Admin Portal at /admin.',
    };
  }

  // Strict Candidate Approval Check: User must be approved by an administrator
  const userStatus = user.status || 'APPROVED';
  if (userStatus === 'PENDING') {
    return {
      success: false,
      error:
        'Account Pending Approval: Your registration is currently awaiting administrator review. Once an administrator approves your account, you will be able to sign in.',
    };
  }

  if (userStatus === 'REJECTED') {
    return {
      success: false,
      error:
        'Account Application Rejected: Your account registration was not approved by the administrator. Please contact support for assistance.',
    };
  }

  // Create session for approved student
  await createSessionCookie({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  });

  revalidatePath('/', 'layout');
  redirect(callbackUrl.startsWith('/') && !callbackUrl.startsWith('/admin') ? callbackUrl : '/dashboard');
}

/**
 * Dedicated Admin Portal Login Action
 * STRICT RULE: Accessible only via direct URL /admin or /admin/login.
 * Non-admin candidate credentials will be strictly rejected.
 */
export async function adminLoginAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email')?.toString().trim();
  const password = formData.get('password')?.toString();
  const callbackUrl = formData.get('callbackUrl')?.toString() || '/admin';

  if (!email || !password) {
    return { success: false, error: 'Admin email and password are required.' };
  }

  const user = findDatabaseUserByEmail(email);

  // Strict Admin Role Guard: If this is a candidate/student account, reject immediately
  if (user && user.role !== 'ADMIN') {
    return {
      success: false,
      error:
        'Access Restricted: Platform administrator credentials are required. Candidate student accounts must sign in at /login.',
    };
  }

  if (!user || user.passwordHash !== password) {
    return { success: false, error: 'Invalid administrator credentials.' };
  }

  if (user.status === 'REJECTED') {
    return {
      success: false,
      error: 'Administrator access for this account has been revoked.',
    };
  }

  // Create verified Admin session
  await createSessionCookie({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status || 'APPROVED',
  });

  revalidatePath('/', 'layout');
  redirect(callbackUrl.startsWith('/admin') ? callbackUrl : '/admin');
}

/**
 * Candidate Registration Action
 * STRICT RULE: New accounts are assigned USER role and status PENDING.
 * They DO NOT receive a session cookie automatically; they must wait for admin approval.
 */
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

  // Account created with PENDING approval status
  createDatabaseUser({
    name,
    email,
    passwordHash: password,
    role: 'USER',
    status: 'PENDING',
  });

  // DO NOT sign in automatically. Return pending approval state for the UI to display.
  return {
    success: true,
    pendingApproval: true,
    message: 'Your registration was submitted successfully and is awaiting administrator approval.',
  };
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  revalidatePath('/', 'layout');
  redirect('/login');
}

/**
 * Candidate Student Demo Login
 * Only available for student evaluation.
 */
export async function demoStudentLoginAction(): Promise<void> {
  const users = getDatabaseUsers();
  const studentUser = users.find(u => u.role === 'USER' && (u.status === 'APPROVED' || !u.status)) || users[1];

  await createSessionCookie({
    id: studentUser.id,
    name: studentUser.name,
    email: studentUser.email,
    role: studentUser.role,
    status: studentUser.status || 'APPROVED',
  });

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

/**
 * Admin Portal Demo Login
 * Only available within the dedicated /admin/login portal.
 */
export async function demoAdminLoginAction(): Promise<void> {
  const users = getDatabaseUsers();
  const adminUser = users.find(u => u.role === 'ADMIN') || users[0];

  await createSessionCookie({
    id: adminUser.id,
    name: adminUser.name,
    email: adminUser.email,
    role: adminUser.role,
    status: adminUser.status || 'APPROVED',
  });

  revalidatePath('/', 'layout');
  redirect('/admin');
}

/**
 * Backward-compatible demo login handler
 */
export async function demoLoginAction(role: Role): Promise<void> {
  if (role === 'ADMIN') {
    return demoAdminLoginAction();
  }
  return demoStudentLoginAction();
}

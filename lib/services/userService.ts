'use server';

import { requireAdmin } from '../auth/permissions';
import {
  getDatabaseUsers,
  updateDatabaseUserRole,
  updateDatabaseUserStatus,
} from '../auth/session';
import { safeRevalidatePath } from './common';
import {
  userRoleSchema,
  userStatusSchema,
  validateInput,
} from '../validations/adminSchemas';
import { AuthUser, Role, UserStatus } from '@/types';

/**
 * Server-side User Listing for Administrators
 */
export async function getAdminUsers(): Promise<AuthUser[]> {
  await requireAdmin();
  const users = await getDatabaseUsers();
  return users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status || 'APPROVED',
    createdAt: u.createdAt,
    attemptCount: u.attemptCount,
  }));
}

/**
 * Approves a registered candidate account, allowing portal login
 */
export async function approveUserAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  if (!userId?.trim()) {
    return { success: false, error: 'User ID is required.' };
  }

  const updated = await updateDatabaseUserStatus(userId, 'APPROVED');
  if (!updated) {
    return { success: false, error: 'User record not found.' };
  }

  safeRevalidatePath('/admin/users');
  safeRevalidatePath('/admin');
  return { success: true };
}

/**
 * Rejects/suspends a registered candidate account with self-rejection guard
 */
export async function rejectUserAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const currentAdmin = await requireAdmin();

  if (!userId?.trim()) {
    return { success: false, error: 'User ID is required.' };
  }

  if (currentAdmin.id === userId) {
    return {
      success: false,
      error: 'Security Guard: You cannot reject or suspend your own account.',
    };
  }

  const updated = await updateDatabaseUserStatus(userId, 'REJECTED');
  if (!updated) {
    return { success: false, error: 'User record not found.' };
  }

  safeRevalidatePath('/admin/users');
  safeRevalidatePath('/admin');
  return { success: true };
}

/**
 * Updates a user's approval status with Zod validation and self-protection
 */
export async function updateUserStatusAction(
  userId: string,
  newStatus: UserStatus
): Promise<{ success: boolean; error?: string }> {
  const currentAdmin = await requireAdmin();

  if (!userId?.trim()) {
    return { success: false, error: 'User ID is required.' };
  }

  const validatedStatus = validateInput(userStatusSchema, newStatus);
  if (!validatedStatus.success) {
    return { success: false, error: validatedStatus.error };
  }

  if (currentAdmin.id === userId && newStatus !== 'APPROVED') {
    return {
      success: false,
      error: 'Security Guard: You cannot revoke or suspend your own status.',
    };
  }

  const updated = await updateDatabaseUserStatus(userId, validatedStatus.data);
  if (!updated) {
    return { success: false, error: 'User record not found.' };
  }

  safeRevalidatePath('/admin/users');
  safeRevalidatePath('/admin');
  return { success: true };
}

/**
 * Updates a user's role (ADMIN/USER) with Zod validation and self-demotion protection
 */
export async function updateUserRoleAction(
  userId: string,
  newRole: Role
): Promise<{ success: boolean; error?: string }> {
  const currentAdmin = await requireAdmin();

  if (!userId?.trim()) {
    return { success: false, error: 'User ID is required.' };
  }

  const validatedRole = validateInput(userRoleSchema, newRole);
  if (!validatedRole.success) {
    return { success: false, error: validatedRole.error };
  }

  // SELF-DEMOTION PROTECTION: Admin cannot demote themselves!
  if (currentAdmin.id === userId && newRole !== 'ADMIN') {
    return {
      success: false,
      error: 'Security Guard: You cannot revoke your own administrator privileges.',
    };
  }

  const updated = updateDatabaseUserRole(userId, validatedRole.data);
  if (!updated) {
    return { success: false, error: 'User not found in database.' };
  }

  safeRevalidatePath('/admin/users');
  return { success: true };
}

import { cookies } from 'next/headers';
import { AuthUser, Role, UserStatus, SessionPayload } from '@/types';
import { signSession, verifySession } from './crypto';
import { INITIAL_USERS, StoredUser } from '../data/users';

export const SESSION_COOKIE_NAME = 'bankmock_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory / dynamic user store that mirrors the database
// Changes made during admin operations (e.g. approving/rejecting users or promoting roles) update here
const liveUsers: StoredUser[] = [...INITIAL_USERS];

export function getDatabaseUsers(): StoredUser[] {
  return liveUsers;
}

export function findDatabaseUserById(id: string): StoredUser | null {
  return liveUsers.find(u => u.id === id) || null;
}

export function findDatabaseUserByEmail(email: string): StoredUser | null {
  return liveUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function updateDatabaseUserRole(userId: string, newRole: Role): StoredUser | null {
  const index = liveUsers.findIndex(u => u.id === userId);
  if (index === -1) return null;

  liveUsers[index] = {
    ...liveUsers[index],
    role: newRole,
  };
  return liveUsers[index];
}

export function updateDatabaseUserStatus(userId: string, newStatus: UserStatus): StoredUser | null {
  const index = liveUsers.findIndex(u => u.id === userId);
  if (index === -1) return null;

  liveUsers[index] = {
    ...liveUsers[index],
    status: newStatus,
  };
  return liveUsers[index];
}

export function createDatabaseUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
  status?: UserStatus;
}): StoredUser {
  const newUser: StoredUser = {
    id: `user-${Date.now()}`,
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash: data.passwordHash,
    role: data.role || 'USER',
    status: data.status || 'PENDING', // All registered candidates require admin approval
    createdAt: new Date().toISOString(),
    attemptCount: 0,
  };
  liveUsers.push(newUser);
  return newUser;
}

// Session Cookie Management
export async function createSessionCookie(user: AuthUser): Promise<void> {
  const exp = Date.now() + SESSION_DURATION_MS;
  const payload: SessionPayload = {
    userId: user.id,
    role: user.role,
    status: user.status,
    email: user.email,
    name: user.name,
    exp,
  };

  const token = await signSession(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySession(token);
}

/**
 * Server-side function to retrieve the currently authenticated user.
 * CRITICAL SECURITY FEATURE: It checks the database record for the user's true,
 * canonical role and approval status, preventing any client-side cookie forgery or role tampering.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSessionPayload();
  if (!session) return null;

  // Verify against canonical database record
  const dbUser = findDatabaseUserById(session.userId);
  if (!dbUser) return null;

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role, // Canonical role from database
    status: dbUser.status || 'APPROVED', // Canonical approval status
    createdAt: dbUser.createdAt,
    attemptCount: dbUser.attemptCount,
  };
}

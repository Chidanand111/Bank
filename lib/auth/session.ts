import { cookies } from 'next/headers';
import { prisma } from '../prisma';
import { UserStatus as PrismaUserStatus, Role as PrismaRole } from '@prisma/client';
import { AuthUser, Role, UserStatus, SessionPayload } from '@/types';
import { signSession, verifySession } from './crypto';
import { INITIAL_USERS, StoredUser } from '../data/users';

export const SESSION_COOKIE_NAME = 'bankmock_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// In-memory fallback cache for development or transient DB disconnects
const fallbackUsers: StoredUser[] = [...INITIAL_USERS];

function toStoredUser(u: {
  id: string;
  name: string;
  email: string;
  password?: string | null;
  role: string;
  status?: string | null;
  createdAt?: Date | string;
  attempts?: Array<{ id: string }>;
}): StoredUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    passwordHash: u.password || '',
    role: u.role as Role,
    status: (u.status || 'APPROVED') as UserStatus,
    createdAt: typeof u.createdAt === 'string' ? u.createdAt : u.createdAt?.toISOString() || new Date().toISOString(),
    attemptCount: Array.isArray(u.attempts) ? u.attempts.length : 0,
  };
}

export async function getDatabaseUsers(): Promise<StoredUser[]> {
  try {
    const dbUsers = await prisma.user.findMany({
      include: { attempts: true },
      orderBy: { createdAt: 'desc' },
    });
    if (dbUsers.length > 0) {
      return dbUsers.map(toStoredUser);
    }
  } catch (err) {
    console.warn('Postgres getDatabaseUsers fallback to memory cache:', err);
  }
  return fallbackUsers;
}

export async function findDatabaseUserById(id: string): Promise<StoredUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { attempts: true },
    });
    if (user) return toStoredUser(user);
  } catch (err) {
    console.warn('Postgres findDatabaseUserById fallback:', err);
  }
  return fallbackUsers.find(u => u.id === id) || null;
}

export async function findDatabaseUserByEmail(email: string): Promise<StoredUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { attempts: true },
    });
    if (user) return toStoredUser(user);
  } catch (err) {
    console.warn('Postgres findDatabaseUserByEmail fallback:', err);
  }
  return fallbackUsers.find(u => u.email.toLowerCase() === normalizedEmail) || null;
}

export async function updateDatabaseUserRole(userId: string, newRole: Role): Promise<StoredUser | null> {
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as PrismaRole },
      include: { attempts: true },
    });
    return toStoredUser(updated);
  } catch (err) {
    console.warn('Postgres updateDatabaseUserRole fallback:', err);
    const index = fallbackUsers.findIndex(u => u.id === userId);
    if (index !== -1) {
      fallbackUsers[index] = { ...fallbackUsers[index], role: newRole };
      return fallbackUsers[index];
    }
    return null;
  }
}

export async function updateDatabaseUserStatus(userId: string, newStatus: UserStatus): Promise<StoredUser | null> {
  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus as PrismaUserStatus },
      include: { attempts: true },
    });
    return toStoredUser(updated);
  } catch (err) {
    console.warn('Postgres updateDatabaseUserStatus fallback:', err);
    const index = fallbackUsers.findIndex(u => u.id === userId);
    if (index !== -1) {
      fallbackUsers[index] = { ...fallbackUsers[index], status: newStatus };
      return fallbackUsers[index];
    }
    return null;
  }
}

export async function createDatabaseUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
  status?: UserStatus;
}): Promise<StoredUser> {
  const normalizedEmail = data.email.toLowerCase().trim();
  try {
    const created = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        password: data.passwordHash,
        role: (data.role || 'USER') as PrismaRole,
        status: (data.status || 'PENDING') as PrismaUserStatus,
      },
      include: { attempts: true },
    });
    return toStoredUser(created);
  } catch (err) {
    console.warn('Postgres createDatabaseUser fallback to memory cache:', err);
    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      name: data.name,
      email: normalizedEmail,
      passwordHash: data.passwordHash,
      role: data.role || 'USER',
      status: data.status || 'PENDING',
      createdAt: new Date().toISOString(),
      attemptCount: 0,
    };
    fallbackUsers.push(newUser);
    return newUser;
  }
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
  const dbUser = await findDatabaseUserById(session.userId);
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

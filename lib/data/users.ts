import { AuthUser, Role } from '@/types';

export interface StoredUser extends AuthUser {
  passwordHash: string; // Dev plaintext/hashed password
}

export const INITIAL_USERS: StoredUser[] = [
  {
    id: 'user-admin-1',
    name: 'Platform Admin',
    email: process.env.DEV_ADMIN_EMAIL || 'admin@bankmock.com',
    role: 'ADMIN',
    passwordHash: process.env.DEV_ADMIN_PASSWORD || 'admin123',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    attemptCount: 12,
  },
  {
    id: 'user-student-1',
    name: 'Rahul Sharma (Student)',
    email: process.env.DEV_USER_EMAIL || 'student@bankmock.com',
    role: 'USER',
    passwordHash: process.env.DEV_USER_PASSWORD || 'user123',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    attemptCount: 6,
  },
  {
    id: 'user-student-2',
    name: 'Priya Verma',
    email: 'priya.verma@example.com',
    role: 'USER',
    passwordHash: 'user123',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    attemptCount: 4,
  },
  {
    id: 'user-student-3',
    name: 'Amit Patel',
    email: 'amit.patel@example.com',
    role: 'USER',
    passwordHash: 'user123',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    attemptCount: 2,
  },
];

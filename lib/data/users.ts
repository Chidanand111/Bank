import { AuthUser } from '@/types';

export interface StoredUser extends AuthUser {
  passwordHash: string; // Dev plaintext/hashed password
}

export const INITIAL_USERS: StoredUser[] = [
  {
    id: 'user-admin-1',
    name: 'Platform Admin',
    email: process.env.DEV_ADMIN_EMAIL || 'admin@bankmock.com',
    role: 'ADMIN',
    status: 'APPROVED',
    passwordHash: process.env.DEV_ADMIN_PASSWORD || 'admin123',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    attemptCount: 12,
  },
  {
    id: 'user-student-1',
    name: 'Rahul Sharma (Student)',
    email: process.env.DEV_USER_EMAIL || 'student@bankmock.com',
    role: 'USER',
    status: 'APPROVED',
    passwordHash: process.env.DEV_USER_PASSWORD || 'user123',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    attemptCount: 6,
  },
  {
    id: 'user-student-2',
    name: 'Priya Verma',
    email: 'priya.verma@example.com',
    role: 'USER',
    status: 'APPROVED',
    passwordHash: 'user123',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    attemptCount: 4,
  },
  {
    id: 'user-student-3',
    name: 'Amit Patel',
    email: 'amit.patel@example.com',
    role: 'USER',
    status: 'APPROVED',
    passwordHash: 'user123',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    attemptCount: 2,
  },
  {
    id: 'user-pending-1',
    name: 'Kavita Reddy (Candidate)',
    email: 'kavita.reddy@example.com',
    role: 'USER',
    status: 'PENDING',
    passwordHash: 'user123',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
    attemptCount: 0,
  },
  {
    id: 'user-pending-2',
    name: 'Suresh Nair (Candidate)',
    email: 'suresh.nair@example.com',
    role: 'USER',
    status: 'PENDING',
    passwordHash: 'user123',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(), // 1 day ago
    attemptCount: 0,
  },
];

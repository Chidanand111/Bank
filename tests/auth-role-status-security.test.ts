import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';
import { signSession } from '@/lib/auth/crypto';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { requireUser, requireAdmin, assertAdmin, getAuthenticatedAdmin, getAuthenticatedUser } from '@/lib/auth/permissions';
import {
  demoStudentLoginAction,
  demoAdminLoginAction,
  loginAction,
  adminLoginAction,
} from '@/lib/auth/actions';
import {
  saveAttemptAction,
  getAttemptByIdAction,
  getUserAttemptsAction,
  getUserDashboardStatsAction,
} from '@/lib/services/attemptService';
import {
  getAdminUsers,
  approveUserAction,
  rejectUserAction,
  updateUserStatusAction,
  updateUserRoleAction,
} from '@/lib/services/userService';
import { getLiveExamQuestionsAction } from '@/lib/services/questionService';
import { toStudentSafeQuestions } from '@/lib/utils/questionDto';
import { POST as adminQuestionUpdateRoute } from '@/app/api/admin/questions/update/route';
import { POST as adminBulkImportRoute } from '@/app/api/admin/questions/bulk-import/route';
import { POST as adminMediaUploadRoute } from '@/app/api/admin/media/upload/route';
import * as sessionModule from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { Question } from '@/types';

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    mockTest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    exam: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    option: {
      findUnique: vi.fn(),
    },
    attempt: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    answer: {
      upsert: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  };
  mock.$transaction = vi.fn().mockImplementation(async (cbOrArray: any) => {
    if (typeof cbOrArray === 'function') {
      return cbOrArray(mock);
    }
    return Promise.all(cbOrArray);
  });
  return { mockPrisma: mock };
});

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT: ${url}`);
    (error as any).digest = `NEXT_REDIRECT;replace;${url};307;;`;
    throw error;
  }),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

const dummyQuestionWithAnswers: Question = {
  id: 'q-sec-101',
  text: 'What is the capital of India?',
  options: [
    { id: 'opt-1', text: 'Mumbai', isCorrect: false, order: 0 },
    { id: 'opt-2', text: 'New Delhi', isCorrect: true, order: 1 },
    { id: 'opt-3', text: 'Kolkata', isCorrect: false, order: 2 },
  ],
  explanation: 'New Delhi is the official capital of India.',
  marks: 1.0,
  negativeMarks: 0.25,
  difficulty: 'EASY',
  examId: 'exam-ibps',
  sectionId: 'sec-ga',
  sectionCode: 'GA',
  sectionName: 'General Awareness',
  topicId: 'topic-capital',
  topicName: 'Capitals',
};

describe('Security Audit: Authentication, Roles, Status & Server Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_OVERRIDE;
    delete process.env.ALLOW_DEMO_LOGINS;
  });

  // =========================================================================
  // 1. UNAUTHENTICATED ACCESS GUARDS
  // =========================================================================
  describe('1. Unauthenticated Access Guards', () => {
    it('proxy redirects unauthenticated user from /admin to /admin/login', async () => {
      const req = new NextRequest('http://localhost:3000/admin/questions');
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/admin/login?callbackUrl=%2Fadmin%2Fquestions');
    });

    it('proxy redirects unauthenticated user from candidate routes to /login', async () => {
      const protectedPaths = ['/dashboard', '/test/mock-1', '/my-results', '/result/att-1', '/review/att-1', '/profile'];
      for (const path of protectedPaths) {
        const req = new NextRequest(`http://localhost:3000${path}`);
        const res = await proxy(req);
        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain(`/login?callbackUrl=${encodeURIComponent(path)}`);
      }
    });

    it('proxy blocks unauthenticated access to /api/admin/* with JSON 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/questions/update', { method: 'POST' });
      const res = await proxy(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Unauthorized');
    });

    it('api admin route handlers return 401 when called without session', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/admin/questions/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId: 'q-1', inputData: {} }),
      });
      const res = await adminQuestionUpdateRoute(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Unauthorized');
    });

    it('requireUser redirects to /login when unauthenticated', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(null);
      await expect(requireUser('/dashboard')).rejects.toThrow(/NEXT_REDIRECT.*login/);
    });

    it('requireAdmin redirects to /admin/login when unauthenticated', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(null);
      await expect(requireAdmin('/admin')).rejects.toThrow(/NEXT_REDIRECT.*admin\/login/);
    });

    it('getAuthenticatedAdmin returns status 401 when unauthenticated', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(null);
      const auth = await getAuthenticatedAdmin();
      expect(auth.user).toBeUndefined();
      expect(auth.status).toBe(401);
      expect(auth.error).toContain('Unauthorized');
    });

    it('saveAttemptAction rejects unauthenticated attempts with status 401 message', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(null);
      const res = await saveAttemptAction({ mockTestId: 'mock-1' } as any);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');
    });

    it('getAttemptByIdAction throws Unauthorized when unauthenticated', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(null);
      await expect(getAttemptByIdAction('att-1')).rejects.toThrow(/Unauthorized/i);
    });
  });

  // =========================================================================
  // 2. ROLE AUTHORIZATION & PRIVILEGE ESCALATION PREVENTION
  // =========================================================================
  describe('2. Role Authorization & Privilege Escalation Prevention', () => {
    it('proxy redirects regular students trying to access /admin to /unauthorized', async () => {
      const studentToken = await signSession({
        userId: 'student-1',
        name: 'Student One',
        email: 'student@bank.com',
        role: 'USER',
        status: 'APPROVED',
        exp: Date.now() + 3600000,
      });
      const req = new NextRequest('http://localhost:3000/admin/questions', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${studentToken}` },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/unauthorized');
    });

    it('proxy returns JSON 403 Forbidden when student calls /api/admin/*', async () => {
      const studentToken = await signSession({
        userId: 'student-1',
        name: 'Student One',
        email: 'student@bank.com',
        role: 'USER',
        status: 'APPROVED',
        exp: Date.now() + 3600000,
      });
      const req = new NextRequest('http://localhost:3000/api/admin/questions/update', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${studentToken}` },
      });
      const res = await proxy(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toContain('Forbidden');
    });

    it('requireAdmin redirects non-admin user to /unauthorized', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'student-1',
        role: 'USER',
        status: 'APPROVED',
        name: 'Student',
        email: 'student@bank.com',
      });
      await expect(requireAdmin('/admin')).rejects.toThrow(/NEXT_REDIRECT.*unauthorized/);
    });

    it('assertAdmin throws Forbidden error when passed a non-admin user', () => {
      const student = {
        id: 'student-1',
        role: 'USER' as const,
        status: 'APPROVED' as const,
        name: 'Student',
        email: 'student@bank.com',
      };
      expect(() => assertAdmin(student)).toThrow(/Forbidden: Admin authorization required/);
    });

    it('prevents regular student from invoking user role management', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'student-1',
        role: 'USER',
        status: 'APPROVED',
        name: 'Student',
        email: 'student@bank.com',
      });
      await expect(updateUserRoleAction('student-1', 'ADMIN')).rejects.toThrow(/NEXT_REDIRECT.*unauthorized/);
    });

    it('prevents regular student from approving other accounts', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'student-1',
        role: 'USER',
        status: 'APPROVED',
        name: 'Student',
        email: 'student@bank.com',
      });
      await expect(approveUserAction('student-2')).rejects.toThrow(/NEXT_REDIRECT.*unauthorized/);
    });

    it('prevents admin from revoking or demoting their own administrator privileges', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        status: 'APPROVED',
        name: 'Platform Admin',
        email: 'admin@bank.com',
      });
      const res = await updateUserRoleAction('admin-1', 'USER');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Security Guard: You cannot revoke your own administrator privileges');
    });

    it('prevents admin from rejecting or suspending their own account', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        status: 'APPROVED',
        name: 'Platform Admin',
        email: 'admin@bank.com',
      });
      const res = await rejectUserAction('admin-1');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Security Guard: You cannot reject or suspend your own account');
    });
  });

  // =========================================================================
  // 3. ACCOUNT STATUS ENFORCEMENT (PENDING, APPROVED, REJECTED)
  // =========================================================================
  describe('3. Account Status Enforcement', () => {
    it('proxy redirects PENDING candidate accounts to /login?error=pending', async () => {
      const pendingToken = await signSession({
        userId: 'pending-1',
        name: 'Pending User',
        email: 'pending@bank.com',
        role: 'USER',
        status: 'PENDING',
        exp: Date.now() + 3600000,
      });
      const req = new NextRequest('http://localhost:3000/dashboard', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${pendingToken}` },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login?error=pending');
    });

    it('proxy redirects REJECTED candidate accounts to /login?error=rejected', async () => {
      const rejectedToken = await signSession({
        userId: 'rejected-1',
        name: 'Rejected User',
        email: 'rejected@bank.com',
        role: 'USER',
        status: 'REJECTED',
        exp: Date.now() + 3600000,
      });
      const req = new NextRequest('http://localhost:3000/test/mock-1', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${rejectedToken}` },
      });
      const res = await proxy(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login?error=rejected');
    });

    it('requireUser blocks PENDING account with error=pending redirect', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'user-pending',
        role: 'USER',
        status: 'PENDING',
        name: 'Pending User',
        email: 'pending@bank.com',
      });
      await expect(requireUser('/dashboard')).rejects.toThrow(/NEXT_REDIRECT.*error=pending/);
    });

    it('requireUser blocks REJECTED account with error=rejected redirect', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'user-rejected',
        role: 'USER',
        status: 'REJECTED',
        name: 'Rejected User',
        email: 'rejected@bank.com',
      });
      await expect(requireUser('/dashboard')).rejects.toThrow(/NEXT_REDIRECT.*error=rejected/);
    });

    it('blocks PENDING account from submitting exam attempts', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'user-pending',
        role: 'USER',
        status: 'PENDING',
        name: 'Pending User',
        email: 'pending@bank.com',
      });
      const res = await saveAttemptAction({ mockTestId: 'mock-1' } as any);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Forbidden: Account approval required');
    });

    it('blocks REJECTED account from submitting exam attempts', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'user-rejected',
        role: 'USER',
        status: 'REJECTED',
        name: 'Rejected User',
        email: 'rejected@bank.com',
      });
      const res = await saveAttemptAction({ mockTestId: 'mock-1' } as any);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Forbidden: Account approval required');
    });

    it('blocks PENDING account from accessing live exam questions', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'user-pending',
        role: 'USER',
        status: 'PENDING',
        name: 'Pending User',
        email: 'pending@bank.com',
      });
      await expect(getLiveExamQuestionsAction('mock-1')).rejects.toThrow(/Forbidden: Account approval required/);
    });

    it('blocks REJECTED account from viewing attempt results', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'user-rejected',
        role: 'USER',
        status: 'REJECTED',
        name: 'Rejected User',
        email: 'rejected@bank.com',
      });
      await expect(getAttemptByIdAction('att-1')).rejects.toThrow(/Forbidden: Account approval required/);
    });

    it('blocks PENDING account from fetching dashboard analytics', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'user-pending',
        role: 'USER',
        status: 'PENDING',
        name: 'Pending User',
        email: 'pending@bank.com',
      });
      await expect(getUserDashboardStatsAction()).rejects.toThrow(/Forbidden: Account approval required/);
    });

    it('assertAdmin rejects an administrator if status is REJECTED', () => {
      const suspendedAdmin = {
        id: 'admin-bad',
        role: 'ADMIN' as const,
        status: 'REJECTED' as const,
        name: 'Suspended Admin',
        email: 'admin@bad.com',
      };
      expect(() => assertAdmin(suspendedAdmin)).toThrow(/Forbidden: Account approval required/);
    });
  });

  // =========================================================================
  // 4. IDOR & CROSS-USER ACCESS CONTROL
  // =========================================================================
  describe('4. IDOR & Cross-User Access Control', () => {
    it('student A is denied access when attempting to view student B attempt', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'student-A',
        role: 'USER',
        status: 'APPROVED',
        name: 'Student A',
        email: 'a@bank.com',
      });

      (mockPrisma.attempt.findUnique as any).mockResolvedValue({
        id: 'att-b-1',
        userId: 'student-B', // Belongs to student B
        score: 85,
        maxScore: 100,
        accuracy: 90,
        totalAttempted: 100,
        unansweredCount: 0,
        correctCount: 90,
        incorrectCount: 10,
        timeTakenSeconds: 3000,
        startedAt: new Date(),
        completedAt: new Date(),
        mockTest: { cutoffMarks: 60, timerType: 'STANDARD' },
        answers: [],
      });

      await expect(getAttemptByIdAction('att-b-1')).rejects.toThrow(/Access denied: You do not have permission/);
    });

    it('administrator CAN view student B attempt', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        status: 'APPROVED',
        name: 'Admin',
        email: 'admin@bank.com',
      });

      (mockPrisma.attempt.findUnique as any).mockResolvedValue({
        id: 'att-b-1',
        userId: 'student-B',
        score: 85,
        maxScore: 100,
        accuracy: 90,
        totalAttempted: 100,
        unansweredCount: 0,
        correctCount: 90,
        incorrectCount: 10,
        timeTakenSeconds: 3000,
        startedAt: new Date(),
        completedAt: new Date(),
        mockTest: { cutoffMarks: 60, timerType: 'STANDARD' },
        answers: [],
      });

      const attempt = await getAttemptByIdAction('att-b-1');
      expect(attempt).not.toBeNull();
      expect(attempt?.userId).toBe('student-B');
    });

    it('getUserAttemptsAction forces non-admin to own userId even if another userId is passed', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'student-A',
        role: 'USER',
        status: 'APPROVED',
        name: 'Student A',
        email: 'a@bank.com',
      });

      (mockPrisma.attempt.findMany as any).mockResolvedValue([]);

      await getUserAttemptsAction('target-student-B');

      // Verify Prisma query was strictly scoped to student-A, NOT target-student-B
      expect(mockPrisma.attempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'student-A',
          }),
        })
      );
    });
  });

  // =========================================================================
  // 5. DEMO LOGIN PRODUCTION SAFEGUARDS
  // =========================================================================
  describe('5. Demo Login Production Safeguards', () => {
    it('demoStudentLoginAction is strictly blocked in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';
        delete process.env.ALLOW_DEMO_LOGINS;
        await expect(demoStudentLoginAction()).rejects.toThrow(/Forbidden: Demo sign-in is disabled in production/);
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });

    it('demoAdminLoginAction is strictly blocked in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';
        delete process.env.ALLOW_DEMO_LOGINS;
        await expect(demoAdminLoginAction()).rejects.toThrow(/Forbidden: Demo sign-in is disabled in production/);
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
      }
    });

    it('demo logins are permitted in production ONLY if ALLOW_DEMO_LOGINS=true is explicitly set', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        (process.env as any).NODE_ENV = 'production';
        process.env.ALLOW_DEMO_LOGINS = 'true';

        vi.spyOn(sessionModule, 'getDatabaseUsers').mockResolvedValue([
          {
            id: 'admin-1',
            name: 'Platform Admin',
            email: 'admin@bankmock.com',
            passwordHash: '$2b$10$hashedAdminPasswordMock',
            role: 'ADMIN',
            status: 'APPROVED',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'student-1',
            name: 'Demo Student',
            email: 'student@bankmock.com',
            passwordHash: '$2b$10$hashedStudentPasswordMock',
            role: 'USER',
            status: 'APPROVED',
            createdAt: new Date().toISOString(),
          },
        ]);

        vi.spyOn(sessionModule, 'createSessionCookie').mockResolvedValue(undefined as any);

        // Should not throw forbidden error, reaches redirect cleanly
        await expect(demoStudentLoginAction()).rejects.toThrow(/NEXT_REDIRECT/);
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        delete process.env.ALLOW_DEMO_LOGINS;
      }
    });
  });

  // =========================================================================
  // 6. QUESTION SANITIZATION & ANSWER KEY LEAKAGE PREVENTION
  // =========================================================================
  describe('6. Question Sanitization & Answer Key Protection', () => {
    it('unauthenticated caller to getLiveExamQuestionsAction NEVER receives isCorrect or explanation', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(null);

      (mockPrisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-open',
        slug: 'open-mock',
        status: 'published',
        isPublished: true,
        mockTestQuestions: [
          {
            order: 1,
            question: dummyQuestionWithAnswers,
          },
        ],
      });

      const questions = await getLiveExamQuestionsAction('mock-open');
      expect(questions.length).toBe(1);
      // Explanation must be stripped
      expect((questions[0] as any).explanation).toBeUndefined();
      // isCorrect on options must be stripped
      for (const opt of questions[0].options) {
        expect((opt as any).isCorrect).toBeUndefined();
      }
    });

    it('student caller to getLiveExamQuestionsAction NEVER receives isCorrect or explanation', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'student-1',
        role: 'USER',
        status: 'APPROVED',
        name: 'Student',
        email: 'student@bank.com',
      });

      (mockPrisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-open',
        slug: 'open-mock',
        status: 'published',
        isPublished: true,
        mockTestQuestions: [
          {
            order: 1,
            question: dummyQuestionWithAnswers,
          },
        ],
      });

      const questions = await getLiveExamQuestionsAction('mock-open');
      expect(questions.length).toBe(1);
      expect((questions[0] as any).explanation).toBeUndefined();
      for (const opt of questions[0].options) {
        expect((opt as any).isCorrect).toBeUndefined();
      }
    });

    it('admin caller to getLiveExamQuestionsAction receives full questions with true answers', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'admin-1',
        role: 'ADMIN',
        status: 'APPROVED',
        name: 'Admin',
        email: 'admin@bank.com',
      });

      (mockPrisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-open',
        slug: 'open-mock',
        status: 'published',
        isPublished: true,
        mockTestQuestions: [
          {
            order: 1,
            question: dummyQuestionWithAnswers,
          },
        ],
      });

      const questions = await getLiveExamQuestionsAction('mock-open');
      expect(questions.length).toBe(1);
      expect(questions[0].explanation).toBe('New Delhi is the official capital of India.');
      expect(questions[0].options[1].isCorrect).toBe(true);
    });

    it('toStudentSafeQuestions accurately strips sensitive attributes across multiple questions', () => {
      const inputQuestions: Question[] = [
        dummyQuestionWithAnswers,
        {
          ...dummyQuestionWithAnswers,
          id: 'q-sec-102',
          explanation: 'Another secret solution note',
        },
      ];

      const safe = toStudentSafeQuestions(inputQuestions);
      expect(safe.length).toBe(2);
      expect((safe[0] as any).explanation).toBeUndefined();
      expect((safe[1] as any).explanation).toBeUndefined();
      for (const q of safe) {
        for (const opt of q.options) {
          expect((opt as any).isCorrect).toBeUndefined();
        }
      }
    });
  });
});

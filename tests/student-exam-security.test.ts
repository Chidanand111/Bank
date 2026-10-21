import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as examQuestionsRoute } from '@/app/api/exam-questions/[testId]/route';
import { POST as attemptsPostRoute, GET as attemptsGetRoute } from '@/app/api/attempts/route';
import { proxy } from '@/proxy';
import { signSession } from '@/lib/auth/crypto';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { toStudentSafeQuestion, toStudentSafeQuestions } from '@/lib/utils/questionDto';
import { getLiveExamQuestionsAction, getCanonicalExamQuestions } from '@/lib/services/questionService';
import {
  saveAttemptAction,
  getAttemptByIdAction,
  getUserAttemptsAction,
} from '@/lib/services/attemptService';
import { prisma } from '@/lib/prisma';
import * as sessionModule from '@/lib/auth/session';
import { AttemptResult, Question } from '@/types';

// Mock Prisma
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    mockTest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    exam: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    question: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    option: {
      findUnique: vi.fn(),
    },
    attempt: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    answer: {
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
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

describe('Student Exam Security & Zero Answer-Key Leakage Audit', () => {
  const dummyQuestionWithAnswers: Question = {
    id: 'q-sec-101',
    text: 'What is the capital of India?',
    difficulty: 'EASY',
    explanation: 'New Delhi is the national capital of India.',
    marks: 1.0,
    negativeMarks: 0.25,
    examId: 'exam-ibps-po',
    sectionId: 'sec-ga',
    sectionCode: 'GA',
    sectionName: 'General Awareness',
    topicId: 'top-gk',
    topicName: 'Current Affairs',
    options: [
      { id: 'opt-1', text: 'Mumbai', isCorrect: false, order: 0 },
      { id: 'opt-2', text: 'New Delhi', isCorrect: true, order: 1 },
      { id: 'opt-3', text: 'Kolkata', isCorrect: false, order: 2 },
      { id: 'opt-4', text: 'Chennai', isCorrect: false, order: 3 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Student-Safe DTO Transformation', () => {
    it('toStudentSafeQuestion strictly omits isCorrect on all options and removes explanation', () => {
      const safe = toStudentSafeQuestion(dummyQuestionWithAnswers);

      expect(safe.id).toBe('q-sec-101');
      expect(safe.text).toBe('What is the capital of India?');
      expect((safe as any).explanation).toBeUndefined();

      expect(safe.options.length).toBe(4);
      for (const opt of safe.options) {
        expect((opt as any).isCorrect).toBeUndefined();
        expect(opt).toHaveProperty('id');
        expect(opt).toHaveProperty('text');
        expect(opt).toHaveProperty('order');
      }
    });

    it('toStudentSafeQuestions maps an array of questions without leaking answers', () => {
      const batch = toStudentSafeQuestions([dummyQuestionWithAnswers]);
      expect(batch.length).toBe(1);
      expect((batch[0] as any).explanation).toBeUndefined();
      expect((batch[0].options[1] as any).isCorrect).toBeUndefined();
    });
  });

  describe('2. Route Handler Security (/api/exam-questions/[testId])', () => {
    it('returns 401 when request has no session cookie', async () => {
      const request = new NextRequest('http://localhost:3000/api/exam-questions/mock-ibps-po-1');
      const response = await examQuestionsRoute(request, {
        params: Promise.resolve({ testId: 'mock-ibps-po-1' }),
      });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Authentication required/i);
    });

    it('returns 401 when session cookie has invalid cryptographic signature', async () => {
      const request = new NextRequest('http://localhost:3000/api/exam-questions/mock-ibps-po-1', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=forged.invalid-token`,
        },
      });
      const response = await examQuestionsRoute(request, {
        params: Promise.resolve({ testId: 'mock-ibps-po-1' }),
      });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Invalid or expired session/i);
    });

    it('returns 403 when authenticated user has PENDING status', async () => {
      const pendingToken = await signSession({
        userId: 'user-pending-1',
        role: 'USER',
        status: 'PENDING',
        email: 'pending@bankmock.com',
        name: 'Pending Student',
        exp: Date.now() + 3600000,
      });

      vi.spyOn(sessionModule, 'findDatabaseUserById').mockResolvedValue({
        id: 'user-pending-1',
        name: 'Pending Student',
        email: 'pending@bankmock.com',
        role: 'USER',
        status: 'PENDING',
        passwordHash: 'hash',
      });

      const request = new NextRequest('http://localhost:3000/api/exam-questions/mock-ibps-po-1', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${pendingToken}`,
        },
      });

      const response = await examQuestionsRoute(request, {
        params: Promise.resolve({ testId: 'mock-ibps-po-1' }),
      });

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/approval required/i);
    });

    it('returns 403 when a student requests an UNPUBLISHED mock test', async () => {
      const studentToken = await signSession({
        userId: 'user-student-1',
        role: 'USER',
        status: 'APPROVED',
        email: 'student@bankmock.com',
        name: 'Approved Student',
        exp: Date.now() + 3600000,
      });

      vi.spyOn(sessionModule, 'findDatabaseUserById').mockResolvedValue({
        id: 'user-student-1',
        name: 'Approved Student',
        email: 'student@bankmock.com',
        role: 'USER',
        status: 'APPROVED',
        passwordHash: 'hash',
      });

      (prisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-draft-1',
        slug: 'draft-1',
        status: 'created',
        isPublished: false,
        exam: { status: 'published' },
      });

      const request = new NextRequest('http://localhost:3000/api/exam-questions/mock-draft-1', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${studentToken}`,
        },
      });

      const response = await examQuestionsRoute(request, {
        params: Promise.resolve({ testId: 'mock-draft-1' }),
      });

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/unpublished/i);
    });

    it('allows an ADMIN to access an unpublished mock test for preview', async () => {
      const adminToken = await signSession({
        userId: 'admin-1',
        role: 'ADMIN',
        status: 'APPROVED',
        email: 'admin@bankmock.com',
        name: 'Admin User',
        exp: Date.now() + 3600000,
      });

      vi.spyOn(sessionModule, 'findDatabaseUserById').mockResolvedValue({
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@bankmock.com',
        role: 'ADMIN',
        status: 'APPROVED',
        passwordHash: 'hash',
      });

      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@bankmock.com',
        role: 'ADMIN',
        status: 'APPROVED',
      });

      (prisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-draft-1',
        slug: 'draft-1',
        status: 'created',
        isPublished: false,
        mockTestQuestions: [
          {
            order: 1,
            question: dummyQuestionWithAnswers,
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/exam-questions/mock-draft-1', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
        },
      });

      const response = await examQuestionsRoute(request, {
        params: Promise.resolve({ testId: 'mock-draft-1' }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.questions.length).toBe(1);
      // Admin preview preserves full questions
      expect(json.questions[0].explanation).toBe('New Delhi is the national capital of India.');
    });

    it('strips all isCorrect and explanations for approved student on published test', async () => {
      const studentToken = await signSession({
        userId: 'user-student-1',
        role: 'USER',
        status: 'APPROVED',
        email: 'student@bankmock.com',
        name: 'Approved Student',
        exp: Date.now() + 3600000,
      });

      vi.spyOn(sessionModule, 'findDatabaseUserById').mockResolvedValue({
        id: 'user-student-1',
        name: 'Approved Student',
        email: 'student@bankmock.com',
        role: 'USER',
        status: 'APPROVED',
        passwordHash: 'hash',
      });

      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'user-student-1',
        name: 'Approved Student',
        email: 'student@bankmock.com',
        role: 'USER',
        status: 'APPROVED',
      });

      (prisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-published-1',
        slug: 'published-1',
        status: 'published',
        isPublished: true,
        exam: { status: 'published' },
        mockTestQuestions: [
          {
            order: 1,
            question: dummyQuestionWithAnswers,
          },
        ],
      });

      const request = new NextRequest('http://localhost:3000/api/exam-questions/mock-published-1', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${studentToken}`,
        },
      });

      const response = await examQuestionsRoute(request, {
        params: Promise.resolve({ testId: 'mock-published-1' }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.questions.length).toBe(1);

      const studentQ = json.questions[0];
      expect(studentQ.explanation).toBeUndefined();
      for (const opt of studentQ.options) {
        expect(opt.isCorrect).toBeUndefined();
      }
    });
  });

  describe('3. Proxy Middleware Guard (proxy.ts)', () => {
    it('intercepts /api/exam-questions and returns 401 JSON when unauthenticated', async () => {
      const request = new NextRequest('http://localhost:3000/api/exam-questions/mock-ibps-po-1');
      const response = await proxy(request);

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/Authentication required/i);
    });

    it('returns 403 JSON when session user is PENDING', async () => {
      const pendingToken = await signSession({
        userId: 'pending-user',
        role: 'USER',
        status: 'PENDING',
        email: 'pending@bank.com',
        name: 'Pending',
        exp: Date.now() + 3600000,
      });

      const request = new NextRequest('http://localhost:3000/api/exam-questions/mock-ibps-po-1', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${pendingToken}`,
        },
      });

      const response = await proxy(request);
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/approval required/i);
    });
  });

  describe('4. Server Action getLiveExamQuestionsAction Protection', () => {
    it('blocks student access to unpublished exam with descriptive error', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'student-id',
        role: 'USER',
        status: 'APPROVED',
        email: 'student@bank.com',
        name: 'Student',
      });

      (prisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-unpub',
        slug: 'unpub',
        status: 'created',
        isPublished: false,
      });

      await expect(getLiveExamQuestionsAction('mock-unpub')).rejects.toThrow(/unpublished/i);
    });

    it('sanitizes questions when retrieved by a student user', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'student-id',
        role: 'USER',
        status: 'APPROVED',
        email: 'student@bank.com',
        name: 'Student',
      });

      (prisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-pub',
        slug: 'pub',
        status: 'published',
        isPublished: true,
        mockTestQuestions: [
          {
            order: 1,
            question: dummyQuestionWithAnswers,
          },
        ],
      });

      const qs = await getLiveExamQuestionsAction('mock-pub');
      expect(qs.length).toBe(1);
      expect((qs[0] as any).explanation).toBeUndefined();
      expect((qs[0].options[1] as any).isCorrect).toBeUndefined();
    });

    it('getCanonicalExamQuestions always preserves true answers for server grading', async () => {
      (prisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-pub',
        slug: 'pub',
        status: 'published',
        isPublished: true,
        mockTestQuestions: [
          {
            order: 1,
            question: dummyQuestionWithAnswers,
          },
        ],
      });

      const canonical = await getCanonicalExamQuestions('mock-pub');
      expect(canonical.length).toBe(1);
      expect(canonical[0].explanation).toBe('New Delhi is the national capital of India.');
      expect(canonical[0].options[1].isCorrect).toBe(true);
    });
  });

  describe('5. Attempt Submission Security & Server-Side Re-Scoring (saveAttemptAction)', () => {
    it('rejects attempt submission if user is unauthenticated', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(null);

      const res = await saveAttemptAction({
        id: 'att-fake-1',
        mockTestId: 'mock-ibps-po-1',
        mockTestTitle: 'Mock 1',
        examSlug: 'ibps-po',
        examTitle: 'IBPS PO',
        userId: 'spoofed-user-id',
        userName: 'Hacker',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        timeTakenSeconds: 120,
        totalDurationSeconds: 3600,
        score: 100,
        maxScore: 100,
        percentage: 100,
        accuracy: 100,
        totalQuestions: 1,
        totalAttempted: 1,
        correctCount: 1,
        incorrectCount: 0,
        unansweredCount: 0,
        cutoffMarks: 60,
        isCutoffCleared: true,
        sectionResults: [],
        topicResults: [],
        questionDetails: [],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/logged in/i);
    });

    it('binds attempt to currentUser.id and ignores client-supplied userId & scores', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'real-student-id',
        role: 'USER',
        status: 'APPROVED',
        email: 'real@bank.com',
        name: 'Real Candidate',
      });

      (prisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-ibps-po-1',
        status: 'published',
        isPublished: true,
        durationMinutes: 60,
        cutoffMarks: 60,
        negativeMarkRatio: 0.25,
        mockTestQuestions: [
          {
            order: 1,
            question: dummyQuestionWithAnswers, // opt-2 is correct, opt-1 is wrong
          },
        ],
      });

      let savedAttemptData: any = null;
      (prisma.attempt.upsert as any).mockImplementation(({ create }: any) => {
        savedAttemptData = create;
        return Promise.resolve({ id: create.id });
      });

      // Client submits a tampered payload claiming 100 score, but actually selected opt-1 (incorrect!)
      const clientTamperedPayload: AttemptResult = {
        id: 'att-tampered-1',
        mockTestId: 'mock-ibps-po-1',
        mockTestTitle: 'IBPS PO Mock',
        examSlug: 'ibps-po',
        examTitle: 'IBPS PO',
        userId: 'victim-user-id', // Attacker trying to spoof victim
        userName: 'Victim',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        timeTakenSeconds: 50,
        totalDurationSeconds: 3600,
        score: 100, // Tampered claim
        maxScore: 100,
        percentage: 100, // Tampered claim
        accuracy: 100, // Tampered claim
        totalQuestions: 1,
        totalAttempted: 1,
        correctCount: 1,
        incorrectCount: 0,
        unansweredCount: 0,
        cutoffMarks: 60,
        isCutoffCleared: true,
        sectionResults: [],
        topicResults: [],
        questionDetails: [
          {
            question: dummyQuestionWithAnswers,
            selectedOptionId: 'opt-1', // Mumbai (INCORRECT!)
            isCorrect: true, // Tampered flag!
            marksObtained: 100, // Tampered score!
            status: 'ANSWERED',
            timeSpentSeconds: 50,
          },
        ],
      };

      const result = await saveAttemptAction(clientTamperedPayload);
      expect(result.success).toBe(true);

      // Verify that userId was bound to real currentUser.id, NOT spoofed victim
      expect(savedAttemptData.userId).toBe('real-student-id');

      // Verify that client score was discarded and recomputed server-side:
      // Option 1 is incorrect, question negativeMarks = 0.25, so score = -0.25!
      expect(savedAttemptData.score).toBe(-0.25);
      expect(savedAttemptData.correctCount).toBe(0);
      expect(savedAttemptData.incorrectCount).toBe(1);
      expect(savedAttemptData.accuracy).toBe(0);

      // Verify server returned result matches authoritative calculation
      expect(result.result?.score).toBe(-0.25);
      expect(result.result?.correctCount).toBe(0);
      expect(result.result?.incorrectCount).toBe(1);
    });

    it('rejects attempt submission on unpublished exams for non-admin users', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'student-id',
        role: 'USER',
        status: 'APPROVED',
        email: 'student@bank.com',
        name: 'Student',
      });

      (prisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-unpublished',
        status: 'created',
        isPublished: false,
      });

      const res = await saveAttemptAction({
        id: 'att-unpub-1',
        mockTestId: 'mock-unpublished',
        mockTestTitle: 'Unpublished Mock',
        examSlug: 'ibps-po',
        examTitle: 'IBPS PO',
        userId: 'student-id',
        userName: 'Student',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        timeTakenSeconds: 60,
        totalDurationSeconds: 3600,
        score: 0,
        maxScore: 100,
        percentage: 0,
        accuracy: 0,
        totalQuestions: 0,
        totalAttempted: 0,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
        cutoffMarks: 60,
        isCutoffCleared: false,
        sectionResults: [],
        topicResults: [],
        questionDetails: [],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/unpublished exam/i);
    });

    it('rejects attempt submission if user account status is PENDING / not approved', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'student-pending',
        role: 'USER',
        status: 'PENDING',
        email: 'pending@bank.com',
        name: 'Pending Student',
      });

      const res = await saveAttemptAction({
        id: 'att-pending-1',
        mockTestId: 'mock-ibps-po-1',
        mockTestTitle: 'Mock 1',
        examSlug: 'ibps-po',
        examTitle: 'IBPS PO',
        userId: 'student-pending',
        userName: 'Pending Student',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        timeTakenSeconds: 60,
        totalDurationSeconds: 3600,
        score: 0,
        maxScore: 100,
        percentage: 0,
        accuracy: 0,
        totalQuestions: 0,
        totalAttempted: 0,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
        cutoffMarks: 60,
        isCutoffCleared: false,
        sectionResults: [],
        topicResults: [],
        questionDetails: [],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Account approval required/i);
    });

    it('rejects attempt submission if mock test does not exist without silent fallback', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'student-id',
        role: 'USER',
        status: 'APPROVED',
        email: 'student@bank.com',
        name: 'Student',
      });

      (prisma.mockTest.findFirst as any).mockResolvedValue(null);

      const res = await saveAttemptAction({
        id: 'att-nonexistent-test',
        mockTestId: 'mock-non-existent-exam-xyz',
        mockTestTitle: 'Non Existent Mock',
        examSlug: 'unknown',
        examTitle: 'Unknown',
        userId: 'student-id',
        userName: 'Student',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        timeTakenSeconds: 60,
        totalDurationSeconds: 3600,
        score: 0,
        maxScore: 100,
        percentage: 0,
        accuracy: 0,
        totalQuestions: 0,
        totalAttempted: 0,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
        cutoffMarks: 60,
        isCutoffCleared: false,
        sectionResults: [],
        topicResults: [],
        questionDetails: [],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Exam not found.*does not exist/i);
    });

    it('rejects attempt submission when payload contains an invalid question ID not belonging to the exam', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'real-student-id',
        role: 'USER',
        status: 'APPROVED',
        email: 'real@bank.com',
        name: 'Real Candidate',
      });

      (prisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-ibps-po-1',
        status: 'published',
        isPublished: true,
        durationMinutes: 60,
        cutoffMarks: 60,
        negativeMarkRatio: 0.25,
        mockTestQuestions: [
          {
            order: 1,
            question: dummyQuestionWithAnswers, // q-sec-101
          },
        ],
      });

      const res = await saveAttemptAction({
        id: 'att-invalid-q',
        mockTestId: 'mock-ibps-po-1',
        mockTestTitle: 'IBPS PO Mock',
        examSlug: 'ibps-po',
        examTitle: 'IBPS PO',
        userId: 'real-student-id',
        userName: 'Real Candidate',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        timeTakenSeconds: 50,
        totalDurationSeconds: 3600,
        score: 0,
        maxScore: 100,
        percentage: 0,
        accuracy: 0,
        totalQuestions: 1,
        totalAttempted: 1,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
        cutoffMarks: 60,
        isCutoffCleared: false,
        sectionResults: [],
        topicResults: [],
        questionDetails: [
          {
            question: { ...dummyQuestionWithAnswers, id: 'q-foreign-exam-999' },
            selectedOptionId: 'opt-1',
            isCorrect: false,
            marksObtained: 0,
            status: 'ANSWERED',
            timeSpentSeconds: 50,
          },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Invalid question: Question "q-foreign-exam-999" does not belong to exam/i);
    });

    it('rejects attempt submission when selectedOptionId belongs to another question or does not exist', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'real-student-id',
        role: 'USER',
        status: 'APPROVED',
        email: 'real@bank.com',
        name: 'Real Candidate',
      });

      (prisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-ibps-po-1',
        status: 'published',
        isPublished: true,
        durationMinutes: 60,
        cutoffMarks: 60,
        negativeMarkRatio: 0.25,
        mockTestQuestions: [
          {
            order: 1,
            question: dummyQuestionWithAnswers, // has options opt-1, opt-2, opt-3, opt-4
          },
        ],
      });

      const res = await saveAttemptAction({
        id: 'att-foreign-opt',
        mockTestId: 'mock-ibps-po-1',
        mockTestTitle: 'IBPS PO Mock',
        examSlug: 'ibps-po',
        examTitle: 'IBPS PO',
        userId: 'real-student-id',
        userName: 'Real Candidate',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        timeTakenSeconds: 50,
        totalDurationSeconds: 3600,
        score: 0,
        maxScore: 100,
        percentage: 0,
        accuracy: 0,
        totalQuestions: 1,
        totalAttempted: 1,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 0,
        cutoffMarks: 60,
        isCutoffCleared: false,
        sectionResults: [],
        topicResults: [],
        questionDetails: [
          {
            question: dummyQuestionWithAnswers,
            selectedOptionId: 'opt-foreign-question-2', // Invalid option!
            isCorrect: false,
            marksObtained: 0,
            status: 'ANSWERED',
            timeSpentSeconds: 50,
          },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Invalid option: Selected option "opt-foreign-question-2" does not belong to question/i);
    });

    it('rejects duplicate submission for an already finalized exam attempt', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'real-student-id',
        role: 'USER',
        status: 'APPROVED',
        email: 'real@bank.com',
        name: 'Real Candidate',
      });

      (prisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-ibps-po-1',
        status: 'published',
        isPublished: true,
        durationMinutes: 60,
        cutoffMarks: 60,
        negativeMarkRatio: 0.25,
        mockTestQuestions: [
          {
            order: 1,
            question: dummyQuestionWithAnswers,
          },
        ],
      });

      // Existing attempt in DB is already finalized
      (prisma.attempt.findUnique as any).mockResolvedValue({
        id: 'att-already-finalized-1',
        userId: 'real-student-id',
        isCompleted: true,
        score: 75.0,
      });

      const upsertSpy = vi.spyOn(prisma.attempt, 'upsert');

      const res = await saveAttemptAction({
        id: 'att-already-finalized-1',
        mockTestId: 'mock-ibps-po-1',
        mockTestTitle: 'IBPS PO Mock',
        examSlug: 'ibps-po',
        examTitle: 'IBPS PO',
        userId: 'real-student-id',
        userName: 'Real Candidate',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        timeTakenSeconds: 50,
        totalDurationSeconds: 3600,
        score: 100, // Attempting to alter finalized score
        maxScore: 100,
        percentage: 100,
        accuracy: 100,
        totalQuestions: 1,
        totalAttempted: 1,
        correctCount: 1,
        incorrectCount: 0,
        unansweredCount: 0,
        cutoffMarks: 60,
        isCutoffCleared: true,
        sectionResults: [],
        topicResults: [],
        questionDetails: [
          {
            question: dummyQuestionWithAnswers,
            selectedOptionId: 'opt-2',
            isCorrect: true,
            marksObtained: 1.0,
            status: 'ANSWERED',
            timeSpentSeconds: 50,
          },
        ],
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Duplicate submission: This exam attempt has already been finalized/i);
      expect(upsertSpy).not.toHaveBeenCalled();
    });

    it('POST /api/attempts returns 401 for unauthenticated submission and 409 for duplicate', async () => {
      // 1. Unauthenticated test
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(null);
      const unauthReq = new NextRequest('http://localhost:3000/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'att-unauth',
          mockTestId: 'mock-ibps-po-1',
        }),
      });
      const unauthRes = await attemptsPostRoute(unauthReq);
      expect(unauthRes.status).toBe(401);
      const unauthJson = await unauthRes.json();
      expect(unauthJson.success).toBe(false);

      // 2. Duplicate submission test
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'real-student-id',
        role: 'USER',
        status: 'APPROVED',
        email: 'real@bank.com',
        name: 'Real Candidate',
      });
      (prisma.mockTest.findFirst as any).mockResolvedValue({
        id: 'mock-ibps-po-1',
        status: 'published',
        isPublished: true,
        durationMinutes: 60,
        cutoffMarks: 60,
        mockTestQuestions: [{ order: 1, question: dummyQuestionWithAnswers }],
      });
      (prisma.attempt.findUnique as any).mockResolvedValue({
        id: 'att-duplicate',
        userId: 'real-student-id',
        isCompleted: true,
      });

      const dupReq = new NextRequest('http://localhost:3000/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'att-duplicate',
          mockTestId: 'mock-ibps-po-1',
          questionDetails: [],
        }),
      });
      const dupRes = await attemptsPostRoute(dupReq);
      expect(dupRes.status).toBe(409);
      const dupJson = await dupRes.json();
      expect(dupJson.error).toMatch(/Duplicate submission/i);
    });
  });

  describe('6. Attempt Results IDOR Protection (getAttemptByIdAction & getUserAttemptsAction)', () => {
    const mockDbAttempt = {
      id: 'att-target-123',
      userId: 'user-alice',
      score: 75.5,
      maxScore: 100,
      accuracy: 85.0,
      timeTakenSeconds: 3000,
      totalAttempted: 80,
      correctCount: 68,
      incorrectCount: 12,
      unansweredCount: 20,
      startedAt: new Date(),
      completedAt: new Date(),
      mockTest: {
        id: 'mock-ibps-po-1',
        title: 'IBPS PO Mock',
        cutoffMarks: 60,
        exam: { slug: 'ibps-po', title: 'IBPS PO' },
      },
      answers: [],
    };

    it('blocks Candidate Bob from accessing Candidate Alice\'s attempt result', async () => {
      // Bob is logged in
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'user-bob',
        role: 'USER',
        status: 'APPROVED',
        email: 'bob@bank.com',
        name: 'Bob',
      });

      (prisma.attempt.findUnique as any).mockResolvedValue(mockDbAttempt);

      // Attempt to access Alice's attempt result
      await expect(getAttemptByIdAction('att-target-123')).rejects.toThrow(/permission to view another user's attempt/i);
    });

    it('allows Alice to access her own attempt result', async () => {
      // Alice is logged in
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'user-alice',
        role: 'USER',
        status: 'APPROVED',
        email: 'alice@bank.com',
        name: 'Alice',
      });

      (prisma.attempt.findUnique as any).mockResolvedValue(mockDbAttempt);

      const result = await getAttemptByIdAction('att-target-123');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('att-target-123');
      expect(result?.userId).toBe('user-alice');
    });

    it('allows an Administrator to view any candidate\'s attempt result', async () => {
      // Admin is logged in
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'admin-super',
        role: 'ADMIN',
        status: 'APPROVED',
        email: 'admin@bank.com',
        name: 'Admin',
      });

      (prisma.attempt.findUnique as any).mockResolvedValue(mockDbAttempt);

      const result = await getAttemptByIdAction('att-target-123');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('att-target-123');
      expect(result?.userId).toBe('user-alice');
    });

    it('forces getUserAttemptsAction to scope to currentUser.id when non-admin supplies target userId', async () => {
      // Bob tries to query Alice's attempts
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'user-bob',
        role: 'USER',
        status: 'APPROVED',
        email: 'bob@bank.com',
        name: 'Bob',
      });

      let queriedUserId = '';
      (prisma.attempt.findMany as any).mockImplementation(({ where }: any) => {
        queriedUserId = where.userId;
        return Promise.resolve([]);
      });

      await getUserAttemptsAction('user-alice');

      // The server MUST enforce querying Bob's own ID, ignoring 'user-alice'
      expect(queriedUserId).toBe('user-bob');
    });

    it('allows Administrator to inspect another candidate\'s attempts in getUserAttemptsAction', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
        id: 'admin-super',
        role: 'ADMIN',
        status: 'APPROVED',
        email: 'admin@bank.com',
        name: 'Admin',
      });

      let queriedUserId = '';
      (prisma.attempt.findMany as any).mockImplementation(({ where }: any) => {
        queriedUserId = where.userId;
        return Promise.resolve([]);
      });

      await getUserAttemptsAction('user-alice');
      expect(queriedUserId).toBe('user-alice');
    });
  });
});

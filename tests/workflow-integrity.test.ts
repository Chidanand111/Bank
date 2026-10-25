import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateQuestionAction,
  deleteQuestionAction,
} from '@/lib/services/questionService';
import {
  createMockTestAction,
  deleteMockTestAction,
  toggleMockTestPublishAction,
  getAdminPartitions,
} from '@/lib/services/mockTestService';
import {
  createExamAction,
  updateExamTitleAction,
  deleteExamAction,
  toggleExamPublishAction,
} from '@/lib/services/examService';
import { getMockTestById } from '@/lib/services/testService';
import { saveAttemptAction } from '@/lib/services/attemptService';
import { QuestionRepository } from '@/lib/db/repositories/questionRepository';
import { MockTestRepository } from '@/lib/db/repositories/mockTestRepository';
import { ExamRepository } from '@/lib/db/repositories/examRepository';
import * as sessionModule from '@/lib/auth/session';
import { AttemptResult } from '@/types';

// Mock next/cache revalidation helpers
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

// Mock permissions to authorized admin by default
vi.mock('@/lib/auth/permissions', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN', status: 'APPROVED', name: 'Admin Officer' }),
  requireUser: vi.fn().mockResolvedValue({ id: 'student-1', role: 'USER', status: 'APPROVED', name: 'Approved Student' }),
}));

// Hoisted Prisma mock
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    mockTest: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: 'mock-1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    mockTestQuestion: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockResolvedValue({ id: 'mtq-1' }),
    },
    exam: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue({ id: 'exam-1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    section: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ id: 'sec-quant', code: 'QUANT' }),
    },
    topic: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ id: 'top-general', name: 'General' }),
      create: vi.fn().mockResolvedValue({ id: 'top-created', name: 'General' }),
    },
    question: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({ id: 'q-101' }),
      delete: vi.fn().mockResolvedValue({ id: 'q-101' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockResolvedValue({ id: 'q-101' }),
      create: vi.fn().mockResolvedValue({ id: 'q-101' }),
    },
    option: {
      findUnique: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: 'opt-1' }),
    },
    attempt: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: 'att-1', isCompleted: true }),
      create: vi.fn().mockResolvedValue({ id: 'att-1', isCompleted: true }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    answer: {
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'ans-1' }),
      create: vi.fn().mockResolvedValue({ id: 'ans-1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
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

describe('Admin & Student Workflow Integrity: Error Propagation & Historical Protections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('1. Question Workflow: No False Success & Attempt Safety', () => {
    it('returns actionable error when QuestionRepository.update fails instead of returning false success', async () => {
      vi.spyOn(QuestionRepository, 'update').mockRejectedValueOnce(
        new Error('Neon database connection timeout')
      );

      const result = await updateQuestionAction('q-sample-1', {
        text: 'Updated Question Text',
        examId: 'exam-ibps-po',
        sectionCode: 'QUANT',
        topicName: 'Arithmetic',
        difficulty: 'MEDIUM',
        explanation: 'Detailed solution',
        marks: 1.0,
        negativeMarks: 0.25,
        options: [
          { text: 'Option A', isCorrect: true },
          { text: 'Option B', isCorrect: false },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Neon database connection timeout');
    });

    it('blocks question deletion if the question has finalized answers in student attempts', async () => {
      mockPrisma.answer.findFirst.mockResolvedValueOnce({
        id: 'ans-hist-1',
        attemptId: 'att-student-1',
      });

      const result = await deleteQuestionAction('q-hist-exam');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot delete question "q-hist-exam" because it is part of finalized student exam attempts');
    });

    it('returns actionable error when QuestionRepository.delete fails', async () => {
      mockPrisma.answer.findFirst.mockResolvedValueOnce(null);
      vi.spyOn(QuestionRepository, 'delete').mockRejectedValueOnce(
        new Error('ForeignKeyConstraint error on database question purge')
      );

      const result = await deleteQuestionAction('q-fail-del');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ForeignKeyConstraint error');
    });
  });

  describe('2. Mock Test Workflow: Persistence & Scorecard Protection', () => {
    it('returns actionable error when MockTestRepository.upsertMockTest fails', async () => {
      vi.spyOn(MockTestRepository, 'upsertMockTest').mockRejectedValueOnce(
        new Error('Unique constraint failed on mock test slug')
      );

      const result = await createMockTestAction({
        title: 'New SBI Clerk Mock 5',
        slug: 'sbi-clerk-mock-5',
        examId: 'exam-sbi-clerk',
        description: 'Practice test',
        durationMinutes: 60,
        totalMarks: 100,
        cutoffMarks: 60,
        isFree: true,
        sections: [
          { code: 'ENGLISH', name: 'English', questionCount: 30, marks: 30 },
          { code: 'QUANT', name: 'Quant', questionCount: 35, marks: 35 },
          { code: 'REASONING', name: 'Reasoning', questionCount: 35, marks: 35 },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unique constraint failed');
    });

    it('blocks deletion of a mock test that contains finalized student exam attempts', async () => {
      mockPrisma.attempt.findFirst.mockResolvedValueOnce({
        id: 'att-fin-42',
        userId: 'student-99',
      });

      const result = await deleteMockTestAction('mock-ibps-po-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot delete mock test "mock-ibps-po-1" because it contains finalized student exam attempts');
    });

    it('returns actionable error when MockTestRepository.deleteCascade fails', async () => {
      mockPrisma.attempt.findFirst.mockResolvedValueOnce(null);
      vi.spyOn(MockTestRepository, 'deleteCascade').mockRejectedValueOnce(
        new Error('Database lock timeout on mock test cascade deletion')
      );

      const result = await deleteMockTestAction('mock-empty-test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database lock timeout');
    });

    it('returns actionable error when MockTestRepository.togglePublish fails', async () => {
      mockPrisma.mockTest.findFirst.mockResolvedValueOnce({
        id: 'mock-sbi-clerk-1',
        isPublished: true,
      });
      vi.spyOn(MockTestRepository, 'togglePublish').mockRejectedValueOnce(
        new Error('Database write permission denied')
      );

      const result = await toggleMockTestPublishAction('mock-sbi-clerk-1', 'created');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database write permission denied');
    });

    it('preserves exact user-given titles for custom partitions without overriding to "IBPS PO 2026 PYQ"', async () => {
      mockPrisma.exam.findMany.mockResolvedValue([
        {
          id: 'exam-ibps-po',
          title: 'IBPS PO (Probationary Officer)',
          slug: 'ibps-po',
          description: 'Official',
          isActive: true,
          sections: [],
          mockTests: [],
        },
      ]);

      mockPrisma.mockTest.findMany.mockResolvedValue([
        {
          id: 'mock-sbi-clerk-2024-pyq',
          title: 'SBI Clerk Prelims 2024 - Previous Year Question Paper',
          slug: 'sbi-clerk-prelims-2024-pyq',
          description: '',
          durationMinutes: 60,
          totalMarks: 100,
          cutoffMarks: 70,
          isPublished: true,
          isPyq: true,
          year: 2024,
          examId: 'exam-sbi-clerk',
          exam: { title: 'SBI Clerk', sections: [] },
          mockTestQuestions: [],
        },
        {
          id: 'mock-custom-given-title',
          title: 'Custom Live Prelims Shift 3 Special',
          slug: 'custom-live-prelims-shift-3-special',
          description: '',
          durationMinutes: 60,
          totalMarks: 100,
          cutoffMarks: 65,
          isPublished: true,
          isPyq: true,
          year: 2026,
          examId: 'exam-ibps-po',
          exam: { title: 'IBPS PO (Probationary Officer)', sections: [] },
          mockTestQuestions: [],
        },
        {
          id: 'mock-custom-mock-session',
          title: 'Full Mock Speed Test 12',
          slug: 'full-mock-speed-test-12',
          description: '',
          durationMinutes: 60,
          totalMarks: 100,
          cutoffMarks: 50,
          isPublished: true,
          isPyq: false,
          year: 2026,
          examId: 'exam-ibps-po',
          exam: { title: 'IBPS PO (Probationary Officer)', sections: [] },
          mockTestQuestions: [],
        },
      ]);

      const partitions = await getAdminPartitions();

      // Seed retains concise label
      const seed = partitions.find(p => p.id === 'mock-sbi-clerk-2024-pyq');
      expect(seed?.label).toBe('SBI Clerk 2024 PYQ');

      // Custom PYQ preserves exact user title and does NOT become "IBPS PO 2026 PYQ"
      const customPyq = partitions.find(p => p.id === 'mock-custom-given-title');
      expect(customPyq?.label).toBe('Custom Live Prelims Shift 3 Special');
      expect(customPyq?.label).not.toBe('IBPS PO 2026 PYQ');

      // Custom Mock preserves exact user title
      const customMock = partitions.find(p => p.id === 'mock-custom-mock-session');
      expect(customMock?.label).toBe('Full Mock Speed Test 12');
    });
  });

  describe('3. Exam Category Workflow: Integrity & Attempt Protection', () => {
    it('returns actionable error when ExamRepository.upsertExam fails', async () => {
      vi.spyOn(ExamRepository, 'upsertExam').mockRejectedValueOnce(
        new Error('Database connection reset during exam creation')
      );

      const result = await createExamAction({
        title: 'Reserve Bank of India Grade B',
        slug: 'rbi-grade-b',
        category: 'PO',
        description: 'RBI Grade B Examination',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection reset');
    });

    it('returns actionable error when ExamRepository.updateTitle fails', async () => {
      vi.spyOn(ExamRepository, 'updateTitle').mockRejectedValueOnce(
        new Error('Exam not found in database')
      );

      const result = await updateExamTitleAction('exam-ibps-po', 'Updated IBPS PO Title');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Exam not found');
    });

    it('blocks deletion of an exam if it contains mock tests with completed student attempts', async () => {
      mockPrisma.attempt.findFirst.mockResolvedValueOnce({
        id: 'att-fin-100',
        userId: 'student-55',
      });

      const result = await deleteExamAction('exam-ibps-po');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot delete exam "exam-ibps-po" because it contains mock tests with finalized student exam attempts');
    });

    it('returns actionable error when ExamRepository.deleteCascade fails', async () => {
      mockPrisma.attempt.findFirst.mockResolvedValueOnce(null);
      vi.spyOn(ExamRepository, 'deleteCascade').mockRejectedValueOnce(
        new Error('Deadlock detected during cascade deletion')
      );

      const result = await deleteExamAction('exam-unused-test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Deadlock detected');
    });

    it('returns actionable error when toggleExamPublishAction database update fails', async () => {
      mockPrisma.exam.findFirst.mockResolvedValueOnce({
        id: 'exam-sbi-po',
        slug: 'sbi-po',
        isActive: true,
      });
      mockPrisma.exam.updateMany.mockRejectedValueOnce(
        new Error('Neon database read-only replica error')
      );

      const result = await toggleExamPublishAction('exam-sbi-po', 'created');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Neon database read-only replica error');
    });
  });

  describe('4. Student Exam Entry: Access Restriction & Publication Enforcement', () => {
    it('throws access restriction error when student attempts to load unpublished mock test', async () => {
      // Simulate client environment fetch call to /api/exam-questions/[testId]
      const originalWindow = globalThis.window;
      (globalThis as any).window = {};

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          error: 'Forbidden: This mock test is unpublished and only accessible to administrators.',
        }),
      });

      try {
        await expect(getMockTestById('mock-sbi-clerk-2024-pyq')).rejects.toThrow(
          'Forbidden: This mock test is unpublished and only accessible to administrators.'
        );
      } finally {
        globalThis.fetch = originalFetch;
        (globalThis as any).window = originalWindow;
      }
    });

    it('throws authentication error when unauthenticated user attempts to load exam questions', async () => {
      const originalWindow = globalThis.window;
      (globalThis as any).window = {};

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Unauthorized: Authentication required.',
        }),
      });

      try {
        await expect(getMockTestById('mock-sbi-clerk-2024-pyq')).rejects.toThrow(
          'Unauthorized: Authentication required.'
        );
      } finally {
        globalThis.fetch = originalFetch;
        (globalThis as any).window = originalWindow;
      }
    });
  });

  describe('5. Student Attempt Submission: Duplicate & Transactional Protections', () => {
    it('rejects duplicate submission of an attempt that has already been finalized', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValueOnce({
        id: 'student-1',
        name: 'Student Candidate',
        email: 'student@example.com',
        role: 'USER',
        status: 'APPROVED',
      });

      mockPrisma.mockTest.findFirst.mockResolvedValueOnce({
        id: 'mock-sbi-clerk-2024-pyq',
        title: 'SBI Clerk Prelims 2024',
        examId: 'exam-sbi-clerk',
        isPublished: true,
        durationMinutes: 60,
        totalMarks: 100,
        cutoffMarks: 60,
        mockTestQuestions: [],
        exam: { id: 'exam-sbi-clerk', slug: 'sbi-clerk', title: 'SBI Clerk', isActive: true },
      });

      mockPrisma.attempt.findUnique.mockResolvedValueOnce({
        id: 'att-already-done-1',
        userId: 'student-1',
        isCompleted: true,
      });

      const payload: AttemptResult = {
        id: 'att-already-done-1',
        mockTestId: 'mock-sbi-clerk-2024-pyq',
        mockTestTitle: 'SBI Clerk Prelims 2024',
        examSlug: 'sbi-clerk',
        examTitle: 'SBI Clerk',
        userId: 'student-1',
        userName: 'Student Candidate',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date().toISOString(),
        timeTakenSeconds: 3600,
        totalDurationSeconds: 3600,
        score: 75,
        maxScore: 100,
        percentage: 75,
        accuracy: 85,
        totalQuestions: 100,
        totalAttempted: 90,
        correctCount: 80,
        incorrectCount: 10,
        unansweredCount: 10,
        cutoffMarks: 60,
        isCutoffCleared: true,
        sectionResults: [],
        topicResults: [],
        questionDetails: [],
      };

      const result = await saveAttemptAction(payload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Duplicate submission: This exam attempt has already been finalized.');
    });

    it('rejects submission by unapproved user accounts', async () => {
      vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValueOnce({
        id: 'pending-student-1',
        name: 'Pending Candidate',
        email: 'pending@example.com',
        role: 'USER',
        status: 'PENDING',
      });

      const payload: AttemptResult = {
        id: 'att-pending-1',
        mockTestId: 'mock-sbi-clerk-2024-pyq',
        mockTestTitle: 'SBI Clerk Prelims 2024',
        examSlug: 'sbi-clerk',
        examTitle: 'SBI Clerk',
        userId: 'pending-student-1',
        userName: 'Pending Candidate',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        timeTakenSeconds: 300,
        totalDurationSeconds: 3600,
        score: 0,
        maxScore: 100,
        percentage: 0,
        accuracy: 0,
        totalQuestions: 10,
        totalAttempted: 0,
        correctCount: 0,
        incorrectCount: 0,
        unansweredCount: 10,
        cutoffMarks: 60,
        isCutoffCleared: false,
        sectionResults: [],
        topicResults: [],
        questionDetails: [],
      };

      const result = await saveAttemptAction(payload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden: Account approval required');
    });
  });
});

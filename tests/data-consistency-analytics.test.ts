import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockTest, Question, UserResponseState } from '@/types';

// Mock next/cache revalidation helpers
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

// Mock permissions to bypass requireAdmin in unit tests where needed
vi.mock('@/lib/auth/permissions', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN', name: 'Admin User' }),
  requireUser: vi.fn().mockResolvedValue({ id: 'user-1', role: 'USER', name: 'Student Aspirant' }),
}));

// Hoisted Prisma mock to eliminate network timeouts
const { mockPrisma } = vi.hoisted(() => {
  const mock: any = {
    mockTest: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: 'mock-1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    mockTestQuestion: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    exam: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue({ id: 'exam-1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    section: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    topic: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
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
      upsert: vi.fn().mockResolvedValue({ id: 'att-1' }),
      create: vi.fn().mockResolvedValue({ id: 'att-1' }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    answer: {
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'ans-1' }),
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

import { calculateAttemptResult } from '@/lib/scoring/scoreCalculator';
import { getDashboardStats, getAttemptResultById } from '@/lib/services/testService';
import {
  getUserDashboardStatsAction,
  getAttemptByIdAction,
} from '@/lib/services/attemptService';
import {
  loadFreshQuestionsFromDb,
  deleteQuestionAction,
  updateQuestionAction,
} from '@/lib/services/questionService';
import { getAdminStats } from '@/lib/services/adminService';
import { updateMockTestTitleAction } from '@/lib/services/mockTestService';
import { deleteExamAction } from '@/lib/services/examService';
import * as cacheModule from '@/lib/cache';
import * as sessionModule from '@/lib/auth/session';

function createMockQuestion(overrides: Partial<Question>): Question {
  return {
    id: 'q-1',
    text: 'Sample question text',
    difficulty: 'EASY',
    explanation: 'Explanation text',
    marks: 1.0,
    negativeMarks: 0.25,
    examId: 'exam-1',
    sectionId: 'sec-quant',
    sectionCode: 'QUANT',
    sectionName: 'Quantitative Aptitude',
    topicId: 'top-1',
    topicName: 'Arithmetic',
    options: [
      { id: 'opt-1', questionId: 'q-1', text: 'Wrong', isCorrect: false, order: 1 },
      { id: 'opt-2', questionId: 'q-1', text: 'Right', isCorrect: true, order: 2 },
    ],
    ...overrides,
  };
}

function createMockTest(sections: { code: string; name: string; cutoffMarks?: number; questions: Question[] }[], timerType: 'SECTIONAL_LOCKED' | 'OVERALL_COMPOSITE' = 'SECTIONAL_LOCKED', overallCutoff = 10): MockTest {
  const allQuestions = sections.flatMap(s => s.questions);
  return {
    id: 'mock-test-data-consistency',
    slug: 'mock-test-data-consistency',
    title: 'Data Consistency Mock Test',
    description: 'Test suite validation',
    examId: 'exam-1',
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO',
    durationMinutes: 60,
    totalMarks: allQuestions.reduce((sum, q) => sum + (q.marks || 1), 0),
    totalQuestions: allQuestions.length,
    cutoffMarks: overallCutoff,
    timerType,
    isFree: true,
    sections: sections.map(s => ({
      id: `sec-${s.code.toLowerCase()}`,
      code: s.code,
      name: s.name,
      cutoffMarks: s.cutoffMarks,
      questionCount: s.questions.length,
      marks: s.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
    })),
    questions: allQuestions,
  };
}

describe('Audit: Cutoff Calculations & Rules (Task 5)', () => {
  it('enforces exact boundary conditions: score < cutoff (false), score === cutoff (true), score > cutoff (true)', () => {
    const q1 = createMockQuestion({ id: 'q-1', marks: 5.0, negativeMarks: 0 });
    const q2 = createMockQuestion({ id: 'q-2', marks: 5.0, negativeMarks: 0 });
    const test = createMockTest([
      { code: 'QUANT', name: 'Quant', cutoffMarks: 5.0, questions: [q1, q2] },
    ], 'OVERALL_COMPOSITE', 5.0);

    // Below cutoff (score 0 < 5.0)
    const respFail: Record<string, UserResponseState> = {
      'q-1': { questionId: 'q-1', selectedOptionId: 'opt-1', isMarkedForReview: false, status: 'ANSWERED', timeSpentSeconds: 10 },
    };
    const resFail = calculateAttemptResult(test, respFail, 60, 'att-fail');
    expect(resFail.score).toBe(0);
    expect(resFail.isCutoffCleared).toBe(false);

    // Exactly at cutoff (score 5.0 === 5.0)
    const respExact: Record<string, UserResponseState> = {
      'q-1': { questionId: 'q-1', selectedOptionId: 'opt-2', isMarkedForReview: false, status: 'ANSWERED', timeSpentSeconds: 10 },
    };
    const resExact = calculateAttemptResult(test, respExact, 60, 'att-exact');
    expect(resExact.score).toBe(5.0);
    expect(resExact.cutoffMarks).toBe(5.0);
    expect(resExact.isCutoffCleared).toBe(true);

    // Above cutoff (score 10.0 > 5.0)
    const respAbove: Record<string, UserResponseState> = {
      'q-1': { questionId: 'q-1', selectedOptionId: 'opt-2', isMarkedForReview: false, status: 'ANSWERED', timeSpentSeconds: 10 },
      'q-2': { questionId: 'q-2', selectedOptionId: 'opt-2', isMarkedForReview: false, status: 'ANSWERED', timeSpentSeconds: 10 },
    };
    const resAbove = calculateAttemptResult(test, respAbove, 60, 'att-above');
    expect(resAbove.score).toBe(10.0);
    expect(resAbove.isCutoffCleared).toBe(true);
  });

  it('fails overall cutoff in sectional banking exams when aggregate cutoff is met but a section cutoff is failed', () => {
    const qQuant1 = createMockQuestion({ id: 'q-q1', sectionCode: 'QUANT', marks: 10, negativeMarks: 0 });
    const qQuant2 = createMockQuestion({ id: 'q-q2', sectionCode: 'QUANT', marks: 10, negativeMarks: 0 });
    const qReason1 = createMockQuestion({ id: 'q-r1', sectionCode: 'REASONING', marks: 10, negativeMarks: 0 });
    const qReason2 = createMockQuestion({ id: 'q-r2', sectionCode: 'REASONING', marks: 10, negativeMarks: 0 });

    const sectionalTest = createMockTest([
      { code: 'QUANT', name: 'Quantitative Aptitude', cutoffMarks: 8.0, questions: [qQuant1, qQuant2] },
      { code: 'REASONING', name: 'Reasoning Ability', cutoffMarks: 8.0, questions: [qReason1, qReason2] },
    ], 'SECTIONAL_LOCKED', 15.0);

    // Candidate scores 20 in Quant (clears quant cutoff 8.0), but 0 in Reasoning (fails reasoning cutoff 8.0)
    // Total score = 20.0 >= 15.0 (meets overall cutoff marks)
    const responses: Record<string, UserResponseState> = {
      'q-q1': { questionId: 'q-q1', selectedOptionId: 'opt-2', isMarkedForReview: false, status: 'ANSWERED', timeSpentSeconds: 20 },
      'q-q2': { questionId: 'q-q2', selectedOptionId: 'opt-2', isMarkedForReview: false, status: 'ANSWERED', timeSpentSeconds: 20 },
    };

    const result = calculateAttemptResult(sectionalTest, responses, 120, 'att-sec-fail');

    expect(result.score).toBe(20.0);
    expect(result.score).toBeGreaterThanOrEqual(result.cutoffMarks);

    const quantSection = result.sectionResults.find(s => s.sectionCode === 'QUANT')!;
    const reasonSection = result.sectionResults.find(s => s.sectionCode === 'REASONING')!;

    expect(quantSection.isCutoffCleared).toBe(true);
    expect(reasonSection.isCutoffCleared).toBe(false);

    // In a sectional exam, failing any section MUST fail the overall attempt
    expect(result.isCutoffCleared).toBe(false);
  });

  it('clears overall cutoff in sectional banking exams when both sectional cutoffs and aggregate cutoff are cleared', () => {
    const qQuant = createMockQuestion({ id: 'q-q1', sectionCode: 'QUANT', marks: 10, negativeMarks: 0 });
    const qReason = createMockQuestion({ id: 'q-r1', sectionCode: 'REASONING', marks: 10, negativeMarks: 0 });

    const sectionalTest = createMockTest([
      { code: 'QUANT', name: 'Quantitative Aptitude', cutoffMarks: 5.0, questions: [qQuant] },
      { code: 'REASONING', name: 'Reasoning Ability', cutoffMarks: 5.0, questions: [qReason] },
    ], 'SECTIONAL_LOCKED', 12.0);

    const responses: Record<string, UserResponseState> = {
      'q-q1': { questionId: 'q-q1', selectedOptionId: 'opt-2', isMarkedForReview: false, status: 'ANSWERED', timeSpentSeconds: 30 },
      'q-r1': { questionId: 'q-r1', selectedOptionId: 'opt-2', isMarkedForReview: false, status: 'ANSWERED', timeSpentSeconds: 30 },
    };

    const result = calculateAttemptResult(sectionalTest, responses, 60, 'att-sec-pass');
    expect(result.score).toBe(20.0);
    expect(result.isCutoffCleared).toBe(true);
    expect(result.sectionResults.every(s => s.isCutoffCleared)).toBe(true);
  });
});

describe('Audit: Demo Data Isolation & Empty Datasets (Task 6 & 7)', () => {
  it('returns clean zero statistics and empty arrays when a user has no completed attempts', () => {
    const stats = getDashboardStats({ includeSampleData: false });

    expect(stats.totalTestsAttempted).toBe(0);
    expect(stats.averageScore).toBe(0);
    expect(stats.bestScore).toBe(0);
    expect(stats.averageAccuracy).toBe(0);
    expect(stats.totalTimeSpentMinutes).toBe(0);
    expect(stats.recentAttempts).toEqual([]);
    expect(stats.sectionPerformance).toEqual([]);
    expect(stats.weakTopics).toEqual([]);
  });

  it('does not fall back to sample attempts for arbitrary unknown attempt IDs', () => {
    const nonExistent = getAttemptResultById('unknown-random-id-999');
    expect(nonExistent).toBeNull();
  });

  it('isolates SAMPLE_ATTEMPTS from admin platform statistics', async () => {
    mockPrisma.attempt.count.mockResolvedValue(3);
    mockPrisma.attempt.findMany.mockResolvedValue([
      {
        id: 'real-att-1',
        mockTestId: 'test-1',
        mockTest: { title: 'Real Test 1', durationMinutes: 60, cutoffMarks: 50, exam: { slug: 'ibps-po', title: 'IBPS PO' } },
        userId: 'user-real',
        user: { name: 'Real Aspirant' },
        startedAt: new Date(),
        completedAt: new Date(),
        updatedAt: new Date(),
        timeTakenSeconds: 3000,
        score: 65,
        maxScore: 100,
        accuracy: 85,
        totalAttempted: 80,
        correctCount: 70,
        incorrectCount: 10,
        unansweredCount: 20,
        isCompleted: true,
      },
    ]);
    mockPrisma.attempt.groupBy.mockResolvedValue([
      { mockTestId: 'test-1', _count: { id: 3 } },
    ]);

    const adminStats = await getAdminStats();

    // Must match real database count (3), never SAMPLE_ATTEMPTS.length + 15
    expect(adminStats.totalAttempts).toBe(3);
    expect(adminStats.recentAttempts.length).toBe(1);
    expect(adminStats.recentAttempts[0].id).toBe('real-att-1');
  });

  it('scopes user dashboard stats to authenticated user and applies date range filtering', async () => {
    const userSession = { id: 'user-student-42', name: 'Jane Candidate', email: 'jane@bank.com', role: 'USER' as const };
    vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(userSession);

    mockPrisma.attempt.findMany.mockResolvedValue([
      {
        id: 'att-dated-1',
        userId: 'user-student-42',
        mockTestId: 'mock-1',
        mockTest: { title: 'Mock 1', exam: { slug: 'sbi-clerk', title: 'SBI Clerk' } },
        score: 75.0,
        maxScore: 100.0,
        accuracy: 90.0,
        timeTakenSeconds: 3000,
        totalAttempted: 85,
        correctCount: 78,
        incorrectCount: 7,
        unansweredCount: 15,
        isCompleted: true,
        createdAt: new Date('2026-10-15T10:00:00Z'),
        startedAt: new Date('2026-10-15T09:00:00Z'),
        completedAt: new Date('2026-10-15T10:00:00Z'),
        answers: [
          {
            marksObtained: 1.0,
            isAnswered: true,
            isCorrect: true,
            question: {
              marks: 1.0,
              section: { code: 'QUANT', name: 'Quantitative Aptitude' },
              topic: { name: 'Simplification' },
            },
          },
        ],
      },
    ]);

    const dateFilter = { from: '2026-10-01T00:00:00.000Z', to: '2026-10-20T23:59:59.000Z' };
    const stats = await getUserDashboardStatsAction(dateFilter);

    expect(mockPrisma.attempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-student-42',
          isCompleted: true,
          createdAt: {
            gte: new Date('2026-10-01T00:00:00.000Z'),
            lte: new Date('2026-10-20T23:59:59.000Z'),
          },
        }),
      })
    );

    expect(stats.totalTestsAttempted).toBe(1);
    expect(stats.averageScore).toBe(75.0);
    expect(stats.bestScore).toBe(75.0);
    expect(stats.averageAccuracy).toBe(90.0);
  });
});

describe('Audit: Data Source Consistency & Cache Invalidation (Task 2, 3 & 4)', () => {
  it('treats PostgreSQL as authoritative and does not resurrect deleted questions from static JSON', async () => {
    mockPrisma.question.findMany.mockResolvedValue([
      {
        id: 'q-db-101',
        text: 'Live Question 101',
        examId: 'exam-1',
        sectionId: 'sec-1',
        topicId: 'top-1',
        difficulty: 'MEDIUM',
        explanation: 'Db explanation',
        marks: 1.0,
        negativeMarks: 0.25,
        isPyq: false,
        options: [{ id: 'opt-101-1', text: 'Opt 1', isCorrect: true, order: 1, questionId: 'q-db-101' }],
        exam: { slug: 'ibps-po', title: 'IBPS PO' },
        section: { code: 'QUANT', name: 'Quant' },
        topic: { name: 'Arithmetic' },
      },
    ]);

    const freshQuestions = await loadFreshQuestionsFromDb();

    // Verify it returns the PostgreSQL questions and does not merge static questions
    expect(freshQuestions.length).toBe(1);
    expect(freshQuestions[0].id).toBe('q-db-101');
  });

  it('invalidates cache tags upon question update', async () => {
    const invalidateQuestionsSpy = vi.spyOn(cacheModule, 'invalidateQuestionsCache').mockResolvedValue();
    const invalidateLiveSpy = vi.spyOn(cacheModule, 'invalidateLiveQuestionsCache').mockResolvedValue();

    mockPrisma.question.findUnique.mockResolvedValue({ id: 'q-101', examId: 'exam-ibps-po', options: [] });
    mockPrisma.question.upsert.mockResolvedValue({ id: 'q-101' });

    await updateQuestionAction('q-101', {
      text: 'Updated question title',
      examId: 'exam-ibps-po',
      sectionCode: 'QUANT',
      topicName: 'Algebra',
      difficulty: 'MEDIUM',
      explanation: 'Updated explanation',
      marks: 1.0,
      negativeMarks: 0.25,
      options: [
        { text: 'A', isCorrect: true },
        { text: 'B', isCorrect: false },
      ],
    });

    expect(invalidateQuestionsSpy).toHaveBeenCalled();
    expect(invalidateLiveSpy).toHaveBeenCalledWith('exam-ibps-po');
  });

  it('invalidates caches upon mock test title update and exam deletion', async () => {
    const invalidateMockSpy = vi.spyOn(cacheModule, 'invalidateMockTestsCache').mockResolvedValue();
    const invalidateExamSpy = vi.spyOn(cacheModule, 'invalidateExamsCache').mockResolvedValue();

    mockPrisma.mockTest.findFirst.mockResolvedValue({ id: 'mock-1', title: 'Old Title' });
    mockPrisma.mockTest.update.mockResolvedValue({ id: 'mock-1' });

    await updateMockTestTitleAction('mock-1', 'Brand New Mock Test Title');
    expect(invalidateMockSpy).toHaveBeenCalled();

    mockPrisma.exam.findFirst.mockResolvedValue({ id: 'exam-custom', slug: 'custom' });
    mockPrisma.exam.delete.mockResolvedValue({ id: 'exam-custom' });

    await deleteExamAction('exam-custom');
    expect(invalidateExamSpy).toHaveBeenCalled();
    expect(invalidateMockSpy).toHaveBeenCalled();
  });
});

describe('Audit: Historical Result Stability & Integrity (Task 8)', () => {
  it('blocks deletion of questions that are referenced in completed student attempts', async () => {
    mockPrisma.answer.findFirst.mockResolvedValue({
      id: 'ans-hist-1',
      attemptId: 'att-student-99',
    });

    const deleteResult = await deleteQuestionAction('q-historical');

    expect(deleteResult.success).toBe(false);
    expect(deleteResult.error).toContain('Cannot delete question "q-historical" because it is part of finalized student exam attempts');
  });

  it('preserves historical marks and score even if question details differ', async () => {
    const userSession = { id: 'student-owner-1', name: 'Owner Aspirant', email: 'owner@bank.com', role: 'USER' as const };
    vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue(userSession);

    mockPrisma.attempt.findUnique.mockResolvedValue({
      id: 'att-hist-frozen',
      userId: 'student-owner-1',
      score: 68.25,
      maxScore: 100,
      accuracy: 88.0,
      startedAt: new Date('2024-05-10T10:00:00Z'),
      completedAt: new Date('2024-05-10T11:00:00Z'),
      timeTakenSeconds: 3200,
      mockTest: {
        title: 'Historical Mock 2024',
        cutoffMarks: 60,
        exam: { slug: 'ibps-po', title: 'IBPS PO' },
      },
      answers: [
        {
          id: 'ans-frozen-1',
          selectedOptionId: 'opt-hist-1',
          marksObtained: 1.5,
          isAnswered: true,
          isCorrect: true,
          isMarkedForReview: false,
          timeSpentSeconds: 45,
          question: {
            id: 'q-hist-1',
            text: 'Question text that might be edited later',
            marks: 1.5,
            negativeMarks: 0.375,
            options: [
              { id: 'opt-hist-1', text: 'Option A', isCorrect: false, order: 1, questionId: 'q-hist-1' },
            ],
            section: { code: 'QUANT', name: 'Quantitative Aptitude' },
            topic: { name: 'Arithmetic' },
          },
        },
      ],
    });

    const attempt = await getAttemptByIdAction('att-hist-frozen');

    expect(attempt).not.toBeNull();
    // The candidate's historical score and individual answer marks remain frozen and untouched
    expect(attempt!.score).toBe(68.25);
    expect(attempt!.questionDetails[0].marksObtained).toBe(1.5);
    expect(attempt!.questionDetails[0].isCorrect).toBe(true);
  });
});

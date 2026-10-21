'use server';

/**
 * ============================================================================
 * ADMIN SERVICE FACADE
 * ============================================================================
 * Refactored in Phase 3 (Service Layer Modularization).
 * This file serves as a unified, backward-compatible facade delegating all calls
 * to domain-specific services while providing the top-level Admin Dashboard statistics aggregator.
 *
 * Domain Services:
 * - userService: User approvals, RBAC roles, and status management.
 * - examService: Exam categories, sections, patterns, and cascade deletion.
 * - mockTestService: Mock tests, PYQ papers, partitions, and publish toggles.
 * - questionService: Question CRUD, bulk import, passage deduplication, and live exam queries.
 * - attemptService: Candidate attempt logs and performance records.
 * ============================================================================
 */

import { requireAdmin } from '../auth/permissions';
import { getDatabaseUsers } from '../auth/session';
import { prisma } from '../prisma';
import * as userService from './userService';
import * as examService from './examService';
import * as mockTestService from './mockTestService';
import * as questionService from './questionService';
import * as attemptService from './attemptService';
import {
  AdminExamInput,
  AdminMockTestInput,
  AdminQuestionInput,
  AdminStats,
  AuthUser,
  AttemptResult,
  Exam,
  ExamStatus,
  MockTest,
  Question,
  Role,
  UserStatus,
  AdminPartitionInfo,
} from '@/types';

export type { AdminPartitionInfo };

// ============================================================================
// User Management Actions
// ============================================================================

export async function getAdminUsers(): Promise<AuthUser[]> {
  return userService.getAdminUsers();
}

export async function approveUserAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return userService.approveUserAction(userId);
}

export async function rejectUserAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return userService.rejectUserAction(userId);
}

export async function updateUserStatusAction(
  userId: string,
  newStatus: UserStatus
): Promise<{ success: boolean; error?: string }> {
  return userService.updateUserStatusAction(userId, newStatus);
}

export async function updateUserRoleAction(
  userId: string,
  newRole: Role
): Promise<{ success: boolean; error?: string }> {
  return userService.updateUserRoleAction(userId, newRole);
}

// ============================================================================
// Exam Management Actions
// ============================================================================

export async function getAdminExams(): Promise<Exam[]> {
  return examService.getAdminExams();
}

export async function createExamAction(
  input: AdminExamInput
): Promise<{ success: boolean; exam?: Exam; error?: string }> {
  return examService.createExamAction(input);
}

export async function updateExamTitleAction(
  examIdOrSlug: string,
  newTitle: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  return examService.updateExamTitleAction(examIdOrSlug, newTitle, description);
}

export async function deleteExamAction(
  examIdOrSlug: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  return examService.deleteExamAction(examIdOrSlug);
}

export async function toggleExamPublishAction(
  examIdOrSlug: string,
  targetStatus?: ExamStatus
): Promise<{ success: boolean; status?: ExamStatus; error?: string }> {
  return examService.toggleExamPublishAction(examIdOrSlug, targetStatus);
}

// ============================================================================
// Mock Test Management Actions
// ============================================================================

export async function loadFreshMockTestsFromDb(): Promise<MockTest[]> {
  return mockTestService.loadFreshMockTestsFromDb();
}

export async function getAdminMockTests(): Promise<MockTest[]> {
  return mockTestService.getAdminMockTests();
}

export async function createMockTestAction(
  input: AdminMockTestInput
): Promise<{ success: boolean; test?: MockTest; error?: string }> {
  return mockTestService.createMockTestAction(input);
}

export async function updateMockTestTitleAction(
  testIdOrSlug: string,
  newTitle: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  return mockTestService.updateMockTestTitleAction(testIdOrSlug, newTitle, description);
}

export async function deleteMockTestAction(
  testId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  return mockTestService.deleteMockTestAction(testId);
}

export async function toggleMockTestPublishAction(
  testIdOrSlug: string,
  targetStatus?: ExamStatus
): Promise<{ success: boolean; status?: ExamStatus; error?: string }> {
  return mockTestService.toggleMockTestPublishAction(testIdOrSlug, targetStatus);
}

export async function getAdminPartitions(): Promise<mockTestService.AdminPartitionInfo[]> {
  return mockTestService.getAdminPartitions();
}

// ============================================================================
// Question Management Actions
// ============================================================================

export async function loadFreshQuestionsFromDb(): Promise<Question[]> {
  return questionService.loadFreshQuestionsFromDb();
}

export async function getAdminQuestions(filters?: {
  search?: string;
  examId?: string;
  sectionCode?: string;
  difficulty?: string;
  partition?: string;
}): Promise<Question[]> {
  return questionService.getAdminQuestions(filters);
}

export async function createQuestionAction(
  input: AdminQuestionInput
): Promise<{ success: boolean; question?: Question; error?: string }> {
  return questionService.createQuestionAction(input);
}

export async function bulkImportQuestionsAction(
  questions: AdminQuestionInput[],
  partitionId?: string,
  images?: { filename: string; base64: string; mimeType: string }[],
  batchId?: string
): Promise<{ success: boolean; count: number; error?: string; batchId?: string; report?: any }> {
  return questionService.bulkImportQuestionsAction(questions, partitionId, images, batchId);
}

export async function retryImportBatchAction(
  batchId: string,
  overrides?: { duplicatePolicy?: 'SKIP' | 'UPDATE' | 'REVIEW'; allowDestructiveUpdates?: boolean }
) {
  const { retryImportBatch } = await import('./importBatchService');
  return retryImportBatch(batchId, overrides);
}

export async function getImportBatchAction(batchId: string) {
  const { getImportBatch } = await import('../storage/importBatchStore');
  return getImportBatch(batchId);
}

export async function cancelImportBatchAction(batchId: string) {
  const { requestBatchCancellation } = await import('../storage/importBatchStore');
  const { safeCleanupUnreferencedBatchImages } = await import('../storage/mediaStorage');
  const cancelled = requestBatchCancellation(batchId);
  const cleanup = await safeCleanupUnreferencedBatchImages(batchId);
  return { cancelled, cleanup };
}

export async function uploadQuestionDiagramAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; filename?: string; error?: string }> {
  return questionService.uploadQuestionDiagramAction(formData);
}

export async function updateQuestionAction(
  questionId: string,
  input: AdminQuestionInput
): Promise<{ success: boolean; error?: string }> {
  return questionService.updateQuestionAction(questionId, input);
}

export async function getLiveExamQuestionsAction(testIdOrSlug: string): Promise<Question[]> {
  return questionService.getLiveExamQuestionsAction(testIdOrSlug);
}

export async function getCanonicalExamQuestions(testIdOrSlug: string): Promise<Question[]> {
  return questionService.getCanonicalExamQuestions(testIdOrSlug);
}

export async function deleteQuestionAction(
  questionId: string
): Promise<{ success: boolean; error?: string }> {
  return questionService.deleteQuestionAction(questionId);
}

export async function partitionQuestionsList(
  questions: Question[],
  partitionId?: string
): Promise<Question[]> {
  return questionService.partitionQuestionsList(questions, partitionId);
}

export async function resolveGroupPassages(questions: Question[]): Promise<Question[]> {
  return questionService.resolveGroupPassages(questions);
}

// ============================================================================
// Candidate Attempt Actions
// ============================================================================

export async function getAdminAllAttempts(): Promise<AttemptResult[]> {
  return attemptService.getAdminAllAttempts();
}

export async function saveAttemptAction(
  result: AttemptResult
): Promise<{ success: boolean; attemptId?: string; result?: AttemptResult; error?: string }> {
  return attemptService.saveAttemptAction(result);
}

export async function getAttemptByIdAction(attemptId: string): Promise<AttemptResult | null> {
  return attemptService.getAttemptByIdAction(attemptId);
}

export async function getUserAttemptsAction(userId?: string): Promise<AttemptResult[]> {
  return attemptService.getUserAttemptsAction(userId);
}

export async function getUserDashboardStatsAction(dateRange?: {
  from?: string;
  to?: string;
}) {
  return attemptService.getUserDashboardStatsAction(dateRange);
}

// ============================================================================
// Admin Statistics Aggregator
// ============================================================================

export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();

  const [users, exams, dynamicMockTests, dynamicQuestions] = await Promise.all([
    getDatabaseUsers(),
    examService.getAdminExams(),
    mockTestService.getDynamicMockTests(),
    questionService.getDynamicQuestions(),
  ]);

  const totalAdmins = users.filter(u => u.role === 'ADMIN').length;
  const pendingApprovalsCount = users.filter(u => u.status === 'PENDING').length;
  const totalUsers = users.length;
  const totalExams = exams.length;
  const totalQuestions = dynamicQuestions.length;
  const totalMockTests = dynamicMockTests.length;

  let totalAttempts = 0;
  let recentAttempts: AttemptResult[] = [];
  const attemptCountsByTest = new Map<string, number>();

  try {
    totalAttempts = await prisma.attempt.count({
      where: { isCompleted: true },
    });

    const dbRecentAttempts = await prisma.attempt.findMany({
      where: { isCompleted: true },
      orderBy: { completedAt: 'desc' },
      take: 5,
      include: {
        user: true,
        mockTest: {
          include: { exam: true },
        },
      },
    });

    recentAttempts = dbRecentAttempts.map(a => ({
      id: a.id,
      mockTestId: a.mockTestId,
      mockTestTitle: a.mockTest?.title || 'Mock Test',
      examSlug: a.mockTest?.exam?.slug || 'ibps-po',
      examTitle: a.mockTest?.exam?.title || 'Exam',
      userId: a.userId,
      userName: a.user?.name || 'Aspirant',
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt?.toISOString() || a.updatedAt.toISOString(),
      timeTakenSeconds: a.timeTakenSeconds,
      totalDurationSeconds: (a.mockTest?.durationMinutes || 60) * 60,
      score: a.score,
      maxScore: a.maxScore,
      percentage: a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0,
      accuracy: a.accuracy,
      totalQuestions: a.correctCount + a.incorrectCount + a.unansweredCount,
      totalAttempted: a.totalAttempted,
      correctCount: a.correctCount,
      incorrectCount: a.incorrectCount,
      unansweredCount: a.unansweredCount,
      cutoffMarks: a.mockTest?.cutoffMarks || 60,
      isCutoffCleared: a.score >= (a.mockTest?.cutoffMarks || 60),
      sectionResults: [],
      topicResults: [],
      questionDetails: [],
    }));

    const groupedAttempts = await prisma.attempt.groupBy({
      by: ['mockTestId'],
      where: { isCompleted: true },
      _count: { id: true },
    });
    for (const group of groupedAttempts) {
      attemptCountsByTest.set(group.mockTestId, group._count.id);
    }
  } catch (err) {
    console.warn('Failed to query attempt statistics from database in getAdminStats:', err);
  }

  const popularTests = [...dynamicMockTests]
    .map(t => ({
      id: t.id,
      title: t.title,
      examTitle: t.examTitle,
      attemptsCount: attemptCountsByTest.get(t.id) || 0,
    }))
    .sort((a, b) => b.attemptsCount - a.attemptsCount)
    .slice(0, 4);

  return {
    totalUsers,
    totalAdmins,
    pendingApprovalsCount,
    totalExams,
    totalQuestions,
    totalMockTests,
    totalAttempts,
    recentUsers: users.slice(0, 5),
    recentAttempts,
    popularTests,
  };
}

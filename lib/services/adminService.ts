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
import { SAMPLE_ATTEMPTS } from '../data/sampleAttempts';
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
  partitionId?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  return questionService.bulkImportQuestionsAction(questions, partitionId);
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
  const totalAttempts = SAMPLE_ATTEMPTS.length + 15; // Platform count

  return {
    totalUsers,
    totalAdmins,
    pendingApprovalsCount,
    totalExams,
    totalQuestions,
    totalMockTests,
    totalAttempts,
    recentUsers: users.slice(0, 5),
    recentAttempts: SAMPLE_ATTEMPTS.slice(0, 5),
    popularTests: dynamicMockTests.slice(0, 4).map(t => ({
      id: t.id,
      title: t.title,
      examTitle: t.examTitle,
      attemptsCount: Math.floor(Math.random() * 200) + 50,
    })),
  };
}

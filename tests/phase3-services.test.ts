import { describe, it, expect } from 'vitest';
import {
  adminQuestionInputSchema,
  bulkImportQuestionsSchema,
  adminExamInputSchema,
  updateExamTitleSchema,
  adminMockTestInputSchema,
  updateMockTestTitleSchema,
  userStatusSchema,
  userRoleSchema,
  validateInput,
} from '@/lib/validations/adminSchemas';
import * as adminService from '@/lib/services/adminService';
import * as userService from '@/lib/services/userService';
import * as examService from '@/lib/services/examService';
import * as mockTestService from '@/lib/services/mockTestService';
import * as questionService from '@/lib/services/questionService';
import * as attemptService from '@/lib/services/attemptService';

describe('Phase 3: Validation Schemas (Zod)', () => {
  it('validates question input correctly and rejects questions with no correct option', () => {
    const invalidQuestion = {
      text: 'What is 2 + 2?',
      sectionCode: 'QUANT',
      topicName: 'Arithmetic',
      difficulty: 'EASY',
      explanation: '2 + 2 = 4',
      marks: 1.0,
      negativeMarks: 0.25,
      options: [
        { text: '3', isCorrect: false },
        { text: '5', isCorrect: false },
      ],
    };

    const res = validateInput(adminQuestionInputSchema, invalidQuestion);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain('At least one option must be marked as correct');
    }
  });

  it('validates question input and requires at least 2 options', () => {
    const invalidQuestion = {
      text: 'What is the capital of India?',
      sectionCode: 'GENERAL',
      topicName: 'Static GK',
      difficulty: 'EASY',
      explanation: 'New Delhi is the capital.',
      marks: 1.0,
      negativeMarks: 0.25,
      options: [{ text: 'New Delhi', isCorrect: true }],
    };

    const res = validateInput(adminQuestionInputSchema, invalidQuestion);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toContain('At least 2 options are required');
    }
  });

  it('accepts valid question input and parses numeric string pyqYear', () => {
    const validQuestion = {
      text: 'In which year was RBI established?',
      sectionCode: 'GENERAL',
      topicName: 'Banking History',
      difficulty: 'MEDIUM',
      explanation: 'The RBI was established in 1935 under the RBI Act 1934.',
      marks: 1.0,
      negativeMarks: 0.25,
      isPyq: true,
      pyqYear: '1935',
      options: [
        { text: '1930', isCorrect: false },
        { text: '1935', isCorrect: true },
        { text: '1947', isCorrect: false },
      ],
    };

    const res = validateInput(adminQuestionInputSchema, validQuestion);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.pyqYear).toBe(1935);
      expect(res.data.difficulty).toBe('MEDIUM');
    }
  });

  it('validates bulk import questions array', () => {
    const emptyBatch: any[] = [];
    const resEmpty = validateInput(bulkImportQuestionsSchema, emptyBatch);
    expect(resEmpty.success).toBe(false);

    const validBatch = [
      {
        text: 'Question 1',
        sectionCode: 'ENGLISH',
        topicName: 'Reading',
        difficulty: 'EASY',
        explanation: 'Exp 1',
        options: [
          { text: 'A', isCorrect: true },
          { text: 'B', isCorrect: false },
        ],
      },
    ];
    const resValid = validateInput(bulkImportQuestionsSchema, validBatch);
    expect(resValid.success).toBe(true);
  });

  it('validates exam creation and update inputs', () => {
    const invalidExam = { title: '' };
    const resInv = validateInput(adminExamInputSchema, invalidExam);
    expect(resInv.success).toBe(false);

    const validExam = {
      title: 'IBPS RRB Officer Scale I',
      category: 'PO',
      description: 'Regional Rural Banks PO examination',
    };
    const resValid = validateInput(adminExamInputSchema, validExam);
    expect(resValid.success).toBe(true);

    const updateValid = validateInput(updateExamTitleSchema, {
      examIdOrSlug: 'exam-ibps-rrb',
      newTitle: 'IBPS RRB Officer Scale I 2026',
    });
    expect(updateValid.success).toBe(true);
  });

  it('validates mock test creation input', () => {
    const validTest = {
      title: 'IBPS RRB Prelims Full Mock 1',
      examId: 'exam-ibps-rrb',
      durationMinutes: 45,
      totalMarks: 80,
      cutoffMarks: 52,
      sections: [
        { code: 'REASONING', name: 'Reasoning', questionCount: 40, marks: 40 },
        { code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 40, marks: 40 },
      ],
    };
    const res = validateInput(adminMockTestInputSchema, validTest);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.durationMinutes).toBe(45);
      expect(res.data.totalMarks).toBe(80);
    }
  });

  it('validates user status and role schemas', () => {
    expect(validateInput(userStatusSchema, 'APPROVED').success).toBe(true);
    expect(validateInput(userStatusSchema, 'REJECTED').success).toBe(true);
    expect(validateInput(userStatusSchema, 'INVALID_STATUS').success).toBe(false);

    expect(validateInput(userRoleSchema, 'ADMIN').success).toBe(true);
    expect(validateInput(userRoleSchema, 'USER').success).toBe(true);
    expect(validateInput(userRoleSchema, 'SUPERADMIN').success).toBe(false);
  });
});

describe('Phase 3: Domain Service Facade Architecture', () => {
  it('facade exposes all user management functions', () => {
    expect(typeof adminService.getAdminUsers).toBe('function');
    expect(typeof adminService.approveUserAction).toBe('function');
    expect(typeof adminService.rejectUserAction).toBe('function');
    expect(typeof adminService.updateUserStatusAction).toBe('function');
    expect(typeof adminService.updateUserRoleAction).toBe('function');

    expect(typeof userService.getAdminUsers).toBe('function');
    expect(typeof userService.approveUserAction).toBe('function');
  });

  it('facade exposes all exam management functions', () => {
    expect(typeof adminService.getAdminExams).toBe('function');
    expect(typeof adminService.createExamAction).toBe('function');
    expect(typeof adminService.updateExamTitleAction).toBe('function');
    expect(typeof adminService.deleteExamAction).toBe('function');
    expect(typeof adminService.toggleExamPublishAction).toBe('function');

    expect(typeof examService.getAdminExams).toBe('function');
    expect(typeof examService.createExamAction).toBe('function');
  });

  it('facade exposes all mock test management functions', () => {
    expect(typeof adminService.loadFreshMockTestsFromDb).toBe('function');
    expect(typeof adminService.getAdminMockTests).toBe('function');
    expect(typeof adminService.createMockTestAction).toBe('function');
    expect(typeof adminService.updateMockTestTitleAction).toBe('function');
    expect(typeof adminService.deleteMockTestAction).toBe('function');
    expect(typeof adminService.toggleMockTestPublishAction).toBe('function');
    expect(typeof adminService.getAdminPartitions).toBe('function');

    expect(typeof mockTestService.createMockTestAction).toBe('function');
  });

  it('facade exposes all question management functions', () => {
    expect(typeof adminService.loadFreshQuestionsFromDb).toBe('function');
    expect(typeof adminService.getAdminQuestions).toBe('function');
    expect(typeof adminService.createQuestionAction).toBe('function');
    expect(typeof adminService.bulkImportQuestionsAction).toBe('function');
    expect(typeof adminService.updateQuestionAction).toBe('function');
    expect(typeof adminService.getLiveExamQuestionsAction).toBe('function');
    expect(typeof adminService.deleteQuestionAction).toBe('function');
    expect(typeof adminService.partitionQuestionsList).toBe('function');
    expect(typeof adminService.resolveGroupPassages).toBe('function');

    expect(typeof questionService.createQuestionAction).toBe('function');
    expect(typeof questionService.bulkImportQuestionsAction).toBe('function');
  });

  it('facade exposes attempt and stats functions', () => {
    expect(typeof adminService.getAdminAllAttempts).toBe('function');
    expect(typeof adminService.getAdminStats).toBe('function');

    expect(typeof attemptService.getAdminAllAttempts).toBe('function');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isExamComposite,
  calculateExamTimeRemaining,
  computeMonotonicRemainingTime,
  syncSectionalStateOnResume,
} from '@/lib/exam-engine/timingUtils';
import { saveAttemptAction } from '@/lib/services/attemptService';
import { prisma } from '@/lib/prisma';
import * as sessionModule from '@/lib/auth/session';
import { MockTest, Question, AttemptResult } from '@/types';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    mockTest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    attempt: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    answer: {
      upsert: vi.fn(),
      create: vi.fn(),
    },
    question: {
      findUnique: vi.fn(),
    },
    option: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn(prisma)),
  },
}));

vi.mock('@/lib/services/common', () => ({
  safeRevalidatePath: vi.fn(),
}));

const dummyQuestion: Question = {
  id: 'q-timing-1',
  text: 'What is the capital of India?',
  explanation: 'New Delhi is the capital.',
  marks: 2.0,
  negativeMarks: 0.5,
  difficulty: 'EASY',
  examId: 'exam-ssc',
  sectionId: 'sec-2',
  sectionCode: 'GA',
  sectionName: 'General Awareness',
  topicId: 'top-1',
  topicName: 'Static GK',
  options: [
    { id: 'opt-1', text: 'Mumbai', isCorrect: false, order: 1 },
    { id: 'opt-2', text: 'New Delhi', isCorrect: true, order: 2 },
  ],
};

const compositeSscTest: MockTest = {
  id: 'mock-ssc-composite-1',
  slug: 'mock-ssc-composite-1',
  title: 'SSC CGL Tier-1 Composite Full Mock',
  description: 'SSC CGL Mock Test',
  examId: 'exam-ssc',
  examSlug: 'ssc-cgl',
  examTitle: 'SSC CGL',
  durationMinutes: 60,
  totalMarks: 200,
  totalQuestions: 100,
  cutoffMarks: 130,
  isFree: true,
  timerType: 'OVERALL_COMPOSITE',
  allowSectionSwitch: true,
  negativeMarkRatio: 0.5,
  sections: [
    { id: 'sec-1', code: 'REASONING', name: 'General Intelligence', durationMinutes: 15, questionCount: 25, marks: 50 },
    { id: 'sec-2', code: 'GA', name: 'General Awareness', durationMinutes: 15, questionCount: 25, marks: 50 },
    { id: 'sec-3', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 15, questionCount: 25, marks: 50 },
    { id: 'sec-4', code: 'ENGLISH', name: 'English Comprehension', durationMinutes: 15, questionCount: 25, marks: 50 },
  ],
  questions: [dummyQuestion],
};

const sectionalBankTest: MockTest = {
  id: 'mock-bank-sectional-1',
  slug: 'mock-bank-sectional-1',
  title: 'IBPS PO Prelims Sectional Mock',
  description: 'IBPS PO Mock Test',
  examId: 'exam-ibps',
  examSlug: 'ibps-po',
  examTitle: 'IBPS PO',
  durationMinutes: 60,
  totalMarks: 100,
  totalQuestions: 100,
  cutoffMarks: 60,
  isFree: true,
  timerType: 'SECTIONAL_LOCKED',
  allowSectionSwitch: false,
  sections: [
    { id: 'sec-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 30, marks: 30 },
    { id: 'sec-quant', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 20, questionCount: 35, marks: 35 },
    { id: 'sec-reas', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 35, marks: 35 },
  ],
  questions: [dummyQuestion],
};

const singleSectionTest: MockTest = {
  id: 'mock-single-quiz-1',
  slug: 'mock-single-quiz-1',
  title: 'Current Affairs Daily Quiz',
  description: 'Single Section Quiz',
  examId: 'exam-quiz',
  examSlug: 'quiz',
  examTitle: 'Quiz',
  durationMinutes: 25,
  totalMarks: 50,
  totalQuestions: 25,
  cutoffMarks: 30,
  isFree: true,
  timerType: 'OVERALL_COMPOSITE',
  sections: [
    { id: 'sec-ga', code: 'GA', name: 'General Awareness', durationMinutes: 25, questionCount: 25, marks: 50 },
  ],
  questions: [dummyQuestion],
};

describe('1. Exam Timing Calculations & Section Duration Policy', () => {
  it('correctly calculates composite-exam timer: does NOT duplicate or sum section durations', () => {
    // SSC CGL composite exam: 4 sections of 15 min each, 60 min total duration
    expect(isExamComposite(compositeSscTest)).toBe(true);

    const timing = calculateExamTimeRemaining({
      test: compositeSscTest,
      isComposite: true,
      compositeRemainingSeconds: 3600, // 60 minutes
      sectionTimers: {
        REASONING: 3600,
        GA: 3600,
        QUANT: 3600,
        ENGLISH: 3600,
      },
      lockedSectionCodes: [],
      currentSectionCode: 'REASONING',
      isSubmitting: false,
    });

    // CRITICAL: Total remaining must be 3600s (60 min), NOT 3600 * 4 = 14,400s (240 min)
    expect(timing.totalRemainingSeconds).toBe(3600);
    expect(timing.activeSectionRemainingSeconds).toBe(3600);
    expect(timing.isCurrentSectionExpired).toBe(false);
    expect(timing.isExamExpired).toBe(false);
    expect(timing.isInteractionDisabled).toBe(false);
  });

  it('correctly synchronizes active section and total remaining time in single-section exams', () => {
    const timing = calculateExamTimeRemaining({
      test: singleSectionTest,
      isComposite: false,
      compositeRemainingSeconds: 1500, // 25 minutes
      sectionTimers: { GA: 1500 },
      lockedSectionCodes: [],
      currentSectionCode: 'GA',
      isSubmitting: false,
    });

    expect(timing.activeSectionRemainingSeconds).toBe(1500);
    expect(timing.totalRemainingSeconds).toBe(1500);
    expect(timing.isCurrentSectionExpired).toBe(false);
    expect(timing.isExamExpired).toBe(false);
  });

  it('correctly calculates sectional locked timing across unexpired and locked sections', () => {
    // Banking exam: 3 sections of 20 min each
    expect(isExamComposite(sectionalBankTest)).toBe(false);

    // Initial state: Section 1 active with 1200s, total is 3600s
    const timingInit = calculateExamTimeRemaining({
      test: sectionalBankTest,
      isComposite: false,
      compositeRemainingSeconds: 3600,
      sectionTimers: { ENGLISH: 1200, QUANT: 1200, REASONING: 1200 },
      lockedSectionCodes: [],
      currentSectionCode: 'ENGLISH',
      isSubmitting: false,
    });
    expect(timingInit.activeSectionRemainingSeconds).toBe(1200);
    expect(timingInit.totalRemainingSeconds).toBe(3600);

    // Mid-exam state: English locked (0s), active in Quant with 800s left, Reasoning has 1200s
    const timingMid = calculateExamTimeRemaining({
      test: sectionalBankTest,
      isComposite: false,
      compositeRemainingSeconds: 2000,
      sectionTimers: { ENGLISH: 0, QUANT: 800, REASONING: 1200 },
      lockedSectionCodes: ['ENGLISH'],
      currentSectionCode: 'QUANT',
      isSubmitting: false,
    });
    expect(timingMid.activeSectionRemainingSeconds).toBe(800);
    expect(timingMid.totalRemainingSeconds).toBe(2000); // 800 + 1200 = 2000s
    expect(timingMid.isCurrentSectionExpired).toBe(false);
    expect(timingMid.isExamExpired).toBe(false);
  });
});

describe('2. Section Expiration & Answering Prohibition', () => {
  it('disables answering when active section timer expires or section is locked', () => {
    // Current section time is 0
    const expiredSecTiming = calculateExamTimeRemaining({
      test: sectionalBankTest,
      isComposite: false,
      compositeRemainingSeconds: 2400,
      sectionTimers: { ENGLISH: 0, QUANT: 1200, REASONING: 1200 },
      lockedSectionCodes: [],
      currentSectionCode: 'ENGLISH',
      isSubmitting: false,
    });
    expect(expiredSecTiming.isCurrentSectionExpired).toBe(true);
    expect(expiredSecTiming.isInteractionDisabled).toBe(true);

    // Current section is in lockedSectionCodes
    const lockedSecTiming = calculateExamTimeRemaining({
      test: sectionalBankTest,
      isComposite: false,
      compositeRemainingSeconds: 2400,
      sectionTimers: { ENGLISH: 50, QUANT: 1200, REASONING: 1200 },
      lockedSectionCodes: ['ENGLISH'],
      currentSectionCode: 'ENGLISH',
      isSubmitting: false,
    });
    expect(lockedSecTiming.isCurrentSectionExpired).toBe(true);
    expect(lockedSecTiming.isInteractionDisabled).toBe(true);
  });

  it('disables answering across the entire exam when total remaining time is 0', () => {
    const expiredExamTiming = calculateExamTimeRemaining({
      test: compositeSscTest,
      isComposite: true,
      compositeRemainingSeconds: 0,
      sectionTimers: {},
      lockedSectionCodes: [],
      currentSectionCode: 'GA',
      isSubmitting: false,
    });
    expect(expiredExamTiming.isExamExpired).toBe(true);
    expect(expiredExamTiming.isCurrentSectionExpired).toBe(true);
    expect(expiredExamTiming.isInteractionDisabled).toBe(true);
  });

  it('disables candidate interaction while submission is in progress', () => {
    const submittingTiming = calculateExamTimeRemaining({
      test: compositeSscTest,
      isComposite: true,
      compositeRemainingSeconds: 1500,
      sectionTimers: {},
      lockedSectionCodes: [],
      currentSectionCode: 'GA',
      isSubmitting: true,
    });
    expect(submittingTiming.isExamExpired).toBe(false);
    expect(submittingTiming.isInteractionDisabled).toBe(true);
  });
});

describe('3. Monotonic Clock Protection & Tab Resume Invariance', () => {
  it('prevents client-side clock rewind from extending remaining time', () => {
    const t0 = 1700000000000;
    const deadline = t0 + 3600 * 1000; // 60 minutes later
    const lastRecordedRemaining = 3000; // Candidate was at 50 minutes left

    // Case A: Candidate rewinds local clock backwards by 2 hours
    const rewoundNow = t0 - 7200 * 1000;
    const sync = computeMonotonicRemainingTime({
      sessionDeadline: deadline,
      lastRecordedRemaining,
      lastHeartbeatTime: t0 + 600 * 1000,
      now: rewoundNow,
    });

    // Clock rewind must be detected and remaining time must NOT exceed lastRecordedRemaining
    expect(sync.clockTampered).toBe(true);
    expect(sync.effectiveRemaining).toBe(lastRecordedRemaining);
  });

  it('accurately deducts wall-clock time elapsed while browser tab was closed', () => {
    const t0 = 1700000000000;
    const deadline = t0 + 3600 * 1000; // 60 minutes
    const lastRecordedRemaining = 3600;

    // Candidate closed tab at T0 and reopened 15 minutes later (900 seconds)
    const resumeNow = t0 + 900 * 1000;
    const sync = computeMonotonicRemainingTime({
      sessionDeadline: deadline,
      lastRecordedRemaining,
      lastHeartbeatTime: t0,
      now: resumeNow,
    });

    expect(sync.clockTampered).toBe(false);
    expect(sync.effectiveRemaining).toBe(2700); // 3600 - 900 = 2700s
    expect(sync.isExpired).toBe(false);
  });

  it('expires exam immediately if closed tab reopens after session deadline', () => {
    const t0 = 1700000000000;
    const deadline = t0 + 3600 * 1000; // 60 minutes
    const lastRecordedRemaining = 3600;

    // Candidate reopened 70 minutes later (expired)
    const lateNow = t0 + 4200 * 1000;
    const sync = computeMonotonicRemainingTime({
      sessionDeadline: deadline,
      lastRecordedRemaining,
      lastHeartbeatTime: t0,
      now: lateNow,
    });

    expect(sync.effectiveRemaining).toBe(0);
    expect(sync.isExpired).toBe(true);
  });

  it('correctly locks expired sections on resume for sectional locked exams', () => {
    const t0 = 1700000000000;
    // 3 sections of 20 min (1200s) each:
    // Section 1: 0 - 1200s (English)
    // Section 2: 1200 - 2400s (Quant)
    // Section 3: 2400 - 3600s (Reasoning)
    const sections = sectionalBankTest.sections;

    // Candidate resumes at T0 + 25 minutes (1500 seconds):
    // English (20 min) is completely expired -> locked!
    // Quant (20 min) has 15 minutes (900s) remaining -> active!
    const resumeNow = t0 + 1500 * 1000;
    const synced = syncSectionalStateOnResume({
      sections,
      sessionStartTime: t0,
      currentSectionTimers: { ENGLISH: 1200, QUANT: 1200, REASONING: 1200 },
      lockedSectionCodes: [],
      now: resumeNow,
    });

    expect(synced.updatedLockedSections).toContain('ENGLISH');
    expect(synced.updatedSectionTimers['ENGLISH']).toBe(0);
    expect(synced.activeSectionCode).toBe('QUANT');
    expect(synced.updatedSectionTimers['QUANT']).toBe(900);
    expect(synced.isAllExpired).toBe(false);
  });
});

describe('4. Submission Verification, Idempotency & Safe Retry Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authoritatively saves and scores attempt when valid credentials and answers provided', async () => {
    vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
      id: 'student-valid-1',
      role: 'USER',
      status: 'APPROVED',
      email: 'student@bank.com',
      name: 'Valid Student',
    });

    (prisma.mockTest.findFirst as any).mockResolvedValue({
      id: 'mock-ssc-composite-1',
      status: 'published',
      isPublished: true,
      durationMinutes: 60,
      totalMarks: 200,
      cutoffMarks: 130,
      negativeMarkRatio: 0.5,
      mockTestQuestions: [
        {
          order: 1,
          question: dummyQuestion,
        },
      ],
    });

    (prisma.attempt.findUnique as any).mockResolvedValue(null);
    (prisma.attempt.upsert as any).mockResolvedValue({
      id: 'att-session-123',
      userId: 'student-valid-1',
      mockTestId: 'mock-ssc-composite-1',
      score: 2.0,
      maxScore: 2.0,
      accuracy: 100,
      totalAttempted: 1,
      correctCount: 1,
      incorrectCount: 0,
      unansweredCount: 0,
      isCompleted: true,
    });

    const res = await saveAttemptAction({
      id: 'att-session-123',
      mockTestId: 'mock-ssc-composite-1',
      mockTestTitle: 'SSC CGL Mock',
      examSlug: 'ssc-cgl',
      examTitle: 'SSC CGL',
      userId: 'student-valid-1',
      userName: 'Valid Student',
      startedAt: new Date(Date.now() - 1800 * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      timeTakenSeconds: 1800,
      totalDurationSeconds: 3600,
      score: 0,
      maxScore: 200,
      percentage: 0,
      accuracy: 0,
      totalQuestions: 1,
      totalAttempted: 0,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      cutoffMarks: 130,
      isCutoffCleared: false,
      sectionResults: [],
      topicResults: [],
      questionDetails: [
        {
          question: dummyQuestion,
          selectedOptionId: 'opt-2', // Correct option (+2.0 marks)
          isCorrect: null,
          marksObtained: 0,
          status: 'ANSWERED',
          timeSpentSeconds: 45,
        },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.attemptId).toBe('att-session-123');
    expect(res.result?.score).toBe(2.0);
    expect(res.result?.correctCount).toBe(1);
  });

  it('enforces safe retry idempotency: retrying finalized attempt returns duplicate error without overwriting', async () => {
    vi.spyOn(sessionModule, 'getCurrentUser').mockResolvedValue({
      id: 'student-valid-1',
      role: 'USER',
      status: 'APPROVED',
      email: 'student@bank.com',
      name: 'Valid Student',
    });

    (prisma.mockTest.findFirst as any).mockResolvedValue({
      id: 'mock-ssc-composite-1',
      status: 'published',
      isPublished: true,
      durationMinutes: 60,
      mockTestQuestions: [{ order: 1, question: dummyQuestion }],
    });

    // Attempt is already finalized in database
    (prisma.attempt.findUnique as any).mockResolvedValue({
      id: 'att-session-123',
      userId: 'student-valid-1',
      isCompleted: true,
      score: 2.0,
    });

    const upsertSpy = vi.spyOn(prisma.attempt, 'upsert');

    const res = await saveAttemptAction({
      id: 'att-session-123',
      mockTestId: 'mock-ssc-composite-1',
      mockTestTitle: 'SSC CGL Mock',
      examSlug: 'ssc-cgl',
      examTitle: 'SSC CGL',
      userId: 'student-valid-1',
      userName: 'Valid Student',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      timeTakenSeconds: 1800,
      totalDurationSeconds: 3600,
      score: 999, // Tampered score
      maxScore: 200,
      percentage: 100,
      accuracy: 100,
      totalQuestions: 1,
      totalAttempted: 1,
      correctCount: 1,
      incorrectCount: 0,
      unansweredCount: 0,
      cutoffMarks: 130,
      isCutoffCleared: true,
      sectionResults: [],
      topicResults: [],
      questionDetails: [],
    });

    // Server must reject overwriting finalized attempt
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Duplicate submission: This exam attempt has already been finalized/i);
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});

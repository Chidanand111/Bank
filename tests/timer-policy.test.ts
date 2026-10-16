import { describe, it, expect } from 'vitest';
import {
  getTimerPolicy,
  SectionalLockedTimerPolicy,
  OverallCompositeTimerPolicy,
  sectionalLockedTimerPolicy,
  overallCompositeTimerPolicy,
} from '@/lib/exam-engine/policies/timerPolicy';
import { calculateAttemptResult } from '@/lib/scoring/scoreCalculator';
import { MockTest, Question, UserResponseState } from '@/types';
import { MOCK_TESTS_DATA } from '@/lib/data/mockTests';
import { EXAMS_DATA } from '@/lib/data/exams';
import { getFixedQuestionsForMockTest } from '@/lib/db/questionDb';

function createMockQuestion(overrides: Partial<Question>): Question {
  return {
    id: 'q-1',
    text: 'Sample question text',
    difficulty: 'MEDIUM',
    explanation: 'Sample explanation',
    marks: 1.0,
    negativeMarks: 0.25,
    examId: 'exam-1',
    sectionId: 'sec-1',
    sectionCode: 'REASONING',
    sectionName: 'Reasoning Ability',
    topicId: 'top-1',
    topicName: 'Logic',
    options: [
      { id: 'opt-1', questionId: 'q-1', text: 'Option A', isCorrect: false, order: 1 },
      { id: 'opt-2', questionId: 'q-1', text: 'Option B', isCorrect: true, order: 2 },
    ],
    ...overrides,
  };
}

describe('TimerPolicy Engine', () => {
  const bankMockTest: MockTest = {
    id: 'mock-bank',
    slug: 'mock-bank',
    title: 'IBPS PO Prelims',
    description: 'Bank Prelims',
    examId: 'exam-bank',
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 3,
    cutoffMarks: 50,
    isFree: true,
    timerType: 'SECTIONAL_LOCKED',
    allowSectionSwitch: false,
    sections: [
      { id: 's1', code: 'ENGLISH', name: 'English Language', durationMinutes: 20, questionCount: 1, marks: 30 },
      { id: 's2', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 20, questionCount: 1, marks: 35 },
      { id: 's3', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 20, questionCount: 1, marks: 35 },
    ],
    questions: [],
  };

  const sscMockTest: MockTest = {
    id: 'mock-ssc',
    slug: 'mock-ssc',
    title: 'SSC CGL Tier 1',
    description: 'SSC CGL Tier 1',
    examId: 'exam-ssc',
    examSlug: 'ssc-cgl',
    examTitle: 'SSC CGL',
    durationMinutes: 60,
    totalMarks: 200,
    totalQuestions: 4,
    cutoffMarks: 130,
    isFree: true,
    timerType: 'OVERALL_COMPOSITE',
    allowSectionSwitch: true,
    negativeMarkRatio: 0.50,
    sections: [
      { id: 's1', code: 'REASONING', name: 'General Intelligence', durationMinutes: 15, questionCount: 25, marks: 50 },
      { id: 's2', code: 'GA', name: 'General Awareness', durationMinutes: 15, questionCount: 25, marks: 50 },
      { id: 's3', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 15, questionCount: 25, marks: 50 },
      { id: 's4', code: 'ENGLISH', name: 'English Comprehension', durationMinutes: 15, questionCount: 25, marks: 50 },
    ],
    questions: [],
  };

  const rrbMockTest: MockTest = {
    id: 'mock-rrb',
    slug: 'mock-rrb',
    title: 'RRB NTPC CBT 1',
    description: 'RRB NTPC CBT 1',
    examId: 'exam-rrb',
    examSlug: 'rrb-ntpc',
    examTitle: 'RRB NTPC',
    durationMinutes: 90,
    totalMarks: 100,
    totalQuestions: 3,
    cutoffMarks: 70,
    isFree: true,
    timerType: 'OVERALL_COMPOSITE',
    allowSectionSwitch: true,
    negativeMarkRatio: 0.333,
    sections: [
      { id: 's1', code: 'GA', name: 'General Awareness', durationMinutes: 0, questionCount: 1, marks: 40 },
      { id: 's2', code: 'QUANT', name: 'Mathematics', durationMinutes: 0, questionCount: 1, marks: 30 },
      { id: 's3', code: 'REASONING', name: 'Reasoning', durationMinutes: 0, questionCount: 1, marks: 30 },
    ],
    questions: [],
  };

  it('selects correct TimerPolicy via factory', () => {
    expect(getTimerPolicy('SECTIONAL_LOCKED')).toBeInstanceOf(SectionalLockedTimerPolicy);
    expect(getTimerPolicy('OVERALL_COMPOSITE')).toBeInstanceOf(OverallCompositeTimerPolicy);
    expect(getTimerPolicy(undefined)).toBeInstanceOf(SectionalLockedTimerPolicy);
  });

  describe('SectionalLockedTimerPolicy (Banking)', () => {
    it('initializes 20 minutes per section and locks navigation', () => {
      const state = sectionalLockedTimerPolicy.initialize(bankMockTest);
      expect(state.timerType).toBe('SECTIONAL_LOCKED');
      expect(state.sectionTimers['ENGLISH']).toBe(1200);
      expect(state.sectionTimers['QUANT']).toBe(1200);
      expect(state.sectionTimers['REASONING']).toBe(1200);
      expect(state.currentSectionCode).toBe('ENGLISH');

      // Candidate CANNOT navigate to other sections while in English
      expect(sectionalLockedTimerPolicy.canNavigateToSection(state, 'ENGLISH')).toBe(true);
      expect(sectionalLockedTimerPolicy.canNavigateToSection(state, 'QUANT')).toBe(false);
      expect(sectionalLockedTimerPolicy.canNavigateToSection(state, 'REASONING')).toBe(false);
    });

    it('advances section and locks previous when section time expires', () => {
      let state = sectionalLockedTimerPolicy.initialize(bankMockTest);
      state.sectionTimers['ENGLISH'] = 1;

      const result = sectionalLockedTimerPolicy.tick(state, bankMockTest);
      expect(result.shouldAutoSubmit).toBe(false);
      expect(result.sectionTransition?.from).toBe('English Language');
      expect(result.sectionTransition?.to).toBe('Quantitative Aptitude');
      expect(result.nextState.currentSectionCode).toBe('QUANT');
      expect(result.nextState.lockedSectionCodes).toContain('ENGLISH');

      // Now candidate cannot return to English
      expect(sectionalLockedTimerPolicy.canNavigateToSection(result.nextState, 'ENGLISH')).toBe(false);
      expect(sectionalLockedTimerPolicy.canNavigateToSection(result.nextState, 'QUANT')).toBe(true);
    });

    it('auto-submits when final section concludes', () => {
      let state = sectionalLockedTimerPolicy.initialize(bankMockTest);
      state.currentSectionCode = 'REASONING';
      state.sectionTimers['REASONING'] = 1;
      state.lockedSectionCodes = ['ENGLISH', 'QUANT'];

      const result = sectionalLockedTimerPolicy.tick(state, bankMockTest);
      expect(result.shouldAutoSubmit).toBe(true);
      expect(result.nextState.isExpired).toBe(true);
    });
  });

  describe('OverallCompositeTimerPolicy (SSC & Railway)', () => {
    it('initializes master countdown and allows free bidirectional navigation', () => {
      const state = overallCompositeTimerPolicy.initialize(sscMockTest);
      expect(state.timerType).toBe('OVERALL_COMPOSITE');
      expect(state.totalRemainingSeconds).toBe(3600); // 60 mins

      // Free navigation across all 4 sections at any time
      expect(overallCompositeTimerPolicy.canNavigateToSection(state, 'REASONING', sscMockTest)).toBe(true);
      expect(overallCompositeTimerPolicy.canNavigateToSection(state, 'GA', sscMockTest)).toBe(true);
      expect(overallCompositeTimerPolicy.canNavigateToSection(state, 'QUANT', sscMockTest)).toBe(true);
      expect(overallCompositeTimerPolicy.canNavigateToSection(state, 'ENGLISH', sscMockTest)).toBe(true);

      // Verify exact section allocations: 25 Qs, 50 Marks, 15 Mins per section
      expect(sscMockTest.sections).toHaveLength(4);
      sscMockTest.sections.forEach(sec => {
        expect(sec.questionCount).toBe(25);
        expect(sec.marks).toBe(50);
        expect(sec.durationMinutes).toBe(15);
      });
      const totalSecTime = sscMockTest.sections.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const totalSecMarks = sscMockTest.sections.reduce((sum, s) => sum + s.marks, 0);
      const totalSecQuestions = sscMockTest.sections.reduce((sum, s) => sum + s.questionCount, 0);
      expect(totalSecTime).toBe(60);
      expect(totalSecMarks).toBe(200);
      expect(totalSecQuestions).toBe(100);
    });

    it('initializes 90-minute countdown for Railway NTPC', () => {
      const state = overallCompositeTimerPolicy.initialize(rrbMockTest);
      expect(state.totalRemainingSeconds).toBe(5400); // 90 mins
      expect(overallCompositeTimerPolicy.canNavigateToSection(state, 'GA', rrbMockTest)).toBe(true);
      expect(overallCompositeTimerPolicy.canNavigateToSection(state, 'QUANT', rrbMockTest)).toBe(true);
    });

    it('auto-submits only when total master clock hits 00:00', () => {
      let state = overallCompositeTimerPolicy.initialize(sscMockTest);
      state.totalRemainingSeconds = 1;

      const result = overallCompositeTimerPolicy.tick(state);
      expect(result.shouldAutoSubmit).toBe(true);
      expect(result.nextState.isExpired).toBe(true);
      expect(result.nextState.totalRemainingSeconds).toBe(0);
    });
  });
});

describe('Dynamic Scoring for SSC and Railway', () => {
  it('correctly scores SSC Tier-1 questions (+2.0 marks, -0.50 penalty)', () => {
    const q1 = createMockQuestion({ id: 'q1', marks: 2.0, negativeMarks: 0.50 });
    const q2 = createMockQuestion({ id: 'q2', marks: 2.0, negativeMarks: 0.50 });

    const sscTest: MockTest = {
      id: 'ssc-test',
      slug: 'ssc-test',
      title: 'SSC Practice',
      description: 'SSC',
      examId: 'exam-ssc',
      examSlug: 'ssc-cgl',
      examTitle: 'SSC CGL',
      durationMinutes: 60,
      totalMarks: 4,
      totalQuestions: 2,
      cutoffMarks: 2,
      isFree: true,
      timerType: 'OVERALL_COMPOSITE',
      negativeMarkRatio: 0.50,
      sections: [{ id: 's1', code: 'REASONING', name: 'Reasoning', questionCount: 2, marks: 4 }],
      questions: [q1, q2],
    };

    const responses: Record<string, UserResponseState> = {
      q1: { questionId: 'q1', selectedOptionId: 'opt-2', status: 'ANSWERED', isMarkedForReview: false, timeSpentSeconds: 30 }, // Correct (+2.0)
      q2: { questionId: 'q2', selectedOptionId: 'opt-1', status: 'ANSWERED', isMarkedForReview: false, timeSpentSeconds: 40 }, // Wrong (-0.50)
    };

    const result = calculateAttemptResult(sscTest, responses, 70);
    expect(result.score).toBe(1.50); // 2.0 - 0.50 = 1.50
    expect(result.correctCount).toBe(1);
    expect(result.incorrectCount).toBe(1);
  });

  it('correctly scores Railway NTPC questions (+1.0 mark, -0.333 penalty)', () => {
    const q1 = createMockQuestion({ id: 'q1', marks: 1.0, negativeMarks: 0.333 });
    const q2 = createMockQuestion({ id: 'q2', marks: 1.0, negativeMarks: 0.333 });
    const q3 = createMockQuestion({ id: 'q3', marks: 1.0, negativeMarks: 0.333 });

    const rrbTest: MockTest = {
      id: 'rrb-test',
      slug: 'rrb-test',
      title: 'RRB NTPC Practice',
      description: 'RRB',
      examId: 'exam-rrb',
      examSlug: 'rrb-ntpc',
      examTitle: 'RRB NTPC',
      durationMinutes: 90,
      totalMarks: 3,
      totalQuestions: 3,
      cutoffMarks: 1.5,
      isFree: true,
      timerType: 'OVERALL_COMPOSITE',
      negativeMarkRatio: 0.333,
      sections: [{ id: 's1', code: 'GA', name: 'General Awareness', questionCount: 3, marks: 3 }],
      questions: [q1, q2, q3],
    };

    const responses: Record<string, UserResponseState> = {
      q1: { questionId: 'q1', selectedOptionId: 'opt-2', status: 'ANSWERED', isMarkedForReview: false, timeSpentSeconds: 25 }, // Correct (+1.0)
      q2: { questionId: 'q2', selectedOptionId: 'opt-1', status: 'ANSWERED', isMarkedForReview: false, timeSpentSeconds: 30 }, // Wrong (-0.333)
      q3: { questionId: 'q3', selectedOptionId: null, status: 'NOT_ANSWERED', isMarkedForReview: false, timeSpentSeconds: 10 }, // Unanswered (0)
    };

    const result = calculateAttemptResult(rrbTest, responses, 65);
    expect(result.score).toBe(0.67); // 1.0 - 0.333 = 0.667 -> rounded to 0.67 on scorecard
    expect(result.correctCount).toBe(1);
    expect(result.incorrectCount).toBe(1);
    expect(result.unansweredCount).toBe(1);
  });

  it('validates official SSC CGL timing and question structure (25 Qs / 50 Marks / 15m per section, 100 Qs / 200 Marks / 60m total)', () => {
    // 1. Verify Exam Pattern in EXAMS_DATA
    const sscExam = EXAMS_DATA.find((e: any) => e.slug === 'ssc-cgl')!;
    expect(sscExam).toBeDefined();
    const tier1Pattern = sscExam.patterns.find((p: any) => p.stage === 'Tier-1')!;
    expect(tier1Pattern).toBeDefined();
    expect(tier1Pattern.totalQuestions).toBe(100);
    expect(tier1Pattern.totalMarks).toBe(200);
    expect(tier1Pattern.totalDurationMinutes).toBe(60);

    const expectedSections = [
      { code: 'REASONING', name: 'General Intelligence & Reasoning', numQuestions: 25, maxMarks: 50, durationMinutes: 15 },
      { code: 'GA', name: 'General Awareness', numQuestions: 25, maxMarks: 50, durationMinutes: 15 },
      { code: 'QUANT', name: 'Quantitative Aptitude', numQuestions: 25, maxMarks: 50, durationMinutes: 15 },
      { code: 'ENGLISH', name: 'English Comprehension', numQuestions: 25, maxMarks: 50, durationMinutes: 15 },
    ];

    expect(tier1Pattern.sections).toHaveLength(4);
    expectedSections.forEach(expected => {
      const match = tier1Pattern.sections.find((s: any) => s.code === expected.code)!;
      expect(match).toBeDefined();
      expect(match.name).toBe(expected.name);
      expect(match.numQuestions).toBe(expected.numQuestions);
      expect(match.maxMarks).toBe(expected.maxMarks);
      expect(match.durationMinutes).toBe(expected.durationMinutes);
    });

    // 2. Verify Mock Test Configuration in MOCK_TESTS_DATA
    const sscMock = MOCK_TESTS_DATA.find((m: any) => m.slug === 'ssc-cgl-tier-1-full-mock-1')!;
    expect(sscMock).toBeDefined();
    expect(sscMock.totalQuestions).toBe(100);
    expect(sscMock.totalMarks).toBe(200);
    expect(sscMock.durationMinutes).toBe(60);
    expect(sscMock.negativeMarkRatio).toBe(0.50);

    sscMock.sections.forEach((sec: any) => {
      expect(sec.questionCount).toBe(25);
      expect(sec.marks).toBe(50);
      expect(sec.durationMinutes).toBe(15);
    });

    // 3. Verify Deterministic Question Slicer in questionDb
    const sliced = getFixedQuestionsForMockTest('ssc-cgl-tier-1-full-mock-1');
    expect(sliced).toHaveLength(100);
    const reasoningQs = sliced.filter((q: any) => q.sectionCode === 'REASONING');
    const gaQs = sliced.filter((q: any) => q.sectionCode === 'GA');
    const quantQs = sliced.filter((q: any) => q.sectionCode === 'QUANT');
    const englishQs = sliced.filter((q: any) => q.sectionCode === 'ENGLISH');

    expect(reasoningQs).toHaveLength(25);
    expect(gaQs).toHaveLength(25);
    expect(quantQs).toHaveLength(25);
    expect(englishQs).toHaveLength(25);

    // Each SSC question must carry +2.0 marks and -0.50 negative penalty
    sliced.forEach((q: any) => {
      expect(q.marks).toBe(2.0);
      expect(q.negativeMarks).toBe(0.50);
    });
  });
});

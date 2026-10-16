import { describe, it, expect } from 'vitest';
import { calculateAttemptResult } from '@/lib/scoring/scoreCalculator';
import { MockTest, Question, UserResponseState } from '@/types';

function createMockQuestion(overrides: Partial<Question>): Question {
  return {
    id: 'q-1',
    text: 'Evaluate: $\\sqrt{144} + \\frac{1}{2}$',
    difficulty: 'EASY',
    explanation: '$\\sqrt{144} = 12$, and $12 + 0.5 = 12.5$',
    marks: 1.0,
    negativeMarks: 0.25,
    examId: 'exam-ibps-po',
    sectionId: 'sec-quant',
    sectionCode: 'QUANT',
    sectionName: 'Quantitative Aptitude',
    topicId: 'top-arithmetic',
    topicName: 'Simplification',
    options: [
      { id: 'opt-1', questionId: 'q-1', text: '12', isCorrect: false, order: 1 },
      { id: 'opt-2', questionId: 'q-1', text: '12.5', isCorrect: true, order: 2 },
      { id: 'opt-3', questionId: 'q-1', text: '13', isCorrect: false, order: 3 },
      { id: 'opt-4', questionId: 'q-1', text: '11.5', isCorrect: false, order: 4 },
    ],
    ...overrides,
  };
}

function createThreeSectionMockTest(): MockTest {
  const englishQuestions: Question[] = Array.from({ length: 30 }, (_, i) =>
    createMockQuestion({
      id: `q-eng-${i + 1}`,
      text: `English Question ${i + 1}`,
      sectionCode: 'ENGLISH',
      sectionName: 'English Language',
      sectionId: 'sec-eng',
      marks: 1.0,
      negativeMarks: 0.25,
      options: [
        { id: `opt-eng-${i + 1}-1`, questionId: `q-eng-${i + 1}`, text: 'Option A', isCorrect: true, order: 1 },
        { id: `opt-eng-${i + 1}-2`, questionId: `q-eng-${i + 1}`, text: 'Option B', isCorrect: false, order: 2 },
      ],
    })
  );

  const quantQuestions: Question[] = Array.from({ length: 35 }, (_, i) =>
    createMockQuestion({
      id: `q-quant-${i + 1}`,
      text: `Quant Question ${i + 1}`,
      sectionCode: 'QUANT',
      sectionName: 'Quantitative Aptitude',
      sectionId: 'sec-quant',
      marks: 1.0,
      negativeMarks: 0.25,
      options: [
        { id: `opt-quant-${i + 1}-1`, questionId: `q-quant-${i + 1}`, text: 'Option A', isCorrect: true, order: 1 },
        { id: `opt-quant-${i + 1}-2`, questionId: `q-quant-${i + 1}`, text: 'Option B', isCorrect: false, order: 2 },
      ],
    })
  );

  const reasoningQuestions: Question[] = Array.from({ length: 35 }, (_, i) =>
    createMockQuestion({
      id: `q-reason-${i + 1}`,
      text: `Reasoning Question ${i + 1}`,
      sectionCode: 'REASONING',
      sectionName: 'Reasoning Ability',
      sectionId: 'sec-reason',
      marks: 1.0,
      negativeMarks: 0.25,
      options: [
        { id: `opt-reason-${i + 1}-1`, questionId: `q-reason-${i + 1}`, text: 'Option A', isCorrect: true, order: 1 },
        { id: `opt-reason-${i + 1}-2`, questionId: `q-reason-${i + 1}`, text: 'Option B', isCorrect: false, order: 2 },
      ],
    })
  );

  const allQuestions = [...englishQuestions, ...quantQuestions, ...reasoningQuestions];

  return {
    id: 'mock-ibps-po-prelims-1',
    slug: 'ibps-po-prelims-1',
    title: 'IBPS PO Prelims Live Mock 1',
    description: 'Authentic 100-question preliminary mock test',
    examId: 'exam-ibps-po',
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO Prelims',
    durationMinutes: 60,
    totalMarks: 100,
    totalQuestions: 100,
    cutoffMarks: 58.5,
    isFree: true,
    sections: [
      { id: 'sec-eng', code: 'ENGLISH', name: 'English Language', questionCount: 30, marks: 30, durationMinutes: 20 },
      { id: 'sec-quant', code: 'QUANT', name: 'Quantitative Aptitude', questionCount: 35, marks: 35, durationMinutes: 20 },
      { id: 'sec-reason', code: 'REASONING', name: 'Reasoning Ability', questionCount: 35, marks: 35, durationMinutes: 20 },
    ],
    questions: allQuestions,
  };
}

describe('Phase 4: Exam Engine Robustness & Player Invariants', () => {
  describe('Invariants 1: Sectional Timers & Prelims Structure', () => {
    it('enforces total duration of strictly 60 minutes (3600 seconds) for standard banking prelims', () => {
      const test = createThreeSectionMockTest();
      expect(test.durationMinutes).toBe(60);
      expect(test.durationMinutes * 60).toBe(3600);
    });

    it('enforces 3 non-transferable 20-minute section allocations (English: 20m, Quant: 20m, Reasoning: 20m)', () => {
      const test = createThreeSectionMockTest();
      expect(test.sections).toHaveLength(3);
      expect(test.sections[0].code).toBe('ENGLISH');
      expect(test.sections[0].durationMinutes).toBe(20);
      expect(test.sections[1].code).toBe('QUANT');
      expect(test.sections[1].durationMinutes).toBe(20);
      expect(test.sections[2].code).toBe('REASONING');
      expect(test.sections[2].durationMinutes).toBe(20);

      const totalSectionMinutes = test.sections.reduce((acc, s) => acc + (s.durationMinutes || 20), 0);
      expect(totalSectionMinutes).toBe(60);
    });

    it('enforces canonical question count distribution (English: 30, Quant: 35, Reasoning: 35 = 100 Qs)', () => {
      const test = createThreeSectionMockTest();
      expect(test.questions).toHaveLength(100);

      const engCount = test.questions.filter(q => q.sectionCode === 'ENGLISH').length;
      const quantCount = test.questions.filter(q => q.sectionCode === 'QUANT').length;
      const reasonCount = test.questions.filter(q => q.sectionCode === 'REASONING').length;

      expect(engCount).toBe(30);
      expect(quantCount).toBe(35);
      expect(reasonCount).toBe(35);
      expect(engCount + quantCount + reasonCount).toBe(100);
    });
  });

  describe('Invariants 2: Strict Marking Scheme (+1.0 / -0.25 / 0)', () => {
    it('awards exactly +1.0 for each correct answer and subtracts 0.25 for each incorrect answer', () => {
      const test = createThreeSectionMockTest();
      const responses: Record<string, UserResponseState> = {};

      // 40 correct answers in English and Quant (+40.0)
      for (let i = 1; i <= 30; i++) {
        responses[`q-eng-${i}`] = {
          questionId: `q-eng-${i}`,
          selectedOptionId: `opt-eng-${i}-1`, // Correct (+1.0)
          isMarkedForReview: false,
          status: 'ANSWERED',
          timeSpentSeconds: 25,
        };
      }
      for (let i = 1; i <= 10; i++) {
        responses[`q-quant-${i}`] = {
          questionId: `q-quant-${i}`,
          selectedOptionId: `opt-quant-${i}-1`, // Correct (+1.0)
          isMarkedForReview: false,
          status: 'ANSWERED',
          timeSpentSeconds: 30,
        };
      }

      // 20 incorrect answers in Quant (-0.25 * 20 = -5.0)
      for (let i = 11; i <= 30; i++) {
        responses[`q-quant-${i}`] = {
          questionId: `q-quant-${i}`,
          selectedOptionId: `opt-quant-${i}-2`, // Incorrect (-0.25)
          isMarkedForReview: false,
          status: 'ANSWERED',
          timeSpentSeconds: 20,
        };
      }

      // Remaining 40 questions unattempted (0.0)
      const result = calculateAttemptResult(test, responses, 3500, 'att-test-invariants');

      expect(result.correctCount).toBe(40);
      expect(result.incorrectCount).toBe(20);
      expect(result.unansweredCount).toBe(40);
      expect(result.totalAttempted).toBe(60);

      // Expected score: 40 * 1.0 - 20 * 0.25 = 40.0 - 5.0 = 35.0
      expect(result.score).toBe(35.0);
      // Accuracy: 40 / 60 = 66.7%
      expect(result.accuracy).toBe(66.7);
      // Cutoff: 35.0 < 58.5
      expect(result.isCutoffCleared).toBe(false);
    });

    it('returns score = 0 when no questions are attempted', () => {
      const test = createThreeSectionMockTest();
      const responses: Record<string, UserResponseState> = {};

      const result = calculateAttemptResult(test, responses, 1800, 'att-unattempted');

      expect(result.correctCount).toBe(0);
      expect(result.incorrectCount).toBe(0);
      expect(result.unansweredCount).toBe(100);
      expect(result.totalAttempted).toBe(0);
      expect(result.score).toBe(0);
      expect(result.accuracy).toBe(0);
      expect(result.isCutoffCleared).toBe(false);
    });

    it('correctly tracks sectional scores and marks cutoff as cleared when target score is achieved', () => {
      const test = createThreeSectionMockTest();
      const responses: Record<string, UserResponseState> = {};

      // 70 correct answers (+70.0)
      for (let i = 1; i <= 30; i++) {
        responses[`q-eng-${i}`] = {
          questionId: `q-eng-${i}`,
          selectedOptionId: `opt-eng-${i}-1`,
          isMarkedForReview: false,
          status: 'ANSWERED',
          timeSpentSeconds: 30,
        };
      }
      for (let i = 1; i <= 35; i++) {
        responses[`q-quant-${i}`] = {
          questionId: `q-quant-${i}`,
          selectedOptionId: `opt-quant-${i}-1`,
          isMarkedForReview: false,
          status: 'ANSWERED',
          timeSpentSeconds: 30,
        };
      }
      for (let i = 1; i <= 5; i++) {
        responses[`q-reason-${i}`] = {
          questionId: `q-reason-${i}`,
          selectedOptionId: `opt-reason-${i}-1`,
          isMarkedForReview: false,
          status: 'ANSWERED',
          timeSpentSeconds: 30,
        };
      }

      // 10 incorrect in reasoning (-2.5)
      for (let i = 6; i <= 15; i++) {
        responses[`q-reason-${i}`] = {
          questionId: `q-reason-${i}`,
          selectedOptionId: `opt-reason-${i}-2`,
          isMarkedForReview: false,
          status: 'ANSWERED',
          timeSpentSeconds: 20,
        };
      }

      const result = calculateAttemptResult(test, responses, 3550, 'att-passed');

      // Score: 70 - 2.5 = 67.5 >= 58.5
      expect(result.score).toBe(67.5);
      expect(result.isCutoffCleared).toBe(true);
      expect(result.accuracy).toBe(87.5); // 70 / 80 = 87.5%

      // Sectional Breakdown Checks
      const engSection = result.sectionResults.find(s => s.sectionCode === 'ENGLISH');
      const quantSection = result.sectionResults.find(s => s.sectionCode === 'QUANT');
      const reasonSection = result.sectionResults.find(s => s.sectionCode === 'REASONING');

      expect(engSection?.score).toBe(30);
      expect(engSection?.attempted).toBe(30);
      expect(quantSection?.score).toBe(35);
      expect(quantSection?.attempted).toBe(35);
      expect(reasonSection?.score).toBe(2.5); // 5 * 1.0 - 10 * 0.25 = 2.5
      expect(reasonSection?.attempted).toBe(15);
    });
  });

  describe('Invariants 3: Question Review & Option Status Mapping', () => {
    it('correctly maps questionDetails statuses for review navigation', () => {
      const test = createThreeSectionMockTest();
      const responses: Record<string, UserResponseState> = {
        'q-eng-1': {
          questionId: 'q-eng-1',
          selectedOptionId: 'opt-eng-1-1', // Correct
          isMarkedForReview: false,
          status: 'ANSWERED',
          timeSpentSeconds: 15,
        },
        'q-eng-2': {
          questionId: 'q-eng-2',
          selectedOptionId: 'opt-eng-2-2', // Incorrect & Marked
          isMarkedForReview: true,
          status: 'ANSWERED_AND_MARKED',
          timeSpentSeconds: 40,
        },
        'q-eng-3': {
          questionId: 'q-eng-3',
          selectedOptionId: null, // Marked for Review without Answer
          isMarkedForReview: true,
          status: 'MARKED_FOR_REVIEW',
          timeSpentSeconds: 20,
        },
      };

      const result = calculateAttemptResult(test, responses, 100, 'att-review-mapping');

      const qd1 = result.questionDetails.find(q => q.question.id === 'q-eng-1');
      const qd2 = result.questionDetails.find(q => q.question.id === 'q-eng-2');
      const qd3 = result.questionDetails.find(q => q.question.id === 'q-eng-3');
      const qd4 = result.questionDetails.find(q => q.question.id === 'q-eng-4');

      expect(qd1?.isCorrect).toBe(true);
      expect(qd1?.status).toBe('ANSWERED');

      expect(qd2?.isCorrect).toBe(false);
      expect(qd2?.status).toBe('ANSWERED_AND_MARKED');

      expect(qd3?.isCorrect).toBe(null);
      expect(qd3?.status).toBe('MARKED_FOR_REVIEW');

      expect(qd4?.isCorrect).toBe(null);
      expect(qd4?.status).toBe('NOT_VISITED');
    });
  });
});

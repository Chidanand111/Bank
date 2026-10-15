import { describe, it, expect } from 'vitest';
import { calculateAttemptResult } from '@/lib/scoring/scoreCalculator';
import { MockTest, Question, UserResponseState } from '@/types';

function createMockQuestion(overrides: Partial<Question>): Question {
  return {
    id: 'q-1',
    text: 'What is the capital of India?',
    difficulty: 'EASY',
    explanation: 'New Delhi is the capital.',
    marks: 1.0,
    negativeMarks: 0.25,
    examId: 'exam-1',
    sectionId: 'sec-1',
    sectionCode: 'GENERAL',
    sectionName: 'General Awareness',
    topicId: 'top-1',
    topicName: 'Current Affairs',
    options: [
      { id: 'opt-1', questionId: 'q-1', text: 'Mumbai', isCorrect: false, order: 1 },
      { id: 'opt-2', questionId: 'q-1', text: 'New Delhi', isCorrect: true, order: 2 },
      { id: 'opt-3', questionId: 'q-1', text: 'Kolkata', isCorrect: false, order: 3 },
      { id: 'opt-4', questionId: 'q-1', text: 'Chennai', isCorrect: false, order: 4 },
    ],
    ...overrides,
  };
}

function createMockTest(questions: Question[]): MockTest {
  return {
    id: 'test-1',
    slug: 'mock-test-1',
    title: 'Sample Mock Test',
    description: 'A test for unit testing scoring',
    examId: 'exam-1',
    examSlug: 'sample-exam',
    examTitle: 'Sample Exam',
    durationMinutes: 60,
    totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
    totalQuestions: questions.length,
    cutoffMarks: 1.5,
    isFree: true,
    sections: [
      { id: 'sec-1', code: 'GENERAL', name: 'General Awareness', questionCount: questions.length, marks: questions.length },
    ],
    questions,
  };
}

describe('calculateAttemptResult', () => {
  it('correctly calculates score with positive and negative marking', () => {
    const q1 = createMockQuestion({ id: 'q-1', marks: 1.0, negativeMarks: 0.25 });
    const q2 = createMockQuestion({ id: 'q-2', marks: 1.0, negativeMarks: 0.25 });
    const q3 = createMockQuestion({ id: 'q-3', marks: 1.0, negativeMarks: 0.25 });
    const test = createMockTest([q1, q2, q3]);

    const responses: Record<string, UserResponseState> = {
      'q-1': {
        questionId: 'q-1',
        selectedOptionId: 'opt-2', // Correct (+1.0)
        isMarkedForReview: false,
        status: 'ANSWERED',
        timeSpentSeconds: 30,
      },
      'q-2': {
        questionId: 'q-2',
        selectedOptionId: 'opt-1', // Incorrect (-0.25)
        isMarkedForReview: false,
        status: 'ANSWERED',
        timeSpentSeconds: 45,
      },
      // q-3 unanswered (0)
    };

    const result = calculateAttemptResult(test, responses, 75, 'att-123');

    expect(result.id).toBe('att-123');
    expect(result.correctCount).toBe(1);
    expect(result.incorrectCount).toBe(1);
    expect(result.unansweredCount).toBe(1);
    expect(result.totalAttempted).toBe(2);
    expect(result.score).toBe(0.75); // 1.0 - 0.25 = 0.75
    expect(result.accuracy).toBe(50); // 1/2 = 50%
    expect(result.isCutoffCleared).toBe(false); // 0.75 < 1.5
  });

  it('marks cutoff as cleared when score meets or exceeds cutoffMarks', () => {
    const q1 = createMockQuestion({ id: 'q-1', marks: 1.0, negativeMarks: 0.25 });
    const q2 = createMockQuestion({ id: 'q-2', marks: 1.0, negativeMarks: 0.25 });
    const test = createMockTest([q1, q2]);

    const responses: Record<string, UserResponseState> = {
      'q-1': { questionId: 'q-1', selectedOptionId: 'opt-2', isMarkedForReview: false, status: 'ANSWERED', timeSpentSeconds: 20 },
      'q-2': { questionId: 'q-2', selectedOptionId: 'opt-2', isMarkedForReview: false, status: 'ANSWERED', timeSpentSeconds: 20 },
    };

    const result = calculateAttemptResult(test, responses, 40, 'att-pass');
    expect(result.score).toBe(2.0);
    expect(result.isCutoffCleared).toBe(true); // 2.0 >= 1.5
    expect(result.accuracy).toBe(100);
  });
});

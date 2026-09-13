import { MockTest } from '@/types';

/**
 * Mock Test Templates
 * Note: Questions are stored in the database (@/data/questions.json)
 * and are picked dynamically and randomly from the database at the start
 * of each exam while guaranteeing non-repeating questions for that user.
 */
export const MOCK_TESTS_DATA: MockTest[] = [
  // --- IBPS PO MOCK 1 ---
  {
    id: 'mock-ibps-po-1',
    slug: 'ibps-po-prelims-mock-1',
    title: 'IBPS PO Prelims Full Mock Test 1',
    description: '30-Question dynamic practice test for IBPS PO Prelims covering English Language, Quantitative Aptitude, and Reasoning Ability with non-repeating questions.',
    examId: 'exam-ibps-po',
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO (Probationary Officer)',
    durationMinutes: 45,
    totalMarks: 30,
    totalQuestions: 30,
    cutoffMarks: 18.5,
    isFree: true,
    sections: [
      { id: 'sec-ibps-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 15, questionCount: 10, marks: 10 },
      { id: 'sec-ibps-p-quant', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 15, questionCount: 10, marks: 10 },
      { id: 'sec-ibps-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 15, questionCount: 10, marks: 10 },
    ],
    questions: [],
  },

  // --- IBPS PO MOCK 2 ---
  {
    id: 'mock-ibps-po-2',
    slug: 'ibps-po-prelims-mock-2',
    title: 'IBPS PO Prelims Speed Drill Mock 2',
    description: 'Targeted high-yield practice test designed to evaluate speed and accuracy under strict timed conditions.',
    examId: 'exam-ibps-po',
    examSlug: 'ibps-po',
    examTitle: 'IBPS PO (Probationary Officer)',
    durationMinutes: 45,
    totalMarks: 30,
    totalQuestions: 30,
    cutoffMarks: 20.0,
    isFree: true,
    sections: [
      { id: 'sec-ibps-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 15, questionCount: 10, marks: 10 },
      { id: 'sec-ibps-p-quant', code: 'QUANT', name: 'Quantitative Aptitude', durationMinutes: 15, questionCount: 10, marks: 10 },
      { id: 'sec-ibps-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 15, questionCount: 10, marks: 10 },
    ],
    questions: [],
  },

  // --- SBI CLERK MOCK 1 ---
  {
    id: 'mock-sbi-clerk-1',
    slug: 'sbi-clerk-prelims-mock-1',
    title: 'SBI Clerk Prelims Full Mock Test 1',
    description: 'Realistic preliminary exam mockup featuring high-frequency questions in Numerical Ability, English, and Reasoning.',
    examId: 'exam-sbi-clerk',
    examSlug: 'sbi-clerk',
    examTitle: 'SBI Clerk (Junior Associate)',
    durationMinutes: 45,
    totalMarks: 30,
    totalQuestions: 30,
    cutoffMarks: 21.5,
    isFree: true,
    sections: [
      { id: 'sec-sbi-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 15, questionCount: 10, marks: 10 },
      { id: 'sec-sbi-p-num', code: 'QUANT', name: 'Numerical Ability', durationMinutes: 15, questionCount: 10, marks: 10 },
      { id: 'sec-sbi-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 15, questionCount: 10, marks: 10 },
    ],
    questions: [],
  },

  // --- SBI CLERK MOCK 2 ---
  {
    id: 'mock-sbi-clerk-2',
    slug: 'sbi-clerk-prelims-mock-2',
    title: 'SBI Clerk Prelims Speed Booster Mock 2',
    description: 'Targeted practice for speed calculation, fast comprehension, and quick logical reasoning.',
    examId: 'exam-sbi-clerk',
    examSlug: 'sbi-clerk',
    examTitle: 'SBI Clerk (Junior Associate)',
    durationMinutes: 45,
    totalMarks: 30,
    totalQuestions: 30,
    cutoffMarks: 22.0,
    isFree: true,
    sections: [
      { id: 'sec-sbi-p-eng', code: 'ENGLISH', name: 'English Language', durationMinutes: 15, questionCount: 10, marks: 10 },
      { id: 'sec-sbi-p-num', code: 'QUANT', name: 'Numerical Ability', durationMinutes: 15, questionCount: 10, marks: 10 },
      { id: 'sec-sbi-p-reason', code: 'REASONING', name: 'Reasoning Ability', durationMinutes: 15, questionCount: 10, marks: 10 },
    ],
    questions: [],
  },
];
